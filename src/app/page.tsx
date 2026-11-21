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
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ConceptMap } from "@/components/ConceptMap";
import { CircuitIllustration, LensIllustration, MagnetIllustration, PrismIllustration } from "@/components/Illustrations";
import { InkBar } from "@/components/Ink";
import { Logo } from "@/components/Logo";
import { CountUp, Reveal } from "@/components/Motion";
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
    <div className="min-h-dvh overflow-x-hidden bg-white">
      {/* ───────── header ───────── */}
      <header className="mx-auto flex h-20 max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-auto flex items-center gap-2">
          <Link
            href="/teacher"
            aria-label="For teachers"
            className="inline-flex h-10 items-center gap-1.5 rounded-full border-2 border-transparent px-3 text-[14px] font-bold text-slate transition-colors hover:border-line hover:text-navy"
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

      {/* ───────── hero ───────── */}
      <section className="relative">
        <div className="dot-grid absolute inset-x-0 top-0 h-[640px] opacity-60 [mask-image:linear-gradient(#000,transparent)]" aria-hidden />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 px-4 pb-24 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-12">
          <div style={{ animation: "rise 650ms cubic-bezier(.2,.8,.2,1) both" }}>
            <Kicker tone="yellow">⚡ CBSE Class 10 Physics, powered by Gemini</Kicker>
            <h1 className="display mt-7 text-[50px] font-extrabold text-navy sm:text-[68px] lg:text-[76px]" style={{ textWrap: "balance", lineHeight: 1.1 }}>
              Find out{" "}
              <span className="relative inline-block">
                <RedPenCircle delay={700} tight>
                  why
                </RedPenCircle>
              </span>{" "}
              you got it wrong.
            </h1>
            <p className="mt-7 max-w-[52ch] text-[18px] leading-relaxed text-slate">
              Most AI tutors only mark your final answer. Samajh reads <strong className="text-navy">how you reasoned</strong>,
              typed, spoken in Hinglish or snapped from your notebook, then circles the exact step that broke and keeps a
              live map of what you really understand.
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <ButtonLink href="/diagnostic" size="lg">
                Take the 10-question diagnostic <ArrowRight className="size-4" />
              </ButtonLink>
              <Button size="lg" variant="outline" onClick={openDemo}>
                Explore a live demo
              </Button>
            </div>
            <dl className="mt-10 flex flex-wrap gap-3">
              {[
                { n: CONCEPTS.length, l: "concepts mapped", c: "bg-highlight" },
                { n: MISCONCEPTIONS.length, l: "misconceptions named", c: "bg-redpen-wash" },
                { n: 3, l: "Gemini agents", c: "bg-ink-soft" },
              ].map((s, i) => (
                <div
                  key={s.l}
                  className={cn("rounded-[14px] border-2 border-line px-4 py-2.5 shadow-[3px_3px_0_var(--color-line)]", s.c)}
                  style={{ transform: `rotate(${[-1.5, 1, -0.5][i]}deg)` }}
                >
                  <dt className="display text-[28px] font-extrabold leading-none text-navy">
                    <CountUp to={s.n} />
                  </dt>
                  <dd className="mt-1 text-[12.5px] font-bold text-navy/75">{s.l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <HeroWorksheet />
        </div>
      </section>

      {/* ───────── misconception ribbon ───────── */}
      <MisconceptionRibbon />

      {/* ───────── how it works ───────── */}
      <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <Reveal className="max-w-[720px]">
          <Kicker>How it works</Kicker>
          <h2 className="display mt-5 text-[38px] font-extrabold text-navy sm:text-[50px]">From one wrong answer to a fixed idea.</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <StepCard
            delay={0}
            n={1}
            color="bg-highlight"
            art={<LensIllustration />}
            title="Diagnose in ten questions"
            body="Each question is chosen from your last answer. Miss one and Samajh checks its prerequisites to find the root cause."
          />
          <StepCard
            delay={120}
            n={2}
            color="bg-lilac"
            art={<PrismIllustration />}
            title="Find the why"
            body="Every wrong option is a trap for a known misconception. Explain your thinking and Gemini pinpoints the faulty step, even when the answer was right."
          />
          <StepCard
            delay={240}
            n={3}
            color="bg-[#9fe3c4]"
            art={<MagnetIllustration />}
            title="Fix it, then keep it"
            body="Targeted questions challenge the faulty idea until you beat the trap twice. Spaced reviews return just before you'd forget."
          />
        </div>
      </section>

      {/* ───────── the map ───────── */}
      <section className="border-y-2 border-line bg-paper">
        <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
          <Reveal className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div>
              <Kicker tone="blue">The learner model</Kicker>
              <h2 className="display mt-5 text-[38px] font-extrabold text-navy sm:text-[50px]">Every concept you know, on one map.</h2>
            </div>
            <p className="text-[16.5px] leading-relaxed text-slate">
              31 concepts and how they depend on each other. Each one fills with colour as you master it, and evidence flows
              along the lines, so ten questions are enough to sketch the whole syllabus. Hover a concept to trace its
              prerequisites.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <MapPreview onOpen={openDemo} />
          </Reveal>
        </div>
      </section>

      {/* ───────── input modes + teachers ───────── */}
      <section className="mx-auto grid max-w-[1240px] gap-7 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <Reveal className="glass rounded-[26px] p-7 sm:p-9">
          <Kicker tone="yellow">Multimodal</Kicker>
          <h2 className="display mt-5 text-[32px] font-extrabold text-navy sm:text-[40px]">Explain it however you think.</h2>
          <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-slate">
            Students don&rsquo;t reason in neat typed sentences, so Samajh accepts all three ways a Class 10 student actually works.
          </p>
          <ul className="mt-7 grid gap-3">
            <ModeRow color="bg-ink-soft" icon={<Keyboard className="size-5" />} title="Type it" body="English, Hindi or Hinglish, as messy as you like." />
            <ModeRow color="bg-highlight" icon={<AudioLines className="size-5" />} title="Say it out loud" body="Up to 45 seconds. Gemini transcribes and analyses it in one pass." />
            <ModeRow color="bg-redpen-wash" icon={<Camera className="size-5" />} title="Snap your rough work" body="Gemini reads the handwriting and marks the line where it breaks." />
          </ul>
        </Reveal>
        <Reveal delay={120}>
          <TeacherCard />
        </Reveal>
      </section>

      {/* ───────── agent architecture ───────── */}
      <section className="border-t-2 border-line bg-navy text-white">
        <div className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
          <Reveal className="max-w-[760px]">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-white bg-highlight px-3 py-1 text-[13px] font-bold text-navy">
              Agentic by design
            </span>
            <h2 className="display mt-5 text-[38px] font-extrabold sm:text-[50px]">How the tutor agent thinks.</h2>
            <p className="mt-4 max-w-[62ch] text-[16.5px] leading-relaxed text-white/70">
              Language and judgement go to Gemini. Anything that must be exact and auditable is done in code. Every decision
              shows its reason in the product, and every AI call has a fallback.
            </p>
          </Reveal>
          <AgentFlow />
        </div>
      </section>

      {/* ───────── final CTA ───────── */}
      <section className="mx-auto max-w-[1240px] px-4 py-20 sm:px-6">
        <Reveal className="next-step relative overflow-hidden rounded-[30px] px-6 py-14 sm:px-14">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
            <div>
              <h2 className="display text-[38px] font-extrabold text-navy sm:text-[54px]">Find out what you really understand.</h2>
              <p className="mt-3 text-[17px] font-semibold text-navy/75">Ten questions. About six minutes. No sign-up.</p>
              <div className="mt-8 flex flex-wrap gap-3.5">
                <ButtonLink href="/diagnostic" size="lg">
                  Start the diagnostic <ArrowRight className="size-4" />
                </ButtonLink>
                <Button size="lg" variant="outline" onClick={openDemo}>
                  Explore a live demo
                </Button>
              </div>
            </div>
            <div className="hidden rounded-[22px] border-2 border-line bg-white p-5 shadow-[5px_5px_0_var(--color-line)] lg:block">
              <CircuitIllustration />
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t-2 border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-[13.5px] font-semibold text-slate sm:px-6">
          <Logo />
          <p>Built in one day for the Product Space Agentic AI Hackathon, 21 November 2026.</p>
        </div>
      </footer>
    </div>
  );
}

/* ───────── hero worksheet: the one orchestrated moment ───────── */
function HeroWorksheet() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setStage(1), 900), setTimeout(() => setStage(2), 2000), setTimeout(() => setStage(3), 3000)];
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="relative" style={{ animation: "rise 750ms 150ms cubic-bezier(.2,.8,.2,1) both" }}>
      <div className="glass relative rounded-[26px] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border-2 border-line bg-ink px-2.5 py-0.5 text-[12px] font-extrabold text-white">Q4 · Electricity</span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-good">
            <span className="size-2 animate-pulse rounded-full border border-line bg-good" /> Live analysis
          </span>
        </div>
        <p className="mt-3 text-[17px] font-bold leading-snug text-navy">
          Two identical bulbs are in series with a cell. Which glows brighter, and why?
        </p>
        <div className="mt-3 rounded-[16px] border-2 border-line bg-paper px-3 py-2">
          <CircuitIllustration />
        </div>

        <div className="relative mt-4 min-h-[92px] rounded-[16px] border-2 border-dashed border-line/40 bg-white px-4 py-3">
          <p className="text-[11.5px] font-bold text-faint">Student&rsquo;s answer</p>
          {stage >= 1 && (
            <Handwriting className="mt-0.5 block text-[20px] leading-[1.55]">
              <span className="block opacity-0" style={{ animation: "write 900ms ease-out forwards" }}>
                The first one, because{" "}
                {stage >= 2 ? <RedPenCircle>it uses up the current</RedPenCircle> : "it uses up the current"}, so less reaches the second bulb.
              </span>
            </Handwriting>
          )}
        </div>

        <div className="mt-4 min-h-[40px]">
          {stage >= 3 && (
            <div className="grid max-w-[54%] gap-1.5 px-1" style={{ animation: "rise 450ms 150ms ease-out both" }}>
              <div className="flex justify-between text-[12.5px] font-bold">
                <span className="text-slate">Learner model: Series circuits</span>
                <span className="tabular text-redpen">62% → 48%</span>
              </div>
              <InkBar p={0.48} from={0.62} height={11} />
            </div>
          )}
        </div>
      </div>

      {/* the AI's diagnosis lands as a sticky note */}
      {stage >= 2 && (
        <div
          className="sticky-note absolute -bottom-12 -right-2 w-[250px] rounded-[6px] p-4 sm:-right-7"
          style={{ animation: "stick 520ms cubic-bezier(.2,.9,.3,1.2) 500ms both" }}
        >
          <p className="text-[11.5px] font-extrabold text-redpen">Misconception detected · 98%</p>
          <p className="display mt-1 text-[19px] font-extrabold leading-tight text-navy">Current gets used up</p>
          <p className="mt-1.5 text-[13px] font-semibold leading-snug text-navy/75">
            Both ammeters read 0.5 A. A bulb uses energy, not current.
          </p>
        </div>
      )}
      <div
        className="absolute -left-4 -top-5 hidden rotate-[-6deg] rounded-full border-2 border-line bg-white px-3 py-1 text-[12.5px] font-extrabold text-navy shadow-[2px_2px_0_var(--color-line)] sm:block"
        style={{ animation: "pop-in 400ms 1200ms both" }}
      >
        Hinglish ✓
      </div>
    </div>
  );
}

