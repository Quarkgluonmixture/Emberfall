/** The chronicle: short historical entries written in a storybook style. */
import type { RNG } from '../core/rng';
import type { ChronicleEntry, SimState } from '../core/types';
import { seasonOf, yearOf } from './time';

export interface ChronicleParams {
  civ?: string;
  otherCiv?: string;
  name?: string;
  other?: string;
  pop?: number;
  flavor?: string;
  /** Optional tile location, copied onto the chronicle entry. */
  x?: number;
  y?: number;
}

type Template = (p: ChronicleParams) => string;

const TEMPLATES: Record<string, Template[]> = {
  founding: [
    (p) => `The people of ${p.civ} raise their first fires at ${p.name}.`,
    (p) => `Out of the wandering years, ${p.civ} drives its first stakes at ${p.name}.`,
  ],
  village: [
    (p) => `${p.name} has grown into a village; timber walls rise against the dusk.`,
    (p) => `New rooftops crowd the lanes of ${p.name} — a village now, by any reckoning.`,
  ],
  town: [
    (p) => `Bells ring over ${p.name}, now a town of ${p.pop} souls.`,
    (p) => `${p.name} raises stone walls and a market square — a true town at last.`,
  ],
  famine: [
    (p) => `Famine grips ${p.name}; the granaries stand empty.`,
    (p) => `Hunger stalks ${p.name}. The old and the young fade first.`,
  ],
  famineEnd: [(p) => `The famine in ${p.name} eases as the harvests return.`],
  plague: [
    (p) => `A creeping plague enters ${p.name}.`,
    (p) => `Sickness spreads through ${p.name}; doors are marked with ash.`,
  ],
  plagueEnd: [(p) => `The plague in ${p.name} burns out at last.`],
  migration: [
    (p) => `Hungry and hopeful, settlers from ${p.name} set out and found ${p.other}.`,
    (p) => `A long column of carts leaves ${p.name}; at journey's end they raise ${p.other}.`,
  ],
  skirmish: [
    (p) => `Skirmishes flare along the border between ${p.civ} and ${p.otherCiv}.`,
    (p) => `Raiders strike farms near ${p.name}; ${p.civ} and ${p.otherCiv} trade blood for blood.`,
  ],
  capture: [(p) => `${p.name} falls to the banners of ${p.civ}.`],
  warDeclared: [
    (p) => `${p.civ} declares war upon ${p.otherCiv}. Beacons burn along the marches.`,
  ],
  peace: [(p) => `Weary of war, ${p.civ} and ${p.otherCiv} lay down their arms.`],
  treatySigned: [
    (p) =>
      `Under a white banner, ${p.otherCiv} accepts ${p.civ}'s terms: tribute, and an oath of peace.`,
    (p) =>
      `Envoys seal a treaty at the border stones; ${p.otherCiv} will send caravans of tribute to ${p.civ}.`,
  ],
  tributeEnds: [
    (p) => `The last tribute caravan leaves ${p.civ}; the debt to ${p.otherCiv} is paid in full.`,
  ],
  alliance: [(p) => `${p.civ} and ${p.otherCiv} swear an alliance beneath the old oaks.`],
  tradeOpened: [
    (p) => `Caravans now travel between ${p.civ} and ${p.otherCiv}; trade flourishes.`,
  ],
  rivalry: [(p) => `Cold words pass between ${p.civ} and ${p.otherCiv}; a rivalry takes root.`],
  relationsCooled: [
    (p) => `Relations between ${p.civ} and ${p.otherCiv} settle into wary neutrality.`,
  ],
  succession: [
    (p) => `The death of the old chief throws ${p.civ} into a succession crisis.`,
    (p) => `Rival heirs tear at the council fires of ${p.civ}.`,
  ],
  schism: [
    (p) => `Heretics split the temples of ${p.civ}; the faith is sundered.`,
    (p) => `A new prophet rises in ${p.civ}, and the old shrines stand divided.`,
  ],
  wildfire: [(p) => `Wildfire races through the forests near ${p.name}.`],
  wildfireWild: [
    () => `Wildfire rages through the wild woods, seen for miles as a red dawn.`,
  ],
  flood: [(p) => `The river bursts its banks at ${p.name}; fields drown beneath brown water.`],
  goldenAge: [(p) => `${p.civ} enters a golden age of ${p.flavor}.`],
  collapse: [
    (p) => `${p.name} is abandoned; only crows keep its streets now.`,
    (p) => `The last family bars its door and leaves ${p.name} to the moss.`,
  ],
  civFell: [(p) => `The last fires of ${p.civ} go dark. Their story passes into legend.`],
  rebirth: [
    (p) => `From mossy ruins a new people kindle their fires — ${p.civ} is born at ${p.name}.`,
    (p) => `Wanderers gather where old stones stand; they raise ${p.name} and call themselves ${p.civ}.`,
  ],
  resettleRuin: [
    (p) => `Settlers from ${p.name} raise new roofs over the mossy stones of ${p.other}.`,
    (p) => `The ruins near ${p.other} ring with hammers again; ${p.name} has sent its young.`,
  ],
  incidentBad: [
    (p) => `A hunting party from ${p.civ} is slain in ${p.otherCiv}'s woods.`,
    (p) => `Fishermen of ${p.civ} and ${p.otherCiv} come to blows over the catch.`,
  ],
  incidentGood: [
    (p) => `Envoys from ${p.civ} bring gifts of amber to ${p.otherCiv}.`,
    (p) => `A marriage joins houses of ${p.civ} and ${p.otherCiv}; there is feasting for days.`,
  ],
};

export function composeText(rng: RNG, kind: string, params: ChronicleParams): string {
  const variants = TEMPLATES[kind];
  if (!variants) return `Something stirs in the world. (${kind})`;
  return rng.pick(variants)(params);
}

const CHRONICLE_SOFT_CAP = 4000;
const CHRONICLE_KEEP_RECENT = 500;

export function pushEntry(
  state: SimState,
  kind: string,
  importance: 1 | 2 | 3,
  civId: number,
  text: string,
  x?: number,
  y?: number,
): ChronicleEntry {
  const entry: ChronicleEntry = {
    day: state.day,
    year: yearOf(state.day),
    season: seasonOf(state.day),
    text,
    importance,
    kind,
    civId,
  };
  if (x !== undefined && y !== undefined) {
    entry.x = x;
    entry.y = y;
  }
  state.chronicle.push(entry);
  // Keep memory bounded on very long runs: drop old minor entries, keep history.
  if (state.chronicle.length > CHRONICLE_SOFT_CAP) {
    const cutoff = state.chronicle.length - CHRONICLE_KEEP_RECENT;
    state.chronicle = state.chronicle.filter((e, i) => i >= cutoff || e.importance >= 2);
  }
  return entry;
}

export function pushEvent(
  state: SimState,
  rng: RNG,
  kind: string,
  importance: 1 | 2 | 3,
  civId: number,
  params: ChronicleParams,
): ChronicleEntry {
  // Pick the variant index with the exact arithmetic rng.pick() uses, so the
  // RNG stream is bit-identical to the old composeText path.
  const variants = TEMPLATES[kind];
  const variant = variants ? Math.floor(rng.next() * variants.length) : 0;
  const text = variants ? variants[variant](params) : `Something stirs in the world. (${kind})`;
  const entry = pushEntry(state, kind, importance, civId, text, params.x, params.y);
  entry.variant = variant;
  entry.params = {
    civ: params.civ,
    otherCiv: params.otherCiv,
    name: params.name,
    other: params.other,
    pop: params.pop,
    flavor: params.flavor,
  };
  return entry;
}
