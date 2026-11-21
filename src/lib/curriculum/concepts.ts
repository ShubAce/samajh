import type { Chapter, Concept } from "../types";

// CBSE Class 10 Science — Physics (rationalised syllabus):
// Light – Reflection & Refraction · Human Eye & Colourful World · Electricity · Magnetic Effects of Current

export const CHAPTERS: Chapter[] = [
  { id: "light", title: "Light – Reflection & Refraction", short: "Light", color: "#2F5BD3" },
  { id: "eye", title: "The Human Eye & the Colourful World", short: "Human Eye", color: "#7C4DDB" },
  { id: "electricity", title: "Electricity", short: "Electricity", color: "#D9822B" },
  { id: "magnetism", title: "Magnetic Effects of Electric Current", short: "Magnetism", color: "#0E9384" },
];

export const CONCEPTS: Concept[] = [
  // ───────────── Light ─────────────
  {
    id: "reflection-laws",
    chapter: "light",
    title: "Laws of reflection",
    short: "Reflection",
    summary:
      "Light travels in straight lines; angle of incidence equals angle of reflection, both measured from the normal; incident ray, reflected ray and normal lie in one plane.",
    prereqs: [],
    formula: "∠i = ∠r",
  },
  {
    id: "plane-mirror",
    chapter: "light",
    title: "Plane mirror images",
    short: "Plane mirror",
    summary:
      "Image is virtual, erect, same size, as far behind the mirror as the object is in front, and laterally inverted.",
    prereqs: ["reflection-laws"],
  },
  {
    id: "spherical-mirrors",
    chapter: "light",
    title: "Spherical mirror basics",
    short: "Spherical mirrors",
    summary:
      "Concave vs convex mirrors; pole, centre of curvature, principal axis, principal focus; R = 2f.",
    prereqs: ["reflection-laws"],
    formula: "R = 2f",
  },
  {
    id: "mirror-ray-diagrams",
    chapter: "light",
    title: "Mirror ray diagrams",
    short: "Mirror rays",
    summary:
      "Using standard rays to locate images; nature, size and position of images for concave and convex mirrors for different object positions.",
    prereqs: ["spherical-mirrors"],
  },
  {
    id: "sign-convention",
    chapter: "light",
    title: "New Cartesian sign convention",
    short: "Sign convention",
    summary:
      "Distances measured from the pole / optical centre; along the incident light positive, against it negative; heights above the axis positive.",
    prereqs: ["spherical-mirrors"],
  },
  {
    id: "mirror-formula",
    chapter: "light",
    title: "Mirror formula & magnification",
    short: "Mirror formula",
    summary: "1/v + 1/u = 1/f and m = h′/h = −v/u, applied with correct signs.",
    prereqs: ["mirror-ray-diagrams", "sign-convention"],
    formula: "1/v + 1/u = 1/f ;  m = −v/u",
  },
  {
    id: "refraction-laws",
    chapter: "light",
    title: "Refraction of light",
    short: "Refraction",
    summary:
      "Light bends when its speed changes between media: towards the normal entering an optically denser medium, away from it entering a rarer one (Snell's law).",
    prereqs: ["reflection-laws"],
    formula: "sin i / sin r = constant",
  },
  {
    id: "refractive-index",
    chapter: "light",
    title: "Refractive index",
    short: "Refractive index",
    summary:
      "n = c/v; relative refractive index; optically denser means light is slower there (not the same as mass density).",
    prereqs: ["refraction-laws"],
    formula: "n = c / v",
  },
  {
    id: "lens-ray-diagrams",
    chapter: "light",
    title: "Lens ray diagrams",
    short: "Lens rays",
    summary:
      "Convex (converging) and concave (diverging) lenses; optical centre and foci; nature and position of images for different object positions.",
    prereqs: ["refraction-laws", "spherical-mirrors"],
  },
  {
    id: "lens-formula",
    chapter: "light",
    title: "Lens formula & magnification",
    short: "Lens formula",
    summary: "1/v − 1/u = 1/f and m = v/u, applied with the sign convention.",
    prereqs: ["lens-ray-diagrams", "sign-convention"],
    formula: "1/v − 1/u = 1/f ;  m = v/u",
  },
  {
    id: "lens-power",
    chapter: "light",
    title: "Power of a lens",
    short: "Lens power",
    summary:
      "P = 1/f with f in metres (dioptre); convex positive, concave negative; powers add for lenses in contact.",
    prereqs: ["lens-formula"],
    formula: "P = 1/f  (f in m)",
  },

  // ───────────── Human eye ─────────────
  {
    id: "eye-accommodation",
    chapter: "eye",
    title: "Human eye & accommodation",
    short: "Accommodation",
    summary:
      "The eye lens forms images on the retina; ciliary muscles change the lens's focal length (accommodation); near point ≈ 25 cm, far point at infinity.",
    prereqs: ["lens-ray-diagrams"],
  },
  {
    id: "vision-defects",
    chapter: "eye",
    title: "Defects of vision & correction",
    short: "Vision defects",
    summary:
      "Myopia (corrected with a concave lens), hypermetropia (convex lens), presbyopia (bifocals) — causes and corrections.",
    prereqs: ["eye-accommodation", "lens-power"],
  },
  {
    id: "prism-refraction",
    chapter: "eye",
    title: "Refraction through a prism",
    short: "Prism",
    summary: "Light bends at both faces of a prism; angle of deviation.",
    prereqs: ["refraction-laws"],
  },
  {
    id: "dispersion",
    chapter: "eye",
    title: "Dispersion & the spectrum",
    short: "Dispersion",
    summary:
      "White light splits into VIBGYOR because each colour bends by a different amount (violet most, red least); rainbows.",
    prereqs: ["prism-refraction", "refractive-index"],
  },
  {
    id: "atmospheric-refraction",
    chapter: "eye",
    title: "Atmospheric refraction",
    short: "Atmos. refraction",
    summary:
      "Changing refractive index of air causes twinkling of stars, advanced sunrise and delayed sunset; planets do not twinkle.",
    prereqs: ["refractive-index"],
  },
  {
    id: "scattering",
    chapter: "eye",
    title: "Scattering of light",
    short: "Scattering",
    summary:
      "Tyndall effect; shorter wavelengths (blue) scatter much more — blue sky; reddish sunrise and sunset because blue is scattered out over the long path.",
    prereqs: ["dispersion"],
  },

  // ───────────── Electricity ─────────────
  {
    id: "current-charge",
    chapter: "electricity",
    title: "Electric charge & current",
    short: "Current",
    summary:
      "Current is the rate of flow of charge (I = Q/t); conventional current flows + to −, opposite to electron flow; ammeter goes in series.",
    prereqs: [],
    formula: "I = Q / t",
  },
  {
    id: "potential-difference",
    chapter: "electricity",
    title: "Potential difference",
    short: "Voltage",
    summary: "V = W/Q — work done per unit charge between two points; voltmeter goes in parallel.",
    prereqs: ["current-charge"],
    formula: "V = W / Q",
  },
  {
    id: "circuit-diagrams",
    chapter: "electricity",
    title: "Circuit diagrams",
    short: "Circuits",
    summary: "Standard symbols, closed circuits, and where ammeters and voltmeters are connected.",
    prereqs: ["current-charge"],
  },
  {
    id: "ohms-law",
    chapter: "electricity",
    title: "Ohm's law",
    short: "Ohm's law",
    summary:
      "V = IR at constant temperature; the V–I graph is a straight line; resistance is a property of the conductor, not of the voltage applied.",
    prereqs: ["potential-difference", "circuit-diagrams"],
    formula: "V = I R",
  },
  {
    id: "resistivity",
    chapter: "electricity",
    title: "Resistance & resistivity",
    short: "Resistivity",
    summary:
      "R = ρl/A: resistance depends on length, area, material and temperature; resistivity depends only on the material (and temperature).",
    prereqs: ["ohms-law"],
    formula: "R = ρ l / A",
  },
  {
    id: "series-circuits",
    chapter: "electricity",
    title: "Resistors in series",
    short: "Series",
    summary: "Rs = R₁ + R₂ + …; the same current flows through each; the voltage divides.",
    prereqs: ["ohms-law"],
    formula: "Rs = R₁ + R₂ + R₃",
  },
  {
    id: "parallel-circuits",
    chapter: "electricity",
    title: "Resistors in parallel",
    short: "Parallel",
    summary:
      "1/Rp = 1/R₁ + 1/R₂ + …; same voltage across each branch; current divides; Rp is less than the smallest resistor.",
    prereqs: ["ohms-law"],
    formula: "1/Rp = 1/R₁ + 1/R₂",
  },
  {
    id: "heating-effect",
    chapter: "electricity",
    title: "Heating effect of current",
    short: "Joule heating",
    summary: "H = I²Rt (Joule's law); heaters, filament bulbs and fuses.",
    prereqs: ["ohms-law"],
    formula: "H = I² R t",
  },
  {
    id: "electric-power",
    chapter: "electricity",
    title: "Electric power & energy",
    short: "Power",
    summary: "P = VI = I²R = V²/R; commercial unit kWh; 1 kWh = 3.6 × 10⁶ J.",
    prereqs: ["heating-effect"],
    formula: "P = VI = I²R = V²/R",
  },
  {
    id: "combined-circuits",
    chapter: "electricity",
    title: "Combined circuits & brightness",
    short: "Combined circuits",
    summary:
      "Analysing series–parallel combinations and predicting bulb brightness from the power each bulb actually dissipates.",
    prereqs: ["series-circuits", "parallel-circuits", "electric-power"],
  },

  // ───────────── Magnetism ─────────────
  {
    id: "magnetic-field-lines",
    chapter: "magnetism",
    title: "Magnetic field & field lines",
    short: "Field lines",
    summary:
      "Field lines run N→S outside a magnet and S→N inside, forming closed loops; crowding shows strength; they never intersect.",
    prereqs: [],
  },
  {
    id: "field-due-to-current",
    chapter: "magnetism",
    title: "Magnetic field due to a current",
    short: "Field of a current",
    summary:
      "Straight wire: concentric circles (right-hand thumb rule); circular loop; a solenoid behaves like a bar magnet — electromagnets.",
    prereqs: ["magnetic-field-lines", "current-charge"],
  },
  {
    id: "force-on-conductor",
    chapter: "magnetism",
    title: "Force on a current-carrying conductor",
    short: "Force on conductor",
    summary:
      "A current-carrying conductor in a magnetic field feels a force, maximum when perpendicular to the field; direction by Fleming's left-hand rule.",
    prereqs: ["field-due-to-current"],
  },
  {
    id: "domestic-circuits",
    chapter: "magnetism",
    title: "Domestic electric circuits",
    short: "Domestic circuits",
    summary:
      "Live, neutral and earth wires; appliances in parallel; fuse / MCB in the live wire; overloading and short circuits; AC at 50 Hz in India.",
    prereqs: ["electric-power", "parallel-circuits"],
  },
];

