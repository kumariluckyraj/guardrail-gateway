const URL_ = process.env.GUARDRAIL_URL;
const KEY = process.env.GUARDRAIL_API_KEY;

export class GuardrailError extends Error {
  constructor(message, decision, status) {
    super(message);
    this.decision = decision;
    this.status = status;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// guard("action_name", { small details }, () => the real action)
export async function guard(tool, args, run, opts = {}) {
  const { waitSeconds = 120, description = "" } = opts;
  const headers = { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

  let res;
  try {
    res = await fetch(`${URL_}/v1/check`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tool, arguments: args, description }),
    });
  } catch {
    throw new GuardrailError("Gateway unreachable, action not run", "error", 0);
  }
  const data = await res.json().catch(() => ({}));

  if (res.status === 200) return run(); // allowed

  if (res.status === 202) {
    // a human must approve first
    const end = Date.now() + waitSeconds * 1000;
    while (Date.now() < end) {
      await sleep(3000);
      const p = await fetch(`${URL_}${data.status_url}`, { headers }).then((r) => r.json()).catch(() => ({}));
      if (p.status === "executed") return run();
      if (["rejected", "expired", "failed"].includes(p.status))
        throw new GuardrailError(`Not approved (${p.status})`, p.status, 403);
    }
    throw new GuardrailError("Still waiting for approval", "pending_approval", 202);
  }

  throw new GuardrailError(data.reason || data.detail || "Blocked by gateway", data.decision || "error", res.status);
}