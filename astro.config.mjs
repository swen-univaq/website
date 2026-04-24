// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// When deployed at swen-univaq.github.io/website/, base must be '/website'.
// When deployed at custom domain swen.disim.univaq.it, base must be '/'.
// Toggle via env var SITE_BASE if needed, default assumes GitHub Pages subpath.
const BASE = process.env.SITE_BASE ?? '/website';
const SITE = process.env.SITE_URL ?? 'https://swen-univaq.github.io';

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
