"use client";

import { useCallback, useEffect, useState } from "react";
import ApiKeyModal from "@/components/ApiKeyModal";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { ui } from "@/lib/ui";
import type { Agent, AgentWithKey } from "@/types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<{ key: string; name: string } | null>(null);

  const load = useCallback(() => {
    api<Agent[]>("/agents").then(setAgents).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const a = await api<AgentWithKey>("/agents", { method: "POST", json: { name, description } });
      setShown({ key: a.api_key, name: a.name });
      setName("");
      setDescription("");
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function rotate(a: Agent) {
    if (!confirm(`Rotate the key for "${a.name}"? The old key stops working immediately.`)) return;
    try {
      const r = await api<AgentWithKey>(`/agents/${a.id}/rotate-key`, { method: "POST" });
      setShown({ key: r.api_key, name: r.name });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function revoke(a: Agent) {
    if (!confirm(`Revoke "${a.name}"? This is permanent.`)) return;
    try {
      await api(`/agents/${a.id}/revoke`, { method: "POST" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className={ui.title}>Agents &amp; API keys</h1>
      <p className={ui.lead}>
        Register each AI agent you run. It uses its API key to reach tools through the gateway.
      </p>

      <form onSubmit={create} className={`${ui.card} mt-6 grid items-center gap-3 sm:grid-cols-[1fr_2fr_auto]`}>
        <input
          required
          minLength={2}
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={ui.input}
        />
        <input
          placeholder="What does it do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={ui.input}
        />
        <button disabled={busy} className={ui.btn}>
          {busy ? "Creating..." : "Create agent"}
        </button>
      </form>
      {error && <p className={ui.error}>{error}</p>}

      <div className={`${ui.tableWrap} mt-6`}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Name</th>
              <th className={ui.th}>Key</th>
              <th className={ui.th}>Status</th>
              <th className={ui.th}>Last used</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className={ui.row}>
                <td className={ui.td}>
                  <p className="font-medium text-white">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.description}</p>
                  <p className="gg-mono text-xs text-slate-500">{a.id}</p>
                </td>
                <td className={`${ui.td} gg-mono text-slate-300`}>{a.key_prefix}…</td>
                <td className={ui.td}>
                  <Badge value={a.status} />
                </td>
                <td className={`${ui.td} text-slate-400`}>
                  {a.last_used_at ? new Date(a.last_used_at + "Z").toLocaleString() : "never"}
                </td>
                <td className={`${ui.td} space-x-2 text-right`}>
                  {a.status === "active" && (
                    <>
                      <button onClick={() => rotate(a)} className={ui.ghostSm}>
                        Rotate key
                      </button>
                      <button onClick={() => revoke(a)} className={ui.dangerSm}>
                        Revoke
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={5} className={ui.empty}>
                  No agents yet. Create your first agent above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {shown && <ApiKeyModal apiKey={shown.key} agentName={shown.name} onClose={() => setShown(null)} />}
    </div>
  );
}