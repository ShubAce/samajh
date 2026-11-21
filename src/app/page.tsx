"use client";

import {
  ArrowRight,
  AudioLines,
  Brain,
  Camera,
  GitBranch,
  GraduationCap,
  Keyboard,
  ListChecks,
  Repeat,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConceptMap } from "@/components/ConceptMap";
import { InkBar } from "@/components/Ink";
import { Logo } from "@/components/Logo";
import { Handwriting, RedPenCircle } from "@/components/RedPen";
import { Button, ButtonLink, Kicker } from "@/components/ui";
import { CONCEPTS } from "@/lib/curriculum/concepts";
import { MISCONCEPTIONS } from "@/lib/curriculum/misconceptions";
import { syntheticClass } from "@/lib/seed/class";
import { buildDemo } from "@/lib/seed/demo";
import { useHydrated, useSamajh } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Landing() {
  const router = useRouter();
  const hydrated = useHydrated();
  const student = useSamajh((s) => s.student);
  const loadDemo = useSamajh((s) => s.loadDemo);
  const openDemo = () => {
    loadDemo();
    router.push("/learn");
  };

  return (
    <div className="min-h-dvh overflow-x-hidden">
      {/* ───────── hero ───────── */}
      <section className="relative">
        <div className="aurora" aria-hidden>
          <span style={{ width: 620, height: 620, left: "-8%", top: "-22%", background: "#5b4cff" }} />
          <span style={{ width: 520, height: 520, right: "-6%", top: "-10%", background: "#1fb6ff", opacity: 0.35, animationDelay: "-6s" }} />
          <span style={{ width: 460, height: 460, left: "38%", top: "35%", background: "#ff4f8b", opacity: 0.18, animationDelay: "-11s" }} />
        </div>
        <div
          className="dot-grid pointer-events-none absolute inset-0 opacity-70"
          style={{ maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, #000 30%, transparent 75%)" }}
          aria-hidden
        />

        <header className="relative z-10 mx-auto flex h-20 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="ml-auto flex items-center gap-2">
            <Link
              href="/teacher"
              aria-label="For teachers"
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-slate transition-colors hover:bg-white/5 hover:text-white"
            >
              <GraduationCap className="size-4" /> <span className="hidden sm:inline">For teachers</span>
            </Link>
            {hydrated && student ? (
              <ButtonLink href="/learn" variant="outline" size="sm" className="rounded-full">
                <span className="sm:hidden">Continue</span>
                <span className="hidden sm:inline">Continue as {student.name}</span>
              </ButtonLink>
            ) : (
              <Button size="sm" variant="outline" className="rounded-full" onClick={openDemo}>
                Live demo
              </Button>
            )}
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid max-w-[1240px] items-center gap-12 px-4 pb-20 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-14">
          <div style={{ animation: "rise 700ms cubic-bezier(.2,.8,.2,1) both" }}>
            <Kicker>Powered by Gemini · built for CBSE Class 10 Physics</Kicker>
            <h1 className="display text-gradient mt-6 text-[46px] font-bold sm:text-[62px] lg:text-[68px]" style={{ textWrap: "balance" }}>
              The tutor that finds out why you got it wrong.
            </h1>
            <p className="mt-6 max-w-[54ch] text-[17.5px] leading-relaxed text-slate">
              Most AI tutors only mark your final answer. Samajh reads how you reasoned (typed, spoken in Hinglish or
              snapped from your notebook), pinpoints the exact step that breaks, and keeps a live map of what you truly
              understand.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/diagnostic" size="lg" className="rounded-full px-6">
                Take the 10-question diagnostic <ArrowRight className="size-4" />
              </ButtonLink>
              <Button size="lg" variant="outline" className="rounded-full px-6" onClick={openDemo}>
                Explore a live demo
              </Button>
            </div>
            <dl className="mt-11 grid max-w-[520px] grid-cols-3 gap-4">
              {[
                [String(CONCEPTS.length), "concepts mapped with prerequisites"],
                [String(MISCONCEPTIONS.length), "misconceptions it can name"],
                ["3", "Gemini agents working together"],
              ].map(([n, l]) => (
                <div key={l} className="border-l border-white/10 pl-4">
                  <dt className="display text-[30px] font-bold leading-none text-white">{n}</dt>
                  <dd className="mt-1.5 text-[12.5px] leading-snug text-slate">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroAnalysis />
        </div>
      </section>

      {/* ───────── constellation preview ───────── */}
      <section className="relative mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[760px] text-center">
          <Kicker>The learner model</Kicker>
          <h2 className="display mt-5 text-[34px] font-bold text-white sm:text-[44px]">Your knowledge, as a constellation</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-slate">
            Every concept in the syllabus and how they depend on each other. Each star brightens as you master it, and
            evidence flows along the lines, so ten questions are enough to light up the whole sky.
          </p>
        </div>
        <ConstellationPreview onOpen={openDemo} />
      </section>

      {/* ───────── how it works ───────── */}
      <section className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <StepCard
            n={1}
            icon={<Target className="size-5" />}
            title="Diagnose in ten questions"
            body="Each question is chosen from your last answer. Miss one and Samajh checks its prerequisites to find the root cause."
          />
          <StepCard
            n={2}
            icon={<Brain className="size-5" />}
            title="Find the why"
            body="Every wrong option is a designed trap for a known misconception. Explain your thinking and Gemini pinpoints the faulty step, even when the answer was right."
          />
          <StepCard
            n={3}
            icon={<Repeat className="size-5" />}
            title="Fix it, then keep it"
            body="Targeted questions challenge the faulty idea until you beat the trap twice. Spaced reviews return just before you'd forget."
          />
        </div>
      </section>

      {/* ───────── input modes + teachers ───────── */}
      <section className="mx-auto grid max-w-[1240px] gap-5 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="glass rounded-[24px] p-7 sm:p-9">
          <Kicker>Multimodal</Kicker>
          <h2 className="display mt-5 text-[30px] font-bold text-white sm:text-[36px]">Explain it however you think</h2>
          <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-slate">
            Students don&rsquo;t reason in neat typed sentences, so Samajh accepts all three ways a Class 10 student actually works.
          </p>
          <ul className="mt-7 grid gap-3">
            <ModeRow icon={<Keyboard className="size-5" />} title="Type it" body="English, Hindi or Hinglish, as messy as you like." />
            <ModeRow icon={<AudioLines className="size-5" />} title="Say it out loud" body="Up to 45 seconds. Gemini transcribes and analyses it in one pass." />
            <ModeRow icon={<Camera className="size-5" />} title="Snap your rough work" body="Gemini reads the handwriting and marks the line where it breaks." />
          </ul>
        </div>
        <TeacherCard />
      </section>

      {/* ───────── agent architecture ───────── */}
      <section className="relative mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-[760px] text-center">
          <Kicker>Agentic by design</Kicker>
          <h2 className="display mt-5 text-[34px] font-bold text-white sm:text-[44px]">How the tutor agent thinks</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-slate">
            Language and judgement go to Gemini. Anything that must be exact and auditable is done in code. Every
            decision shows its reason in the product.
          </p>
        </div>
        <AgentFlow />
      </section>

      {/* ───────── final CTA ───────── */}
      <section className="mx-auto max-w-[1240px] px-4 pb-20 sm:px-6">
        <div className="glow-border relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,rgba(108,92,255,.22),rgba(70,211,255,.08)_55%,rgba(255,92,124,.12))] px-6 py-14 text-center sm:px-12">
          <div className="aurora" aria-hidden>
            <span style={{ width: 420, height: 420, left: "10%", top: "-40%", background: "#6c5cff", opacity: 0.35 }} />
            <span style={{ width: 380, height: 380, right: "5%", bottom: "-50%", background: "#46d3ff", opacity: 0.2, animationDelay: "-7s" }} />
          </div>
          <div className="relative">
            <h2 className="display text-[32px] font-bold text-white sm:text-[44px]">Find out what you really understand.</h2>
            <p className="mx-auto mt-3 max-w-[48ch] text-[16.5px] text-slate">Ten questions. About six minutes. No sign-up.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/diagnostic" size="lg" className="rounded-full px-7">
                Start the diagnostic <ArrowRight className="size-4" />
              </ButtonLink>
              <Button size="lg" variant="outline" className="rounded-full px-6" onClick={openDemo}>
                Explore a live demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 border-t border-white/[.06] px-4 py-8 text-[13px] text-slate sm:px-6">
        <Logo />
        <p>Built in one day for the Product Space Agentic AI Hackathon, 21 November 2026.</p>
      </footer>
    </div>
  );
}

/* ───────── hero analysis card: the one orchestrated moment ───────── */
function HeroAnalysis() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setStage(1), 600), setTimeout(() => setStage(2), 1700), setTimeout(() => setStage(3), 2700)];
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="relative" style={{ animation: "rise 800ms 120ms cubic-bezier(.2,.8,.2,1) both" }}>
      <div className="absolute -inset-6 rounded-[40px] bg-[radial-gradient(closest-side,rgba(108,92,255,.35),transparent)] blur-2xl" aria-hidden />
      <div className="glass glow-border relative rounded-[26px] p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] font-semibold text-slate">Q4 · Electricity</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/[.05] px-2.5 py-1 text-[12px] font-semibold text-[#9ff0c8] ring-1 ring-white/10">
            <span className="size-1.5 animate-pulse rounded-full bg-good shadow-[0_0_8px_2px_rgba(52,216,154,.8)]" />
            Live analysis
          </span>
        </div>
        <p className="mt-3 text-[17px] font-semibold leading-snug text-white">
          Two identical bulbs are in series with a cell. Which glows brighter, and why?
        </p>

        <div className="mt-5 min-h-[104px] rounded-[16px] bg-black/20 px-4 py-3 ring-1 ring-white/[.06]">
          <p className="text-[11.5px] font-semibold text-faint">Student&rsquo;s reasoning</p>
          {stage >= 1 && (
            <Handwriting className="mt-1 block text-[20px] leading-[1.6]">
              <span className="block opacity-0" style={{ animation: "write 900ms ease-out forwards" }}>
                The first one, because{" "}
                {stage >= 2 ? <RedPenCircle>it uses up some of the current</RedPenCircle> : "it uses up some of the current"}, so less reaches the second bulb.
              </span>
            </Handwriting>
          )}
        </div>

        <div className="mt-4 min-h-[156px]">
          {stage >= 2 && (
            <div className="rounded-[16px] bg-redpen-wash p-4 ring-1 ring-redpen/25" style={{ animation: "rise 500ms ease-out both" }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-redpen">Misconception detected</p>
                <span className="text-[12px] font-semibold text-slate">confidence 98%</span>
              </div>
              <p className="mt-1 text-[17px] font-bold text-white">Current gets used up</p>
              {stage >= 3 && (
                <p className="mt-1.5 text-[14px] leading-snug text-slate" style={{ animation: "rise 500ms ease-out both" }}>
                  Both glow equally. A bulb uses <span className="font-semibold text-white">energy</span>, not current: an ammeter
                  before and after it reads the same.
                </p>
              )}
            </div>
          )}
          {stage >= 3 && (
            <div className="mt-3 grid gap-1.5 px-1" style={{ animation: "rise 500ms 120ms ease-out both" }}>
              <div className="flex justify-between text-[12.5px]">
                <span className="text-slate">Learner model: Series circuits</span>
                <span className="tabular font-bold text-redpen">62% → 48%</span>
              </div>
              <InkBar p={0.48} from={0.62} height={7} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ConstellationPreview({ onOpen }: { onOpen: () => void }) {
  const hydrated = useHydrated();
  const demo = useMemo(() => buildDemo(Date.now()), []);
  return (
    <div className="relative mt-12">
      <div className="absolute inset-x-10 -inset-y-6 rounded-[40px] bg-[radial-gradient(closest-side,rgba(108,92,255,.28),transparent)] blur-2xl" aria-hidden />
      <div className="glass glow-border relative overflow-hidden rounded-[28px]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] px-5 py-3.5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
            </span>
            <span className="text-[13px] font-semibold text-slate">Aarav&rsquo;s map, three weeks in</span>
          </div>
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#c9c3ff] hover:text-white">
            Open the live demo <ArrowRight className="size-3.5" />
          </button>
        </div>
        <div className="dot-grid overflow-x-auto px-4 py-5 sm:px-7">
          <div className="min-w-[760px]">
            {hydrated ? (
              <ConceptMap states={demo.snap.states} misconceptions={demo.snap.misconceptions} />
            ) : (
              <div className="aspect-[1.45] animate-pulse rounded-xl bg-white/[.03]" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ n, icon, title, body }: { n: number; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass group relative overflow-hidden rounded-[22px] p-6 transition-transform duration-300 hover:-translate-y-1">
      <div className="pointer-events-none absolute -right-6 -top-10 text-[120px] font-black leading-none text-white/[.03]" aria-hidden>
        {n}
      </div>
      <span className="grid size-11 place-items-center rounded-[14px] bg-[linear-gradient(135deg,rgba(125,107,255,.35),rgba(70,211,255,.18))] text-white ring-1 ring-white/15 shadow-[0_0_24px_-6px_rgba(125,107,255,.9)]">
        {icon}
      </span>
      <p className="mt-5 text-[12px] font-bold text-[#a59cff]">Step {n}</p>
      <h3 className="display mt-1 text-[21px] font-bold text-white">{title}</h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-slate">{body}</p>
    </div>
  );
}

function ModeRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex items-start gap-4 rounded-[16px] bg-white/[.03] p-4 ring-1 ring-white/[.06]">
      <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-ink-soft text-[#c9c3ff] ring-1 ring-ink/30">{icon}</span>
      <div>
        <p className="text-[15.5px] font-bold text-white">{title}</p>
        <p className="mt-0.5 text-[14px] text-slate">{body}</p>
      </div>
    </li>
  );
}

function TeacherCard() {
  const cls = syntheticClass();
  const count = cls.filter((s) => s.misconceptions.includes("current-consumed")).length;
  return (
    <div className="glass relative overflow-hidden rounded-[24px] p-7 sm:p-9">
      <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-redpen/15 blur-3xl" aria-hidden />
      <Kicker>
        <Users className="size-3.5" /> For teachers
      </Kicker>
      <h2 className="display mt-5 text-[30px] font-bold text-white sm:text-[36px]">See the idea behind the class&rsquo;s mistakes</h2>
      <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-slate">
        Students are grouped by the misconception they share, not by marks. One click turns a group into a 10-minute
        predict, observe, explain lesson.
      </p>
      <div className="mt-7 rounded-[18px] bg-black/25 p-5 ring-1 ring-white/[.07]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[16px] font-bold text-white">Current gets used up</p>
          <span className="tabular text-[13px] font-bold text-redpen">
            {count} of {cls.length}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[.06]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#ff5c7c,#ff8a65)] shadow-[0_0_12px_rgba(255,92,124,.7)]"
            style={{ width: `${(count / cls.length) * 100}%` }}
          />
        </div>
        <p className="hand mt-3 text-[17px] text-[#b8c4ff]">&ldquo;pehla bulb thoda current use kar leta hai&rdquo;</p>
        <div className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-[#c9c3ff]">
          <Sparkles className="size-4" /> Plan a 10-minute reteach
        </div>
      </div>
      <ButtonLink href="/teacher" variant="outline" className="mt-6 rounded-full">
        Open the teacher dashboard
      </ButtonLink>
    </div>
  );
}

function AgentFlow() {
  const nodes = [
    { icon: <Keyboard className="size-5" />, title: "Student", body: "Answer + reasoning: typed, voice or photo", tone: "plain" },
    { icon: <Brain className="size-5" />, title: "Misconception detective", body: "Gemini reads the reasoning, quotes the faulty step, names the idea", tone: "ai" },
    { icon: <GitBranch className="size-5" />, title: "Learner model", body: "Bayesian Knowledge Tracing, evidence spreads along prerequisites", tone: "code" },
    { icon: <ListChecks className="size-5" />, title: "Tutor planner", body: "Next best step: fix, review, learn frontier or stretch", tone: "code" },
    { icon: <ShieldCheck className="size-5" />, title: "Question smith + verifier", body: "Gemini writes trap questions; a second AI solves each before it ships", tone: "ai" },
    { icon: <Users className="size-5" />, title: "Teacher insights", body: "Misconception clusters, reteach plans, new ideas for approval", tone: "ai" },
  ];
  return (
    <div className="mt-12">
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((n, i) => (
          <li key={n.title} className="glass relative rounded-[20px] p-5">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-[12px] ring-1",
                  n.tone === "ai"
                    ? "bg-[linear-gradient(135deg,rgba(125,107,255,.4),rgba(70,211,255,.2))] text-white ring-white/15 shadow-[0_0_22px_-6px_rgba(125,107,255,.9)]"
                    : n.tone === "code"
                      ? "bg-good-wash text-good ring-good/30"
                      : "bg-white/[.06] text-slate ring-white/10",
                )}
              >
                {n.icon}
              </span>
              <span className="text-[11.5px] font-bold text-faint">0{i + 1}</span>
            </div>
            <p className="mt-4 text-[16px] font-bold text-white">{n.title}</p>
            <p className="mt-1 text-[13.5px] leading-snug text-slate">{n.body}</p>
            <p className={cn("mt-3 text-[11.5px] font-bold", n.tone === "ai" ? "text-[#a59cff]" : n.tone === "code" ? "text-good" : "text-faint")}>
              {n.tone === "ai" ? "Gemini" : n.tone === "code" ? "Deterministic code" : "Input"}
            </p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center text-[13px] text-slate">
        Every Gemini call has a deterministic fallback and fails over across models, so the tutor keeps working even when
        a model is busy.
      </p>
    </div>
  );
}
