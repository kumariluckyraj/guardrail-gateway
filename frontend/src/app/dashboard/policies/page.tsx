"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { ui } from "@/lib/ui";
import type { Agent, Policy, Tool } from "@/types";

export default function PoliciesPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [agentId, setAgentId] = useState("");
  const [toolId, setToolId] = useState("");
  const [allowed, setAllowed] = useState(true);
  const [maxCalls, setMaxCalls] = useState(60);
  const [windowSec, setWindowSec] = useState(60);
  const [mode, setMode] = useState("never");
  const [field, setField] = useState("amount");
  const [operator, setOperator] = useState("gt");
  const [value, setValue] = useState("100000");
  const [error, setError] = useState("");

  const loadPolicies = useCallback(() => {
    api<Policy[]>("/policies").then(setPolicies).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    Promise.all([api<Agent[]>("/agents"), api<Tool[]>("/tools")])
      .then(([a, t]) => {
        const active = a.filter((x) => x.status === "active");
        setAgents(active);
        setTools(t);
        if (active[0]) setAgentId(active[0].id);
        if (t[0]) setToolId(t[0].id);
      })
      .catch((e) => setError(e.message));
    loadPolicies();
  }, [loadPolicies]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const num = Number(value);
    try {
      await api("/policies", {
        method: "PUT",
        json: {
          agent_id: agentId,
          tool_id: toolId,
          allowed,
          rate_limit: { max_calls: maxCalls, window_seconds: windowSec },
          approval:
            mode === "conditional"
              ? { mode, field, operator, value: value !== "" && !Number.isNaN(num) ? num : value }
              : { mode },
        },
      });
      loadPolicies();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(p: Policy) {
    if (!confirm(`Remove the policy for ${p.tool_name}? The agent will be denied that tool.`)) return;
    try {
      await api(`/policies/${p.id}`, { method: "DELETE" });
      loadPolicies();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const agentName = (id: string) => agents.find((a) => a.id === id)?.name ?? id.slice(-6);
  const describe = (a: Policy["approval"]) =>
    a.mode === "never"
      ? "No approval"
      : a.mode === "always"
      ? "Always ask a human"
      : `Ask a human if ${a.field} ${a.operator} ${a.value}`;

  return (
    <div>
      <h1 className={ui.title}>Policies</h1>
      <p className={ui.lead}>
        A policy links one agent to one tool. With no policy, the gateway denies the call.
      </p>

      <form onSubmit={save} className={`${ui.card} mt-6 grid items-start gap-4 sm:grid-cols-2`}>
        <label className={ui.label}>
          Agent
          <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={ui.input}>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.key_prefix}…)
              </option>
            ))}
          </select>
        </label>
        <label className={ui.label}>
          Tool
          <select value={toolId} onChange={(e) => setToolId(e.target.value)} className={ui.input}>
            {tools.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.risk_level})
              </option>
            ))}
          </select>
        </label>
        <label className={ui.label}>
          Max calls
          <input
            type="number"
            min={1}
            value={maxCalls}
            onChange={(e) => setMaxCalls(Number(e.target.value))}
            className={ui.input}
          />
        </label>
        <label className={ui.label}>
          Per (seconds)
          <input
            type="number"
            min={1}
            value={windowSec}
            onChange={(e) => setWindowSec(Number(e.target.value))}
            className={ui.input}
          />
        </label>
        <label className={ui.label}>
          Human approval
          <select value={mode} onChange={(e) => setMode(e.target.value)} className={ui.input}>
            <option value="never">Never</option>
            <option value="always">Always</option>
            <option value="conditional">Only when a value is too high or low</option>
          </select>
        </label>
        <label className="flex items-center gap-2.5 pt-7 text-sm font-medium text-slate-300">
          <input type="checkbox" checked={allowed} onChange={(e) => setAllowed(e.target.checked)} className="h-4 w-4" />
          Agent is allowed to use this tool
        </label>

        {mode === "conditional" && (
          <div className="grid gap-4 sm:col-span-2 sm:grid-cols-3">
            <label className={ui.label}>
              Argument name
              <input value={field} onChange={(e) => setField(e.target.value)} className={ui.input} />
            </label>
            <label className={ui.label}>
              Condition
              <select value={operator} onChange={(e) => setOperator(e.target.value)} className={ui.input}>
                <option value="gt">greater than</option>
                <option value="gte">at least</option>
                <option value="lt">less than</option>
                <option value="lte">at most</option>
                <option value="eq">equals</option>
                <option value="neq">not equal to</option>
              </select>
            </label>
            <label className={ui.label}>
              Value
              <input value={value} onChange={(e) => setValue(e.target.value)} className={ui.input} />
            </label>
          </div>
        )}

        <button disabled={!agentId || !toolId} className={`${ui.btn} sm:col-span-2`}>
          Save policy
        </button>
      </form>
      {error && <p className={ui.error}>{error}</p>}

      <div className={`${ui.tableWrap} mt-6`}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Agent</th>
              <th className={ui.th}>Tool</th>
              <th className={ui.th}>Access</th>
              <th className={ui.th}>Rate limit</th>
              <th className={ui.th}>Approval</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id} className={ui.row}>
                <td className={`${ui.td} text-white`}>{agentName(p.agent_id)}</td>
                <td className={`${ui.td} gg-mono text-slate-200`}>{p.tool_name}</td>
                <td className={ui.td}>
                  <Badge value={p.allowed ? "allowed" : "denied"} />
                </td>
                <td className={`${ui.td} text-slate-300`}>
                  {p.rate_limit.max_calls} / {p.rate_limit.window_seconds}s
                </td>
                <td className={`${ui.td} text-slate-300`}>{describe(p.approval)}</td>
                <td className={`${ui.td} text-right`}>
                  <button onClick={() => remove(p)} className={ui.dangerSm}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {policies.length === 0 && (
              <tr>
                <td colSpan={6} className={ui.empty}>
                  No policies yet. Pick an agent and a tool above, then save.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}