"use client";

import { ArrowRight, CalendarClock, FastForward, History, Network, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptMap } from "@/components/ConceptMap";
import { InkBar, InkDot, InkTube, InkWell } from "@/components/Ink";
import { MarginNote } from "@/components/RedPen";
import { Button, ButtonLink, Pill, Sheet } from "@/components/ui";
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS, descendantsOf } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { BKT, band, bandLabel, retention, rootCause } from "@/lib/engine/learner";
import { actionHref, chapterMastery, nextBestAction, overallMastery, type NextAction } from "@/lib/engine/policy";
import { useMisconceptionDef, useNow, useSamajh } from "@/lib/store";
import { cn, daysFromNow, pct, timeAgo } from "@/lib/utils";

export default function LearnPage() {
  return (
    <AppShell wide>
      <LearnHome />
    </AppShell>
  );
}

function LearnHome() {
  const s = useSamajh();
  const now = useNow();
  const [selected, setSelected] = useState<string | null>(null);

  const action = useMemo(
    () =>
      nextBestAction({
        diagnosticDone: s.diagnostic.status === "done",
        states: s.states,
        misconceptions: s.misconceptions,
        cards: s.cards,
        now,
      }),
    [s.diagnostic.status, s.states, s.misconceptions, s.cards, now],
  );

  if (!s.student) return <NoStudent />;

  const overall = overallMastery(s.states);
  const secure = CONCEPTS.filter((c) => band(s.states[c.id]) === "secure").length;
  const checked = CONCEPTS.filter((c) => (s.states[c.id]?.attempts ?? 0) > 0).length;
  const chapters = chapterMastery(s.states);

  const activeMis = Object.values(s.misconceptions).filter((m) => m.status !== "resolved").length;
  const dueNow = Object.values(s.cards).filter((c) => c.due <= now).length;

  return (
    <div className="grid gap-6">
      <Sheet className="graph-paper-faint flex flex-wrap items-center gap-x-8 gap-y-5 px-5 py-5 sm:px-7">
        <InkWell p={overall} caption="overall mastery" />
        <div className="min-w-[260px] flex-1">
          <p className="text-[15px] text-slate">Hi {s.student.name}. Here&rsquo;s what Samajh thinks you understand right now.</p>
          <h1 className="display mt-1 text-[32px] font-bold text-navy sm:text-[38px]">Your Class 10 Physics map</h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
            {CHAPTERS.map((c) => (
              <InkTube key={c.id} label={c.short} p={chapters[c.id]} color={c.color} />
            ))}
          </div>
        </div>
        <dl className="grid min-w-[190px] gap-2 border-navy/10 text-[14px] sm:border-l sm:pl-7">
          <Stat value={`${secure}/${CONCEPTS.length}`} label="concepts secure" />
          <Stat value={String(checked)} label="checked directly" />
          <Stat value={String(activeMis)} label={activeMis === 1 ? "misconception to fix" : "misconceptions to fix"} tone={activeMis ? "red" : undefined} />
          <Stat value={String(dueNow)} label={dueNow === 1 ? "review due" : "reviews due"} />
        </dl>
      </Sheet>

      <NextActionCard action={action} />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-6">
        <Sheet className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-navy">
              <Network className="size-4 text-ink" /> Concept graph
            </p>
            <p className="text-[13.5px] text-slate">Each line runs from a prerequisite to the concept it unlocks. Click a concept for details.</p>
          </div>
          <div className="graph-paper overflow-x-auto px-3 pb-4 pt-3 sm:px-5">
            <div className="min-w-[760px]">
              <ConceptMap
                states={s.states}
                misconceptions={s.misconceptions}
                selected={selected}
                onSelect={(id) => setSelected((cur) => (cur === id ? null : id))}
              />
            </div>
          </div>
        </Sheet>
        <RecentActivity />
        </div>

        <div className="grid content-start gap-6">
          {selected ? (
            <ConceptPanel id={selected} onClose={() => setSelected(null)} />
          ) : (
            <p className="rounded-[12px] border border-dashed border-navy/20 px-4 py-3 text-[14px] text-slate">
              Click any concept on the map to see its prerequisites, your history and its review schedule.
            </p>
          )}
          <RedPenList />
          <ReviewList />
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "red" }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className={cn("tabular w-12 text-right text-[19px] font-bold", tone === "red" ? "text-redpen" : "text-navy")}>{value}</dt>
      <dd className="text-slate">{label}</dd>
    </div>
  );
}

