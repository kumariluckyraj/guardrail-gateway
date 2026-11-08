import Link from "next/link";

const product = [
  { href: "/#flow", label: "Gateway" },
  { href: "/#outcomes", label: "Decisions" },
  { href: "/#how", label: "How it works" },
  { href: "/#connect", label: "Connect your agent" },
];

const account = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register your company" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/run", label: "Live demo" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#05060d]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5 !text-white">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] text-white shadow-[0_0_24px_-2px_rgba(124,92,255,0.9)]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </span>
              <span className="gg-display text-lg font-bold">Guardrail Gateway</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              A security guard between your AI agents and your tools. It allows, limits, blocks or asks a
              person, and logs every decision.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 text-xs text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              All systems running
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Product</h3>
            <ul className="mt-4 space-y-3">
              {product.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-400 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Account</h3>
            <ul className="mt-4 space-y-3">
              {account.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-400 transition hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© 2026 Guardrail Gateway. All rights reserved.</p>
          <p>Built with Next.js, FastAPI, MongoDB, Redis and LangGraph.</p>
        </div>
      </div>
    </footer>
  );
}