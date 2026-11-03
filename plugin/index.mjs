import { prepareCompany, companyPreset, companyActions } from "./runtime.mjs";
export const inject = ["agentPresets", "connection"];
export async function apply(ctx) {
  const runtime = await prepareCompany();
  const dispose = await ctx.agentPresets.register(await companyPreset(runtime));
  ctx.effect(() => dispose);
  const action = companyActions(runtime);
  // Connection owns browser authentication, request trust, owner access and Desktop IPC.
  ctx.connection.fetch.register({
    path: "/api/company-erp/control", methods: ["POST"], requestBody: "buffered",
    async fetch(request) {
      const message = await request.json();
      if (message?.type !== "client-request" || message.method !== "company-erp/control" ||
          typeof message.rpcId !== "string" || typeof message.payload?.action !== "string")
        return new Response("Invalid company request", { status: 400 });
      let result;
      try {
        request.signal.throwIfAborted();
        result = { ok: true, value: await action(message.payload.action, message.payload.body) };
      } catch (error) {
        result = { ok: false, error: { code: error.code || "company/action-failed", message: error.message,
          details: Number.isInteger(error.status) ? { status: error.status } : {} } };
      }
      return Response.json({ type: "server-response", rpcId: message.rpcId, result });
    },
  });
}
