# SWEN Website — v1 (Astro + Notion + DBLP)

Static website of the SWEN Research Group (DISIM, Università dell'Aquila).
Content lives in Notion and is fetched at build time; publications come from DBLP.

**Tech**: Astro 5 · Tailwind 3 · TypeScript · Notion API · GitHub Pages

---

## Quick start (local dev)

Requires **Node ≥ 20** and **pnpm ≥ 9**.

```bash
# 1. install deps
pnpm install

# 2. create env file
cp .env.example .env
# then edit .env and paste your NOTION_TOKEN (ntn_...)

# 3. first-time content fetch (downloads Notion DBs as JSON)
pnpm fetch:notion

# 4. dev server
pnpm dev
# → open http://localhost:4321/website/
```

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Start Astro dev server at `http://localhost:4321/website/` |
| `pnpm fetch:notion` | Fetch all 8 Notion DBs, write to `src/data/generated/*.json` |
| `pnpm build` | Fetch content + build static site to `dist/` |
| `pnpm preview` | Preview the production build locally |
| `pnpm check` | Run Astro type check + lint |

## Project layout

```
swen-v1-astro/
├── src/
│   ├── config/notion.ts        # 8 DB IDs (public, safe to commit)
│   ├── lib/notion.ts           # SDK wrappers + property readers
│   ├── content/config.ts       # Zod schemas for in-repo MDX (future)
│   ├── data/generated/         # JSON written by fetch-notion.ts (gitignored)
│   ├── layouts/Base.astro      # shared page chrome (topbar, footer, head)
│   ├── components/*.astro      # Topbar, Footer, cards
│   ├── pages/
│   │   └── index.astro         # home
│   └── styles/global.css       # Tailwind + font imports + tokens
├── scripts/
│   └── fetch-notion.ts         # main content fetcher
├── public/
│   └── website-logo.png        # SWEN logo (used in topbar, OG image)
├── .github/workflows/
│   └── build-deploy.yml        # CI: fetch + build + deploy to Pages
├── astro.config.mjs            # site, base path, integrations
├── tailwind.config.ts          # palette (4 brand colors from logo) + fonts
└── tsconfig.json               # strict TS + path aliases
```

## How content flows

```
Notion (8 DBs)  ─┐
                 │
DBLP (per PID)  ─┼─▶  scripts/fetch-notion.ts  ─▶  src/data/generated/*.json  ─▶  astro build  ─▶  dist/
                 │                                                                                  │
GitHub API      ─┘                                                                                  ▼
(for software)                                                                            GitHub Pages deploy
```

At build time, `pnpm build` (or the CI action) runs `fetch-notion.ts`, which:
1. Reads `NOTION_TOKEN` from env
2. Queries each of the 8 DBs (IDs in `src/config/notion.ts`)
3. Normalises each row into a flat TypeScript shape
4. Writes one JSON file per DB to `src/data/generated/`
5. Astro pages import these JSON files and render at build time

## Deploying

CI/CD via GitHub Actions (`.github/workflows/build-deploy.yml`):
- **Triggers**: push to `main` or `v1-astro`, daily cron (06:00 UTC), manual dispatch
- **Deploy**: only from `main` (the `v1-astro` branch builds but does not deploy — keeps the v0 preview live)
- **Secret required in repo**: `NOTION_TOKEN` (Settings → Secrets and variables → Actions → New repository secret)

### Setting up GitHub Secrets

1. Go to `https://github.com/swen-univaq/website/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `NOTION_TOKEN`
4. Value: paste the Notion integration token (starts with `ntn_`)
5. Save

## Custom domain (`swen.disim.univaq.it`)

When the DISIM IT ticket is resolved:

1. Create a file `public/CNAME` with contents: `swen.disim.univaq.it`
2. In the repo: Settings → Pages → Custom domain → enter `swen.disim.univaq.it` → Save
3. Wait for DNS check to turn green, then tick "Enforce HTTPS"
4. In `astro.config.mjs` change `SITE_BASE` default to `/` (or set env var `SITE_BASE=/` in the Action)
5. In `build-deploy.yml` replace `SITE_BASE: /website` with `SITE_BASE: /`

## Adding content

All editorial content goes via Notion — no code changes needed.

- **Add a news item** → Notion News DB, set Status = Published
- **Announce a talk** → Notion Talks DB, Status = Upcoming, fill Date/Location
- **New PhD student** → Notion People DB, Role = PhD
- **New paper** → nothing to do, DBLP auto-fetch picks it up within ~2–6 weeks
- **New software** → Notion Software DB, set Repository URL + Featured = true

After editing in Notion:
- Either wait for the next scheduled rebuild (daily), or
- Manually trigger: repo → Actions → "Build and Deploy" → Run workflow

## Status & roadmap

**v1 (current scaffold)**: home + Notion content + CI. Labs, People, Projects, Talks, Software pages in progress.

**v1.1 (next)**:
- Per-person pages `/people/[slug]` generated from Notion
- Per-lab pages `/labs/[slug]` with team + projects + publications
- Per-project pages `/projects/[slug]`
- Publications page with DBLP auto-fetch, filters by year/venue
- Software page with GitHub stats (stars, last update, contributors)
- RSS feed + sitemap
- Search (Pagefind, client-side)

**v2**:
- Webhook Notion → instant rebuild (via Make.com or Cloudflare Worker)
- Auto-post news to LinkedIn via RSS → Buffer
- OG image auto-generation per page
- Analytics (Plausible)
- WCAG 2.1 AA audit

## Why these choices

See the architectural document in the SWEN strategia folder:
`website-architecture.md`
`website-migration-assessment.md`
`website-CLAUDE.md` (conventions for Claude Code sessions)

---

**Questions? Pipeline broken?** Check the Action logs first. If `fetch:notion` fails, 90% of the time it's one of:
- `NOTION_TOKEN` not set or revoked → recreate integration
- Integration not shared with a DB → open DB → `…` → Connections → add the integration
- Column renamed in Notion → update the column name in `scripts/fetch-notion.ts`
