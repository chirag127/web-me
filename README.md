# me

[![Deploy to Cloudflare Pages](https://github.com/chirag127/me/actions/workflows/deploy.yml/badge.svg)](https://github.com/chirag127/me/actions/workflows/deploy.yml)
[![GitHub stars](https://img.shields.io/github/stars/chirag127/me?style=flat)](https://github.com/chirag127/me/stargazers)

Personal OS for **[me.oriz.in](https://me.oriz.in)** — a public, static dashboard
aggregating Chirag Singhal's work, media library, coding activity, and life
stats. Astro + React islands, no backend, no login. Fully public.

## Stack

- **Astro 4** (`output: static`) + **React 19** islands + **Tailwind 3**
- **@vite-pwa/astro** — installable PWA (offline shell, network-only live data)
- Data pulled from ~30 APIs at build time into `public/data/*.json`

## Develop

```bash
pnpm install
pnpm dev            # astro dev
pnpm exec astro build   # build WITHOUT refreshing data (safe)
pnpm build          # prebuild (fetch-data) + astro build — needs API keys
```

> **`pnpm build` runs `scripts/fetch-data.ts` first.** Without API keys it
> writes **empty** JSON over `public/data/*`. CI and Cloudflare deploy therefore
> run `astro build` **only** — the committed data snapshots are the source of
> truth; a separate scheduled `refresh-data.yml` workflow updates them with
> secrets present.

## Data refresh

`.github/workflows/refresh-data.yml` runs `pnpm run fetch-data` on a schedule
with API keys in repo secrets, then commits the refreshed `public/data/*.json`.
See `.env.example` for the full list of provider keys (all optional — each
fetcher skips gracefully when its key is absent).

## Deploy

Push to `main` → `.github/workflows/deploy.yml` runs `astro build` and
`wrangler pages deploy dist --project-name=me`. Requires repo secrets
`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`. Custom domain `me.oriz.in`
attaches on the first successful deploy.

## Releases

`.github/workflows/prerelease.yml` builds and tags every push to `main`
(`prerelease-<UTCdate>-<shortsha>`) and attaches a `dist` tarball.

## Packaging

Two tag-triggered workflows build **unsigned** installable wrappers around
`https://me.oriz.in`:

- **Android TWA** (`package-android.yml`) — Bubblewrap APK + AAB
- **Windows** (`package-windows.yml`) — Tauri NSIS + MSI

> **Blocker — signing.** Both produce **unsigned** artifacts. No keystore or
> code-signing certificate is generated or committed. Signing (Android upload
> key + Play App Signing; Windows Authenticode cert) is a manual, credential-
> gated step left for a maintainer.

## PWA

`manifest.webmanifest` + a Workbox service worker precache the static shell.
`/data/*` and all cross-origin requests are **network-only** — live stats are
never served stale. Icons in `public/icons/` (192/512 + maskable).

## License

See [LICENSE](../../../LICENSE).
