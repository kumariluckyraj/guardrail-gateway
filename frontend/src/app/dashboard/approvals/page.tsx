"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { ui } from "@/lib/ui";
import type { Approval } from "@/types";

const filters = ["pending", "executed", "rejected", "failed", "expired"];

export default function ApprovalsPage() {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<Approval[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(() => {
    api<Approval[]>(`/approvals?status=${status}`).then(setItems).catch((e) => setError(e.message));
  }, [status]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function approve(a: Approval) {
    if (!confirm(`Approve and run ${a.tool_name} now? This performs the real action.`)) return;
    setBusyId(a.id);
    setError("");
    try {
      await api(`/approvals/${a.id}/approve`, { method: "POST" });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function reject(a: Approval) {
    const reason = prompt("Reason for rejecting (optional):") ?? undefined;
    setBusyId(a.id);
    setError("");
    try {
      await api(`/approvals/${a.id}/reject`, { method: "POST", json: { reason } });
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <h1 className={ui.title}>Approvals</h1>
      <p className={ui.lead}>Risky actions wait here until a person approves or rejects them.</p>

      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            aria-pressed={status === f}
            className={`rounded-full px-3.5 py-1 text-sm font-medium transition ${
              status === f
                ? "bg-gradient-to-r from-[#7c5cff] to-[#4f7bff] text-white shadow-[0_0_20px_-6px_rgba(124,92,255,0.9)]"
                : "border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      {error && <p className={ui.error}>{error}</p>}

      <div className="mt-5 space-y-4">
        {items.map((a) => (
          <div key={a.id} className={`${a.status === "pending" ? "gg-v-approval gg-card-v" : "gg-panel"} p-5`}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="gg-mono font-semibold text-white">{a.tool_name}</span>
              <Badge value={a.risk_level} />
              <Badge value={a.status} />
              <span className="text-xs text-slate-400">
                by {a.agent_name} · {new Date(a.created_at + "Z").toLocaleString()}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-200">{a.reason}</p>
            <pre className={`${ui.code} mt-3`}>{JSON.stringify(a.arguments, null, 2)}</pre>
            {a.decided_by && <p className="mt-3 text-xs text-slate-400">Decided by {a.decided_by}</p>}
            {a.rejection_reason && <p className="text-xs text-slate-400">Reason: {a.rejection_reason}</p>}
            {a.status === "pending" && (
              <div className="mt-4 flex gap-2">
                <button disabled={busyId === a.id} onClick={() => approve(a)} className={ui.okBtn}>
                  Approve
                </button>
                <button disabled={busyId === a.id} onClick={() => reject(a)} className={ui.rejectBtn}>
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className={`${ui.card} text-center text-slate-400`}>Nothing here right now.</p>
        )}
      </div>
    </div>
  );
}