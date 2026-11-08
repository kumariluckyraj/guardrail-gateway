"use client";

import { useState } from "react";

export default function ApiKeyModal({
  apiKey,
  agentName,
  onClose,
}: {
  apiKey: string;
  agentName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const gateway = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const example = `curl -X POST ${gateway}/v1/tool-call \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"send_email","arguments":{"to":"a@b.com","subject":"Hi","body":"Hello"}}'`;

  async function copy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">API key for “{agentName}”</h2>
        <p className="mt-1 text-sm text-amber-700">
          Copy it now. For security it is shown only once and cannot be retrieved later.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 break-all rounded bg-slate-100 px-3 py-2 text-sm">{apiKey}</code>
          <button onClick={copy} className="rounded border px-3 py-2 text-sm hover:bg-slate-100">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <p className="mt-4 text-sm font-medium">Use it in your agent</p>
        <pre className="mt-1 overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{example}</pre>

        <div className="mt-5 text-right">
          <button onClick={onClose} className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
            I have saved it
          </button>
        </div>
      </div>
    </div>
  );
}