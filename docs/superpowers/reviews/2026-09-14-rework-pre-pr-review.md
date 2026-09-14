# Gameplay Rework 2.5D — Pre-PR Review

## Scope

This branch replaces the Phase 1 match presentation and control surface while preserving the existing match core, scoring, abilities, persistence, and deployment configuration.

## Rework slice currently wired

- KAI-only focus control; no manual/automatic player switching.
- One-axis drag movement with width assistance.
- Fixed PLAY / POWER touch zones.
- KAI RECEIVE -> teammate SET -> KAI JUMP -> KAI SPIKE flow.
- POWER hold/release FLOAT serve.
- POWER hold/release block preparation with reservation preserved through opponent SET -> SPIKE.
- REN/HINA teammate AI and away-team CPU receive/set/attack execution.
- Home teammate auto serve when rotation selects REN/HINA.
- Point pause -> base formation reset.
- Fixed 2.5D camera with impact zoom only; no rally camera cuts.
- 2.5D toon player proxies; old primitive/capsule PlayerView is not used by ReworkScene.
- Receive / approach / attack-lane / block-read court markers.
- Rework-specific tutorial and smartphone HUD.
- App MATCH route points to ReworkMatchScreen on this branch only.

## Issues found and fixed during static review

- Back-court attack jump was possible.
- Normal spike trajectory could clip the net.
- CPU set target and actual attacker could disagree.
- KAI-only control could stall when REN/HINA rotated to serve.
- Point transition could retain displaced/airborne player states.
- Tutorial opening serve could clip the net or target the wrong player.
- Server visuals could jump from service area to court position.
- Ground movement could look like an idle sprite sliding.
- Block hold reservation was lost when opponent SET changed to SPIKE.
- Tutorial could advance on MISS contacts.

## Verification status

### Performed

- Static review of Rework runtime / AI / rendering / React integration.
- Pure TypeScript spot checks performed during implementation for isolated movement/action/runtime helpers where dependencies were not required.
- Existing and new Vitest/Playwright regression cases have been written around the rework flow.
- Branch contains no `.github/workflows` directory.

### NOT performed in this environment

The current execution environment cannot resolve GitHub/npm registry DNS, so these have **not** been successfully run here:

```bash
npm install
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run verify:full
```

Do not mark the PR ready and do not merge until the real project dependencies are installed and `npm run verify:full` is green in an environment with network/dependency access.
