import Link from "next/link";
import GatewayDemo from "@/components/GatewayDemo";
import GuestOnly from "@/components/GuestOnly";
import DemoButton from "@/components/DemoButton";
//
const outcomes = [
  { key: "allowed", label: "Allowed", text: "Safe actions run straight away.", example: "lookup_customer" },
  {
    key: "limited",
    label: "Rate limited",
    text: "Too many calls in a short time get slowed down.",
    example: "send_email, 12th call this minute",
  },
  {
    key: "approval",
    label: "Needs approval",
    text: "Risky actions wait until a person says yes.",
    example: "send_email to an outside address",
  },
  {
    key: "denied",
    label: "Denied",
    text: "Dangerous actions are blocked. The agent is told no.",
    example: "delete_all_customers",
  },
];

const steps = [
  ["Register", "Create a company account and register your AI agent."],
  ["Get an API key", "It is shown once. Paste it into your agent with the gateway URL."],
  ["AI sets the rules", "New actions are rated by AI: allow, limit, ask a human, or deny."],
  ["Watch it work", "Every call is decided in milliseconds and saved in the audit log."],
];

const demoSteps = [
  ["1", "Click the button", "You enter a ready-made company. No sign-up, no password."],
  ["2", "Give the Sales Agent a task", "Like “send a follow-up email to Rahul” or “create a quote of 150000”."],
  ["3", "Watch the gateway decide", "See each call allowed, limited, denied, or waiting for you to approve."],
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
            <GuestOnly>
              <span className="demo-tag mb-6">
                <span className="live-dot h-2 w-2 rounded-full bg-emerald-400" />
                Live demo · no sign-up
              </span>
            </GuestOnly>
            <h1 className="gg-display gg-title text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.5rem]">
              Your AI agents ask before they act.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Agents never touch your CRM, email or billing directly. They ask the gateway first. It allows the call,
              slows it down, sends it to a person, or blocks it, and writes every decision in a log.
            </p>

            <GuestOnly>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
                <DemoButton variant="hero" />
                <Link href="/register" className="gg-btn gg-btn-ghost">
                  Register your company
                </Link>
              </div>
              <p className="mt-5 text-sm text-slate-400">
                One click opens a working dashboard with a real AI sales agent.
              </p>
            </GuestOnly>

            <p className="mt-4 text-sm text-slate-500">Checks take under a second. Every call is logged.</p>
          </div>

          <GatewayDemo />
        </div>
      </section>

      {/* TRY IT NOW */}
      <GuestOnly>
        <section id="demo" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
          <div className="demo-band mx-auto max-w-6xl">
            <div className="demo-band-inner text-center">
              <span className="demo-tag">Try it yourself</span>
              <h2 className="gg-display mx-auto mt-5 max-w-2xl text-3xl font-extrabold text-white sm:text-5xl">
                See the guard work in <span className="gg-title">one click</span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-slate-400">
                The fastest way to understand the gateway is to use it. Run a real AI agent and watch every decision.
              </p>

              <div className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-3">
                {demoSteps.map(([n, title, text]) => (
                  <div key={n} className="gg-panel p-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7c5cff] to-[#22d3ee] text-sm font-bold text-white">
                      {n}
                    </span>
                    <h3 className="mt-3 font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 flex justify-center">
                <DemoButton variant="hero" />
              </div>
              <p className="mt-4 text-xs text-slate-500">Shared demo account. Please don't enter private data.</p>
            </div>
          </div>
        </section>
      </GuestOnly>

      {/* FLOW */}
      <section id="flow" className="scroll-mt-20 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="gg-display max-w-2xl text-3xl font-bold sm:text-4xl">
            Nothing reaches your tools unless the gateway says so
          </h2>

          <div className="mt-14 grid items-center gap-6 md:grid-cols-[1fr_auto_auto_auto_1fr] md:gap-0">
            <div className="gg-panel p-6">
              <p className="font-semibold text-white">Your AI agent</p>
              <p className="mt-1 text-sm text-slate-400">Wants to send an email, create a quote or delete a record.</p>
            </div>

            <div className="gg-line mx-auto hidden w-14 md:block lg:w-24" aria-hidden />
            <div className="gg-line-v mx-auto md:hidden" aria-hidden />

            <div className="flex flex-col items-center gap-4 text-center">
              <div className="gg-core">
                <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <p className="gg-display font-semibold text-white">Guardrail Gateway</p>
            </div>

            <div className="gg-line mx-auto hidden w-14 md:block lg:w-24" aria-hidden />
            <div className="gg-line-v mx-auto md:hidden" aria-hidden />

            <div className="gg-panel p-6">
              <p className="font-semibold text-white">Your tools</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {["CRM", "Email", "Billing"].map((t) => (
                  <span key={t} className="rounded-lg border border-white/12 bg-white/5 px-3 py-1 text-sm text-slate-200">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DECISIONS */}
      <section id="outcomes" className="scroll-mt-20 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="gg-display max-w-xl text-3xl font-bold sm:text-4xl">Every call gets one of four decisions</h2>
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
            <h2 className="gg-display text-3xl font-bold sm:text-4xl">Set up in four steps</h2>
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

      {/* CODE */}
      <section id="connect" className="scroll-mt-20 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <h2 className="gg-display max-w-xl text-3xl font-bold sm:text-4xl">Wrap the risky action</h2>
          <p className="mt-4 max-w-xl text-slate-400">
            Add your API key and gateway URL, then pass the action through{" "}
            <code className="gg-mono text-sm text-[#9db0ff]">guard</code>. The agent&apos;s own logic stays as it is.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-500">Before</p>
              <pre className="gg-mono gg-panel h-[9.5rem] overflow-x-auto rounded-xl p-5 text-sm leading-relaxed text-slate-300">
{`const ticket = await actionAgent(data);`}
              </pre>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-white">After</p>
              <pre className="gg-mono gg-panel gg-edge h-[9.5rem] overflow-x-auto rounded-xl p-5 text-sm leading-relaxed text-slate-200 shadow-[0_0_60px_-20px_rgba(124,92,255,0.7)]">
{`const ticket = await `}<span className="text-[#22d3ee]">guard</span>{`(
  "create_ticket",
  { issue, priority },
  () => actionAgent(data)
);`}
              </pre>
            </div>
          </div>
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
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <DemoButton variant="hero" />
                <Link href="/register" className="gg-btn gg-btn-ghost">
                  Register your company
                </Link>
              </div>
            </div>
          </div>
        </section>
      </GuestOnly>

      {/* FLOATING DEMO BUTTON (always visible for visitors) */}
      <GuestOnly>
        <DemoButton variant="floating" />
      </GuestOnly>
    </main>
  );
}