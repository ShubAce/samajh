import type { Misconception } from "../types";

// Curated from well-documented physics-education research on student alternative conceptions
// (e.g. current-consumption model, sequential reasoning, battery-as-constant-current-source,
// ray-optics and colour misconceptions). Each one is tied to the concepts where it shows up.

export const MISCONCEPTIONS: Misconception[] = [
  // ───────────── Electricity ─────────────
  {
    id: "current-consumed",
    title: "Current gets used up",
    description:
      "Believes components consume current, so less current flows out of a bulb or resistor than flows into it.",
    studentVoice: "The first bulb uses up some current, so less is left for the second bulb.",
    conceptIds: ["current-charge", "series-circuits", "combined-circuits"],
    remedy:
      "Put ammeters before and after a bulb in series: both read the same. Energy is transferred, charge is conserved.",
  },
  {
    id: "battery-constant-current",
    title: "Battery gives a fixed current",
    description:
      "Treats a battery as a constant-current source instead of a (nearly) constant-voltage source, so ignores how circuit resistance changes the current drawn.",
    studentVoice: "The cell always gives the same current, so adding a branch just splits that current.",
    conceptIds: ["ohms-law", "parallel-circuits", "combined-circuits"],
    remedy:
      "Compare one bulb vs two bulbs in parallel on the same cell: total current doubles because the voltage stays fixed and resistance halves.",
  },
  {
    id: "parallel-adds-like-series",
    title: "Parallel resistances add up",
    description: "Adds resistances in parallel directly (R₁ + R₂) as if they were in series.",
    studentVoice: "Two 6 Ω resistors in parallel make 12 Ω.",
    conceptIds: ["parallel-circuits", "combined-circuits"],
    remedy:
      "Think of lanes on a road: opening a second lane makes traffic flow easier, not harder. 1/Rp = 1/R₁ + 1/R₂.",
  },
  {
    id: "more-resistors-more-resistance",
    title: "More resistors always means more resistance",
    description:
      "Believes adding any resistor increases total resistance, even when it is added in parallel.",
    studentVoice: "Adding another resistor means more opposition, so total resistance goes up.",
    conceptIds: ["parallel-circuits", "combined-circuits"],
    remedy:
      "Show that Rp is always smaller than the smallest branch — each new branch is an extra path for charge.",
  },
  {
    id: "sequential-reasoning",
    title: "Sequential (upstream-downstream) reasoning",
    description:
      "Thinks a change in a circuit only affects components 'after' it in the direction of current, instead of the circuit responding as a whole system.",
    studentVoice: "Changing the resistor after the bulb won't affect the bulb because the current already passed it.",
    conceptIds: ["series-circuits", "combined-circuits"],
    remedy:
      "Swap the order of a bulb and a resistor in series — brightness does not change. The whole loop sets the current at once.",
  },
  {
    id: "voltage-flows",
    title: "Voltage flows through the circuit",
    description:
      "Confuses potential difference with current — talks about voltage flowing through components, or connects a voltmeter in series.",
    studentVoice: "The voltage flows through the bulb, so the voltmeter should be in line with it.",
    conceptIds: ["potential-difference", "circuit-diagrams"],
    remedy:
      "Voltage is measured ACROSS two points (energy per charge), current THROUGH a point (charge per second).",
  },
  {
    id: "resistance-depends-on-voltage",
    title: "Resistance changes with voltage",
    description:
      "Reads R = V/I as if resistance is caused by the voltage or current, so thinks doubling V doubles R for an ohmic conductor.",
    studentVoice: "If we double the voltage, R = V/I means the resistance doubles too.",
    conceptIds: ["ohms-law", "resistivity"],
    remedy:
      "Doubling V doubles I, so V/I stays the same. R depends on the wire (ρ, l, A), not on what you connect it to.",
  },
  {
    id: "resistivity-depends-on-shape",
    title: "Resistivity depends on length / thickness",
    description:
      "Confuses resistance with resistivity — thinks cutting or thinning a wire changes its resistivity.",
    studentVoice: "If we cut the wire in half, its resistivity also becomes half.",
    conceptIds: ["resistivity"],
    remedy:
      "Resistivity is a property of the material, like density. Resistance R = ρl/A depends on the shape.",
  },
  {
    id: "brightness-one-rule",
    title: "One rule for bulb brightness",
    description:
      "Applies a single rule (e.g. 'higher-resistance bulb is always brighter' or 'always dimmer') without checking whether bulbs are in series (same I) or parallel (same V).",
    studentVoice: "The 100 W bulb is always brighter than the 60 W bulb, whatever the circuit.",
    conceptIds: ["electric-power", "combined-circuits"],
    remedy:
      "In series use P = I²R (same I → bigger R is brighter); in parallel use P = V²/R (same V → smaller R is brighter).",
  },
  {
    id: "power-formula-misuse",
    title: "Wrong power formula for the situation",
    description:
      "Picks P = I²R or P = V²/R without checking which quantity is actually fixed, e.g. concludes a heater on mains gets more powerful if its resistance increases.",
    studentVoice: "P = I²R, so a bigger resistance always gives more power.",
    conceptIds: ["electric-power", "heating-effect"],
    remedy:
      "Ask first: what stays constant here — V (mains, parallel) or I (series)? Then choose the form of the power formula.",
  },
  {
    id: "current-direction-electrons",
    title: "Conventional current = electron flow",
    description:
      "Thinks conventional current flows in the same direction as electrons (from − to +).",
    studentVoice: "Current flows from the negative terminal because electrons come out of it.",
    conceptIds: ["current-charge"],
    remedy:
      "Conventional current was defined before electrons were discovered: + to −. Electrons drift the opposite way.",
  },
  {
    id: "heat-linear-in-current",
    title: "Heat is proportional to current",
    description: "Believes heat produced doubles when current doubles (ignores the square in H = I²Rt).",
    studentVoice: "Double the current, double the heat.",
    conceptIds: ["heating-effect"],
    remedy: "H = I²Rt — doubling I makes heat 4×. That's why fuses melt so suddenly on overload.",
  },
  {
    id: "kwh-is-power",
    title: "kWh is a unit of power",
    description: "Confuses energy (kWh, joule) with power (kW, watt).",
    studentVoice: "A 1 kWh appliance is more powerful than a 500 W one.",
    conceptIds: ["electric-power"],
    remedy:
      "kW is a rate; kWh is an amount (rate × time) — like km/h vs km. 1 kWh = 1000 W used for 1 hour = 3.6 MJ.",
  },

  // ───────────── Light ─────────────
  {
    id: "image-on-mirror-surface",
    title: "Plane-mirror image is on the mirror",
    description:
      "Thinks the image in a plane mirror forms on the mirror's surface (or is real), rather than as far behind it as the object is in front.",
    studentVoice: "The image is on the glass of the mirror.",
    conceptIds: ["plane-mirror"],
    remedy:
      "Step back from a mirror and your image steps back too — it is as far behind the mirror as you are in front.",
  },
  {
    id: "concave-always-magnifies",
    title: "Concave mirrors always magnify",
    description:
      "Believes a concave mirror always forms an enlarged (or always real) image, regardless of object position.",
    studentVoice: "Concave mirrors are magnifying mirrors, so the image is always bigger.",
    conceptIds: ["mirror-ray-diagrams"],
    remedy:
      "Object beyond C gives a diminished real image; between F and P gives an enlarged virtual one. Position decides.",
  },
  {
    id: "ignores-sign-convention",
    title: "Ignores the sign convention",
    description:
      "Puts all distances in as positive numbers (e.g. u = +20 cm for a real object), producing wrong image positions and magnifications.",
    studentVoice: "Object is 20 cm away so u = 20.",
    conceptIds: ["sign-convention", "mirror-formula", "lens-formula"],
    remedy:
      "Measure from the pole/optical centre; distances against the incoming light are negative — a real object always has u negative.",
  },
  {
    id: "mirror-lens-formula-swap",
    title: "Mixes up mirror and lens formulas",
    description:
      "Uses 1/v + 1/u = 1/f for lenses (or 1/v − 1/u for mirrors), or swaps m = −v/u with m = v/u.",
    studentVoice: "1/v + 1/u = 1/f works for every lens and mirror.",
    conceptIds: ["mirror-formula", "lens-formula"],
    remedy: "Mirror: 1/v + 1/u = 1/f, m = −v/u. Lens: 1/v − 1/u = 1/f, m = v/u.",
  },
  {
    id: "bends-away-in-denser",
    title: "Light bends away from normal in a denser medium",
    description: "Reverses the refraction rule: thinks light entering glass or water bends away from the normal.",
    studentVoice: "Going into glass the ray bends away from the normal.",
    conceptIds: ["refraction-laws"],
    remedy:
      "Light slows down in a denser medium — like a car wheel hitting sand first — so it turns towards the normal.",
  },
  {
    id: "denser-means-faster",
    title: "Light is faster in denser media",
    description:
      "Thinks light travels faster (or at the same speed) in an optically denser medium, or confuses optical density with mass density.",
    studentVoice: "Glass is solid, so light moves faster through it.",
    conceptIds: ["refractive-index"],
    remedy: "n = c/v: a bigger refractive index means a smaller speed. Kerosene is optically denser than water yet lighter.",
  },
  {
    id: "convex-lens-always-real",
    title: "Convex lenses always make real images",
    description:
      "Believes a convex lens always forms a real image (forgetting the magnifying-glass case) or that a concave lens can form a real image of a real object.",
    studentVoice: "A convex lens always makes a real, inverted image.",
    conceptIds: ["lens-ray-diagrams"],
    remedy:
      "Object inside F of a convex lens gives a virtual, erect, magnified image — that's a magnifying glass.",
  },
  {
    id: "half-lens-half-image",
    title: "Covering half a lens cuts half the image",
    description:
      "Thinks blocking part of a lens removes that part of the image, instead of making the full image dimmer.",
    studentVoice: "If I cover the top half of the lens, the top half of the image disappears.",
    conceptIds: ["lens-ray-diagrams"],
    remedy:
      "Every point of the object sends rays through every part of the lens; covering half removes half the light, not half the picture.",
  },
  {
    id: "lens-power-sign-units",
    title: "Lens power sign or units",
    description:
      "Gives converging lenses negative power, or computes P = 1/f with f in centimetres.",
    studentVoice: "f = 50 cm so P = 1/50 = 0.02 D.",
    conceptIds: ["lens-power"],
    remedy: "Convert f to metres first: f = 0.5 m → P = +2 D. Convex (converging) is positive.",
  },

  // ───────────── Human eye ─────────────
  {
    id: "accommodation-lens-moves",
    title: "The eye focuses by moving its lens",
    description:
      "Thinks the eye focuses like a camera by moving the lens back and forth, rather than ciliary muscles changing the lens's focal length.",
    studentVoice: "The eye lens moves forward to see near objects.",
    conceptIds: ["eye-accommodation"],
    remedy:
      "Image distance (lens to retina) is fixed, so the eye must change f — ciliary muscles make the lens thicker for near objects.",
  },
  {
    id: "myopia-convex",
    title: "Myopia corrected with a convex lens",
    description:
      "Swaps the corrections — uses a convex lens for myopia (short-sightedness) or a concave lens for hypermetropia.",
    studentVoice: "Short-sighted people need a converging lens to see far.",
    conceptIds: ["vision-defects"],
    remedy:
      "Myopic eye focuses distant light in front of the retina — it converges too much, so add a diverging (concave) lens.",
  },
  {
    id: "prism-adds-colour",
    title: "The prism creates the colours",
    description: "Thinks a prism adds or creates colours, instead of separating colours already present in white light.",
    studentVoice: "The glass of the prism colours the light.",
    conceptIds: ["dispersion"],
    remedy:
      "Newton's second prism recombines the spectrum back into white light — the colours were in the white light all along.",
  },
  {
    id: "red-scatters-most",
    title: "Red light scatters the most",
    description:
      "Reverses the wavelength dependence of scattering (thinks longer wavelengths scatter more), or explains the blue sky as a reflection of the sea.",
    studentVoice: "The sun looks red at sunset because red light scatters the most.",
    conceptIds: ["scattering"],
    remedy:
      "Shorter wavelengths scatter much more. At sunset the long path removes blue, so mostly red reaches your eye.",
  },
  {
    id: "planets-twinkle",
    title: "Twinkling comes from the star itself",
    description:
      "Thinks stars twinkle because their light flickers at the source, or that planets twinkle just like stars.",
    studentVoice: "Stars twinkle because they are burning and flickering.",
    conceptIds: ["atmospheric-refraction"],
    remedy:
      "Stars are point sources — atmospheric refraction keeps shifting their apparent position and brightness. Planets are extended sources, so the fluctuations average out.",
  },

  // ───────────── Magnetism ─────────────
  {
    id: "field-lines-cross",
    title: "Field lines can cross",
    description: "Believes magnetic field lines can intersect or are physical lines.",
    studentVoice: "Where two magnets meet, their field lines cross each other.",
    conceptIds: ["magnetic-field-lines"],
    remedy:
      "If two lines crossed, a compass there would point two ways at once — impossible. Field lines never intersect.",
  },
  {
    id: "field-inside-n-to-s",
    title: "Field inside a magnet runs N → S",
    description: "Thinks field lines inside a bar magnet also go from north to south (they go S → N, forming closed loops).",
    studentVoice: "Field lines go from north to south everywhere.",
    conceptIds: ["magnetic-field-lines"],
    remedy: "Field lines are closed loops: N → S outside, S → N inside the magnet.",
  },
  {
    id: "hand-rule-swap",
    title: "Mixes up the hand rules",
    description:
      "Uses Fleming's left-hand rule to find the field around a wire, or the right-hand thumb rule to find the force on a conductor.",
    studentVoice: "Use the right-hand thumb rule to find which way the wire is pushed.",
    conceptIds: ["field-due-to-current", "force-on-conductor"],
    remedy:
      "Field AROUND a current → right-hand thumb rule. FORCE on a current in a field → Fleming's left-hand rule (F-B-I).",
  },
  {
    id: "force-along-field",
    title: "Force acts along the field",
    description:
      "Expects the force on a current-carrying conductor to be along the field direction, or maximum when the wire is parallel to the field.",
    studentVoice: "The wire gets pushed in the direction of the magnetic field.",
    conceptIds: ["force-on-conductor"],
    remedy:
      "The force is perpendicular to both the current and the field; it is zero when the wire is parallel to the field.",
  },
  {
    id: "stationary-charge-field",
    title: "Any wire makes a magnetic field",
    description:
      "Thinks a wire (or a stationary charge) produces a magnetic field even when no current is flowing.",
    studentVoice: "A copper wire always has a magnetic field around it.",
    conceptIds: ["field-due-to-current"],
    remedy: "Only moving charges (current) produce a magnetic field — switch the circuit off and the compass returns.",
  },
  {
    id: "fuse-in-neutral",
    title: "Fuse / switch in the neutral wire",
    description:
      "Places the fuse or switch in the neutral wire, or thinks the earth wire normally carries current.",
    studentVoice: "The fuse can go in the neutral wire, it is the same circuit.",
    conceptIds: ["domestic-circuits"],
    remedy:
      "With the fuse in neutral, the appliance stays connected to the live wire even after the fuse blows — a shock risk.",
  },
  {
    id: "short-circuit-no-current",
    title: "Short circuit means no current",
    description:
      "Thinks a short circuit stops the current, when actually resistance drops to almost zero and current becomes very large.",
    studentVoice: "In a short circuit the circuit breaks so no current flows.",
    conceptIds: ["domestic-circuits"],
    remedy: "Short circuit: live touches neutral, R ≈ 0, so I = V/R becomes huge — that's why the fuse blows.",
  },
];

export const MISCONCEPTION_BY_ID: Record<string, Misconception> = Object.fromEntries(
  MISCONCEPTIONS.map((m) => [m.id, { ...m, origin: "taxonomy" as const }]),
);

export function misconceptionsForConcept(conceptId: string): Misconception[] {
  return MISCONCEPTIONS.filter((m) => m.conceptIds.includes(conceptId));
}