export const CONCEPT_BY_ID: Record<string, Concept> = Object.fromEntries(
  CONCEPTS.map((c) => [c.id, c]),
);

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((c) => [c.id, c])) as Record<
  Chapter["id"],
  Chapter
>;

/** concepts that list `id` as a prerequisite */
export function dependentsOf(id: string): string[] {
  return CONCEPTS.filter((c) => c.prereqs.includes(id)).map((c) => c.id);
}

/** all ancestors (transitive prerequisites) with graph distance */
export function ancestorsOf(id: string): Map<string, number> {
  const out = new Map<string, number>();
  const queue: [string, number][] = (CONCEPT_BY_ID[id]?.prereqs ?? []).map((p) => [p, 1]);
  while (queue.length) {
    const [cur, d] = queue.shift()!;
    if (out.has(cur) && out.get(cur)! <= d) continue;
    out.set(cur, d);
    for (const p of CONCEPT_BY_ID[cur]?.prereqs ?? []) queue.push([p, d + 1]);
  }
  return out;
}

/** all descendants (concepts that transitively depend on id) with graph distance */
export function descendantsOf(id: string): Map<string, number> {
  const out = new Map<string, number>();
  const queue: [string, number][] = dependentsOf(id).map((p) => [p, 1]);
  while (queue.length) {
    const [cur, d] = queue.shift()!;
    if (out.has(cur) && out.get(cur)! <= d) continue;
    out.set(cur, d);
    for (const p of dependentsOf(cur)) queue.push([p, d + 1]);
  }
  return out;
}

/** depth = longest prerequisite chain length (used for layout) */
export function depthOf(id: string, memo: Record<string, number> = {}): number {
  if (memo[id] !== undefined) return memo[id];
  const c = CONCEPT_BY_ID[id];
  const d = !c || c.prereqs.length === 0 ? 0 : 1 + Math.max(...c.prereqs.map((p) => depthOf(p, memo)));
  memo[id] = d;
  return d;
}
