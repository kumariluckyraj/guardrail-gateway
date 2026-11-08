"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Variant = "default" | "hero" | "floating" | "nav";

export default function DemoButton({
  variant = "default",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { demoLogin } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true);
    setError("");
    try {
      await demoLogin();
      router.push("/dashboard/run");
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (variant === "default") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="gg-btn gg-btn-ghost w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Opening demo..." : "▶ Try the live demo"}
        </button>
        {error && <p className="mt-2 text-sm text-[#ff8da1]">{error}</p>}
      </div>
    );
  }

  if (variant === "nav") {
    return (
      <button type="button" onClick={go} disabled={busy} className={`demo-nav ${className}`}>
        <span aria-hidden>▶</span>
        {busy ? "Opening..." : "Try demo"}
      </button>
    );
  }

  const wrapper = variant === "floating" ? "demo-float" : "";

  return (
    <div className={`${wrapper} ${className}`}>
      <button type="button" onClick={go} disabled={busy} className="demo-cta">
        <span className="demo-play">▶</span>
        {busy ? "Opening demo..." : variant === "floating" ? "Try the demo" : "Try the live demo"}
      </button>
      {error && (
        <p className="mt-3 max-w-xs rounded-lg bg-[#ff5c7a]/10 px-3 py-2 text-sm text-[#ff8da1]">{error}</p>
      )}
    </div>
  );
}