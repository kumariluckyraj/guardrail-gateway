"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { ui } from "@/lib/ui";
import type { AuditFull } from "@/types";

const decisions = ["", "allowed", "denied", "rate_limited", "pending_approval", "approved_executed", "approved_failed", "rejected", "upstream_error", "error"];

export default function AuditPage() {
  const [decision, setDecision] = useState("");
  const [tool, setTool] = useState("");
  const [items, setItems] = useState<AuditFull[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [open, setOpen] = useState("");
  const [error, setError] = useState("");

  const query = useCallback(
    (before?: string) => {
      const p = new URLSearchParams({ limit: "50" });
      if (decision) p.set("decision", decision);
      if (tool.trim()) p.set("tool", tool.trim());
      if (before) p.set("before", before);
      return api<{ items: AuditFull[]; next_before: string | null }>(`/audit?${p}`);
    },
    [decision, tool]
  );

  useEffect(() => {
    query().then((r) => { setItems(r.items); setNext(r.next_before); }).catch((e) => setError(e.message));
  }, [query]);

  async function more() {
    if (!next) return;
    const r = await query(next);
    setItems((prev) => [...prev, ...r.items]);
    setNext(r.next_before);
  }

  return (
    <div>
      <h1 className={ui.title}>Audit logs</h1>
      <p className={ui.lead}>Every gateway decision, newest first. Logs are read-only.</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className={ui.input}
          aria-label="Filter by decision"
        >
          {decisions.map((d) => (
            <option key={d} value={d}>
              {d ? d.replace(/_/g, " ") : "All decisions"}
            </option>
          ))}
        </select>
        <input
          placeholder="Tool name"
          value={tool}
          onChange={(e) => setTool(e.target.value)}
          className={`${ui.input} gg-mono sm:w-56`}
          aria-label="Filter by tool name"
        />
      </div>
      {error && <p className={ui.error}>{error}</p>}

      <div className={`${ui.tableWrap} mt-5`}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Time</th>
              <th className={ui.th}>Agent</th>
              <th className={ui.th}>Tool</th>
              <th className={ui.th}>Decision</th>
              <th className={ui.th}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <Fragment key={x.id}>
                <tr
                  onClick={() => setOpen(open === x.id ? "" : x.id)}
                  className={`${ui.row} cursor-pointer ${open === x.id ? "bg-white/[0.04]" : ""}`}
                >
                  <td className={`${ui.td} whitespace-nowrap text-slate-400`}>
                    {new Date(x.created_at + "Z").toLocaleString()}
                  </td>
                  <td className={`${ui.td} text-white`}>{x.agent_name}</td>
                  <td className={`${ui.td} gg-mono text-slate-200`}>{x.tool_name}</td>
                  <td className={ui.td}>
                    <Badge value={x.decision} />
                  </td>
                  <td className={`${ui.td} text-slate-300`}>{x.reason}</td>
                </tr>
                {open === x.id && (
                  <tr className="bg-white/[0.03]">
                    <td colSpan={5} className="px-4 py-4">
                      <p className="text-xs text-slate-400">
                        latency {x.latency_ms ?? "-"} ms{x.deny_cause ? ` · cause: ${x.deny_cause}` : ""}
                        {x.decided_by ? ` · decided by ${x.decided_by}` : ""}
                      </p>
                      <pre className={`${ui.code} mt-2`}>{JSON.stringify(x.arguments ?? {}, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className={ui.empty}>
                  No entries match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {next && (
        <button onClick={more} className={`${ui.ghost} mt-5`}>
          Load more
        </button>
      )}
    </div>
  );
}