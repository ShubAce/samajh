"use client";

import { ArrowRight, AudioLines, Camera, GraduationCap, Keyboard, Pause, Play, Sparkles, Users } from "lucide-react";
import { MotionConfig, motion, stagger, useInView, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AgentTrace } from "@/components/AgentTrace";
import { confirmDemoSwitch } from "@/components/AppShell";
import { ConceptMap } from "@/components/ConceptMap";
import { HeroDemo } from "@/components/HeroDemo";
import { CircuitIllustration, LensIllustration, MagnetIllustration, PrismIllustration } from "@/components/Illustrations";
import { InkBar } from "@/components/Ink";
import { Logo } from "@/components/Logo";
import { CountUp, Reveal } from "@/components/Motion";
import { RedPenCircle } from "@/components/RedPen";
import { Button, ButtonLink, Kicker } from "@/components/ui";
import { CONCEPTS, CONCEPT_BY_ID, ancestorsOf } from "@/lib/curriculum/concepts";
import { MISCONCEPTIONS } from "@/lib/curriculum/misconceptions";
import { BKT, rootCause } from "@/lib/engine/learner";
import { syntheticClass } from "@/lib/seed/class";
import { buildDemo } from "@/lib/seed/demo";
import { useHydrated, useSamajh } from "@/lib/store";
import { cn, pct } from "@/lib/utils";

/** CSS rise (works before hydration; collapsed by the global reduced-motion rule) */
const rise = (ms: number): React.CSSProperties => ({ animation: `rise 600ms cubic-bezier(.2,.8,.2,1) ${ms}ms both` });

export default function Landing() {
  const router = useRouter();
  const hydrated = useHydrated();
  const student = useSamajh((s) => s.student);
  const loadDemo = useSamajh((s) => s.loadDemo);
  const openDemo = () => {
    if (!confirmDemoSwitch()) return;
    loadDemo();
    router.push("/learn");
  };

  return (
    <MotionConfig reducedMotion="user">
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
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 px-4 pb-24 pt-8 sm:px-6 sm:pb-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start lg:pt-6">
            <div>
              <div style={rise(0)}>
                <Kicker tone="yellow">⚡ CBSE Class 10 Physics, powered by Gemini</Kicker>
              </div>
              <h1 className="display mt-7 text-[50px] font-extrabold text-navy sm:text-[68px] lg:text-[76px]" style={{ textWrap: "balance", lineHeight: 1.1 }}>
                <Word k={0}>Find</Word> <Word k={1}>out</Word>{" "}
                <Word k={2}>
                  <RedPenCircle delay={600} tight>
                    why
                  </RedPenCircle>
                </Word>{" "}
                <Word k={3}>you</Word> <Word k={4}>got</Word> <Word k={5}>it</Word> <Word k={6}>wrong.</Word>
              </h1>
              <p className="mt-7 max-w-[52ch] text-[18px] leading-relaxed text-slate" style={rise(350)}>
                Most AI tutors only mark your final answer. Samajh reads <strong className="text-navy">how you reasoned</strong>,
                typed, spoken in Hinglish or snapped from your notebook, then circles the exact step that broke and keeps a
                live map of what you really understand.
              </p>
              <div className="mt-9" style={rise(450)}>
                <div className="flex flex-wrap gap-3.5">
                  <ButtonLink href="/diagnostic" size="lg" className="group">
                    Take the 10-question diagnostic <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </ButtonLink>
                  <Button size="lg" variant="outline" onClick={openDemo}>
                    Explore a live demo
                  </Button>
                </div>
                <p className="mt-3 text-[13.5px] font-semibold text-slate">No sign-up · about 6 minutes · English, हिंदी or Hinglish</p>
              </div>
              <motion.dl className="mt-10 flex flex-wrap gap-3" style={rise(550)} variants={STAT_ROW} initial="hidden" animate="shown">
                {[
                  { n: CONCEPTS.length, l: "concepts mapped", c: "bg-highlight" },
                  { n: MISCONCEPTIONS.length, l: "misconceptions named", c: "bg-redpen-wash" },
                  { n: 3, l: "Gemini agents", c: "bg-ink-soft" },
                ].map((s, k) => (
                  <motion.div
                    key={s.l}
                    custom={STAT_TILT[k]}
                    variants={STICKER}
                    whileHover={{ rotate: STAT_TILT[k] + 4, y: -3, transition: STICKER_SPRING }}
                    className={cn("rounded-[14px] border-2 border-line px-4 py-2.5 shadow-[3px_3px_0_var(--color-line)]", s.c)}
                  >
                    <dt className="display text-[28px] font-extrabold leading-none text-navy">
                      <CountUp to={s.n} />
                    </dt>
                    <dd className="mt-1 text-[12.5px] font-bold text-navy/75">{s.l}</dd>
                  </motion.div>
                ))}
              </motion.dl>
            </div>

            <HeroDemo />
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
                along the lines, so ten questions are enough to sketch the whole syllabus. Watch it trace a weak concept to its
                root, or hover any concept yourself.
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
            <AgentTrace />
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
                  <ButtonLink href="/diagnostic" size="lg" className="group">
                    Start the diagnostic <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </ButtonLink>
                  <Button size="lg" variant="outline" onClick={openDemo}>
                    Explore a live demo
                  </Button>
                </div>
              </div>
              <div className="hidden rounded-[22px] border-2 border-line bg-white p-5 shadow-[5px_5px_0_var(--color-line)] lg:block">
                <CircuitIllustration bg="#ffffff" />
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
    </MotionConfig>
  );
}

