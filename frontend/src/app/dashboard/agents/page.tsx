"use client";

import { useCallback, useEffect, useState } from "react";
import ApiKeyModal from "@/components/ApiKeyModal";
import Badge from "@/components/Badge";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { ui } from "@/lib/ui";
import type { Agent, AgentWithKey } from "@/types";

const DEMO_EMAIL = (process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "").toLowerCase();

export default function AgentsPage() {
  const { user } = useAuth();
  const locked = !!DEMO_EMAIL && user?.email.toLowerCase() === DEMO_EMAIL;

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
    if (locked) return;
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
    if (locked) return;
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
    if (locked) return;
    if (!confirm(`Revoke "${a.name}"? This is permanent.`)) return;
    try {
      await api(`/agents/${a.id}/revoke`, { method: "POST" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const off = "disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div>
      <h1 className={ui.title}>Agents &amp; API keys</h1>
      <p className={ui.lead}>
        Register each AI agent you run. It uses its API key to reach tools through the gateway.
      </p>

      {locked && (
        <div className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-100">
          <p className="font-semibold">🔒 This page is read-only in the demo</p>
          <p className="mt-1 text-amber-200/80">
            The demo account is shared by every visitor, and the demo Sales Agent depends on its API key. If anyone
            created, rotated or revoked an agent here, the demo would stop working for everyone else. You can look
            around freely. To manage your own agents and keys, register your company; it takes under a minute.
          </p>
        </div>
      )}

      <form onSubmit={create} className={`${ui.card} mt-6 grid items-center gap-3 sm:grid-cols-[1fr_2fr_auto]`}>
        <input
          required
          minLength={2}
          disabled={locked}
          placeholder="Agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`${ui.input} ${off}`}
        />
        <input
          disabled={locked}
          placeholder="What does it do?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${ui.input} ${off}`}
        />
        <button disabled={busy || locked} title={locked ? "Turned off in the demo" : ""} className={`${ui.btn} ${off}`}>
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
                      <button
                        onClick={() => rotate(a)}
                        disabled={locked}
                        title={locked ? "Turned off in the demo" : ""}
                        className={`${ui.ghostSm} ${off}`}
                      >
                        Rotate key
                      </button>
                      <button
                        onClick={() => revoke(a)}
                        disabled={locked}
                        title={locked ? "Turned off in the demo" : ""}
                        className={`${ui.dangerSm} ${off}`}
                      >
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