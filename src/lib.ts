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
