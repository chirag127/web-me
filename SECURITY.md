# Security

## Reporting a vulnerability

Use GitHub Security Advisories: go to
https://github.com/chirag127/me/security/advisories/new
and open a private advisory.

Alternatively email / DM chirag127 directly (do not open a public issue for
security bugs).

## Supported versions

Only the latest commit on `main` is supported.

## Scope

This repo is a **fully public, read-only static site** — no user accounts, no
auth, no payment data, no server-side secrets at runtime.

Build-time secrets (API keys for data-fetch scripts) live in GitHub Actions
repo secrets and are never embedded in the deployed `dist/`. If you believe a
key has been leaked into built artifacts or the repo history, report it
immediately via the advisory link above.
