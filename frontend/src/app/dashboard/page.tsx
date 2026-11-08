import Link from "next/link";
import GatewayDemo from "@/components/GatewayDemo";
import GuestOnly from "@/components/GuestOnly";
import DemoButton from "@/components/DemoButton";
const steps = [
  ["Register", "Create a company account and register your AI agent."],
  ["Get an API key", "Shown once. Paste it into your agent as its gateway key."],
  ["Set the rules", "Choose which tools it may use, its rate limits, and what needs human approval."],
  ["Watch it work", "Every call is allowed, limited, blocked or held for approval, and logged."],
];

const outcomes = [
  { key: "allowed", label: "Allowed", text: "Safe actions run straight away.", example: "lookup_customer" },
  {
    key: "limited",
    label: "Rate limited",
    text: "Too many calls are slowed down.",
    example: "send_email, 12th call this minute",
  },
  {
    key: "approval",
    label: "Needs approval",
    text: "Risky actions wait for a human.",
    example: "send_email to an outside address",
  },
  { key: "denied", label: "Denied", text: "Anything not permitted is blocked.", example: "delete_all_customers" },
];

export default function Home() {
  return (
    <main className="gg-root">
      {/* HERO */}
      <section className="relative">
        <div className="gg-aurora" />
        <div className="gg-grid" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-4 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:gap-16 lg:pb-28 lg:pt-6">
          <div>
            <h1 className="gg-display gg-title text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.5rem]">
              A security guard between your AI agents and your tools.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Agents never touch your CRM, email or billing directly. They ask the gateway, which enforces permissions
              and rate limits, asks a human before risky actions, and keeps a full audit log.
            </p>
            <GuestOnly>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/register" className="gg-btn gg-btn-primary">
                  Get started
                </Link>
                <Link href="/login" className="gg-btn gg-btn-ghost">
                  Log in
                </Link>
                  <DemoButton />
              </div>
            </GuestOnly>
          </div>

          <GatewayDemo />
        </div>
      </section>

      {/* DECISIONS */}
      <section id="outcomes" className="scroll-mt-20 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="gg-display max-w-xl text-3xl font-bold sm:text-4xl">Every tool call gets a decision</h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {outcomes.map((o) => (
              <div key={o.key} className={`gg-v-${o.key} gg-card-v card-hover p-7`}>
                <p className="gg-display flex items-center gap-3 text-2xl font-semibold text-white">
                  <span className="gg-dot" aria-hidden />
                  {o.label}
                </p>
                <p className="mt-3 text-slate-300">{o.text}</p>
                <p className="gg-mono mt-6 text-sm" style={{ color: "var(--v)" }}>
                  {o.example}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="scroll-mt-20 border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20 lg:py-28">
          <div>
            <h2 className="gg-display text-3xl font-bold sm:text-4xl">How it works</h2>
            <p className="mt-4 max-w-sm text-slate-400">
              You connect the agent once. After that, the gateway handles every call it makes.
            </p>
          </div>
          <ol className="gg-steps">
            {steps.map(([title, text], i) => (
              <li key={title}>
                <span className="gg-step-num" aria-hidden>
                  {i + 1}
                </span>
                <h3 className="gg-display text-xl font-semibold text-white">{title}</h3>
                <p className="mt-1 max-w-md text-slate-400">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <GuestOnly>
        <section className="px-4 pb-24 sm:px-6">
          <div className="gg-panel gg-edge relative mx-auto max-w-6xl overflow-hidden px-8 py-16 text-center">
            <div className="gg-aurora" />
            <div className="relative">
              <h2 className="gg-display mx-auto max-w-xl text-3xl font-bold sm:text-4xl">
                Put a guard on your agents today.
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/register" className="gg-btn gg-btn-primary">
                  Register your company
                </Link>
                <Link href="/login" className="gg-btn gg-btn-ghost">
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </GuestOnly>
    </main>
  );
}