/* ───────── hero headline + stats ───────── */

/** one headline word springing up into place */
function Word({ k, children }: { k: number; children: React.ReactNode }) {
  return (
    <motion.span
      className="inline-block"
      initial={{ y: "0.5em", opacity: 0, rotate: -3 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 420, damping: 28, delay: 0.08 + k * 0.07 }}
    >
      {children}
    </motion.span>
  );
}

const STAT_TILT = [-1.5, 1, -0.5];
const STICKER_SPRING = { type: "spring", stiffness: 520, damping: 17 } as const;
// The row staggers the stickers in. The delay lives on the row, so a sticker returning from hover springs back at once.
const STAT_ROW: Variants = {
  hidden: {},
  shown: { transition: { delayChildren: stagger(0.12, { startDelay: 0.85 }) } },
};
const STICKER: Variants = {
  hidden: (r: number) => ({ scale: 0.5, opacity: 0, rotate: r - 10 }),
  shown: (r: number) => ({ scale: 1, opacity: 1, rotate: r, transition: STICKER_SPRING }),
};

function MisconceptionRibbon() {
  const items = MISCONCEPTIONS.slice(0, 16).map((m) => m.title);
  const row = [...items, ...items];
  return (
    <div role="group" className="group relative overflow-hidden border-y-2 border-line bg-navy py-4" aria-label="Misconceptions Samajh can name">
      {/* pauses while hovered or focused; the duplicate half (for a seamless loop) is hidden from screen readers */}
      <div className="flex w-max animate-[marquee_60s_linear_infinite] gap-8 whitespace-nowrap group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
        {row.map((t, i) => (
          <span key={i} aria-hidden={i >= items.length || undefined} className="inline-flex items-center gap-8 text-[17px] font-bold text-white">
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
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.4 });
  const [replay, setReplay] = useState(0);
  return (
    <Reveal delay={delay} className="group">
      <div
        ref={ref}
        onMouseEnter={() => setReplay((x) => x + 1)}
        className="glass h-full overflow-hidden rounded-[24px] transition-transform duration-200 hover:-translate-y-1.5"
      >
        <div className={cn("border-b-2 border-line px-6 pb-3 pt-5", color)}>
          <span className="display text-[15px] font-extrabold text-navy">Step {n}</span>
          <div className="mx-auto mt-2 max-w-[260px] transition-transform duration-300 group-hover:scale-[1.04]">
            {/* remounting replays the drawing: once when it first comes into view, and again on hover */}
            <div key={`${seen ? "on" : "off"}-${replay}`} className={seen ? undefined : "invisible"}>
              {art}
            </div>
          </div>
        </div>
        <div className="p-6">
          <h3 className="display text-[24px] font-extrabold text-navy">{title}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-slate">{body}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ───────── the map, with a live root-cause trace (reads the engine; never writes to the store) ───────── */

const TOUR = ["combined-circuits", "mirror-formula", "force-on-conductor"];

function MapPreview({ onOpen }: { onOpen: () => void }) {
  const hydrated = useHydrated();
  const demo = useMemo(() => buildDemo(Date.now()), []);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const inView = useInView(ref, { amount: 0.3 });
  const reduce = useReducedMotion();
  const [step, setStep] = useState(-1);
  const [hover, setHover] = useState(false);
  const [paused, setPaused] = useState(false);

  // reduced motion: show the first trace and hold it (Play opts in to the tour)
  useEffect(() => {
    if (!reduce) return;
    setPaused(true);
    setStep((s) => (s < 0 ? 0 : s));
  }, [reduce]);

  useEffect(() => {
    if (!inView || hover || paused) return;
    let tick: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setStep((s) => (s < 0 ? 0 : s));
      tick = setInterval(() => setStep((s) => (s + 1) % TOUR.length), 3600);
    }, 1600);
    return () => {
      clearTimeout(first);
      if (tick) clearInterval(tick);
    };
  }, [inView, hover, paused]);

  const st = demo.snap.states;
  const p = (c: string) => pct(st[c]?.p ?? BKT.pInit);
  const traces = TOUR.map((cid) => ({ id: cid, root: rootCause(st, cid), n: ancestorsOf(cid).size }));
  const id = step >= 0 ? TOUR[step] : null;
  const root = step >= 0 ? traces[step].root : null;

  // On a phone the map scrolls sideways inside its card: bring each traced concept (and its root, when both fit) into view.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = scrollRef.current;
    if (!box || !id || box.scrollWidth <= box.clientWidth + 4) return;
    /** screen x of a concept's dot, read from its node's translate() in the map's viewBox */
    const dotX = (cid: string | null) => {
      const g = cid ? box.querySelector<SVGGElement>(`[data-concept="${cid}"]`) : null;
      const svg = g?.ownerSVGElement;
      const m = g?.transform.baseVal.consolidate()?.matrix;
      if (!g || !svg || !m) return null;
      const vb = svg.viewBox.baseVal;
      const r = svg.getBoundingClientRect();
      return r.left + (m.e - vb.x) * (r.width / (vb.width || r.width));
    };
    const sel = dotX(id);
    if (sel === null) return;
    const base = dotX(root);
    // centre the pair if they fit side by side (with room for the selected label), else the selected concept
    const fits = base !== null && Math.abs(sel - base) < box.clientWidth - 140;
    const target = fits ? (sel + base + 60) / 2 : sel + 50;
    const b = box.getBoundingClientRect();
    box.scrollTo({ left: box.scrollLeft + target - b.left - box.clientWidth / 2, behavior: reduce ? "auto" : "smooth" });
  }, [id, root, reduce]);

  return (
    <div ref={ref} className="glass mt-10 overflow-hidden rounded-[26px]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-line bg-white px-5 py-3.5 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full border-2 border-line bg-ink text-[13px] font-extrabold text-white">A</span>
          <span className="text-[14px] font-bold text-navy">Aarav&rsquo;s map, three weeks in</span>
        </div>
        <button type="button" onClick={onOpen} className="group inline-flex items-center gap-1.5 text-[14px] font-extrabold text-ink hover:underline">
          Open the live demo <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* caption strip: the trace, in words */}
      <div className="flex min-h-[56px] flex-wrap items-center gap-x-3 gap-y-1 border-b-2 border-line bg-highlight-wash px-5 py-2.5 sm:px-7">
        <span className="rounded-full border-2 border-line bg-highlight px-2.5 py-0.5 text-[12.5px] font-extrabold text-navy">Root-cause trace</span>
        {/* every caption shares one grid cell, so the strip is as tall as the longest and the map never jumps */}
        <div className="grid min-w-0 flex-1 basis-[240px]">
          {[null, ...traces].map((t, k) => {
            const on = k === step + 1;
            return (
              <p
                key={t?.id ?? "intro"}
                aria-hidden={!on}
                className={cn("col-start-1 row-start-1 text-[14px] font-semibold text-navy", !on && "invisible")}
                style={on ? { animation: "rise 350ms both" } : undefined}
              >
                {t ? (
                  <>
                    <strong className="font-extrabold">{CONCEPT_BY_ID[t.id].short}</strong> is at {p(t.id)}. Traced back through {t.n}{" "}
                    {t.n === 1 ? "prerequisite" : "prerequisites"}:{" "}
                    {t.root ? (
                      <>
                        the weakest link is <strong className="font-extrabold">{CONCEPT_BY_ID[t.root].short}</strong> ({p(t.root)}).
                      </>
                    ) : (
                      "its prerequisites look solid, so the gap is the idea itself."
                    )}
                  </>
                ) : (
                  "Watch the learner model trace a weak concept back to its root."
                )}
              </p>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setPaused((x) => !x)}
          aria-label={paused ? "Play the trace" : "Pause the trace"}
          className="ml-auto grid size-8 shrink-0 place-items-center rounded-full border-2 border-line bg-white text-navy transition-colors hover:bg-ink-wash"
        >
          {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        </button>
      </div>

      <div ref={scrollRef} className="dot-grid overflow-x-auto px-4 py-6 sm:px-7" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <div className="min-w-[760px]">
          {hydrated ? (
            // remounted when it first comes into view, so the nodes appear prerequisites-first where they can be seen
            <div className={seen ? undefined : "invisible"}>
              <ConceptMap key={seen ? "live" : "idle"} states={st} misconceptions={demo.snap.misconceptions} selected={id} focus={root} />
            </div>
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
          <span className="tabular shrink-0 whitespace-nowrap rounded-full border-2 border-line bg-redpen-wash px-2 text-[13px] font-extrabold text-redpen">
            {count} of {cls.length}
          </span>
        </div>
        <div className="mt-3">
          <InkBar p={count / cls.length} color="var(--color-redpen)" height={12} />
        </div>
        <p className="hand mt-3 text-[18px] text-[#1f3fc9]">&ldquo;pehla bulb thoda current use kar leta hai&rdquo;</p>
        <Link
          href="/teacher"
          className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-line bg-highlight px-3 py-1 text-[13px] font-extrabold text-navy shadow-[2px_2px_0_var(--color-line)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[3px_3px_0_var(--color-line)] active:translate-y-px active:shadow-none"
        >
          <Sparkles className="size-4" aria-hidden /> Plan a 10-minute reteach <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ButtonLink href="/teacher" variant="outline" className="mt-7">
        Open the teacher dashboard
      </ButtonLink>
    </div>
  );
}
