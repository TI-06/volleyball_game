# Cloudflare Workers deployment

Phase 1 is deployed as a React/Vite SPA on **Cloudflare Workers Static Assets** using the official Cloudflare Vite plugin.

## Current repository configuration

`vite.config.ts`

```ts
import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), cloudflare()],
});
```

`wrangler.jsonc`

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "volleyball-game",
  "compatibility_date": "2026-09-14",
  "assets": {
    "not_found_handling": "single-page-application"
  }
}
```

Do **not** add `assets.directory` while using the Cloudflare Vite plugin. The plugin writes the client build directory into the generated output Wrangler configuration during `vite build`.

## First deploy

Prerequisites:

- Node.js 22.12 or newer
- A Cloudflare account
- This repository checked out locally

Run:

```bash
npm install
npm run test:e2e:install
npm run verify:full
npx wrangler login
npm run deploy
```

The first successful `npm install` should generate `package-lock.json`. Commit that file before the Phase 1 merge, then use `npm ci` for repeatable future installs.

`npm run test:e2e:install` installs the Chromium browser binary used by the Playwright mobile-landscape E2E tests. It is normally needed only once per development machine / Playwright browser cache.

`npm run deploy` performs a production build and then deploys with Wrangler. The deployed Worker name is `volleyball-game` unless `wrangler.jsonc` is changed.

## Local production-runtime preview

```bash
npm run preview
```

The repository preview script builds first and then launches Vite preview with the Cloudflare Vite plugin, so the preview uses the Workers runtime behavior instead of only the normal Vite development server.

## Dashboard check after deploy

In Cloudflare Dashboard:

1. Open **Workers & Pages**.
2. Open the Worker named **volleyball-game**.
3. Confirm the latest deployment is active.
4. Open the generated `workers.dev` URL.
5. Check the game at smartphone landscape sizes, especially 844x390 and 932x430.
6. Confirm SPA fallback works instead of returning a 404 for client-side routes.

No KV, D1, R2, Durable Objects, environment variables, secrets, or custom bindings are required for Phase 1.

## Custom domain (optional)

After the Worker is working on its `workers.dev` URL:

1. Open the Worker in Cloudflare Dashboard.
2. Open **Settings / Domains & Routes** (wording may vary slightly in the dashboard).
3. Add a Custom Domain, for example `volleyball.example.com`.
4. Use a domain that is already managed in the same Cloudflare account.
5. Verify HTTPS and open the game from the custom domain.

Do not change application code for a normal root-domain/subdomain deployment; Vite assets are emitted for root-hosted deployment.

## Git integration policy for Phase 1

GitHub Actions are intentionally not configured yet. Deploy manually from a verified local checkout to avoid noisy failure emails during early development.

After Phase 1 is stable, Cloudflare Builds/Git integration can be considered separately. Do not enable automatic production deploys until `npm ci`, `npm run verify:full`, and the mobile smoke checks are reliable.

## Release gate

Before the first public deployment:

```bash
npm install                   # first time only; creates package-lock.json
npm run test:e2e:install      # first time per machine/browser cache
npm run verify:full
npm run preview
```

Then manually check:

- 844x390 landscape
- 932x430 landscape
- portrait pause/rotate-back behavior
- tutorial first serve
- manual character switching
- one full 15-point match
- result screen
- rematch
- HARD win -> EXPERT unlock
- EXPERT win -> MASTER unlock

Finally:

```bash
npx wrangler login            # first time / when auth has expired
npm run deploy
```
