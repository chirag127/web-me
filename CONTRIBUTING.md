# Contributing

## Setup

```bash
pnpm install
```

## Develop

```bash
pnpm dev          # Astro dev server (hot-reload)
pnpm exec astro build   # build without refreshing data (safe, no API keys needed)
```

`pnpm build` also runs the data-fetch prebuild — skip it during local dev
unless you have all API keys from `.env.example`.

## Tests

```bash
pnpm run test:e2e   # Playwright end-to-end suite
```

Run `pnpm exec playwright install --with-deps` once before the first test run.

## Branch / PR conventions

- Commit direct to `main` for small fixes.
- For larger changes open a PR from a feature branch.
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.

## Code style

Astro + React + Tailwind. No extra formatter config — just keep your output
consistent with the surrounding code. TypeScript strict mode is on.
