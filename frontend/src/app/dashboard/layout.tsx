"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const links = [
  ["/dashboard", "Overview", "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"],
  [
    "/dashboard/agents",
    "Agents & API keys",
    "M21 2l-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
  ],
  [
    "/dashboard/tools",
    "Tools",
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  ],
  ["/dashboard/policies", "Policies", "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3zM9 12l2 2 4-4"],
  ["/dashboard/approvals", "Approvals", "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3"],
  [
    "/dashboard/audit",
    "Audit logs",
    "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  ],
    ["/dashboard/suggestions", "Suggestions", "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"],
  ["/dashboard/run", "Run Sales Agent", "M5 3l14 9-14 9V3z"],
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-[#7c5cff] shadow-[0_0_30px_-4px_rgba(124,92,255,0.8)]" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">
      <aside className="shrink-0 lg:w-64">
        <div className="gg-panel gg-edge p-3 lg:sticky lg:top-24">
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] font-bold text-white shadow-[0_0_22px_-4px_rgba(124,92,255,0.9)]">
              {user.company_name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{user.company_name}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
          </div>

          <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
            {links.map(([href, label, icon]) => {
              const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-gradient-to-r from-[#7c5cff]/90 to-[#4f7bff]/80 font-semibold !text-white shadow-[0_8px_26px_-10px_rgba(124,92,255,0.9)]"
                        : "!text-slate-300 hover:bg-white/[0.07] hover:!text-white"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d={icon} />
                    </svg>
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      <section className="gg-dash-content min-w-0 flex-1">{children}</section>
    </div>
  );
}