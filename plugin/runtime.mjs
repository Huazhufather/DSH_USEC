import { readFile, mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { TeamClient } from "../client.mjs";
import { installRelease, currentRelease, readJson, atomicJson, trustedErpUrl } from "../release.mjs";

export const PRESET = "company-erp-analysis";
export const defaultRoot = () => join(process.env.LOCALAPPDATA || join(homedir(), ".local", "share"), "CompanyDSH");

/** Package code is replaceable; device identity, reports and work stay in the user data directory. */
export async function prepareCompany({ root = defaultRoot(), packageRoot = resolve(import.meta.dirname, "..") } = {}) {
  const config = await readJson(join(packageRoot, "company-public.json"));
  trustedErpUrl(config.server);
  const existing = await readJson(join(root, "company.json"), null);
  if (existing && new URL(existing.server).origin !== new URL(config.server).origin)
    throw new Error("公司工作资料已关联另一 ERP 地址，请先核对安装包。");
  const manifest = await readJson(join(packageRoot, "release.json"));
  const installed = await installRelease(root, manifest);
  if (!existing) await atomicJson(join(root, "company.json"), { server: config.server });
  for (const name of ["downloads", "test-results", "knowledge-drafts"])
    await mkdir(join(root, "workspace", name), { recursive: true });
  const release = await currentRelease(root);
  return { root, workspace: join(root, "workspace"), release, packageVersion: manifest.version,
    server: config.server, pendingReload: installed.status === "pending-reload" };
}

export async function companyPreset(runtime) {
  const { root, release } = runtime;
  const resourceRoot = join(release.path, "workspace", ".dsh", "skills");
  const rules = await readFile(join(release.path, "workspace", "AGENTS.md"), "utf8");
  return {
    id: PRESET, name: "公司 ERP 分析", description: "选品研究、经营、SKU、备货及财务分析。", order: 2,
    plugins: [
      { id: "persona", name: "@deepseek-ai/dsh-persona", config: { prefix: rules } },
      { id: "time-context", name: "@deepseek-ai/dsh-time-context" },
      { id: "tool-fs", name: "@deepseek-ai/dsh-tool-fs" },
      { id: "tool-fs-search", name: "@deepseek-ai/dsh-tool-fs-search", config: { sampleOverCapGlobResults: false } },
      { id: "tool-web", name: "@deepseek-ai/dsh-tool-web" },
      { id: "tool-pwsh", name: "@deepseek-ai/dsh-tool-pwsh", disabled: process.platform !== "win32" },
      { id: "tool-bash", name: "@deepseek-ai/dsh-tool-bash", disabled: process.platform === "win32" },
      { id: "tool-jobs", name: "@deepseek-ai/dsh-tool-jobs" },
      { id: "skill-filesystem", name: "@deepseek-ai/dsh-skill-filesystem", config: {
        providerName: "company-methods", includeDefaultRoots: false, customSkillDirs: [resourceRoot], watch: false,
      } },
      { id: "tool-skill", name: "@deepseek-ai/dsh-tool-skill" },
      { id: "tool-presentation", name: "@deepseek-ai/dsh-agent-tool-presentation", config: { mode: "ptc" } },
      { id: "tool-ask-user", name: "@deepseek-ai/dsh-tool-ask-user" },
      { id: "present", name: "@deepseek-ai/dsh-tool-present" },
      { id: "company-erp-tools", name: "@deepseek-ai/dsh-mcp-client", config: {
        serverName: "erp_read", transport: "stdio", command: process.execPath,
        args: [join(release.path, "app", "cli.mjs"), "bridge", "--root", root, "--version", release.version, "--distribution", "plugin"],
        env: { ELECTRON_RUN_AS_NODE: "1" }, cwd: runtime.workspace, toolCallTimeoutMs: 125000,
        failOnStartupError: true,
      } },
    ],
  };
}

export function companyActions(runtime) {
  const client = new TeamClient(runtime.root, { server: runtime.server });
  return async (action, body = {}) => {
    if (action === "status") {
      let connection;
      try { connection = await client.status(); }
      catch (error) { connection = { status: "unavailable", message: error.message }; }
      let pendingReports = 0;
      const queues = join(runtime.root, "private", "reports");
      for (const owner of await readdir(queues, { withFileTypes: true }).catch((e) => {
        if (e.code === "ENOENT") return []; throw e;
      })) {
        if (owner.isDirectory()) pendingReports += (await readdir(join(queues, owner.name)))
          .filter((name) => name.endsWith(".json")).length;
      }
      return { connection, version: runtime.release.version, packageVersion: runtime.packageVersion,
        pendingReload: runtime.pendingReload, workspace: runtime.workspace, pendingReports };
    }
    if (action === "connect") return client.connect();
    if (action === "switch") return client.switchAccount();
    if (action === "logout") return client.logout();
    if (action === "renew") {
      const device = await readJson(join(runtime.root, "private", "device.json"));
      const result = await client.request(`devices/${device.deviceId}/renew`, { method: "POST", body: {} });
      if (trustedErpUrl(result.verificationUrl).origin !== new URL(runtime.server).origin)
        throw new Error("ERP 续期地址不匹配。");
      return result;
    }
    if (action === "devices") return client.request("devices");
    if (action === "revoke") {
      if (!/^[0-9a-f-]{36}$/i.test(body.deviceId || "")) throw new Error("设备编号无效。");
      return client.request(`devices/${body.deviceId}/revoke`, { method: "POST", body: {} });
    }
    if (action === "reports") return client.call("company_reports_list", { request: body });
    if (action === "report") return client.call("company_reports_read", { request: body });
    if (action === "retry") return { receipts: await client.flushReports() };
    throw new Error("公司分析操作不存在。");
  };
}
