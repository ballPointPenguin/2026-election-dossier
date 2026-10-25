import { defineConfig } from 'astro/config';

// Project site on GitHub Pages: https://<owner>.github.io/<repo>/
// If a custom domain is added later, set `site` to it and drop `base`.
export default defineConfig({
  site: 'https://ballpointpenguin.github.io',
  base: '/2026-election-dossier',
  trailingSlash: 'always',
});
