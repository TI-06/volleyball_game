# Draft PR body

## Summary

Reworks the smartphone match experience around a single focus player and a fixed 2.5D presentation.

- KAI-only player control; REN/HINA teammate AI
- one-axis drag movement with assistance
- fixed PLAY / POWER controls
- RECEIVE -> AI SET -> JUMP -> SPIKE core rally
- hold/release FLOAT serve and block timing
- fixed 2.5D camera, no rally camera cuts
- toon sprite proxies instead of primitive humanoids
- receive/approach/attack/block court markers
- rework tutorial and mobile E2E assertions
- existing scoring, abilities, difficulty, persistence, and Cloudflare configuration retained

## Important

This PR is intentionally Draft. The current environment cannot install dependencies or run the full project verification because outbound DNS to GitHub/npm is unavailable.

Do **not** merge until the following are run successfully in a normal development environment:

```bash
npm install
npm run test:e2e:install
npm run verify:full
```

Then commit the generated `package-lock.json` if this is the first successful install for the repository.

No GitHub Actions workflows are added by this branch.
