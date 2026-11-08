"use client";

import { useState } from "react";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import type { Run, RunStep } from "@/types";

const stepIcon: Record<string, string> = {
  thought: "💭",
  tool_request: "🔧",
  tool_result: "🛡️",
  waiting_approval: "⏳",
  final: "✅",
  error: "⚠️",
};

const stepTitle: Record<string, string> = {
  thought: "Agent thinking",
  tool_request: "Agent requests a tool",
  tool_result: "Gateway decision",
  waiting_approval: "Waiting for a human",
  final: "Final answer",
  error: "Run error",
};

const stepAccent: Record<string, string> = {
  thought: "border-white/10",
  tool_request: "border-[#7c5cff]/40",
  tool_result: "border-[#22d3ee]/40",
  waiting_approval: "border-amber-400/50 shadow-[0_0_30px_-10px_rgba(251,191,36,0.6)]",
  final: "border-emerald-400/40",
  error: "border-[#ff5c7a]/50",
};

export default function RunTimeline({ run }: { run: Run }) {
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  // Approvals that already have a result, so their buttons are hidden.
  const resolved = new Set(
    run.steps
      .filter((s) => s.type === "tool_result" && s.approval_id)
      .map((s) => s.approval_id)
  );

  async function approve(id: string) {
    setBusy(id);
    setMsg("");
    try {
      await api(`/approvals/${id}/approve`, { method: "POST" });
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy("");
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting (optional):") ?? undefined;
    setBusy(id);
    setMsg("");
    try {
      await api(`/approvals/${id}/reject`, { method: "POST", json: { reason } });
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy("");
    }
  }

  function renderBody(s: RunStep) {
    if (s.type === "tool_request") {
      return (
        <>
          <p className="gg-mono text-sm font-semibold text-[#9db0ff]">{s.tool}</p>
          <pre className="gg-mono mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-slate-200">
            {JSON.stringify(s.arguments, null, 2)}
          </pre>
        </>
      );
    }

    if (s.type === "tool_result") {
      return (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="gg-mono text-sm text-slate-100">{s.tool}</span>
          <Badge value={s.decision ?? "unknown"} />
          {s.detail && <span className="text-xs text-slate-400">{s.detail}</span>}
        </div>
      );
    }

    if (s.type === "waiting_approval") {
      const showButtons =
        s.approval_id && !resolved.has(s.approval_id) && run.status === "running";
      return (
        <div>
          <p className="text-sm text-slate-200">
            <span className="gg-mono font-semibold text-amber-300">{s.tool}</span> needs approval
            {s.detail ? <span className="text-slate-400">: {s.detail}</span> : ""}
          </p>
          {showButtons && (
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy === s.approval_id}
                onClick={() => approve(s.approval_id as string)}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1.5 text-sm font-semibold text-white shadow-[0_8px_24px_-10px_rgba(16,185,129,0.9)] transition hover:brightness-110 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={busy === s.approval_id}
                onClick={() => reject(s.approval_id as string)}
                className="rounded-lg border border-[#ff5c7a]/50 bg-[#ff5c7a]/10 px-4 py-1.5 text-sm font-semibold text-[#ff8da1] transition hover:bg-[#ff5c7a]/20 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      );
    }

    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{s.text}</p>;
  }

  const card = "flex-1 rounded-xl border bg-white/[0.04] p-4 backdrop-blur";
  const label = "text-[11px] font-semibold uppercase tracking-wider text-slate-500";

  return (
    <ol className="relative space-y-3">
      <li className="flex gap-3">
        <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg">
          👤
        </span>
        <div className={`${card} border-white/10`}>
          <p className={label}>Task</p>
          <p className="mt-1 text-sm text-white">{run.task}</p>
        </div>
      </li>

      {run.steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg">
            {stepIcon[s.type]}
          </span>
          <div className={`${card} ${stepAccent[s.type] ?? "border-white/10"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className={label}>{stepTitle[s.type]}</p>
              <p className="text-xs text-slate-500">{new Date(s.t).toLocaleTimeString()}</p>
            </div>
            <div className="mt-2">{renderBody(s)}</div>
          </div>
        </li>
      ))}

      {run.status === "running" && (
        <li className="flex items-center gap-3 text-sm text-slate-400">
          <span className="flex h-9 w-9 items-center justify-center">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/15 border-t-[#7c5cff]" />
          </span>
          Agent is working...
        </li>
      )}

      {msg && (
        <p className="rounded-xl border border-[#ff5c7a]/40 bg-[#ff5c7a]/10 px-3.5 py-2.5 text-sm text-[#ff8da1]">
          {msg}
        </p>
      )}
    </ol>
  );
}