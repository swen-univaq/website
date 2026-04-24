// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Custom domain swen.disim.univaq.it is active → base is '/'.
// Fallback to '/website' only if SITE_BASE env var is set explicitly (e.g. for staging previews).
const BASE = process.env.SITE_BASE ?? '/';
const SITE = process.env.SITE_URL ?? 'https://swen.disim.univaq.it';

export default defineConfig({
  site: SITE,
  base: BASE,
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [
    tailwind({
      applyBaseStyles: false, // we use our own global.css
    }),
    sitemap(),
  ],
  build: {
    format: 'directory',
  },
  vite: {
    resolve: {
      preserveSymlinks: true,
    },
  },
});
