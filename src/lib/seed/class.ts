// Deterministic synthetic class (Class 10-B) used for the teacher dashboard and for
// calibrating question difficulty before any real student has answered.
import { CHAPTERS, CONCEPTS, CONCEPT_BY_ID } from "../curriculum/concepts";
import { MISCONCEPTIONS, MISCONCEPTION_BY_ID } from "../curriculum/misconceptions";
import { SEED_QUESTIONS } from "../curriculum/questions";
import { clamp, difficultyToRating, effectiveTheta, eloUpdate, expectedCorrect } from "../engine/learner";
import type { QuestionStat } from "../engine/policy";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number) {
  const u = Math.max(1e-9, r());
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const NAMES = [
  "Ananya Iyer", "Vihaan Sharma", "Diya Patel", "Arjun Nair", "Ishaan Gupta", "Saanvi Reddy",
  "Kabir Singh", "Myra Joshi", "Reyansh Kulkarni", "Aditi Rao", "Rohan Das", "Priya Menon",
  "Krish Agarwal", "Meera Pillai", "Aryan Chauhan", "Zoya Khan", "Dev Malhotra", "Kavya Hegde",
  "Nikhil Verma", "Sara Thomas", "Yash Jain", "Tanvi Deshpande", "Rahul Yadav", "Fatima Shaikh",
  "Harsh Bansal", "Riya Saxena", "Aditya Mishra", "Neha Bhatt", "Kunal Mehta", "Ishita Ghosh",
  "Manav Arora", "Pooja Nambiar", "Siddharth Bose", "Anika Kapoor", "Omkar Patil", "Simran Kaur",
];

// how common each misconception is in a typical class (before ability weighting)
const PREVALENCE: Record<string, number> = {
  "current-consumed": 0.5, "battery-constant-current": 0.3, "parallel-adds-like-series": 0.3,
  "more-resistors-more-resistance": 0.22, "sequential-reasoning": 0.18, "voltage-flows": 0.15,
  "resistance-depends-on-voltage": 0.2, "resistivity-depends-on-shape": 0.25, "brightness-one-rule": 0.33,
  "power-formula-misuse": 0.27, "current-direction-electrons": 0.12, "heat-linear-in-current": 0.17,
  "kwh-is-power": 0.2, "image-on-mirror-surface": 0.14, "concave-always-magnifies": 0.2,
  "ignores-sign-convention": 0.36, "mirror-lens-formula-swap": 0.24, "bends-away-in-denser": 0.1,
  "denser-means-faster": 0.16, "convex-lens-always-real": 0.18, "half-lens-half-image": 0.3,
  "lens-power-sign-units": 0.22, "accommodation-lens-moves": 0.19, "myopia-convex": 0.21,
  "prism-adds-colour": 0.12, "red-scatters-most": 0.24, "planets-twinkle": 0.2, "field-lines-cross": 0.1,
  "field-inside-n-to-s": 0.26, "hand-rule-swap": 0.3, "force-along-field": 0.15,
  "stationary-charge-field": 0.09, "fuse-in-neutral": 0.13, "short-circuit-no-current": 0.11,
};

// What students actually wrote or said (incl. Hinglish) — shown to the teacher as evidence.
const QUOTES: Record<string, string[]> = {
  "current-consumed": [
    "pehla bulb thoda current use kar leta hai, isliye doosra bulb dim hai",
    "less current comes out of the bulb than goes in, it gets used for light",
    "the first resistor takes some current so A2 reads less",
  ],
  "ignores-sign-convention": [
    "u = 30 cm, f = 20 cm so 1/v = 1/20 − 1/30",
    "distance can't be negative so I took u as +15",
  ],
  "parallel-adds-like-series": ["two 4 Ω in parallel = 8 Ω total", "resistances always add, so 6 + 3 = 9 Ω"],
  "battery-constant-current": [
    "the cell gives 2 A, so each branch gets 1 A whatever we add",
    "battery ka current fixed hota hai, branches mein bas divide hota hai",
  ],
  "brightness-one-rule": ["100 W bulb is always brighter, its power is more"],
  "hand-rule-swap": ["I used right hand thumb rule to find the direction of force"],
  "half-lens-half-image": ["half lens cover kiya toh aadhi image hi banegi"],
  "red-scatters-most": ["sunset is red because red light scatters the most"],
  "power-formula-misuse": ["P = I²R so the heater with more resistance gives more heat"],
  "field-inside-n-to-s": ["field lines go north to south inside also"],
};

export interface ClassStudent {
  id: string;
  name: string;
  mastery: Record<string, number>;
  misconceptions: string[];
  quotes: Record<string, string>;
  lastActiveDays: number;
  attempts: number;
}

let _class: ClassStudent[] | null = null;
let _calibration: Record<string, QuestionStat> | null = null;

export function syntheticClass(): ClassStudent[] {
  if (_class) return _class;
  const r = mulberry32(1021);
  const order = topoOrder();
  _class = NAMES.map((name, i) => {
    const ability = clamp(0.64 + gauss(r) * 0.15, 0.22, 0.95);
    const chBias: Record<string, number> = Object.fromEntries(CHAPTERS.map((c) => [c.id, gauss(r) * 0.09]));
    const mis = MISCONCEPTIONS.filter((m) => r() < clamp((PREVALENCE[m.id] ?? 0.15) * (1.55 - ability), 0, 0.85)).map(
      (m) => m.id,
    );
    const mastery: Record<string, number> = {};
    for (const id of order) {
      const c = CONCEPT_BY_ID[id];
      let v = ability + chBias[c.chapter] + gauss(r) * 0.1;
      if (c.prereqs.length) {
        const mp = c.prereqs.reduce((s, p) => s + mastery[p], 0) / c.prereqs.length;
        if (mp < 0.5) v -= (0.5 - mp) * 0.5;
      }
      const hits = mis.filter((m) => MISCONCEPTION_BY_ID[m]?.conceptIds.includes(id)).length;
      v -= hits * 0.12;
      mastery[id] = clamp(v, 0.03, 0.97);
    }
    const quotes: Record<string, string> = {};
    for (const m of mis) {
      const bank = QUOTES[m];
      quotes[m] = bank ? bank[Math.floor(r() * bank.length)] : MISCONCEPTION_BY_ID[m].studentVoice;
    }
    return {
      id: `s${i + 1}`,
      name,
      mastery,
      misconceptions: mis,
      quotes,
      lastActiveDays: Math.floor(r() * r() * 9),
      attempts: 18 + Math.floor(r() * 70),
    };
  });
  return _class;
}

function topoOrder(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    for (const p of CONCEPT_BY_ID[id].prereqs) visit(p);
    out.push(id);
  };
  CONCEPTS.forEach((c) => visit(c.id));
  return out;
}

