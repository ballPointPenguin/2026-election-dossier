# 2026 Election Dossier

Static site of briefings on selected 2026 U.S. midterm races (House first; Senate and governors planned). Built with [Astro](https://astro.build), deployed to GitHub Pages.

## Adding a race

Create `src/content/races/<office>/<slug>.md` (`office` is `house`, `senate` or `governor`; e.g. `house/ca-13.md`). Frontmatter is validated by `src/content.config.ts`; the Markdown body is the briefing. Use `##` for top-level sections (they populate the page's table of contents). Copy `house/ny-21.md` as a template. Set `draft: true` to hide a race.

## Develop

```sh
npm install
npm run dev      # http://localhost:4321/2026-election-dossier/
npm run build    # type-checks content, then builds to dist/
```

Requires Node >= 22.22.

## Deploy

Pushes to `main` build and deploy via `.github/workflows/deploy.yml`. One-time setup: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**. The `base` path in `astro.config.mjs` assumes `https://ballpointpenguin.github.io/2026-election-dossier/`; change `site`/`base` for a custom domain.
