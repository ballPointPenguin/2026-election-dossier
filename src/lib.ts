import { getCollection, type CollectionEntry } from 'astro:content';

export type Race = CollectionEntry<'races'>;

export const OFFICES = {
  house: 'U.S. House',
  senate: 'U.S. Senate',
  governor: 'Governors',
} as const;
export type Office = keyof typeof OFFICES;

/** Prefix a site-relative path with the configured base (GitHub Pages subpath). */
export const url = (path = '') =>
  import.meta.env.BASE_URL.replace(/\/$/, '') + '/' + path.replace(/^\//, '');

export const slugOf = (race: Race) => race.id.split('/').pop()!;
export const raceUrl = (race: Race) => url(`${race.data.office}/${slugOf(race)}/`);

export const raceLabel = (race: Race) =>
  race.data.office === 'house'
    ? `${race.data.state}-${race.data.district ?? 'AL'}`
    : race.data.state;

export async function getRaces(office?: Office): Promise<Race[]> {
  const all = await getCollection('races', ({ data }) => !data.draft);
  return all
    .filter((r) => !office || r.data.office === office)
    .sort(
      (a, b) =>
        a.data.state.localeCompare(b.data.state) ||
        (a.data.district ?? 0) - (b.data.district ?? 0),
    );
}

export const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

// ---- Forecaster ratings -------------------------------------------------

export const FORECASTERS = [
  { key: 'Cook', test: /^Cook/i },
  { key: 'Inside', test: /^Inside/i },
  { key: 'Sabato', test: /^Sabato/i },
  { key: 'DDHQ', test: /^Decision Desk/i },
] as const;

export type Tone = 'R3' | 'R2' | 'R1' | 'R0' | 'T' | 'D0' | 'D1' | 'D2' | 'D3' | 'X';

export interface Rating {
  /** Compact label, e.g. "Lean D" */
  label: string;
  /** Positive = Democratic, negative = Republican; null when ambiguous */
  score: number | null;
  tone: Tone;
  /** The full source string, for tooltips */
  raw: string;
}

const STRENGTH: Record<string, number> = { Solid: 3, Safe: 3, Likely: 2, Lean: 1, Tilt: 0.5 };

export function parseRating(raw: string): Rating {
  const head = raw.split('(')[0].trim();
  if (/\bor\b/i.test(head)) return { label: 'Disputed', score: null, tone: 'X', raw };
  if (/^Toss ?Up/i.test(head)) return { label: 'Toss Up', score: 0, tone: 'T', raw };
  const m = head.match(/^(Solid|Safe|Likely|Lean|Tilt)\s+(Republican|Democratic)/i);
  if (!m) throw new Error(`Unrecognized rating: "${raw}"`);
  const word = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  const sign = /^R/i.test(m[2]) ? -1 : 1;
  const side = sign < 0 ? 'R' : 'D';
  const mag = STRENGTH[word];
  const short = word === 'Safe' ? 'Solid' : word;
  const tone = `${side}${mag === 3 ? 3 : mag === 2 ? 2 : mag === 1 ? 1 : 0}` as Tone;
  return { label: `${short} ${side}`, score: sign * mag, tone, raw };
}

export function ratingFor(race: Race, forecaster: (typeof FORECASTERS)[number]): Rating | undefined {
  const entry = Object.entries(race.data.ratings).find(([name]) => forecaster.test.test(name));
  return entry ? parseRating(entry[1]) : undefined;
}

/** Mean of the forecasters' scores, or null if there are none. */
export function consensusScore(race: Race): number | null {
  const scores = Object.values(race.data.ratings)
    .map((v) => parseRating(v).score)
    .filter((s): s is number => s !== null);
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
}

export function consensusOf(race: Race): { label: string; tone: Tone; score: number | null } {
  const score = consensusScore(race);
  if (score === null) return { label: 'Unrated', tone: 'X', score };
  const a = Math.abs(score);
  const side = score < 0 ? 'R' : 'D';
  if (a < 0.25) return { label: 'Toss Up', tone: 'T', score };
  if (a < 0.75) return { label: `Tilt ${side}`, tone: `${side}0` as Tone, score };
  if (a < 1.5) return { label: `Lean ${side}`, tone: `${side}1` as Tone, score };
  if (a < 2.5) return { label: `Likely ${side}`, tone: `${side}2` as Tone, score };
  return { label: `Solid ${side}`, tone: `${side}3` as Tone, score };
}

export const fmtShort = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// ---- Geography ----------------------------------------------------------

export const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
  CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
  IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas',
  UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
  WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
};
