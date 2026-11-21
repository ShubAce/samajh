"use client";

import { Check, ChevronDown, Sparkles, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { InkBar } from "@/components/Ink";
import { MarginNote } from "@/components/RedPen";
import { Button, Pill, Sheet, Spinner } from "@/components/ui";
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS, ancestorsOf } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { BKT } from "@/lib/engine/learner";
import { syntheticClass, type ClassStudent } from "@/lib/seed/class";
import { useSamajh } from "@/lib/store";
import type { Misconception, ReteachPlan } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

export default function TeacherPage() {
  return (
    <AppShell wide>
      <TeacherDashboard />
    </AppShell>
  );
}

function useRoster() {
  const student = useSamajh((s) => s.student);
  const states = useSamajh((s) => s.states);
  const misconceptions = useSamajh((s) => s.misconceptions);
  const attempts = useSamajh((s) => s.attempts.length);
  return useMemo(() => {
    const cls = syntheticClass();
    if (!student) return { roster: cls, liveId: null as string | null };
    const mis = Object.values(misconceptions).filter((m) => m.status !== "resolved");
    const live: ClassStudent = {
      id: "live",
      name: `${student.name} (live)`,
      mastery: Object.fromEntries(CONCEPTS.map((c) => [c.id, states[c.id]?.p ?? BKT.pInit])),
      misconceptions: mis.map((m) => m.id),
      quotes: Object.fromEntries(mis.filter((m) => m.quotes[0] && !m.quotes[0].startsWith("Chose ")).map((m) => [m.id, m.quotes[0]])),
      lastActiveDays: 0,
      attempts,
    };
    return { roster: [live, ...cls], liveId: "live" };
  }, [student, states, misconceptions, attempts]);
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function TeacherDashboard() {
  const { roster, liveId } = useRoster();
  const discovered = useSamajh((s) => s.discovered);
  const n = roster.length;

  const clusters = useMemo(() => {
    const map = new Map<string, ClassStudent[]>();
    for (const s of roster) for (const m of s.misconceptions) map.set(m, [...(map.get(m) ?? []), s]);
    return [...map.entries()]
      .map(([id, students]) => ({ id, students, def: MISCONCEPTION_BY_ID[id] ?? discovered.find((d) => d.id === id) }))
      .filter((c) => c.def)
      .sort((a, b) => b.students.length - a.students.length);
  }, [roster, discovered]);

  const gaps = useMemo(() => {
    return CONCEPTS.map((c) => {
      const vals = roster.map((s) => s.mastery[c.id] ?? BKT.pInit);
      return { c, mean: avg(vals), below: vals.filter((v) => v < 0.5).length };
    }).sort((a, b) => a.mean - b.mean);
  }, [roster]);

  const classMean = avg(gaps.map((g) => g.mean));
  const weakChapter = [...CHAPTERS]
    .map((ch) => ({ ch, m: avg(gaps.filter((g) => g.c.chapter === ch.id).map((g) => g.mean)) }))
    .sort((a, b) => a.m - b.m)[0];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-[15px] text-slate">
            <Users className="size-4" /> Class 10-B Physics · {n} students
          </p>
          <h1 className="display mt-1 text-[34px] font-bold text-navy sm:text-[40px]">Where your class is stuck, and why</h1>
          <p className="mt-1 max-w-[75ch] text-[15px] text-slate">
            {clusters[0]
              ? `The biggest single issue is a misconception, not a topic: ${clusters[0].students.length} of ${n} students show "${clusters[0].def!.title.toLowerCase()}".`
              : "No misconceptions detected yet."}
            {` Weakest chapter: ${weakChapter.ch.short} (${pct(weakChapter.m)} average mastery).`}
          </p>
        </div>
        <p className="max-w-[44ch] text-[12.5px] leading-snug text-slate">
          {liveId ? "Includes your live session, marked (live). " : ""}The other students are a realistic simulated class so the dashboard has something to show in a demo.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Clusters clusters={clusters} n={n} />
        <Gaps gaps={gaps} n={n} classMean={classMean} />
      </div>

      <Proposals />
      <Heatmap roster={roster} liveId={liveId} />
    </div>
  );
}

