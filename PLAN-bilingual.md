# Plan — bilingual site (EN default, PT at /pt) on the new design

## RESUME HERE

| # | Step | Owner | Status |
|---|---|---|---|
| 0 | Human-only track (see below) | Hugo | open, not blocking the build |
| 1 | English content: toques + song notes/themes → `src/assets/data/content-en.json` | sonnet agent A | **done, verified** (18 toques, 4 songs with notes/themes; live data = 3 bundled + 10 Firestore songs) |
| 2 | Move the current design under `/classico` (links in old components) | sonnet agent B | **done, verified** (13 files; independent grep clean; build/lint/62 tests pass) |
| 3 | Foundation: prerender (static SSR), language routing (`/` EN, `/pt/…` PT), LangService, server-safe services | orchestrator | **done** — 72 pages prerendered (5 pages + 18 toques + 13 songs, ×2 languages); hydration on; DataService reads Firestore over REST at build |
| 4 | New design goes bilingual: UI dictionary EN/PT, lang-aware links, content from step 1 | orchestrator | **done** — typed EN/PT dictionary; language switch keeps the player playing |
| 5 | SEO: per-page title/description/canonical/hreflang/og/html lang, JSON-LD, sitemap.xml, robots.txt, manifest | orchestrator | **done** — sitemap 68 pages; 301s for old URLs in vercel.json; classic + private pages noindex |
| 6 | New-design login + 404 pages (EN/PT); admin gets English notes field | orchestrator | **done** |
| 7 | Verify: build, lint, tests, prerendered HTML per route/lang, browser pass desktop + phone, both themes | orchestrator | **done** locally (Vercel-like server): 66 tests, lint clean, routes/redirects, hydration, phone 360/390, contrast both themes |
| 8 | Deploy | Hugo's explicit "deploy" | gated |

Last updated: 2026-09-28. Branch `main`; last deployed commit `09d7225`; everything since is committed locally, not deployed. Next action: Hugo says "deploy", then the human-only track.

## Decisions (from Hugo, 2026-09-28)

- Language lives in the URL, whatever gives the best SEO: English at `/…`, Portuguese at `/pt/…`.
- English is the default for everyone; no auto-redirect by browser language. An EN | PT switch moves between the two URLs.
- The new ("Abadá", formerly `/novo`) design becomes the main site at `/`. The current design moves to `/classico` for a transition period.
- Claude writes all English content; no teacher review.

## Architecture (orchestrator's call)

- Angular static prerender (`@angular/ssr`, `outputMode: 'static'`): every new-design route in both languages is emitted as real HTML at build, with its own `<html lang>`, title, description, canonical, hreflang (en, pt, x-default→en), Open Graph and JSON-LD. Song/toque ids come from bundled JSON plus Firestore (`songs_extra`, `song_overrides`, public read) fetched at build.
- Client-only routes (`/classico/**`, `/admin/**`) are not prerendered; Vercel rewrites unmatched paths to the CSR shell. Songs added in the admin after a deploy still work client-side and get prerendered on the next deploy.
- Hydration enabled with event replay; the player dock is skipped from hydration. Needs a real iPhone/Safari check (another Angular site of Hugo's had to turn hydration off for Safari).
- Song titles and lyrics stay Portuguese in both languages (they are what is sung). English mode shows translations by default.
- Old URLs: `/novo/**` → same path at root; `/musicas/:id` → `/cantigas/:id`; `/minhas` → `/curtidas`; `/videos` → `/toques`.

## Human-only track (Hugo)

1. After deploy: test on an iPhone (Safari) — open a song, play, change language/theme. Hydration is the risk.
2. Google Search Console: add the site, verify ownership, submit `/sitemap.xml`. Needed for Google to pick up the English and Portuguese pages quickly.
3. Consider a custom domain (e.g. abadamusica.com). A `vercel.app` subdomain ranks, but a real domain carries more weight and survives a host change. Decision + purchase are yours.

## Ground rules

- Orchestrator owns the Browser pane; agents verify by build/tests/reading output only.
- No agent deploys or pushes. Deploy only on Hugo's explicit "deploy".
- Agents don't touch: `app.routes.ts`, `app.config*.ts`, `server*.ts`, `angular.json`, `vercel.json`, `src/app/features/novo-design/**` (orchestrator owns these).
