"use client";

import { ArrowRight, AudioLines, Camera, GitBranch, GraduationCap, Keyboard, Repeat, ShieldCheck, Sigma, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { InkBar } from "@/components/Ink";
import { Logo } from "@/components/Logo";
import { Handwriting, MarginNote, RedPenCircle } from "@/components/RedPen";
import { Button, ButtonLink } from "@/components/ui";
import { MISCONCEPTIONS } from "@/lib/curriculum/misconceptions";
import { CONCEPTS } from "@/lib/curriculum/concepts";
import { ConceptMap } from "@/components/ConceptMap";
import { syntheticClass } from "@/lib/seed/class";
import { buildDemo } from "@/lib/seed/demo";
import { useHydrated, useSamajh } from "@/lib/store";

export default function Landing() {
  const router = useRouter();
  const hydrated = useHydrated();
  const student = useSamajh((s) => s.student);
  const loadDemo = useSamajh((s) => s.loadDemo);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav className="ml-auto flex items-center gap-1">
          <Link
            href="/teacher"
            aria-label="For teachers"
            className="inline-flex h-9 items-center gap-1.5 rounded-[9px] px-2.5 text-[14.5px] font-semibold text-slate hover:bg-navy/5 hover:text-navy sm:px-3"
          >
            <GraduationCap className="size-4" /> <span className="hidden sm:inline">For teachers</span>
          </Link>
          {hydrated && student && (
            <ButtonLink href="/learn" variant="outline" size="sm">
              <span className="sm:hidden">Continue</span>
              <span className="hidden sm:inline">Continue as {student.name}</span>
            </ButtonLink>
          )}
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-14 lg:pt-12">
          <div>
            <p className="text-[15px] font-semibold text-ink">Adaptive tutor for CBSE Class 10 Physics</p>
            <h1 className="display mt-3 text-[44px] font-bold text-navy sm:text-[58px]" style={{ textWrap: "balance" }}>
              Samajh finds out why you got it wrong.
            </h1>
            <p className="mt-5 max-w-[56ch] text-[18px] leading-relaxed text-navy/80">
              Most AI tutors only check your final answer. Samajh reads how you reasoned, typed, spoken in Hinglish or
              photographed from your notebook. It finds the exact step where the reasoning breaks and keeps a live map
              of what you actually understand.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/diagnostic" size="lg">
                Take the 10-question diagnostic <ArrowRight className="size-4" />
              </ButtonLink>
              <Button
                size="lg"
                variant="outline"
                onClick={() => {
                  loadDemo();
                  router.push("/learn");
                }}
              >
                Explore as a demo student
              </Button>
            </div>
            <p className="mt-4 text-[14px] text-slate">No sign-up. Your progress stays in your browser.</p>
          </div>

          <HeroNotebook />
        </section>

        <section className="border-y border-rule bg-white">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div>
            <h2 className="display max-w-[24ch] text-[32px] font-bold text-navy sm:text-[38px]">From one wrong answer to a fixed idea</h2>
            <ol className="mt-10 grid gap-8">
              <Step
                n={1}
                title="Diagnose in ten questions"
                body={`Each question is chosen from your last answer. Miss one and Samajh checks its prerequisites to find the root cause. Answers flow through a graph of ${CONCEPTS.length} linked concepts, so ten questions sketch the whole syllabus.`}
              />
              <Step
                n={2}
                title="Find the why"
                body={`Every wrong option is a designed trap for one of ${MISCONCEPTIONS.length} documented misconceptions. Explain your thinking and Gemini pinpoints the faulty step, even when the final answer happened to be right.`}
              />
              <Step
                n={3}
                title="Fix it, then keep it"
                body="Targeted questions challenge the faulty idea until you get past the trap twice. Spaced reviews come back just before you'd forget, all the way to the board exam."
              />
            </ol>
            </div>
            <MapPreview onOpen={() => { loadDemo(); router.push("/learn"); }} />
          </div>
        </section>

        <section className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div>
            <h2 className="display text-[30px] font-bold text-navy sm:text-[34px]">Explain it however you think</h2>
            <p className="mt-3 max-w-[52ch] text-[16.5px] leading-relaxed text-navy/80">
              Students don&rsquo;t reason in neat typed sentences. Samajh accepts all three ways a Class 10 student actually works.
            </p>
            <ul className="mt-6 grid gap-4">
              <Mode icon={<Keyboard className="size-5" />} title="Type it" body="English, Hindi or Hinglish, as messy as you like." />
              <Mode icon={<AudioLines className="size-5" />} title="Say it out loud" body="Talk it through for up to 45 seconds. Gemini transcribes and analyses it in one pass." />
              <Mode icon={<Camera className="size-5" />} title="Snap your rough work" body="Photograph your working. Gemini reads the handwriting and circles the step where it breaks." />
            </ul>
          </div>
          <div className="rounded-[16px] border border-rule bg-white p-6 shadow-[0_18px_40px_-28px_rgba(22,32,74,.45)]">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-navy">
              <Users className="size-4 text-ink" /> For teachers
            </p>
            <h3 className="mt-2 text-[24px] font-bold leading-tight text-navy">See the idea behind the class&rsquo;s mistakes</h3>
            <p className="mt-2 text-[15.5px] leading-relaxed text-navy/80">
              The dashboard groups students by the misconception they share, not by marks. One click turns a group
              into a 10-minute predict, observe, explain lesson, with exit questions.
            </p>
            <ClusterPreview />
            <ButtonLink href="/teacher" variant="outline" className="mt-5">
              Open the teacher dashboard
            </ButtonLink>
          </div>
        </section>

        <section className="bg-navy text-white">
          <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6">
            <h2 className="display text-[30px] font-bold sm:text-[36px]">How the tutor agent thinks</h2>
            <p className="mt-3 max-w-[70ch] text-[16.5px] leading-relaxed text-white/75">
              Language and judgement go to Gemini. Anything that needs to be exact and auditable is done in code. Each part is
              visible in the product, with a plain-language reason attached.
            </p>
            <div className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
              <Tech icon={<GitBranch className="size-5" />} title="Learner model on a concept graph">
                Bayesian Knowledge Tracing updates mastery for each concept after every answer. Evidence then flows along
                prerequisite links, and a weak concept is traced back to the weak foundation underneath it.
              </Tech>
              <Tech icon={<Sigma className="size-5" />} title="Self-calibrating difficulty">
                Every question carries an Elo rating that moves with each answer. Samajh picks the question you have
                about a 70% chance of getting right, hard enough to learn from.
              </Tech>
              <Tech icon={<Camera className="size-5" />} title="Multimodal misconception detective">
                Gemini reads typed, spoken or handwritten reasoning, quotes the faulty step and maps it to the misconception
                library. Hinglish included.
              </Tech>
              <Tech icon={<ShieldCheck className="size-5" />} title="Generator plus independent verifier">
                New questions are written by Gemini with misconception-tagged traps, then solved from scratch by a second
                AI that never sees the answer key. A question is only shown if both agree.
              </Tech>
              <Tech icon={<Repeat className="size-5" />} title="Spaced repetition with a forgetting curve">
                Secure concepts get review dates at growing intervals. Recall is predicted daily, and a failed review
                pulls the concept back.
              </Tech>
              <Tech icon={<Users className="size-5" />} title="A library that grows, with a human in charge">
                Faulty ideas the AI hasn&rsquo;t seen before are drafted as new library entries. Only a teacher can approve
                them, and after that every student is checked for them.
              </Tech>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-[13.5px] text-slate sm:px-6">
        <Logo />
        <p>Built in one day for the Product Space Agentic AI Hackathon, 21 November 2026.</p>
      </footer>
    </div>
  );
}

