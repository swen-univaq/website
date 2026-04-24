# SWEN Website — Preview v0

Static HTML mockup of the new SWEN Research Group website. Single-page, hash-routed, no backend.

**Live**: https://swen-univaq.github.io/website/ (after Pages is enabled)

## Status

This is a **preview v0** meant to validate the design direction with the organizing committee before starting the full Astro + Notion implementation.

What works:
- All 4 labs (MODES, SPENCER, SoSy, FrAmeLab) with dedicated color accents
- 36 members grouped by role
- 9 active grants (including Horizon Europe MOSAICO and AIM-PRO)
- Filter UI on software and publications pages (static)
- Responsive layout

What's intentionally missing (will come with Astro v1):
- Live Notion content (news, events)
- DBLP publications auto-fetch
- GitHub API for software repo stats
- RSS feed and social integration

## Deployment

1. Enable GitHub Pages: Settings → Pages → Deploy from branch → `main` / `/ (root)`
2. `.nojekyll` is present so Pages serves the files as-is.

## Design decisions

All decisions are documented in the parent folder (`SWEN - Strategia e operations/`):
- `website-architecture.md` — full architecture and schema
- `website-migration-assessment.md` — inventory of content and gaps
- `website-CLAUDE.md` — conventions for Claude Code when we move to Astro

## Files

```
swen-preview/
├── index.html           # the mockup (single-file, Tailwind via CDN)
├── website-logo.png     # SWEN logo
├── .nojekyll            # tells Pages to skip Jekyll processing
└── README.md            # this file
```
