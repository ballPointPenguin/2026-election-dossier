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
    : race.data.office === 'senate'
      ? `${race.data.state} Senate`
      : `${race.data.state} Governor`;

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

// When most of each state's polls close, in minutes after midnight Eastern (1440 = midnight; Alaska and
// Hawaii are shown as 24:00). Split-timezone states use the zone covering most voters; override a district
// with `pollsClose: "HH:MM"` (Eastern, 24h) in its frontmatter.
const t = (h: number, m = 0) => h * 60 + m;
export const POLL_CLOSE_ET: Record<string, number> = {
  KY: t(18), IN: t(18),
  FL: t(19), GA: t(19), SC: t(19), VA: t(19), VT: t(19),
  NC: t(19, 30), OH: t(19, 30), WV: t(19, 30),
  AL: t(20), CT: t(20), DE: t(20), IL: t(20), KS: t(20), ME: t(20), MD: t(20), MA: t(20), MI: t(20),
  MS: t(20), MO: t(20), NH: t(20), NJ: t(20), OK: t(20), PA: t(20), RI: t(20), TN: t(20), TX: t(20),
  AR: t(20, 30),
  AZ: t(21), CO: t(21), IA: t(21), LA: t(21), MN: t(21), NE: t(21), NM: t(21), NY: t(21), SD: t(21), WI: t(21), WY: t(21),
  ID: t(22), MT: t(22), NV: t(22), UT: t(22),
  CA: t(23), OR: t(23), WA: t(23),
  AK: t(24), HI: t(24),
};

/** Poll close in minutes after midnight Eastern, or null if unknown. */
export function pollsCloseET(race: Race): number | null {
  const o = race.data.pollsClose;
  if (o) { const [h, m] = o.split(':').map(Number); return h * 60 + m; }
  return POLL_CLOSE_ET[race.data.state] ?? null;
}

export function fmtClose(min: number | null): string {
  if (min === null) return '—';
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'am' : 'pm'}`;
}

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