/** The real product: a demo student's concept map, rendered live from the same engine. */
function MapPreview({ onOpen }: { onOpen: () => void }) {
  const hydrated = useHydrated();
  const demo = useMemo(() => buildDemo(Date.now()), []);
  return (
    <figure className="relative">
      <div className="graph-paper overflow-hidden rounded-[18px] border border-grid-strong p-4 shadow-[0_30px_60px_-40px_rgba(22,32,74,.55)] sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-1 pb-2">
          <p className="hand text-[21px] leading-none text-ink">Aarav&rsquo;s map, three weeks in</p>
          <button type="button" onClick={onOpen} className="text-[13.5px] font-semibold text-ink underline-offset-2 hover:underline">
            Open it
          </button>
        </div>
        {hydrated ? (
          <ConceptMap states={demo.snap.states} misconceptions={demo.snap.misconceptions} showLegend={false} />
        ) : (
          <div className="aspect-[1.4] animate-pulse rounded-lg bg-navy/[.04]" />
        )}
      </div>
      <figcaption className="mt-3 px-1 text-[13.5px] leading-snug text-slate">
        Each well fills with ink as mastery grows. Red loops mark misconceptions that are still active. Lines run from a
        prerequisite to what it unlocks.
      </figcaption>
    </figure>
  );
}