function MisconceptionRibbon() {
  const items = MISCONCEPTIONS.slice(0, 16).map((m) => m.title);
  const row = [...items, ...items];
  return (
    <div className="relative overflow-hidden border-y-2 border-line bg-navy py-4" aria-label="Misconceptions Samajh can name">
      <div className="flex w-max gap-8 whitespace-nowrap" style={{ animation: "marquee 60s linear infinite" }}>
        {row.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-8 text-[17px] font-bold text-white">
            <span className="hand text-[21px] text-highlight">{t}</span>
            <span className="text-redpen" aria-hidden>
              ✕
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StepCard({
  n,
  color,
  art,
  title,
  body,
  delay,
}: {
  n: number;
  color: string;
  art: React.ReactNode;
  title: string;
  body: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="group">
      <div className="glass h-full overflow-hidden rounded-[24px] transition-transform duration-200 hover:-translate-y-1.5">
        <div className={cn("border-b-2 border-line px-6 pb-3 pt-5", color)}>
          <span className="display text-[15px] font-extrabold text-navy">Step {n}</span>
          <div className="mx-auto mt-2 max-w-[260px] transition-transform duration-300 group-hover:scale-[1.04]">{art}</div>
        </div>
        <div className="p-6">
          <h3 className="display text-[24px] font-extrabold text-navy">{title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate">{body}</p>
        </div>
      </div>
    </Reveal>
  );
}

function MapPreview({ onOpen }: { onOpen: () => void }) {
  const hydrated = useHydrated();
  const demo = useMemo(() => buildDemo(Date.now()), []);
  return (
    <div className="glass mt-10 overflow-hidden rounded-[26px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line bg-white px-5 py-3.5 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full border-2 border-line bg-ink text-[13px] font-extrabold text-white">A</span>
          <span className="text-[14px] font-bold text-navy">Aarav&rsquo;s map, three weeks in</span>
        </div>
        <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-ink hover:underline">
          Open the live demo <ArrowRight className="size-4" />
        </button>
      </div>
      <div className="dot-grid overflow-x-auto px-4 py-6 sm:px-7">
        <div className="min-w-[760px]">
          {hydrated ? (
            <ConceptMap states={demo.snap.states} misconceptions={demo.snap.misconceptions} />
          ) : (
            <div className="aspect-[1.45] animate-pulse rounded-xl bg-navy/[.04]" />
          )}
        </div>
      </div>
    </div>
  );
}

function ModeRow({ icon, title, body, color }: { icon: React.ReactNode; title: string; body: string; color: string }) {
  return (
    <li className="flex items-start gap-4 rounded-[16px] border-2 border-line bg-white p-4 transition-transform hover:-translate-y-0.5">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-[12px] border-2 border-line text-navy", color)}>{icon}</span>
      <div>
        <p className="text-[16px] font-extrabold text-navy">{title}</p>
        <p className="mt-0.5 text-[14.5px] text-slate">{body}</p>
      </div>
    </li>
  );
}

function TeacherCard() {
  const cls = syntheticClass();
  const count = cls.filter((s) => s.misconceptions.includes("current-consumed")).length;
  return (
    <div className="glass h-full rounded-[26px] bg-lilac p-7 sm:p-9">
      <Kicker>
        <Users className="size-3.5" /> For teachers
      </Kicker>
      <h2 className="display mt-5 text-[32px] font-extrabold text-navy sm:text-[40px]">See the idea behind the class&rsquo;s mistakes.</h2>
      <p className="mt-3 max-w-[52ch] text-[16px] font-medium leading-relaxed text-navy/75">
        Students are grouped by the misconception they share, not by marks. One click turns a group into a 10-minute
        predict, observe, explain lesson.
      </p>
      <div className="mt-7 rounded-[18px] border-2 border-line bg-white p-5 shadow-[4px_4px_0_var(--color-line)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[17px] font-extrabold text-navy">Current gets used up</p>
          <span className="tabular rounded-full border-2 border-line bg-redpen-wash px-2 text-[13px] font-extrabold text-redpen">
            {count} of {cls.length}
          </span>
        </div>
        <div className="mt-3">
          <InkBar p={count / cls.length} color="var(--color-redpen)" height={12} />
        </div>
        <p className="hand mt-3 text-[18px] text-[#1f3fc9]">&ldquo;pehla bulb thoda current use kar leta hai&rdquo;</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-line bg-highlight px-3 py-1 text-[13px] font-extrabold text-navy">
          <Sparkles className="size-4" /> Plan a 10-minute reteach
        </div>
      </div>
      <ButtonLink href="/teacher" variant="outline" className="mt-7">
        Open the teacher dashboard
      </ButtonLink>
    </div>
  );
}

function AgentFlow() {
  const nodes = [
    { icon: <Keyboard className="size-5" />, title: "Student", body: "Answer + reasoning: typed, voice or photo", tone: "input" },
    { icon: <Brain className="size-5" />, title: "Misconception detective", body: "Gemini reads the reasoning, quotes the faulty step, names the idea", tone: "ai" },
    { icon: <GitBranch className="size-5" />, title: "Learner model", body: "Bayesian Knowledge Tracing; evidence spreads along prerequisites", tone: "code" },
    { icon: <ListChecks className="size-5" />, title: "Tutor planner", body: "Next best step: fix, review, learn the frontier, or stretch", tone: "code" },
    { icon: <ShieldCheck className="size-5" />, title: "Question smith + verifier", body: "Gemini writes trap questions; a second AI solves each before it ships", tone: "ai" },
    { icon: <Users className="size-5" />, title: "Teacher insights", body: "Misconception clusters, reteach plans, new ideas for approval", tone: "ai" },
  ];
  const tone = {
    input: { box: "bg-white text-navy", tag: "bg-white text-navy", label: "Input" },
    ai: { box: "bg-ink text-white", tag: "bg-highlight text-navy", label: "Gemini" },
    code: { box: "bg-[#9fe3c4] text-navy", tag: "bg-white text-navy", label: "Code" },
  } as const;
  return (
    <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {nodes.map((n, i) => {
        const t = tone[n.tone as keyof typeof tone];
        return (
          <Reveal as="li" key={n.title} delay={i * 90} className="relative">
            <div className="h-full rounded-[20px] border-2 border-white bg-white/[.04] p-5 transition-transform hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <span className={cn("grid size-11 place-items-center rounded-[12px] border-2 border-white", t.box)}>{n.icon}</span>
                <span className={cn("rounded-full border-2 border-white px-2.5 py-0.5 text-[11.5px] font-extrabold", t.tag)}>{t.label}</span>
              </div>
              <p className="mt-4 text-[17px] font-extrabold text-white">
                <span className="mr-2 text-highlight">{i + 1}.</span>
                {n.title}
              </p>
              <p className="mt-1 text-[14px] leading-snug text-white/70">{n.body}</p>
            </div>
          </Reveal>
        );
      })}
    </ol>
  );
}