function NoStudent() {
  const loadDemo = useSamajh((s) => s.loadDemo);
  const router = useRouter();
  return (
    <Sheet className="mx-auto mt-10 max-w-xl p-8 text-center">
      <h1 className="display text-[30px] font-bold text-navy">No map yet</h1>
      <p className="mt-2 text-[16px] text-slate">
        Take the 10-question diagnostic to build your map, or look around as Aarav, a demo student three weeks in.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/diagnostic" size="lg">
          Take the diagnostic
        </ButtonLink>
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            loadDemo();
            router.refresh();
          }}
        >
          Explore as Aarav
        </Button>
      </div>
    </Sheet>
  );
}

function NextActionCard({ action }: { action: NextAction }) {
  const icon =
    action.kind === "fix" ? (
      <span className="hand text-[28px] leading-none text-redpen">!</span>
    ) : action.kind === "review" ? (
      <CalendarClock className="size-5" />
    ) : (
      <Target className="size-5" />
    );
  return (
    <div className="relative overflow-hidden next-step rounded-[20px] px-5 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-line bg-white text-navy shadow-[2px_2px_0_var(--color-line)]">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-slate">Your next best step, chosen by the tutor agent</p>
          <h2 className="mt-0.5 text-[21px] font-bold leading-tight text-navy sm:text-[23px]">{action.title}</h2>
          <p className="mt-1 max-w-[70ch] text-[15px] leading-snug text-navy/80">{action.why}</p>
        </div>
        <ButtonLink href={actionHref(action)} size="lg" className="shrink-0">
          {action.cta} <ArrowRight className="size-4" />
        </ButtonLink>
      </div>
    </div>
  );
}

function ConceptPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const s = useSamajh();
  const now = useNow();
  const c = CONCEPT_BY_ID[id];
  const st = s.states[id];
  const p = st?.p ?? BKT.pInit;
  const b = band(st);
  const root = p < 0.5 ? rootCause(s.states, id) : null;
  const card = s.cards[id];
  const mis = Object.values(s.misconceptions).filter(
    (m) => MISCONCEPTION_BY_ID[m.id]?.conceptIds.includes(id) && m.status !== "resolved",
  );
  const unlocks = descendantsOf(id).size;
  const hist = st?.history ?? [];
  return (
    <Sheet className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-slate">{CHAPTERS.find((ch) => ch.id === c.chapter)?.title}</p>
          <h3 className="mt-0.5 text-[21px] font-bold leading-tight text-navy">{c.title}</h3>
        </div>
        <button type="button" onClick={onClose} className="text-[13.5px] font-semibold text-slate hover:text-navy">
          Close
        </button>
      </div>
      <p className="mt-2 text-[14.5px] leading-snug text-navy/85">{c.summary}</p>
      {c.formula && <p className="mt-2 inline-block rounded-md bg-ink-wash px-2 py-1 text-[15px] font-semibold text-ink">{c.formula}</p>}

      <div className="mt-4 grid gap-1.5">
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-semibold text-navy">{bandLabel[b]}</span>
          <span className="tabular text-slate">
            {pct(p)} {(st?.attempts ?? 0) === 0 ? "estimated" : `· ${st.correct}/${st.attempts} correct`}
          </span>
        </div>
        <InkBar p={p} estimated={(st?.attempts ?? 0) === 0} />
        {hist.length > 1 && <Sparkline points={hist.map((h) => h.p)} />}
      </div>

      {root && (
        <p className="mt-4 rounded-[10px] bg-redpen-wash px-3 py-2 text-[14px] text-navy">
          <strong className="text-redpen">Root cause: </strong>
          {CONCEPT_BY_ID[root].title} is only at {pct(s.states[root]?.p ?? BKT.pInit)}. Fix that first and this concept gets easier.
        </p>
      )}

      {c.prereqs.length > 0 && (
        <div className="mt-4">
          <p className="text-[13px] font-semibold text-slate">Builds on</p>
          <ul className="mt-1.5 grid gap-1.5">
            {c.prereqs.map((pid) => (
              <li key={pid} className="flex items-center gap-2 text-[14px] text-navy">
                <InkDot p={s.states[pid]?.p ?? BKT.pInit} unseen={(s.states[pid]?.attempts ?? 0) === 0 && Math.abs((s.states[pid]?.p ?? BKT.pInit) - BKT.pInit) < 0.01} />
                {CONCEPT_BY_ID[pid].title}
                <span className="tabular ml-auto text-slate">{pct(s.states[pid]?.p ?? BKT.pInit)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {unlocks > 0 && <p className="mt-3 text-[13.5px] text-slate">Unlocks {unlocks} later concept{unlocks > 1 ? "s" : ""}.</p>}

      {mis.length > 0 && (
        <div className="mt-4">
          {mis.map((m) => (
            <MarginNote key={m.id} delay={0} className="text-[17px]">
              {MISCONCEPTION_BY_ID[m.id].title}
            </MarginNote>
          ))}
        </div>
      )}

      {card && (
        <p className="mt-4 flex items-center gap-2 text-[14px] text-navy">
          <CalendarClock className="size-4 text-ink" />
          Recall today {pct(retention(card, now))}. Next review {daysFromNow(card.due, now)}.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <ButtonLink href={`/practice?mode=learn&concept=${id}`}>Practise this concept</ButtonLink>
        {mis[0] && (
          <ButtonLink href={`/practice?mode=fix&mis=${mis[0].id}`} variant="danger">
            Fix the misconception
          </ButtonLink>
        )}
      </div>
    </Sheet>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 300;
  const h = 34;
  const pts = points.slice(-20);
  const step = pts.length > 1 ? w / (pts.length - 1) : w;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - 3 - p * (h - 6)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-9 w-full" aria-label="Mastery history" role="img">
      <line x1="0" x2={w} y1={h - 3 - 0.75 * (h - 6)} y2={h - 3 - 0.75 * (h - 6)} stroke="var(--color-good)" strokeOpacity=".35" strokeDasharray="3 4" />
      <path d={d} fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function RedPenList() {
  const s = useSamajh();
  const now = useNow();
  const lookup = useMisconceptionDef();
  const items = Object.values(s.misconceptions).sort(
    (a, b) => Number(a.status === "resolved") - Number(b.status === "resolved") || b.lastSeen - a.lastSeen,
  );
  return (
    <Sheet className="p-5">
      <h3 className="text-[17px] font-bold text-navy">Misconceptions Samajh caught</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-[14px] text-slate">
          None yet. When you explain your thinking, Samajh checks it against {Object.keys(MISCONCEPTION_BY_ID).length} documented misconceptions.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {items.map((m) => {
            const def = lookup(m.id);
            if (!def) return null;
            const resolved = m.status === "resolved";
            return (
              <li key={m.id} className={cn("rounded-[10px] border px-3 py-2.5", resolved ? "border-good/25 bg-good-wash/50" : "border-redpen/25 bg-redpen-wash/50")}>
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("hand text-[18px] leading-tight", resolved ? "text-good line-through decoration-2" : "text-redpen")}>{def.title}</p>
                  <Pill tone={resolved ? "good" : m.status === "resolving" ? "highlight" : "red"} className="shrink-0">
                    {m.status === "suspected" ? "Suspected" : m.status === "active" ? "Active" : m.status === "resolving" ? "Fixing" : "Fixed"}
                  </Pill>
                </div>
                {m.quotes[0] && !m.quotes[0].startsWith("Chose ") && (
                  <p className="hand mt-1 text-[16px] leading-snug text-ink">&ldquo;{m.quotes[0]}&rdquo;</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-slate">
                  <span>Last seen {timeAgo(m.lastSeen, now)}</span>
                  {!resolved && (
                    <Link href={`/practice?mode=fix&mis=${m.id}`} className="font-semibold text-redpen hover:underline">
                      Fix it
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

function ReviewList() {
  const s = useSamajh();
  const now = useNow();
  const timeTravel = useSamajh((x) => x.timeTravel);
  const cards = Object.values(s.cards).sort((a, b) => a.due - b.due);
  const due = cards.filter((c) => c.due <= now);
  return (
    <Sheet className="p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[17px] font-bold text-navy">Spaced review</h3>
        {due.length > 0 && <Pill tone="highlight">{due.length} due</Pill>}
      </div>
      {cards.length === 0 ? (
        <p className="mt-2 text-[14px] text-slate">
          Once a concept reaches 70% mastery, Samajh schedules reviews at growing intervals so it doesn&rsquo;t fade before the board exam.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {cards.slice(0, 7).map((c) => {
            const r = retention(c, now);
            const isDue = c.due <= now;
            return (
              <li key={c.conceptId} className="grid gap-1">
                <div className="flex items-center justify-between gap-2 text-[14px]">
                  <span className={cn("truncate", isDue ? "font-semibold text-navy" : "text-navy/85")}>{CONCEPT_BY_ID[c.conceptId]?.title}</span>
                  <span className={cn("tabular shrink-0 text-[12.5px]", isDue ? "font-semibold text-redpen" : "text-slate")}>
                    {isDue ? "due now" : daysFromNow(c.due, now)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy/[.06]">
                    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${r * 100}%`, background: r < 0.85 ? "var(--color-redpen)" : "var(--color-ink)", opacity: 0.75 }} />
                  </div>
                  <span className="tabular w-[74px] text-right text-[12px] text-slate">recall {pct(r)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-dashed border-navy/15 pt-3">
        {due.length > 0 && (
          <ButtonLink href="/practice?mode=review" size="sm">
            Review now
          </ButtonLink>
        )}
        <Button variant="quiet" size="sm" onClick={() => timeTravel(3)} title="Demo control: simulate the passing of time to see the forgetting curve">
          <FastForward className="size-3.5" /> Skip ahead 3 days
        </Button>
        {s.clockOffsetDays > 0 && <span className="text-[12px] text-slate">Simulated +{s.clockOffsetDays} days</span>}
      </div>
    </Sheet>
  );
}

function RecentActivity() {
  const s = useSamajh();
  const now = useNow();
  const recent = [...s.attempts].reverse().slice(0, 8);
  if (!recent.length) return null;
  return (
    <Sheet className="p-5">
      <h3 className="flex items-center gap-2 text-[17px] font-bold text-navy">
        <History className="size-4 text-ink" /> Recent answers
      </h3>
      <ul className="mt-3 grid gap-x-8 gap-y-2 md:grid-cols-2">
        {recent.map((a) => (
          <li key={a.id} className="flex items-center gap-3 text-[14px]">
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white", a.correct ? "bg-good" : "bg-redpen")}>
              {a.correct ? "✓" : "✗"}
            </span>
            <span className="min-w-0 flex-1 truncate text-navy">{CONCEPT_BY_ID[a.conceptId]?.title}</span>
            {a.reasoningMode && <Pill tone="ink" className="shrink-0">{a.reasoningMode === "photo" ? "photo" : a.reasoningMode === "voice" ? "voice" : "typed"}</Pill>}
            <span className={cn("tabular shrink-0 text-[12.5px]", a.masteryAfter >= a.masteryBefore ? "text-ink" : "text-redpen")}>
              {pct(a.masteryBefore)} → {pct(a.masteryAfter)}
            </span>
            <span className="hidden shrink-0 text-[12px] text-slate sm:inline">{timeAgo(a.t, now)}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