function ClusterPreview() {
  const cls = syntheticClass();
  const count = cls.filter((s) => s.misconceptions.includes("current-consumed")).length;
  return (
    <div className="mt-5 rounded-[12px] border border-navy/10 p-4">
      <p className="hand text-[19px] text-redpen">Current gets used up</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-redpen-wash">
          <div className="h-full rounded-full bg-redpen" style={{ width: `${(count / cls.length) * 100}%` }} />
        </div>
        <span className="tabular text-[13.5px] font-semibold text-navy">
          {count} of {cls.length}
        </span>
      </div>
      <p className="hand mt-2 text-[16.5px] text-ink">&ldquo;pehla bulb thoda current use kar leta hai&rdquo;</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li>
      <span className="hand text-[34px] leading-none text-ink">{n}.</span>
      <h3 className="mt-2 text-[20px] font-bold text-navy">{title}</h3>
      <p className="mt-2 text-[15.5px] leading-relaxed text-navy/80">{body}</p>
    </li>
  );
}

function Mode({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-soft text-ink">{icon}</span>
      <div>
        <p className="text-[16.5px] font-bold text-navy">{title}</p>
        <p className="text-[15px] text-navy/75">{body}</p>
      </div>
    </li>
  );
}

function Tech({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="grid size-10 place-items-center rounded-full bg-white/10 text-highlight">{icon}</span>
      <h3 className="mt-3 text-[18px] font-bold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">{children}</p>
    </div>
  );
}

/** The one orchestrated moment: a notebook answer gets marked by the red pen. */
function HeroNotebook() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setStage(1), 700), setTimeout(() => setStage(2), 1900), setTimeout(() => setStage(3), 3000)];
    return () => ts.forEach(clearTimeout);
  }, []);
  return (
    <div className="relative">
      <div className="graph-paper relative overflow-hidden rounded-[18px] border border-grid-strong p-6 shadow-[0_30px_60px_-40px_rgba(22,32,74,.55)] sm:p-8">
        <div className="absolute inset-y-0 left-12 w-px bg-redpen/30 sm:left-14" aria-hidden />
        <div className="pl-8 sm:pl-10">
          <p className="text-[13px] font-semibold text-slate">Q4. Electricity</p>
          <p className="mt-1 text-[17px] font-semibold leading-snug text-navy">
            Two identical bulbs are connected in series to a cell. Which bulb glows brighter, and why?
          </p>
          <div className="mt-5 min-h-[112px]">
            {stage >= 1 && (
              <Handwriting className="block text-[21px] leading-[1.55]">
                <span className="block opacity-0" style={{ animation: "write 900ms ease-out forwards" }}>
                  The first one, because{" "}
                  {stage >= 2 ? <RedPenCircle>it uses up some of the current</RedPenCircle> : "it uses up some of the current"}, so less reaches the second bulb.
                </span>
              </Handwriting>
            )}
          </div>
          <div className="mt-4 min-h-[150px]">
            {stage >= 2 && (
              <MarginNote delay={500} className="text-[22px]">
                Misconception: current gets used up
              </MarginNote>
            )}
            {stage >= 3 && (
              <div className="mt-3 rounded-[12px] bg-white/90 p-4 ring-1 ring-navy/10" style={{ animation: "write 600ms ease-out" }}>
                <p className="text-[15px] leading-snug text-navy">
                  Both glow equally. A bulb uses <strong>energy</strong>, not current. An ammeter before and after it reads the same.
                </p>
                <div className="mt-3 grid gap-1">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-navy">Series circuits</span>
                    <span className="tabular font-semibold text-redpen">62% → 48%</span>
                  </div>
                  <InkBar p={0.48} from={0.62} height={7} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
