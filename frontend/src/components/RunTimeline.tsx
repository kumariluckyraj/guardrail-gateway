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
          <p className="font-mono text-sm font-semibold">{s.tool}</p>
          <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-100">
            {JSON.stringify(s.arguments, null, 2)}
          </pre>
        </>
      );
    }

    if (s.type === "tool_result") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm">{s.tool}</span>
          <Badge value={s.decision ?? "unknown"} />
          {s.detail && <span className="text-xs text-slate-500">{s.detail}</span>}
        </div>
      );
    }

    if (s.type === "waiting_approval") {
      const showButtons =
        s.approval_id && !resolved.has(s.approval_id) && run.status === "running";
      return (
        <div>
          <p className="text-sm">
            <span className="font-mono font-semibold">{s.tool}</span> needs approval
            {s.detail ? `: ${s.detail}` : ""}
          </p>
          {showButtons && (
            <div className="mt-2 flex gap-2">
              <button
                disabled={busy === s.approval_id}
                onClick={() => approve(s.approval_id as string)}
                className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                disabled={busy === s.approval_id}
                onClick={() => reject(s.approval_id as string)}
                className="rounded border border-rose-300 px-3 py-1 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      );
    }

    return <p className="whitespace-pre-wrap text-sm text-slate-700">{s.text}</p>;
  }

  return (
    <ol className="space-y-3">
      <li className="flex gap-3">
        <span className="text-xl">👤</span>
        <div className="flex-1 rounded-lg border bg-white p-3">
          <p className="text-xs font-semibold uppercase text-slate-400">Task</p>
          <p className="text-sm">{run.task}</p>
        </div>
      </li>

      {run.steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-xl">{stepIcon[s.type]}</span>
          <div className="flex-1 rounded-lg border bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-slate-400">
                {stepTitle[s.type]}
              </p>
              <p className="text-xs text-slate-400">
                {new Date(s.t).toLocaleTimeString()}
              </p>
            </div>
            <div className="mt-1">{renderBody(s)}</div>
          </div>
        </li>
      ))}

      {run.status === "running" && (
        <li className="flex gap-3 text-sm text-slate-500">
          <span className="text-xl">⏳</span>
          <span className="pt-1">Agent is working...</span>
        </li>
      )}

      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </ol>
  );
}