type Cluster = { id: string; students: ClassStudent[]; def?: Misconception };

function Clusters({ clusters, n }: { clusters: Cluster[]; n: number }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Sheet className="p-5 sm:p-6">
      <h2 className="text-[19px] font-bold text-navy">Misconceptions spreading in the class</h2>
      <p className="mt-1 text-[14px] text-slate">Grouped by the faulty idea behind the wrong answers, not by chapter. Fix one idea and marks improve across several topics.</p>
      <ul className="mt-4 grid gap-3">
        {clusters.slice(0, 7).map((c) => (
          <li key={c.id} className="rounded-[12px] border border-navy/10 bg-white">
            <button
              type="button"
              className="flex w-full items-start gap-3 px-4 py-3 text-left"
              onClick={() => setOpen((o) => (o === c.id ? null : c.id))}
              aria-expanded={open === c.id}
            >
              <div className="min-w-0 flex-1">
                <p className="hand text-[19px] leading-tight text-redpen">{c.def!.title}</p>
                <p className="mt-0.5 text-[13px] text-slate">
                  {c.def!.conceptIds.map((id) => CONCEPT_BY_ID[id]?.short).join(", ")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-redpen-wash">
                    <div className="h-full rounded-full bg-redpen" style={{ width: `${(c.students.length / n) * 100}%` }} />
                  </div>
                  <span className="tabular shrink-0 text-[13.5px] font-semibold text-navy">
                    {c.students.length} of {n}
                  </span>
                </div>
              </div>
              <ChevronDown className={cn("mt-1 size-5 shrink-0 text-slate transition-transform", open === c.id && "rotate-180")} />
            </button>
            {open === c.id && <ClusterDetail cluster={c} n={n} />}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function ClusterDetail({ cluster, n }: { cluster: Cluster; n: number }) {
  const [plan, setPlan] = useState<ReteachPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const quotes = cluster.students.map((s) => s.quotes[cluster.id]).filter(Boolean).slice(0, 3);
  async function makePlan() {
    setLoading(true);
    try {
      const res = await fetch("/api/reteach", {
        method: "POST",
        signal: AbortSignal.timeout(50_000),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          misconceptionId: cluster.id,
          misconception: cluster.def,
          affected: cluster.students.length,
          classSize: n,
          quotes,
        }),
      });
      if (res.ok) setPlan((await res.json()) as ReteachPlan);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="border-t border-dashed border-navy/15 px-4 pb-4 pt-3">
      <p className="text-[14px] text-navy">{cluster.def!.description}</p>
      {quotes.length > 0 && (
        <div className="mt-3">
          <p className="text-[12.5px] font-semibold text-slate">What students wrote or said</p>
          <ul className="mt-1 grid gap-1">
            {quotes.map((q) => (
              <li key={q} className="hand text-[17px] leading-snug text-ink">
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[13px] text-slate">
        <span className="font-semibold text-navy">Students: </span>
        {cluster.students.slice(0, 8).map((s) => s.name.split(" ")[0]).join(", ")}
        {cluster.students.length > 8 ? ` and ${cluster.students.length - 8} more` : ""}
      </p>
      {!plan ? (
        <Button className="mt-4" onClick={makePlan} disabled={loading}>
          {loading ? <Spinner /> : <Sparkles className="size-4" />} {loading ? "Planning with Gemini…" : "Plan a 10-minute reteach"}
        </Button>
      ) : (
        <ReteachView plan={plan} />
      )}
    </div>
  );
}

function ReteachView({ plan }: { plan: ReteachPlan }) {
  return (
    <div className="mt-4 grid gap-3 rounded-[12px] bg-ink-wash/70 p-4">
      <p className="text-[16px] font-bold leading-snug text-navy">{plan.headline}</p>
      <p className="text-[14px] text-navy/85">{plan.whyItHappens}</p>
      <div>
        <p className="text-[14px] font-semibold text-navy">
          {plan.activity.title} <span className="font-normal text-slate">· {plan.activity.minutes} min</span>
        </p>
        <ol className="mt-1.5 grid list-decimal gap-1 pl-5 text-[14px] text-navy">
          {plan.activity.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </div>
      <div className="rounded-[10px] bg-[#1f2a2a] px-4 py-3 text-[#eef3ea]">
        <p className="text-[12px] font-semibold opacity-70">On the board</p>
        <p className="hand mt-0.5 whitespace-pre-line text-[18px] leading-snug">{plan.boardExplanation}</p>
      </div>
      <details>
        <summary className="cursor-pointer text-[14px] font-semibold text-ink">3 exit-check questions</summary>
        <ol className="mt-2 grid list-decimal gap-2 pl-5 text-[14px] text-navy">
          {plan.checkQuestions.map((q) => (
            <li key={q.question}>
              {q.question}
              <span className="block text-slate">Answer: {q.answer}</span>
            </li>
          ))}
        </ol>
      </details>
      <p className="text-[13.5px] text-slate">
        <span className="font-semibold text-navy">Grouping: </span>
        {plan.grouping}
      </p>
      {plan.engine === "fallback" && <p className="text-[12px] text-slate">Generated from the misconception library (AI unavailable).</p>}
    </div>
  );
}

function Gaps({ gaps, n, classMean }: { gaps: { c: (typeof CONCEPTS)[number]; mean: number; below: number }[]; n: number; classMean: number }) {
  const means = useMemo(() => Object.fromEntries(gaps.map((g) => [g.c.id, g.mean])), [gaps]);
  return (
    <Sheet className="p-5 sm:p-6">
      <h2 className="text-[19px] font-bold text-navy">Weakest concepts</h2>
      <p className="mt-1 text-[14px] text-slate">Class average mastery is {pct(classMean)}. Where a weak concept sits on a weak prerequisite, the prerequisite is named.</p>
      <ul className="mt-4 grid gap-3">
        {gaps.slice(0, 8).map((g) => {
          const weakAnc = [...ancestorsOf(g.c.id).entries()]
            .filter(([id]) => means[id] < 0.5)
            .sort((a, b) => b[1] - a[1])[0];
          return (
            <li key={g.c.id} className="grid gap-1">
              <div className="flex items-baseline justify-between gap-2 text-[14.5px]">
                <span className="font-semibold text-navy">{g.c.title}</span>
                <span className="tabular shrink-0 text-[13px] text-slate">
                  {pct(g.mean)} · {g.below} of {n} below 50%
                </span>
              </div>
              <InkBar p={g.mean} height={7} />
              {weakAnc && (
                <p className="text-[12.5px] text-slate">
                  Rooted in <span className="font-semibold text-redpen">{CONCEPT_BY_ID[weakAnc[0]].title}</span> ({pct(means[weakAnc[0]])})
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function Proposals() {
  const proposals = useSamajh((s) => s.proposals);
  const approve = useSamajh((s) => s.approveProposal);
  const reject = useSamajh((s) => s.rejectProposal);
  const pending = proposals.filter((p) => p.status === "pending");
  const decided = proposals.filter((p) => p.status !== "pending").slice(0, 3);
  return (
    <Sheet className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[19px] font-bold text-navy">New misconceptions Samajh found</h2>
        {pending.length > 0 && <Pill tone="red">{pending.length} waiting for you</Pill>}
      </div>
      <p className="mt-1 max-w-[80ch] text-[14px] text-slate">
        When a student&rsquo;s reasoning shows a faulty idea that isn&rsquo;t in the library, Gemini drafts a new entry. Nothing is added until you approve it. Once approved, Samajh checks every student for it.
      </p>
      {pending.length === 0 && decided.length === 0 && <p className="mt-4 text-[14px] text-slate">Nothing new right now.</p>}
      <ul className="mt-4 grid gap-3 lg:grid-cols-2">
        {pending.map((p) => (
          <li key={p.id} className="rounded-[12px] border border-redpen/25 bg-white p-4">
            <MarginNote delay={0} className="text-[19px]">{p.title}</MarginNote>
            <p className="mt-1 text-[14px] text-navy">{p.description}</p>
            <p className="hand mt-2 text-[16.5px] leading-snug text-ink">&ldquo;{p.evidenceQuote}&rdquo;</p>
            <p className="mt-1 text-[12.5px] text-slate">
              {p.studentName} · {CONCEPT_BY_ID[p.conceptId]?.title}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => approve(p.id)}>
                <Check className="size-4" /> Add to library
              </Button>
              <Button size="sm" variant="outline" onClick={() => reject(p.id)}>
                <X className="size-4" /> Not a misconception
              </Button>
            </div>
          </li>
        ))}
        {decided.map((p) => (
          <li key={p.id} className="rounded-[12px] border border-navy/10 bg-white/70 p-4 opacity-80">
            <p className="text-[15px] font-semibold text-navy">{p.title}</p>
            <p className="mt-1 text-[13px] text-slate">
              {p.status === "approved" ? "Added to the library. Samajh now checks every student's reasoning for it." : "Dismissed."}
            </p>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}

function Heatmap({ roster, liveId }: { roster: ClassStudent[]; liveId: string | null }) {
  const rows = useMemo(
    () =>
      [...roster].sort((a, b) => {
        if (a.id === liveId) return -1;
        if (b.id === liveId) return 1;
        return avg(Object.values(a.mastery)) - avg(Object.values(b.mastery));
      }),
    [roster, liveId],
  );
  const cols = CHAPTERS.flatMap((ch) => CONCEPTS.filter((c) => c.chapter === ch.id));
  const [hover, setHover] = useState<{ s: string; c: string; p: number } | null>(null);
  return (
    <Sheet className="p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[19px] font-bold text-navy">Every student, every concept</h2>
        <p className="text-[13px] text-slate">
          {hover ? (
            <>
              <span className="font-semibold text-navy">{hover.s}</span> · {CONCEPT_BY_ID[hover.c].title} ·{" "}
              <span className="tabular font-semibold text-ink">{pct(hover.p)}</span>
            </>
          ) : (
            "Darker ink = stronger mastery. Struggling students at the top. Hover a cell for details."
          )}
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="border-separate" style={{ borderSpacing: 2 }} onMouseLeave={() => setHover(null)}>
          <thead>
            <tr>
              <th />
              {CHAPTERS.map((ch) => (
                <th
                  key={ch.id}
                  colSpan={CONCEPTS.filter((c) => c.chapter === ch.id).length}
                  className="border-b border-navy/15 pb-1 text-left text-[12px] font-semibold text-slate"
                >
                  {ch.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <th scope="row" className={cn("whitespace-nowrap pr-3 text-left text-[12.5px] font-medium", s.id === liveId ? "text-ink font-bold" : "text-navy")}>
                  {s.name}
                </th>
                {cols.map((c) => {
                  const p = s.mastery[c.id] ?? BKT.pInit;
                  return (
                    <td
                      key={c.id}
                      onMouseEnter={() => setHover({ s: s.name, c: c.id, p })}
                      title={`${s.name}: ${c.title} ${pct(p)}`}
                      className="size-[15px] min-w-[15px] rounded-[3px]"
                      style={{
                        background: `color-mix(in srgb, var(--color-ink) ${Math.round(p * 100)}%, #f3f5fb)`,
                        outline: hover?.c === c.id || hover?.s === s.name ? "1px solid rgba(22,32,74,.25)" : undefined,
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Sheet>
  );
}
