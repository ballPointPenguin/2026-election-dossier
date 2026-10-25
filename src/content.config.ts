import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per race, at src/content/races/<office>/<slug>.md.
// The directory name must match `office`; the body is the briefing itself.
const races = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/races' }),
  schema: z.object({
    office: z.enum(['house', 'senate', 'governor']),
    state: z.string().length(2).toUpperCase(),
    district: z.number().int().positive().optional(), // House only; omit for at-large
    title: z.string(),
    summary: z.string(), // one or two sentences for index listings
    briefingDate: z.coerce.date(),
    electionDate: z.coerce.date().default(new Date('2026-11-03')),
    incumbentParty: z.enum(['D', 'R', 'I']).optional(),
    openSeat: z.boolean().default(false),
    // Forecaster ratings as published, e.g. { Cook: 'Lean R' }
    ratings: z.record(z.string(), z.string()).default({}),
    candidates: z
      .array(z.object({ name: z.string(), party: z.string() }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { races };
