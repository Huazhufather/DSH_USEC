import { generateKeyPairSync, createHash, randomUUID, sign } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, rename } from "node:fs/promises";
import { join, basename, dirname } from "node:path";
import { hostname, userInfo } from "node:os";
import { execFileSync } from "node:child_process";
import { trustedErpUrl, readJson, atomicJson } from "./release.mjs";
export async function secureDirectory(path) {
  await mkdir(path, { recursive: true, mode: 0o700 });
  if (process.platform === "win32") {
    const output = execFileSync(
      "C:/Windows/System32/whoami.exe",
      ["/user", "/fo", "csv", "/nh"],
      { encoding: "utf8", windowsHide: true },
    );
    const sid = output.match(/S-1-5-[0-9-]+/);
    if (!sid) throw new Error("无法确认当前 Windows 用户。");
    execFileSync(
      "C:/Windows/System32/icacls.exe",
      [path, "/inheritance:r", "/grant:r", `*${sid[0]}:(OI)(CI)F`],
      { windowsHide: true, stdio: "pipe" },
    );
  }
}
export class TeamClient {
  constructor(root, config) {
    this.root = root;
    this.config = config;
    this.state = join(root, "private");
    trustedErpUrl(config.server);
    this.base = new URL("/api/v1/dsh/", config.server);
  }
  async key() {
    await secureDirectory(this.state);
    const file = join(this.state, "device-key.pem");
    let privateKey;
    try {
      privateKey = await readFile(file, "utf8");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      privateKey = generateKeyPairSync("ed25519", {
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      }).privateKey;
      await writeFile(file, privateKey, { flag: "wx", mode: 0o600 });
    }
    return privateKey;
  }
  checkIdentity(device, expectedDeviceId) {
    if ((expectedDeviceId && device.deviceId !== expectedDeviceId) ||
        (this.config.pinIdentity && this.boundDeviceId && device.deviceId !== this.boundDeviceId))
      throw new Error("ERP 账号已切换，请新建公司分析对话。原账号的待共享报告已保留，不会以当前账号上传。");
    if (this.config.pinIdentity) this.boundDeviceId ||= device.deviceId;
  }
  async request(path, { method = "GET", body, signed = true, expectedDeviceId } = {}) {
    const url = new URL(path, this.base);
    if (
      url.origin !== this.base.origin ||
      !url.pathname.startsWith(this.base.pathname)
    )
      throw new Error("无效的公司接口。");
    const raw =
      body === undefined ? Buffer.alloc(0) : Buffer.from(JSON.stringify(body));
    const headers = { "Content-Type": "application/json" };
    if (signed) {
      const device = await readJson(join(this.state, "device.json"), null);
      if (!device) throw new Error("请先关联本人 ERP 账号，再重试本次操作。");
      this.checkIdentity(device, expectedDeviceId);
      const time = String(Math.floor(Date.now() / 1000)),
        nonce = randomUUID();
      const canonical = [
        time,
        nonce,
        method,
        url.pathname + url.search,
        createHash("sha256").update(raw).digest("hex"),
      ].join("\n");
      headers["X-DSH-Device"] = device.deviceId;
      headers["X-DSH-Time"] = time;
      headers["X-DSH-Nonce"] = nonce;
      headers["X-DSH-Signature"] = sign(
        null,
        Buffer.from(canonical),
        await this.key(),
      ).toString("base64");
    }
    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: method === "GET" ? undefined : raw,
        redirect: "error",
        signal: AbortSignal.timeout(120000),
      });
    } catch {
      throw new Error("公司服务暂时无法连接，请保留当前操作后重试。");
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 32 * 1024 * 1024) throw new Error("服务响应超过限制。");
      chunks.push(chunk);
    }
    let result;
    try {
      result = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new Error("公司服务返回了无效响应。");
    }
    if (!response.ok) {
      const code = result.error?.code || `HTTP_${response.status}`;
      const requestId = typeof result.error?.requestId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.error.requestId)
        ? result.error.requestId : undefined;
      const message = response.status === 503 || code === "SERVICE_UNAVAILABLE"
        ? "公司服务繁忙，请稍后重试。"
        : `公司服务拒绝本次操作 (${code})`;
      const e = new Error(message + (requestId ? `（请求编号：${requestId}）` : ""));
      e.code = code;
      e.status = response.status;
      e.requestId = requestId;
      throw e;
    }
    return result;
  }
  async connect(deviceName = hostname()) {
    const previous = await readJson(join(this.state, "device.json"), null);
    if (previous) {
      const status = await this.status();
      if (status.status === "active" || status.canRenew)
        throw new Error("本机已登录 ERP，请使用续期或点击“切换账号”。");
      if (status.status === "pending")
        return {deviceId:previous.deviceId, expiresAt:status.expiresAt,
          verificationUrl:new URL(`connect/${encodeURIComponent(previous.deviceId)}`,this.base).href};
      if (status.status !== "revoked" || status.linked && !status.revoked)
        throw new Error("尚未确认旧关联已解除，请先核对状态。");
    }
    const { createPublicKey } = await import("node:crypto");
    const publicKey = createPublicKey(await this.key()).export({
      type: "spki",
      format: "pem",
    });
    const result = await this.request("devices/request", {
      method: "POST",
      signed: false,
      body: { publicKey, deviceName },
    });
    await atomicJson(join(this.state, "device.json"), {
      deviceId: result.deviceId,
    });
    const verification = trustedErpUrl(result.verificationUrl);
    if (verification.origin !== this.base.origin)
      throw new Error("确认地址与公司 ERP 不一致。");
    return {
      deviceId: result.deviceId,
      verificationUrl: verification.href,
      expiresAt: result.expiresAt,
    };
  }
  async status() {
    const device = await readJson(join(this.state, "device.json"), null);
    if (!device) return { status: "unpaired" };
    return this.request(
      `devices/${encodeURIComponent(device.deviceId)}/status`,
      { method: "POST", body: {} },
    );
  }
  async logout() {
    const device = await readJson(join(this.state, "device.json"), null);
    if (device) {
      const result = await this.request(`devices/${encodeURIComponent(device.deviceId)}/revoke`, {
        method: "POST", body: {}, expectedDeviceId: device.deviceId,
      });
      if (result.status !== "revoked" || result.deviceId !== device.deviceId)
        throw new Error("尚未确认当前账号已退出，请刷新状态后重试。");
      await atomicJson(join(this.state, "device.json"), null);
    }
    return { status: "unpaired" };
  }
  async switchAccount() {
    await this.logout();
    return this.connect();
  }
  async tools() {
    return this.request("tools");
  }
  async call(name, args = {}, { expectedDeviceId } = {}) {
    return this.request("tools/call", {
      method: "POST",
      body: { name, arguments: args },
      expectedDeviceId,
    });
  }
  async saveReport(report) {
    await secureDirectory(this.state);
    const device = await readJson(join(this.state, "device.json"), null);
    if (!device) throw new Error("请先关联本人 ERP 账号，再保存共享报告。");
    this.checkIdentity(device);
    const queue = join(this.state, "reports", device.deviceId);
    await mkdir(queue, { recursive: true, mode: 0o700 });
    const operationId = report.operationId || randomUUID();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        operationId,
      )
    )
      throw new Error("报告操作编号必须是 UUID。");
    const path = join(queue, operationId + ".json");
    const pending = await readJson(path, null);
    const original = pending || await readJson(path + ".shared", null);
    const request = { ...report, operationId };
    const generatedAt = original ? original.source?.generatedAt : new Date().toISOString();
    if (generatedAt && report.source?.generatedAt === undefined)
      request.source = { ...report.source, generatedAt };
    if (original && JSON.stringify(original) !== JSON.stringify(request))
      throw new Error("同一报告操作编号不能修改内容。");
    if (!pending) await atomicJson(path, request);
    return this.sendQueued(path, request);
  }
  async sendQueued(path, request) {
    try {
      const receipt = await this.call("company_reports_save", { request }, { expectedDeviceId: basename(dirname(path)) });
      if (receipt.status !== "shared")
        throw new Error("服务器尚未确认报告共享。");
      await rename(path, path + ".shared");
      return { ...receipt, operationId: request.operationId };
    } catch (e) {
      return {
        status: "pending",
        operationId: request.operationId,
        message: e.message,
      };
    }
  }
  async flushReports() {
    const device = await readJson(join(this.state, "device.json"), null);
    if (!device) throw new Error("请先关联本人 ERP 账号，再保存共享报告。");
    this.checkIdentity(device);
    const queue = join(this.state, "reports", device.deviceId);
    await mkdir(queue, { recursive: true });
    const results = [];
    for (const owner of await readdir(join(this.state, "reports"), { withFileTypes: true })) {
      if (!owner.isDirectory() || owner.name === device.deviceId) continue;
      const files = await readdir(join(this.state, "reports", owner.name));
      const count = files.filter(name => name.endsWith(".json")).length;
      if (count) results.push({status:"pending", reason:"different_device", count,
        message:"原关联的待共享报告已保留，未以当前用户上传。"});
    }
    for (const name of await readdir(queue)) {
      if (name.endsWith(".json")) {
        const path = join(queue, name);
        results.push(await this.sendQueued(path, await readJson(path)));
      }
    }
    return results;
  }
}
