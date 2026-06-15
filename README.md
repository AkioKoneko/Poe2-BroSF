# BROSF Wishlist

Compact Path of Exile 2 team wishlist app for BROSF.

## Status

- Frontend: React + Vite.
- Backend: Supabase Auth, Postgres, RLS, and `redeem-invite` Edge Function.
- Local CLI: `npm run brossf -- --help` from the parent project root, or
  `npm run brossf -- --help` inside this app package.
- Intended GitHub shape: separate repository for this app, not the broader
  `PathOfExile2` knowledge repo.

## Local Development

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Required public frontend env:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key
VITE_BROSSF_INTERNAL_EMAIL_DOMAIN=brossf.local.invalid
```

Do not put service-role keys, database passwords, or Supabase secret keys in
frontend env variables.

## CLI

User-mode commands use the publishable key plus `BROSSF_ACCOUNT` and
`BROSSF_PASSWORD`, so they obey RLS.

Admin invite creation requires `BROSSF_SUPABASE_SECRET_KEY` from local env only.
Do not commit it.

```powershell
npm run brossf -- invite create --account Sasha --initials SW --dry-run
npm run brossf -- wish add-rare --owner Sasha --build "BIG MONKE" --name "Dex/Spirit chest" --affix "+Spirit" --dry-run
npm run brossf -- export --dry-run
```

## Supabase

Checked-in SQL migrations live in:

```text
supabase/migrations/
```

The first migrations create:

- `profiles`
- `invites`
- `builds`
- `wishes`
- `wish_claims`

Every frontend table has RLS enabled. The `invites` table is managed through
the Edge Function/service role path, not anonymous frontend reads.

## Separate Repository Deploy Plan

Preferred next step is to create a dedicated GitHub repository, for example:

```text
AkioKoneko/brossf-wishlist
```

Then copy or move this app package as the repository root:

```text
.
├─ src/
├─ public/
├─ supabase/
├─ package.json
├─ package-lock.json
├─ index.html
├─ tsconfig.json
└─ vite.config.ts
```

For GitHub Pages, configure repository Actions with public env values supplied
as repository variables or secrets:

```yaml
name: Deploy BROSF Wishlist

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: lts/*
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}
          VITE_BROSSF_INTERNAL_EMAIL_DOMAIN: brossf.local.invalid
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v5
```

If the repository is published at `https://<user>.github.io/<repo>/`, set Vite
`base` deliberately before the final deploy test. Current `base: "./"` is
portable for static subpath assets, but the final repo URL should still be
browser-tested.
