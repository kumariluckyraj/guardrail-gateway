"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ui } from "@/lib/ui";
import type { ApprovalRule, Suggestion } from "@/types";

function describe(a: ApprovalRule) {
  if (a.mode === "never") return "Run automatically (no approval)";
  if (a.mode === "always") return "Always ask a human";
  return `Ask a human only if ${a.field} ${a.operator} ${a.value}`;
}

export default function SuggestionsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Suggestion[]>("/suggestions?status=pending").then(setItems).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function analyze() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const r = await api<{ checked: number; new_suggestions: number }>("/suggestions/analyze", { method: "POST" });
      setNote(
        r.checked === 0
          ? "Not enough human decisions yet. Approve or reject a few more requests first."
          : `The advisor reviewed ${r.checked} action(s) and made ${r.new_suggestions} suggestion(s).`
      );
      load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, what: "apply" | "dismiss") {
    setError("");
    try {
      await api(`/suggestions/${id}/${what}`, { method: "POST" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <h1 className={ui.title}>Suggestions</h1>
      <p className={ui.lead}>
        An AI advisor reads your approval history and suggests better rules. Nothing changes unless you click Apply.
      </p>

      <button onClick={analyze} disabled={busy} className={`${ui.btn} mt-6`}>
        {busy ? "Advisor is thinking..." : "Analyze approval history"}
      </button>
      {note && <p className="mt-3 text-sm text-slate-300">{note}</p>}
      {error && <p className={ui.error}>{error}</p>}

      <div className="mt-6 space-y-4">
        {items.map((s) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono font-semibold text-white">{s.tool_name}</span>
              <span className="text-xs text-slate-400">for {s.agent_name}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  s.action === "relax" ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"
                }`}
              >
                {s.action === "relax" ? "Make it easier" : "Make it stricter"}
              </span>
            </div>

            <p className="mt-3 text-slate-200">{s.reason}</p>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Now</p>
                <p className="mt-1 text-slate-300">{describe(s.current_approval)}</p>
              </div>
              <div className="rounded-xl border border-[#7c5cff]/40 bg-[#7c5cff]/10 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-400">Suggested</p>
                <p className="mt-1 text-white">{describe(s.proposed_approval)}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Based on {s.evidence.approved} approved and {s.evidence.rejected} rejected requests
              {s.evidence.avg_seconds_to_decide !== null && `, humans took about ${s.evidence.avg_seconds_to_decide}s to decide`}.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => decide(s.id, "apply")}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-sm font-semibold text-white hover:brightness-110"
              >
                Apply
              </button>
              <button
                onClick={() => decide(s.id, "dismiss")}
                className="rounded-lg border border-white/20 px-4 py-1.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                Dismiss
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-slate-400">
            No suggestions yet. Approve a few requests, then click "Analyze approval history".
          </p>
        )}
      </div>
    </div>
  );
}