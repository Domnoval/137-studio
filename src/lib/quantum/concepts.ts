/**
 * "Other Smart People Shit" — a curated set of the equations and ideas that
 * rewired how we understand reality. Each entry pairs the famous shorthand
 * with a plain-language gut punch and the human who lit the fuse.
 *
 * This is reference data for the gallery on /quantum. Keep it honest and
 * keep it vivid — the goal is awe that survives a second read.
 */

export interface Concept {
  id: string;
  title: string;
  /** The equation as it's usually written, kept short enough to render big. */
  equation: string;
  thinker: string;
  year: number;
  /** Field tag, used for the little uppercase label. */
  field: string;
  /** One-line hook. */
  tagline: string;
  /** The "what it actually means" paragraph, no jargon. */
  meaning: string;
}

export const concepts: Concept[] = [
  {
    id: 'mass-energy',
    title: 'Mass–Energy Equivalence',
    equation: 'E = mc²',
    thinker: 'Albert Einstein',
    year: 1905,
    field: 'Special Relativity',
    tagline: 'Matter is frozen light.',
    meaning:
      'Mass and energy are the same currency in two denominations. A gram of anything, fully converted, holds the energy of a small nuclear bomb. The c² is the brutal exchange rate — and the reason stars shine and bombs end cities.',
  },
  {
    id: 'schrodinger',
    title: 'The Schrödinger Equation',
    equation: 'iℏ ∂ψ/∂t = Ĥψ',
    thinker: 'Erwin Schrödinger',
    year: 1926,
    field: 'Quantum Mechanics',
    tagline: 'How a possibility evolves.',
    meaning:
      'Reality, before you look, is a wave of probability called ψ. This equation tells you how that wave sloshes forward in time. It does not say where the particle is — it says where it could be, and with what odds. Everything quantum starts here.',
  },
  {
    id: 'uncertainty',
    title: 'The Uncertainty Principle',
    equation: 'Δx · Δp ≥ ℏ/2',
    thinker: 'Werner Heisenberg',
    year: 1927,
    field: 'Quantum Mechanics',
    tagline: 'Precision is a zero-sum game.',
    meaning:
      'Nail down where a particle is and you lose all grip on how fast it moves — and the reverse. This is not a flaw in our instruments; it is a property of reality itself. The universe refuses to be fully specified.',
  },
  {
    id: 'planck',
    title: "Planck's Quantum",
    equation: 'E = hf',
    thinker: 'Max Planck',
    year: 1900,
    field: 'Quantum Theory',
    tagline: 'Energy comes in lumps.',
    meaning:
      'To explain why hot objects glow the colors they do, Planck had to assume energy is not smooth but granular — emitted in tiny indivisible packets proportional to frequency. He called it an act of desperation. It started the quantum revolution.',
  },
  {
    id: 'dirac',
    title: 'The Dirac Equation',
    equation: '(iγᵘ∂ᵤ − m)ψ = 0',
    thinker: 'Paul Dirac',
    year: 1928,
    field: 'Quantum Field Theory',
    tagline: 'It predicted antimatter.',
    meaning:
      'Dirac forced quantum mechanics to obey relativity, and the math spat out a mirror universe of particles with opposite charge. Everyone thought it was a bookkeeping error. Four years later they found the positron. The equation was right; the universe was weirder.',
  },
  {
    id: 'entropy',
    title: "Boltzmann's Entropy",
    equation: 'S = k log W',
    thinker: 'Ludwig Boltzmann',
    year: 1877,
    field: 'Statistical Mechanics',
    tagline: 'Why time has a direction.',
    meaning:
      'Entropy counts the number of ways a system could be arranged and look the same. There are vastly more messy arrangements than tidy ones, so disorder wins by sheer numbers. This is why eggs break but never unbreak — the arrow of time is just statistics.',
  },
  {
    id: 'field-equations',
    title: "Einstein's Field Equations",
    equation: 'Gᵤᵥ = 8πG Tᵤᵥ',
    thinker: 'Albert Einstein',
    year: 1915,
    field: 'General Relativity',
    tagline: 'Gravity is bent geometry.',
    meaning:
      'There is no force of gravity. Mass and energy curve spacetime, and everything else just follows the straightest available path through that curve. Matter tells space how to bend; space tells matter how to move.',
  },
  {
    id: 'bell',
    title: "Bell's Inequality",
    equation: '|S| ≤ 2',
    thinker: 'John Stewart Bell',
    year: 1964,
    field: 'Quantum Foundations',
    tagline: 'The universe is not local.',
    meaning:
      'Bell found a number that any "common sense" universe — where things have definite properties and nothing travels faster than light — could never exceed. Experiments blow right past it. Entangled particles really do coordinate across any distance, instantly.',
  },
];
