"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Verdict = "allowed" | "limited" | "approval" | "denied";

type Action = {
  chip: string;
  tool: string;
  args: string;
  verdict: Verdict;
  label: string;
  reason: string;
  next: string;
  ms: number;
};

type LogRow = { id: number; tool: string; label: string; verdict: Verdict; ms: number };

const ACTIONS: Action[] = [
  {
    chip: "lookup_customer",
    tool: "lookup_customer",
    args: '{ id: "cus_2841" }',
    verdict: "allowed",
    label: "Allowed",
    reason: "Read-only action. It matches your rule for customer lookups.",
    next: "The call runs and the agent gets the result.",
    ms: 38,
  },
  {
    chip: "send_email",
    tool: "send_email",
    args: '{ to: "client@acme.com" }',
    verdict: "approval",
    label: "Needs approval",
    reason: "It sends a message outside your company, so a person should look first.",
    next: "The agent waits while your team approves or rejects it.",
    ms: 52,
  },
  {
    chip: "create_quote",
    tool: "create_quote",
    args: '{ customer: "cus_2841", total: 1200 }',
    verdict: "allowed",
    label: "Allowed",
    reason: "The total is under your quote limit.",
    next: "The call runs and the agent gets the result.",
    ms: 41,
  },
  {
    chip: "send_email ×12",
    tool: "send_email",
    args: '{ to: "client@acme.com" }',
    verdict: "limited",
    label: "Rate limited",
    reason: "This is the 12th email in one minute. The limit is 10.",
    next: "The call is slowed down. The agent can try again shortly.",
    ms: 29,
  },
  {
    chip: "delete_all_customers",
    tool: "delete_all_customers",
    args: "{}",
    verdict: "denied",
    label: "Denied",
    reason: "Deleting every customer is blocked. No rule can allow it.",
    next: "The call never reaches your tools. The agent is told no.",
    ms: 17,
  },
];

export default function GatewayDemo() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"checking" | "done">("checking");
  const [log, setLog] = useState<LogRow[]>([]);
  const [manual, setManual] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const indexRef = useRef(0);
  const seq = useRef(0);

  const run = useCallback((i: number) => {
    clearTimeout(timer.current);
    indexRef.current = i;
    setIndex(i);
    setPhase("checking");
    timer.current = setTimeout(() => {
      const a = ACTIONS[i];
      setPhase("done");
      setLog((prev) =>
        [{ id: ++seq.current, tool: a.tool, label: a.label, verdict: a.verdict, ms: a.ms }, ...prev].slice(0, 5)
      );
    }, 700);
  }, []);

  useEffect(() => {
    run(0);
    return () => clearTimeout(timer.current);
  }, [run]);

  useEffect(() => {
    if (manual) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => run((indexRef.current + 1) % ACTIONS.length), 4200);
    return () => clearInterval(id);
  }, [manual, run]);

  const a = ACTIONS[index];

  return (
    <div className="gg-panel gg-edge overflow-hidden text-slate-200 shadow-[0_0_90px_-25px_rgba(124,92,255,0.7)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-sm">
        <span className="font-semibold text-white">Try the gateway</span>
        <span className="flex items-center gap-2 text-xs text-slate-400">
          <span className="live-dot h-2 w-2 rounded-full bg-[#34e0a1] shadow-[0_0_10px_#34e0a1]" aria-hidden />
          support-bot is connected
        </span>
      </div>

      <div className="px-5 pt-5">
        <p id="gg-pick" className="text-xs text-slate-400">
          Pick an action your agent might try
        </p>
        <div role="group" aria-labelledby="gg-pick" className="mt-3 flex flex-wrap gap-2">
          {ACTIONS.map((x, i) => (
            <button
              key={x.chip}
              type="button"
              aria-pressed={i === index}
              onClick={() => {
                setManual(true);
                run(i);
              }}
              className="gg-chip gg-mono"
            >
              {x.chip}
            </button>
          ))}
        </div>
      </div>

      <div className="gg-mono mt-5 space-y-1.5 px-5 text-[13px] leading-relaxed">
        <p>
          <span className="text-slate-500">support-bot </span>
          <span className="text-slate-400">calls </span>
          <span className="text-white">{a.tool}</span>
          <span className="text-slate-400">({a.args})</span>
        </p>
        <p className="text-slate-400">
          <span className="text-slate-500">gateway     </span>
          {phase === "checking" ? (
            <>
              checking rules
              <span className="gg-caret" aria-hidden />
            </>
          ) : (
            <>decided in {a.ms} ms</>
          )}
        </p>
      </div>

      <div
        aria-live="polite"
        className={`gg-v-${a.verdict} ${
          phase === "done" ? "gg-verdict" : "border border-white/10 bg-white/[0.03]"
        } mx-5 mt-5 min-h-[9.5rem] rounded-xl p-4 transition-colors`}
      >
        {phase === "done" ? (
          <div>
            <span className="gg-stamp gg-display text-lg">{a.label}</span>
            <p className="mt-3 text-sm text-slate-100">{a.reason}</p>
            <p className="mt-1.5 text-sm text-slate-400">{a.next}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Waiting for a decision</p>
        )}
      </div>

      <div className="mt-5 border-t border-white/10 px-5 py-4">
        <p className="text-xs text-slate-400">Audit log</p>
        <div className="min-h-[9.5rem]">
          {log.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No calls yet.</p>
          ) : (
            <ol className="mt-2 divide-y divide-white/5">
              {log.map((r) => (
                <li key={r.id} className={`gg-v-${r.verdict} flex items-center justify-between py-1.5 text-[13px]`}>
                  <span className="gg-mono text-slate-200">{r.tool}</span>
                  <span className="flex items-center gap-3">
                    <span style={{ color: "var(--v)" }}>{r.label}</span>
                    <span className="gg-mono w-14 text-right text-slate-500">{r.ms} ms</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}