"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/Badge";
import { api } from "@/lib/api";
import { ui } from "@/lib/ui";
import type { Tool } from "@/types";

const empty = {
  name: "",
  description: "",
  upstream_url: "",
  http_method: "POST",
  risk_level: "low",
};

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<Tool[]>("/tools").then(setTools).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/tools", { method: "POST", json: form });
      setForm(empty);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeRisk(t: Tool, risk_level: string) {
    try {
      await api(`/tools/${t.id}`, { method: "PATCH", json: { risk_level } });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function remove(t: Tool) {
    if (!confirm(`Delete "${t.name}"? Its policies are deleted too.`)) return;
    try {
      await api(`/tools/${t.id}`, { method: "DELETE" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1 className={ui.title}>Tools</h1>
      <p className={ui.lead}>
        Tools are the real actions your agents can request. The gateway forwards approved calls to the URL you give.
      </p>

      <form onSubmit={create} className={`${ui.card} mt-6 grid gap-3 sm:grid-cols-2`}>
        <input
          required
          pattern="^[a-z][a-z0-9_]{1,49}$"
          title="lowercase letters, digits and underscores, e.g. send_email"
          placeholder="name (e.g. send_email)"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={`${ui.input} gg-mono`}
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className={ui.input}
        />
        <input
          required
          placeholder="Upstream URL (https://...)"
          value={form.upstream_url}
          onChange={(e) => set("upstream_url", e.target.value)}
          className={`${ui.input} sm:col-span-2`}
        />
        <select value={form.http_method} onChange={(e) => set("http_method", e.target.value)} className={ui.input}>
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <select value={form.risk_level} onChange={(e) => set("risk_level", e.target.value)} className={ui.input}>
          <option value="low">low risk</option>
          <option value="medium">medium risk</option>
          <option value="high">high risk</option>
        </select>
        <button disabled={busy} className={`${ui.btn} sm:col-span-2`}>
          {busy ? "Adding..." : "Add tool"}
        </button>
      </form>
      {error && <p className={ui.error}>{error}</p>}

      <div className={`${ui.tableWrap} mt-6`}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Tool</th>
              <th className={ui.th}>Endpoint</th>
              <th className={ui.th}>Risk</th>
              <th className={ui.th}></th>
            </tr>
          </thead>
          <tbody>
            {tools.map((t) => (
              <tr key={t.id} className={ui.row}>
                <td className={ui.td}>
                  <p className="gg-mono font-medium text-white">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.description}</p>
                </td>
                <td className={`${ui.td} text-xs text-slate-300`}>
                  <span className="gg-mono font-semibold text-[#8aa2ff]">{t.http_method}</span>{" "}
                  <span className="break-all">{t.upstream_url}</span>
                </td>
                <td className={ui.td}>
                  <div className="flex items-center gap-2">
                    <Badge value={t.risk_level} />
                    <select
                      value={t.risk_level}
                      onChange={(e) => changeRisk(t, e.target.value)}
                      className={ui.selectSm}
                      aria-label={`Change risk level for ${t.name}`}
                    >
                      <option>low</option>
                      <option>medium</option>
                      <option>high</option>
                    </select>
                  </div>
                </td>
                <td className={`${ui.td} text-right`}>
                  <button onClick={() => remove(t)} className={ui.dangerSm}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {tools.length === 0 && (
              <tr>
                <td colSpan={4} className={ui.empty}>
                  No tools yet. Add the first action your agents can request.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}