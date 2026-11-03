import {
  readFile,
  writeFile,
  mkdir,
  rename,
  stat,
  readdir,
  rm,
  cp,
  copyFile,
  rmdir,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join, resolve, dirname } from "node:path";

export const digest = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export function trustedErpUrl(value) {
  const url = new URL(value);
  if (
    url.origin === "http://211.97.68.49:10020" &&
    !url.username &&
    !url.password &&
    !url.hash
  )
    return url;
  return trustedUrl(value);
}
export function trustedUrl(value) {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.hash ||
    !(
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    )
  )
    throw new Error("请使用 HTTPS 公司地址。");
  return url;
}
export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT" && fallback !== undefined) return fallback;
    throw e;
  }
}
export async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temp = path + "." + randomUUID() + ".tmp";
  await writeFile(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  try {
    await rename(temp, path);
  } finally {
    await rm(temp, { force: true });
  }
}
export async function currentRelease(root) {
  const marker = await readJson(join(root, "current.json"));
  return { ...marker, path: join(root, "versions", marker.version) };
}
export async function fetchJson(url, maxBytes = 64 * 1024 * 1024) {
  trustedUrl(url);
  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`下载失败 (${response.status})`);
  if (Number(response.headers.get("content-length")) > maxBytes)
    throw new Error("更新包超过尺寸限制。");
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw new Error("更新包超过尺寸限制。");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function validateRelease(manifest) {
  if (
    manifest.schemaVersion !== 1 ||
    !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(manifest.version) ||
    !Array.isArray(manifest.files) ||
    !manifest.files.length ||
    manifest.files.length > 1000
  )
    throw new Error("更新包格式无效。");
  const required = [
    "app/cli.mjs",
    "app/bridge.mjs",
    "app/client.mjs",
    "app/release.mjs",
    "app/control.mjs",
    "app/launcher.mjs",
    "app/control.html",
    "workspace/AGENTS.md",
  ];
  for (const path of required)
    if (!manifest.files.some((file) => file.path === path))
      throw new Error("更新包缺少必要程序文件。");
  const skills = manifest.files.filter((file) =>
    /^workspace\/\.dsh\/skills\/[^/]+\/SKILL\.md$/.test(file.path),
  );
  if (![11, 12].includes(skills.length))
    throw new Error("更新包业务 Skill 不完整。");
  const paths = new Set();
  let total = 0;
  return manifest.files.map((file) => {
    const path = file.path;
    if (
      typeof path !== "string" ||
      path.length > 220 ||
      path.includes("\\") ||
      !path
        .split("/")
        .every(
          (s) =>
            s &&
            s !== "." &&
            s !== ".." &&
            !/[<>:"|?*\x00-\x1f]/.test(s) &&
            !/[. ]$/.test(s) &&
            !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s),
        ) ||
      !/^(app|workspace)\//.test(path)
    )
      throw new Error("更新包含非法路径。");
    const canonical = path.normalize("NFC").toLowerCase();
    if (paths.has(canonical)) throw new Error("更新包含重复路径。");
    paths.add(canonical);
    if (
      typeof file.contentBase64 !== "string" ||
      file.contentBase64.length > 16 * 1024 * 1024 ||
      !/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        file.contentBase64,
      )
    )
      throw new Error("更新文件内容无效。");
    const bytes = Buffer.from(file.contentBase64, "base64");
    total += bytes.length;
    if (
      total > 48 * 1024 * 1024 ||
      bytes.length !== file.bytes ||
      digest(bytes) !== file.sha256
    )
      throw new Error("更新文件校验失败。");
    return { path, bytes };
  });
}
export async function liveLeases(root) {
  const dir = join(root, "leases");
  await mkdir(dir, { recursive: true });
  const live = [];
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    const value = await readJson(path);
    try {
      process.kill(value.pid, 0);
      live.push(value);
    } catch (e) {
      if (e.code === "ESRCH") await rm(path, { force: true });
      else live.push(value);
    }
  }
  return live;
}
async function installReleaseUnlocked(root, manifest, { defer = true } = {}) {
  const files = validateRelease(manifest);
  await mkdir(join(root, "versions"), { recursive: true });
  const target = join(root, "versions", manifest.version);
  let exists = false;
  try {
    await stat(target);
    exists = true;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const fingerprint = digest(Buffer.from(JSON.stringify(manifest)));
  if (exists) {
    const receipt = await readJson(join(target, "release-receipt.json"));
    if (receipt.fingerprint !== fingerprint)
      throw new Error("相同版本已有不同内容，请发布新版本。");
  } else {
    const staging = join(root, "versions", ".stage-" + randomUUID());
    await mkdir(staging);
    try {
      for (const file of files) {
        const output = join(staging, ...file.path.split("/"));
        await mkdir(dirname(output), { recursive: true });
        await writeFile(output, file.bytes);
      }
      await atomicJson(join(staging, "release-receipt.json"), {
        version: manifest.version,
        fingerprint,
      });
      await rename(staging, target);
    } catch (e) {
      await rm(staging, { recursive: true, force: true });
      throw e;
    }
  }
  const marker = { version: manifest.version, fingerprint };
  const current = await readJson(join(root, "current.json"), null);
  if (current?.version === marker.version && current.fingerprint === fingerprint)
    return { ...marker, status: "installed" };
  if (defer && (await liveLeases(root)).length) {
    await atomicJson(join(root, "pending.json"), marker);
    return { ...marker, status: "pending-reload" };
  }
  await publishWorkspace(root, target, marker);
  await rm(join(root, "pending.json"), { force: true });
  return { ...marker, status: "installed" };
}
async function publishWorkspace(root, target, marker) {
  const source = join(target, "workspace"),
    workspace = join(root, "workspace");
  await mkdir(join(workspace, "reports"), { recursive: true });
  const stage = join(workspace, ".company-stage-" + randomUUID()),
    previous = join(workspace, ".company-previous-" + randomUUID());
  await mkdir(stage);
  await mkdir(previous);
  const old = [],
    installed = [];
  try {
    await copyFile(join(source, "AGENTS.md"), join(stage, "AGENTS.md"));
    await cp(join(source, ".dsh"), join(stage, ".dsh"), {
      recursive: true,
      errorOnExist: true,
    });
    for (const name of ["AGENTS.md", ".dsh"]) {
      try {
        await rename(join(workspace, name), join(previous, name));
        old.push(name);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      await rename(join(stage, name), join(workspace, name));
      installed.push(name);
    }
    await atomicJson(join(root, "current.json"), marker);
  } catch (error) {
    for (const name of installed.reverse())
      await rename(join(workspace, name), join(stage, name));
    for (const name of old.reverse())
      await rename(join(previous, name), join(workspace, name));
    throw error;
  }
}
async function activatePendingUnlocked(root) {
  const pending = await readJson(join(root, "pending.json"), null);
  if (!pending || (await liveLeases(root)).length) return false;
  await publishWorkspace(
    root,
    join(root, "versions", pending.version),
    pending,
  );
  await rm(join(root, "pending.json"), { force: true });
  return true;
}
export async function configureProfile(
  profile,
  root,
  nodePath,
  { checkOnly = false } = {},
) {
  const path = join(profile, "cordis.patch.yml");
  await mkdir(profile, { recursive: true });
  let existing = "";
  try {
    existing = await readFile(path, "utf8");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const begin = "# BEGIN COMPANY DSH TEAM";
  const end = "# END COMPANY DSH TEAM";
  const start = existing.indexOf(begin);
  let clean = existing;
  if (start >= 0) {
    const finish = existing.indexOf(end, start);
    if (finish < 0) throw new Error("公司配置区不完整，请恢复配置备份。");
    clean = existing.slice(0, start) + existing.slice(finish + end.length);
  }
  if (
    /serverName\s*:\s*['"]?erp_read\b/.test(clean) ||
    /['"]serverName['"]\s*:\s*['"]erp_read['"]/.test(clean)
  )
    throw new Error(
      "已存在 erp_read 连接。请先备份、停用并移除原连接配置，再安装公司连接。",
    );
  const store = await readJson(
    join(dirname(dirname(profile)), "storages", "mcp_connector.json"),
    null,
  );
  if (store && JSON.stringify(store).includes("erp_read"))
    throw new Error("MCP 连接管理器已有 erp_read 记录。请先停用并移除旧记录。");
  let homePatch = "";
  try {
    homePatch = await readFile(
      join(dirname(dirname(profile)), "cordis.patch.yml"),
      "utf8",
    );
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (/serverName\s*:\s*['"]?erp_read\b/.test(homePatch))
    throw new Error("DSH 全局配置已有 erp_read 连接，请先备份、停用并移除原连接配置。");
  if (checkOnly) return path;
  const block = `${begin}\n- insert:\n    - id: company-erp-read\n      name: '@deepseek-ai/dsh-mcp-client'\n      config:\n        serverName: erp_read\n        transport: stdio\n        command: ${JSON.stringify(nodePath.replaceAll("\\", "/"))}\n        args: [${JSON.stringify(join(root, "launcher.mjs").replaceAll("\\", "/"))}, bridge, --root, ${JSON.stringify(root.replaceAll("\\", "/"))}]\n        toolCallTimeoutMs: 120000\n        failOnStartupError: false\n${end}\n`;
  await writeFile(path + ".company-before", existing, { flag: "wx" }).catch(
    (e) => {
      if (e.code !== "EEXIST") throw e;
    },
  );
  const temp = path + ".company.tmp";
  await writeFile(temp, clean.trimEnd() + "\n" + block);
  await rename(temp, path);
  return path;
}

export async function withActivationLock(root, operation) {
  await mkdir(root, { recursive: true });
  const lock = join(root, "activation.lock");
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      await mkdir(lock);
      await writeFile(
        join(lock, "owner.json"),
        JSON.stringify({ pid: process.pid }),
      );
      break;
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      let owner = null;
      try {
        owner = await readJson(join(lock, "owner.json"), null);
      } catch {}
      let dead = false;
      if (owner?.pid) {
        try {
          process.kill(owner.pid, 0);
        } catch (failure) {
          dead = failure.code === "ESRCH";
        }
      }
      if (dead) {
        await rm(join(lock, "owner.json"), { force: true });
        await rmdir(lock).catch((failure) => {
          if (!["ENOENT", "ENOTEMPTY"].includes(failure.code)) throw failure;
        });
        continue;
      }
      if (!owner) {
        const age = Date.now() - (await stat(lock)).mtimeMs;
        if (age > 30000) {
          await rm(join(lock, "owner.json"), { force: true });
          await rmdir(lock).catch(() => {});
          continue;
        }
      }
      if (attempt === 199) throw new Error("公司更新正在办理，请稍后重试。");
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  try {
    return await operation();
  } finally {
    await rm(join(lock, "owner.json"), { force: true });
    await rmdir(lock);
  }
}
export async function installRelease(root, manifest, options) {
  return withActivationLock(root, () =>
    installReleaseUnlocked(root, manifest, options),
  );
}
export async function activatePending(root) {
  return withActivationLock(root, () => activatePendingUnlocked(root));
}
export async function beginBridge(root, { version } = {}) {
  return withActivationLock(root, async () => {
    await activatePendingUnlocked(root);
    let release = await currentRelease(root);
    if (version !== undefined) {
      if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(version))
        throw new Error("公司方法版本无效。");
      const path = join(root, "versions", version);
      const receipt = await readJson(join(path, "release-receipt.json"));
      release = { ...receipt, version, path };
    }
    const lease = join(root, "leases", randomUUID() + ".json");
    await atomicJson(lease, { pid: process.pid, version: release.version });
    return { release, lease };
  });
}
export async function endBridge(root, snapshot) {
  await rm(snapshot.lease, { force: true });
  await activatePending(root);
}
