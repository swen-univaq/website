// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// Custom domain swen.disim.univaq.it active → base is '/'.
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
