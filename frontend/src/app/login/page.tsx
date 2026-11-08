"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DemoButton from "@/components/DemoButton";
const legend = [
  ["allowed", "Allowed"],
  ["limited", "Rate limited"],
  ["approval", "Needs approval"],
  ["denied", "Denied"],
];

const input =
  "mt-1.5 w-full rounded-xl border border-white/15 bg-[#0b0f20] px-3.5 py-2.5 text-white placeholder:text-slate-500 outline-none transition focus:border-[#8aa2ff] focus:shadow-[0_0_0_3px_rgba(124,92,255,0.25)]";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="gg-root min-h-[calc(100vh-4rem)]">
      <div className="gg-aurora" />
      <div className="gg-grid" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div>
          <h1 className="gg-display gg-title text-4xl font-extrabold leading-tight sm:text-5xl">Welcome back</h1>
          <p className="mt-4 max-w-sm text-lg text-slate-400">
            See what your agents asked for and what the gateway decided.
          </p>
          <ul className="mt-8 space-y-3">
            {legend.map(([key, label]) => (
              <li key={key} className={`gg-v-${key} flex items-center gap-3 text-slate-300`}>
                <span className="gg-dot" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="gg-panel gg-edge p-7 shadow-[0_0_90px_-25px_rgba(124,92,255,0.7)] sm:p-8">
          <h2 className="gg-display text-2xl font-bold">Log in</h2>
          <form onSubmit={submit} className="mt-6 space-y-5">
            <label className="block text-sm font-medium text-slate-300">
              Email
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={input}
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Password
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
              />
            </label>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-[#ff5c7a]/40 bg-[#ff5c7a]/10 px-3.5 py-2.5 text-sm text-[#ff8da1]"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="gg-btn gg-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Logging in..." : "Log in"}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-400">
            No account?{" "}
            <Link href="/register" className="font-medium text-[#9db0ff] hover:underline">
              Register your company
            </Link>
          </p>
                    <div className="mt-6 border-t border-white/10 pt-6 text-center">
            <p className="mb-3 text-sm text-slate-400">Just want to look around?</p>
            <DemoButton />
          </div>
        </div>
      </div>
    </main>
  );
}