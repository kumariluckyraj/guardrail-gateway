"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import DemoButton from "@/components/DemoButton";

const links = [
  { href: "/#flow", label: "Gateway" },
  { href: "/#outcomes", label: "Decisions" },
  { href: "/#how", label: "How it works" },
  { href: "/#connect", label: "Connect" },
];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    await logout();
    router.push("/");
  }

  return (
    <header className="gg-nav sticky top-0 z-40 border-b border-white/10 bg-[rgba(5,6,13,0.72)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <Link href="/" className="flex items-center gap-2.5 !text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] text-white shadow-[0_0_24px_-2px_rgba(124,92,255,0.9)]">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </span>
          <span className="gg-display text-lg font-bold">Guardrail Gateway</span>
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="gg-nav-link">
              {l.label}
            </Link>
          ))}
          <span className="mx-3 h-5 w-px bg-white/15" aria-hidden />
          {loading ? (
            <div className="h-9 w-48" aria-hidden />
          ) : user ? (
            <>
              <Link href="/dashboard" className="gg-btn gg-btn-sm gg-btn-primary">
                Dashboard
              </Link>
              <button type="button" onClick={handleLogout} className="gg-nav-link">
                Log out
              </button>
            </>
          ) : (
                       <>
              <DemoButton variant="nav" />
              <Link href="/login" className="gg-nav-link ml-2">
                Log in
              </Link>
              <Link href="/register" className="gg-btn gg-btn-sm gg-btn-primary">
                Register your company
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-white/10 px-4 pb-5 pt-3 md:hidden">
          <div className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="gg-nav-link block py-3 text-base">
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-4">
            {loading ? null : user ? (
              <>
                <Link href="/dashboard" onClick={() => setOpen(false)} className="gg-btn gg-btn-primary">
                  Dashboard
                </Link>
                <button type="button" onClick={handleLogout} className="gg-btn gg-btn-ghost">
                  Log out
                </button>
              </>
            ) : (
                            <>
                <DemoButton variant="nav" className="justify-center py-3" />
                <Link href="/register" onClick={() => setOpen(false)} className="gg-btn gg-btn-primary">
                  Register your company
                </Link>
                <Link href="/login" onClick={() => setOpen(false)} className="gg-btn gg-btn-ghost">
                  Log in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}