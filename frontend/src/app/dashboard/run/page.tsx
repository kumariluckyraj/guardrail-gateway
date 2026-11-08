"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Badge from "@/components/Badge";
import RunTimeline from "@/components/RunTimeline";
import { ui } from "@/lib/ui";
import type { Run, RunSummary } from "@/types";

const AGENT = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8001";

const examples = [
  "Look up Rahul Sharma and send him a short follow-up email about our meeting",
  "Create a quote of 50000 for Rahul Sharma for a website redesign",
  "Create a quote of 150000 for Priya Mehta for an annual contract",
  "Change Rahul Sharma's email to rahul@newco.com",
  "Send 7 separate emails to rahul@example.com, subjects Test 1 to Test 7",
];

export default function RunPage() {
  const [task, setTask] = useState(examples[0]);
  const [run, setRun] = useState<Run | null>(null);
  const [recent, setRecent] = useState<RunSummary[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  const loadRecent = useCallback(() => {
    fetch(`${AGENT}/runs`)
      .then((r) => r.json())
      .then(setRecent)
      .catch(() => {});
  }, []);

  const follow = useCallback(
    (id: string) => {
      stop();
      const tick = async () => {
        try {
          const r: Run = await (await fetch(`${AGENT}/runs/${id}`)).json();
          setRun(r);
          if (r.status === "completed" || r.status === "failed") {
            stop();
            loadRecent();
          }
        } catch {
          stop();
          setError("Lost connection to the sales agent (port 8001).");
        }
      };
      tick();
      timer.current = setInterval(tick, 2000);
    },
    [loadRecent]
  );

  useEffect(() => {
    loadRecent();
    return stop;
  }, [loadRecent]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    setRun(null);
    try {
      const res = await fetch(`${AGENT}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not start the run");
      }
      follow(data.run_id);
    } catch (err: any) {
      setError(
        err.message === "Failed to fetch"
          ? "Cannot reach the sales agent. Is it running on port 8001?"
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  const active = run && (run.status === "queued" || run.status === "running");

  return (
    <div>
      <h1 className={ui.title}>Run Sales Agent</h1>
      <p className={ui.lead}>
        Give the agent a task and watch every step. Each tool call goes through the gateway, which allows,
        limits, blocks or holds it for approval.
      </p>

      <form onSubmit={start} className={`${ui.card} mt-6`}>
                <label className={`${ui.label} block w-full`}>
          Task
          <textarea
            required
            minLength={3}
            maxLength={1000}
            rows={3}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className={`${ui.input} w-full`}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {examples.map((x) => (
            <button
              type="button"
              key={x}
              onClick={() => setTask(x)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                task === x
                  ? "border-[#8aa2ff]/80 bg-[#7c5cff]/25 text-white shadow-[0_0_20px_-6px_rgba(124,92,255,0.9)]"
                  : "border-white/15 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {x.length > 42 ? x.slice(0, 42) + "…" : x}
            </button>
          ))}
        </div>
        <button disabled={busy || !!active} className={`${ui.btn} mt-5`}>
          {active ? "Running..." : busy ? "Starting..." : "Run agent"}
        </button>
        {error && <p className={ui.error}>{error}</p>}
      </form>

      {run && (
        <div className="mt-8">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <h2 className="gg-display text-xl font-semibold text-white">Workflow</h2>
            <Badge value={run.status} />
            <span className="gg-mono text-xs text-slate-500">run {run.id}</span>
          </div>
          <RunTimeline run={run} />
          {run.status === "failed" && run.error && (
            <p className="mt-4 rounded-xl border border-[#ff5c7a]/40 bg-[#ff5c7a]/10 p-3.5 text-sm text-[#ff8da1]">
              {run.error}
            </p>
          )}
        </div>
      )}

      <h2 className="gg-display mt-12 text-xl font-semibold text-white">Recent runs</h2>
      <div className={`${ui.tableWrap} mt-4`}>
        <table className={ui.table}>
          <tbody>
            {recent.slice(0, 10).map((r) => (
              <tr
                key={r.id}
                onClick={() => {
                  setRun(null);
                  follow(r.id);
                }}
                className={`${ui.row} cursor-pointer first:border-t-0`}
              >
                <td className={`${ui.td} whitespace-nowrap text-slate-400`}>
                  {new Date(r.created_at).toLocaleTimeString()}
                </td>
                <td className={`${ui.td} text-slate-200`}>{r.task}</td>
                <td className={ui.td}>
                  <Badge value={r.status} />
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td className={ui.empty}>No runs yet. Pick an example above and run the agent.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}