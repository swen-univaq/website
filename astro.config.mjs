// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// WIP: custom domain swen.disim.univaq.it pending DNS fix at DISIM IT.
// Until the CNAME is corrected with trailing dot, we stay on swen-univaq.github.io/website/.
// When DNS is ready: swap the defaults below to '/' and 'https://swen.disim.univaq.it'.
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
