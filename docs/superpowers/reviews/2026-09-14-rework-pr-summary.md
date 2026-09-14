# Rework PR Summary

## Why

The original Phase 1 match experience had too much cognitive load for smartphone play: three-player switching, 360-degree movement, context-sensitive actions, camera changes, and primitive 3D character presentation competed with the core volleyball rhythm.

## New match structure

- One focus player: KAI.
- REN and HINA are teammate AI.
- Fixed 2.5D camera.
- Horizontal drag strip for movement.
- Fixed PLAY and POWER controls.
- Core rhythm: RECEIVE -> AI SET -> JUMP -> SPIKE.
- Hold/release POWER for serve/block.
- Toon 2.5D player proxies with distinct silhouettes and action poses.
- Court markers emphasize receive point, approach, attack lanes, and block read.

## Safety / rollout

- Old MatchScreen and old runtime remain in the repository for rollback/reference.
- main is not changed by this branch until PR merge.
- No GitHub Actions workflows are added.
- PR must stay Draft until real `npm run verify:full` passes outside the restricted environment.
