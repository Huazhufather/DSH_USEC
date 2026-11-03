window.__ModuleLoader__.load({
  id: "@company/dsh-erp-analysis",
  factory(require) {
    const React = require("react"), h = React.createElement;
    const words = {
      zh: {
        title: "公司 ERP 分析", intro: "经营复盘、SKU、备货和财务分析，自动选用公司方法。",
        refresh: "刷新状态", connect: "登录 ERP", continue: "继续登录", renew: "续期登录",
        switchAccount: "切换账号", logout: "退出登录", signedOut: "已退出当前电脑的 ERP 登录。", accountChanged: "请在 ERP 确认新账号；登录后新建公司分析对话。",
        authorize: "打开 ERP 登录并确认", awaiting: "在 ERP 完成确认后，返回这里刷新状态。",
        unpaired: "先登录本人的 ERP 账号，再开始公司分析。", active: "当前账号：", expired: "登录已到期或权限已变更，请续期或切换账号。",
        revoked: "当前登录已退出，可以重新登录。", pending: "等待本人在 ERP 页面确认登录。",
        unavailable: "公司服务暂时无法连接，请稍后刷新。", loading: "正在读取公司接入状态…",
        start: "开始公司分析", account: "个人 ERP 账号", devices: "我的设备", revoke: "解除此设备",
        revokedDevice: "已解除", expires: "有效期至", version: "公司方法版本", needReload: "新版已准备好，完成当前任务后重启 DSH。",
        methods: "使用统一公司方法；模型由你在 DSH 中自行选择。",
        reports: "共享正式报告", loadReports: "读取共享报告", retry: "恢复待共享报告", queue: "份报告待共享",
        sharing: "生成或保存正式报告后自动共享，所有已启用成员均可查看完整内容，包括成本和利润。聊天、草稿和临时附件仅保存在本机。",
        noReports: "暂无共享报告。", reportTitle: "报告", author: "作者", reportVersion: "版本", time: "生成时间", download: "下载",
        previousPage: "上一页", nextPage: "下一页", page: "页码",
        retryDone: "已恢复共享报告", local: "本机公司资料目录", update: "安装更新",
        updateHelp: "完成当前分析后，在 DSH 插件管理中卸载公司插件，使用 github:Huazhufather/DSH_USEC 重新安装、立即启用并重启。新建公司分析对话使用新版；ERP 登录和本机资料保留。",
        failed: "操作未完成，请重试。", mismatch: "报告文件校验失败，请重新下载。", refreshing: "正在办理…",
      },
      en: {
        title: "Company ERP Analysis", intro: "Business reviews, SKU, supply and finance analysis using company methods.",
        refresh: "Refresh", connect: "Sign in to ERP", continue: "Continue sign-in", renew: "Renew sign-in",
        switchAccount: "Switch account", logout: "Sign out", signedOut: "Signed out of ERP on this computer.", accountChanged: "Confirm the new ERP account, then start a new company analysis conversation.",
        authorize: "Sign in and confirm in ERP", awaiting: "Confirm in ERP, then return here and refresh.",
        unpaired: "Sign in with your own ERP account to begin.", active: "Current account:", expired: "Sign-in expired or permissions changed. Renew or switch accounts.",
        revoked: "Signed out. You may sign in again.", pending: "Waiting for your ERP sign-in confirmation.",
        unavailable: "The company service is unavailable. Refresh later.", loading: "Loading connection status…",
        start: "Start company analysis", account: "Your ERP account", devices: "My devices", revoke: "Revoke device",
        revokedDevice: "Revoked", expires: "Valid until", version: "Company method version", needReload: "An update is ready. Finish your work, then restart DSH.",
        methods: "Company methods are managed centrally. Choose your own model in DSH.",
        reports: "Shared formal reports", loadReports: "Load shared reports", retry: "Retry pending reports", queue: "reports pending upload",
        sharing: "Formal reports are shared automatically with every enabled member, including costs and profit. Chats, drafts and temporary attachments stay on this computer.",
        noReports: "No shared reports yet.", reportTitle: "Report", author: "Author", reportVersion: "Version", time: "Created", download: "Download",
        previousPage: "Previous page", nextPage: "Next page", page: "Page",
        retryDone: "Reports shared", local: "Local company workspace", update: "Install updates",
        updateHelp: "Finish your analysis, uninstall the company plugin in DSH Plugins, then reinstall from github:Huazhufather/DSH_USEC, enable it and restart. New conversations use the updated methods; ERP sign-in and local files are retained.",
        failed: "The operation did not finish. Retry.", mismatch: "Report verification failed. Download again.", refreshing: "Working…",
      },
    };
    const css = `.company-erp-panel{height:100%;overflow:auto;padding:36px clamp(20px,4vw,56px);color:var(--dsw-alias-label-primary,CanvasText);font:inherit;box-sizing:border-box}.company-erp-panel>div{max-width:1000px;margin:auto}.company-erp-panel h1{font-size:26px;line-height:1.3;margin:0 0 10px;font-weight:600}.company-erp-panel h2{font-size:18px;margin:0 0 12px;font-weight:600}.company-erp-panel p{line-height:1.7;max-width:72ch;margin:10px 0}.company-erp-panel header,.company-erp-panel .company-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.company-erp-panel header{justify-content:space-between;align-items:flex-start}.company-erp-panel section{padding:28px 0;border-bottom:1px solid color-mix(in srgb,currentColor 18%,transparent)}.company-erp-panel button,.company-erp-panel a.company-button{font:inherit;min-height:38px;padding:8px 14px;border:1px solid color-mix(in srgb,currentColor 25%,transparent);border-radius:6px;background:transparent;color:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;box-sizing:border-box}.company-erp-panel button:hover,.company-erp-panel a.company-button:hover{background:color-mix(in srgb,currentColor 7%,transparent)}.company-erp-panel button.primary{background:#205eaa;border-color:#205eaa;color:#fff}.company-erp-panel button:disabled{opacity:.5;cursor:default}.company-erp-panel button:focus-visible,.company-erp-panel a:focus-visible{outline:2px solid #3e8ce0;outline-offset:3px}.company-erp-panel .company-message{min-height:28px;margin-top:16px;line-height:1.6}.company-erp-panel .company-error{color:light-dark(#a52420,#ffaaa4)}.company-erp-panel table{border-collapse:collapse;width:100%;font-size:14px}.company-erp-panel th,.company-erp-panel td{text-align:left;padding:12px 10px;border-bottom:1px solid color-mix(in srgb,currentColor 15%,transparent);overflow-wrap:anywhere}.company-erp-panel th{font-weight:600}.company-erp-panel .company-table{overflow-x:auto}.company-erp-panel small{font-size:13px}.company-erp-panel .company-path{overflow-wrap:anywhere}.company-erp-panel ::selection{background:#b7d6fa;color:#122b48}@media(max-width:700px){.company-erp-panel{padding:24px 18px}.company-erp-panel h1{font-size:23px}.company-erp-panel section{padding:22px 0}}`;
    function Icon() {
      return h("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, "aria-hidden": true },
        h("path", { d: "M4 20V4h12v16M2 20h20M8 8h4M8 12h4M8 16h2M18 8h3v12" }));
    }
    return {
      inject: ["connection", "slots", "locale", "layout", "uiWorkspace", "workspaces"],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register("company-erp", words));
        const t = ctx.locale.bind("company-erp");
        async function api(action, body = {}) {
          const response = await ctx.connection.rpc.call("/api", "company-erp/control", { action, body });
          if (!response.ok) {
            const error = new Error(response.error?.message || t("failed"));
            error.code = response.error?.code; error.status = response.error?.details?.status;
            throw error;
          }
          return response.value;
        }
        function CompanyPanel() {
          const [state, setState] = React.useState(null), [busy, setBusy] = React.useState(false);
          const [message, setMessage] = React.useState(""), [error, setError] = React.useState(false);
          const [verification, setVerification] = React.useState(null), [devices, setDevices] = React.useState(null);
          const [reports, setReports] = React.useState(null);
          const [reportPage, setReportPage] = React.useState(1), [hasMoreReports, setHasMoreReports] = React.useState(false);
          const alive = React.useRef(true), accountEpoch = React.useRef(0);
          const refresh = async () => {
            const epoch = accountEpoch.current;
            const next = await api("status");
            if (alive.current && epoch === accountEpoch.current) {
              setState(next);
              if (next.connection.status !== "active") { setReports(null); setDevices(null); }
            }
            return next;
          };
          React.useEffect(() => {
            alive.current = true;
            refresh().catch((e) => { if (alive.current) { setMessage(e.message); setError(true); } });
            return () => { alive.current = false; };
          }, []);
          async function action(fn) {
            setBusy(true); setError(false); setMessage(t("refreshing"));
            try { await fn(); }
            catch (e) { if (alive.current) {
              if (e.status === 401 || e.status === 403) {
                setReports(null); setDevices(null); setVerification(null);
                setState((previous) => previous && { ...previous, connection: { status: "unavailable", message: e.message } });
              }
              setError(true); setMessage(e.message);
            } }
            finally { if (alive.current) setBusy(false); }
          }
          const connection = state?.connection, active = connection?.status === "active";
          const canRenew = connection?.canRenew;
          const user = connection?.user?.login && connection.user.login !== connection.user.displayName
            ? `${connection.user.displayName} (${connection.user.login})`
            : connection?.user?.login || connection?.user?.displayName || "";
          const status = !connection ? t("loading") : active
            ? `${t("active")} ${user}${connection.expiresAt ? ` · ${t("expires")} ${new Date(connection.expiresAt).toLocaleString()}` : ""}`
            : connection.message || t(canRenew ? "expired" : connection.status) || t("unavailable");
          function button(label, fn, disabled = false, primary = false) {
            return h("button", { type: "button", disabled: busy || disabled, className: primary ? "primary" : undefined,
              onClick: () => action(fn) }, label);
          }
          async function link(renew) {
            const result = await api(renew ? "renew" : "connect");
            setVerification(result.verificationUrl); setMessage(t("awaiting")); await refresh();
          }
          async function changeAccount(switching) {
            accountEpoch.current++;
            setReports(null); setDevices(null); setVerification(null); setState(null);
            setReportPage(1); setHasMoreReports(false);
            try {
              const result = await api(switching ? "switch" : "logout");
              setVerification(result.verificationUrl || null);
              setMessage(t(switching ? "accountChanged" : "signedOut"));
            } finally { await refresh(); }
          }
          async function loadReports(page = 1) {
            const result = await api("reports", { page });
            setReports(result.items || []); setReportPage(result.page);
            setHasMoreReports(result.hasMore); setMessage("");
          }
          async function download(report) {
            const file = await api("report", { reportId: report.reportId || report.id, version: report.version });
            const bytes = Uint8Array.from(atob(file.contentBase64), (c) => c.charCodeAt(0));
            const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
            if (digest !== file.sha256) throw new Error(t("mismatch"));
            const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
            const link = document.createElement("a"); link.href = url; link.download = file.filename.split(/[\\/]/).pop(); link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000); setMessage("");
          }
          return h("main", { className: "company-erp-panel" }, h("style", null, css), h("div", null,
            h("header", null, h("div", null, h("h1", null, t("title")), h("p", null, t("intro"))),
              button(t("refresh"), async () => { await refresh(); setMessage(""); })),
            h("div", { role: error ? "alert" : "status", "aria-live": "polite", className: `company-message${error ? " company-error" : ""}` }, message),
            h("section", null, h("h2", null, t("account")), h("p", null, status),
              h("div", { className: "company-row" },
                button(connection?.status === "pending" ? t("continue") : t("connect"), () => link(false), active || canRenew || !state || connection?.status === "unavailable"),
                button(t("renew"), () => link(true), !active && !canRenew),
                button(t("switchAccount"), () => changeAccount(true), !connection?.deviceId),
                button(t("logout"), () => changeAccount(false), !connection?.deviceId),
                button(t("start"), async () => {
                  const workspace = await ctx.workspaces.create({ path: state.workspace });
                  if (workspace.title === "workspace") await ctx.workspaces.rename(workspace.workspaceId, t("title"));
                  await ctx.uiWorkspace.openWorkspace(workspace.workspaceId, undefined, { agentPreset: "company-erp-analysis" });
                  setMessage("");
                }, !active || state?.pendingReload, true)),
              verification ? h("p", null, h("a", { className: "company-button", href: verification, target: "_blank", rel: "noreferrer noopener" }, t("authorize"))) : null,
              h("p", null, h("small", null, `${t("version")} ${state?.version || "—"} · ${t("methods")}`)),
              state?.pendingReload ? h("p", { role: "status" }, t("needReload")) : null),
            h("section", null, h("h2", null, t("reports")), h("p", null, t("sharing")),
              h("div", { className: "company-row" },
                button(t("loadReports"), () => loadReports(), !active),
                button(t("retry"), async () => { const r = await api("retry"); await refresh(); setMessage(`${t("retryDone")}: ${r.receipts.filter((x) => x.status === "shared").length}`); }, !active),
                state?.pendingReports ? h("span", null, `${state.pendingReports} ${t("queue")}`) : null),
              reports ? reports.length ? h("div", { className: "company-table" }, h("table", null,
                h("thead", null, h("tr", null, ...["reportTitle", "author", "reportVersion", "time", "download"].map((key) => h("th", { key, scope: "col" }, t(key))))),
                h("tbody", null, ...reports.map((report) => h("tr", { key: report.reportId || report.id },
                  h("td", null, report.title), h("td", null, report.authorName || report.author?.name || "—"),
                  h("td", null, report.version || report.currentVersion || "—"),
                  h("td", null, report.generatedAt ? new Date(report.generatedAt).toLocaleString() : "—"),
                  h("td", null, button(t("download"), () => download(report)))))))) : h("p", null, t("noReports")) : null,
              reports && h("div", { className: "company-row" },
                button(t("previousPage"), () => loadReports(reportPage - 1), reportPage <= 1 || !active),
                h("span", { "aria-live": "polite" }, `${t("page")} ${reportPage}`),
                button(t("nextPage"), () => loadReports(reportPage + 1), !hasMoreReports || !active))),
            h("section", null, h("h2", null, t("devices")),
              button(t("devices"), async () => { const r = await api("devices"); setDevices(r.items || r.devices || []); setMessage(""); }, !active),
              devices?.map((device) => h("div", { className: "company-row", key: device.deviceId || device.id },
                h("p", null, device.deviceName || device.name, " · ", device.revoked ? t("revokedDevice") : `${t("expires")} ${new Date(device.expiresAt).toLocaleString()}`),
                button(t("revoke"), async () => { await api("revoke", { deviceId: device.deviceId || device.id }); await refresh(); setDevices(null); setReports(null); setVerification(null); setMessage(""); }, device.revoked)))),
            h("section", null, h("h2", null, t("update")), h("p", null, t("updateHelp")),
              h("p", null, h("small", null, t("local")), h("br"), h("span", { className: "company-path" }, state?.workspace || "—")))));
        }
        ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: "company-erp-analysis" }, CompanyPanel));
        ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({ name: "sidebar.panellist", id: "company-erp-analysis", order: 5, label: () => t("title") }, Icon));
      },
    };
  },
});