/** Elo-calibrate every seed question from the class's simulated responses */
export function classCalibration(): Record<string, QuestionStat> {
  if (_calibration) return _calibration;
  const r = mulberry32(77);
  const students = syntheticClass();
  const trueRating: Record<string, number> = {};
  const stats: Record<string, QuestionStat> = {};
  for (const q of SEED_QUESTIONS) {
    const init = difficultyToRating(q.difficulty);
    trueRating[q.id] = init + gauss(r) * 70;
    stats[q.id] = { rating: init, n: 0, correct: 0, initialRating: init };
  }
  const responses: { s: ClassStudent; qid: string }[] = [];
  for (const s of students) for (const q of SEED_QUESTIONS) if (r() < 0.75) responses.push({ s, qid: q.id });
  responses.sort(() => r() - 0.5);
  for (const { s, qid } of responses) {
    const q = SEED_QUESTIONS.find((x) => x.id === qid)!;
    const ability = Object.values(s.mastery).reduce((a, b) => a + b, 0) / CONCEPTS.length;
    const theta = 1000 + 380 * (ability - 0.55);
    const eff = effectiveTheta(theta, s.mastery[q.conceptId]);
    const trap = q.options.some((o) => o.misconceptionId && s.misconceptions.includes(o.misconceptionId));
    const pTrue = expectedCorrect(eff, trueRating[qid]) * (trap ? 0.55 : 1);
    const correct = r() < pTrue;
    const st = stats[qid];
    const upd = eloUpdate(eff, st.rating, st.n, correct);
    stats[qid] = { ...st, rating: upd.rating, n: st.n + 1, correct: st.correct + (correct ? 1 : 0) };
  }
  _calibration = stats;
  return stats;
}
