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
- Shared receive ownership decides KAI / REN / HINA from predicted landing, reachability, and Receive ability.
- Predicted OUT balls are left untouched by both sides.
- Home teammate auto serve when rotation selects REN/HINA.
- Point pause -> base formation reset.
- Result -> REMATCH creates a fresh runtime/seed and does not duplicate saved match results.
- Fixed 2.5D camera with impact zoom only; no rally camera cuts.
- 2.5D toon player proxies; old primitive/capsule PlayerView is not used by ReworkScene.
- Receive / approach / attack-lane / block-read court markers.
- Rework-specific tutorial and smartphone HUD.
- App MATCH route points to ReworkMatchScreen on this branch only.

## Issues found and fixed during static review

- Back-court attack jump was possible.
- Attack JUMP/SPIKE could be offered from unrealistic distances; jump and real spike contact now use separate ranges.
- Normal spike trajectory could clip the net.
- User BLOCK could contact a spike too far across the net; real net-depth distance is now required.
- CPU set target and actual attacker could disagree.
- KAI-only control could stall when REN/HINA rotated to serve.
- REN/HINA automatic serve happened almost instantly after SERVE_READY; a 0.45s readable windup is now used.
- KAI manual serve remains manual when rotation returns to index 0.
- Point transition could retain displaced/airborne player states.
- Final POINT could persist after MATCH_OVER and be processed more than once inside a multi-step render frame.
- Final hit presentation could freeze for the 900ms result delay; rendering now continues while the one-shot result timer runs.
- Tutorial opening serve could clip the net or target the wrong player.
- Serve-ready ball staging used a lower visual height than the real FLOAT contact origin, causing a visible jump on contact.
- Server visuals could jump from service area to court position.
- Ground movement could look like an idle sprite sliding.
- Block hold reservation was lost when opponent SET changed to SPIKE.
- User BLOCK could contact before the player had physically left the floor.
- CPU blockers could attempt a block from the back court instead of first approaching the net.
- Tutorial could advance on MISS contacts.
- Teammate receive assignment always forced HINA, even when REN was much closer to the landing ball.
- KAI PLAY could light for a ball that was clearly owned by REN/HINA; PLAY and teammate AI now use the same receive-ownership decision.
- Receive guidance could point KAI at teammate-owned or predicted OUT balls; marker state now uses the same receive ownership.
- CPU could attempt to receive a user attack predicted to land OUT; both sides now use shared court-boundary logic.
- REN first touch can continue into HINA emergency set.
- Movement / serve / spike screen direction could disagree with the fixed camera; all now map finger direction to screen direction.
- pointercancel could behave like POWER release and accidentally trigger a serve/block; cancel now discards the hold.

## Presentation / feedback added during review

- Volleyball-specific court cues: attack lines, antennae, service marks.
- Staged receive / approach / attack-lane / block guidance to avoid showing every marker at once.
- Contact impact rings and light impact zoom on RECEIVE / SPIKE / BLOCK.
- Supported-device haptics for KAI RECEIVE / SPIKE / BLOCK and won points; unsupported browsers no-op.
- Fast-ball trail only on high-speed serves/spikes to make trajectories readable.
- Toon proxy textures reduced to 320px, mipmaps disabled, and renderer DPR capped at 1.5 for mobile performance.
- Home/away proxy faces orient toward the net.
- Volleyball-specific result stats: spike kills, block points, perfect passes, longest rally, best spike.

## Verification status

### Performed

- Static review of Rework runtime / AI / rendering / React integration.
- Pure TypeScript spot checks performed during implementation for isolated movement/action/runtime helpers where dependencies were not required.
- Existing and new Vitest/Playwright regression cases have been written around the rework flow, including REMATCH lifecycle, receive ownership, attack/block contact range, and symmetric court-boundary behavior.
- Branch contains no `.github/workflows` directory.
- Latest checked PR-head Workflow run list is empty.

### NOT performed in this environment

The current execution environment still cannot reliably reach the npm registry, so these have **not** been successfully run here:

```bash
npm install
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run verify:full
```

Before merge, run:

```bash
npm install
npm run test:e2e:install
npm run verify:full
```

If this is the repository's first successful dependency install, commit the generated `package-lock.json`, then use `npm ci` for subsequent verification.

Do not mark PR #2 ready and do not merge until the real project dependencies are installed, `npm run verify:full` is green, and the 844x390 / 932x430 landscape flows have been manually smoke-tested.
