# Gameplay V3 Playable Slice Implementation Plan

**Goal:** Make the new V3 rules playable as one complete mobile-first rally slice: read an opponent attack early, move freely, prepare receive before contact, transition through a teammate set, switch early to KAI, approach/jump, choose an attack, then score/reset.

**Architecture:** A deterministic fixed-step `V3RuntimeState` owns rally time, ball trajectory, control owner, forecast, buffered inputs, and score. It consumes pure rules already implemented in Foundation/Rally Actions. Three.js and React are presentation/input adapters only and never decide legal volleyball outcomes.

**Spec:** `docs/superpowers/specs/2026-09-15-gameplay-v3-design.md`

## Task 1: Runtime state and deterministic opponent attack

Create:
- `src/game/v3/core/runtime.ts`
- `tests/unit/game/v3/runtime.test.ts`

Requirements:
- `createV3Runtime(seed)` starts with 0-0 score, HINA controlled, `DEFENSE_READ`.
- Opponent attack has a visible pre-contact read window before ball launch.
- Same seed produces same landing target and timing.
- Forecast stages progress `SET_READ -> APPROACH_READ -> CONTACT_READ -> FLIGHT_CONFIRMED` before/after opponent contact.
- Ball flight is deterministic and continuously sampleable; no render-frame dependence.

## Task 2: Integrate movement + early receive buffer

Requirements in runtime tests:
- x/z movement updates the controlled defender directly.
- ACTION pressed up to 0.45 s early remains prepared until receive contact.
- A well-positioned early ACTION yields a successful receive; no last-frame prompt required.
- No buffered action / unreachable position awards the point to CPU and resets rally.

## Task 3: Receive -> set -> attacker switch

Requirements:
- Successful receive enters `SET_BUILDUP`.
- REN provides the default automatic set in the first prototype.
- Before the set reaches KAI, control transfers to KAI with useful lead time.
- The state enters `ATTACK_APPROACH`; user can move KAI on both axes.

## Task 4: Jump + directional attack + simple result

Requirements:
- JUMP is accepted from `ATTACK_APPROACH` with a forgiving ideal timing window.
- Attack gesture is only consumed during `ATTACK_AIRBORNE`.
- TIP/LINE/CROSS/POWER intent is preserved in runtime event output.
- First prototype uses deterministic defensive outcome weights from seed/attack quality, not hidden render state.
- A successful attack awards home point and resets to the next defensive read; failed attack awards away point.

## Task 5: Third-person camera model

Create:
- `src/game/v3/camera/V3Camera.ts`
- `tests/unit/game/v3/camera.test.ts`

Requirements:
- Pure camera frame output by rally phase.
- `DEFENSE_READ/RECEIVE_PREP`: behind controlled defender, wider FOV.
- `SET_BUILDUP`: elevated framing.
- `ATTACK_APPROACH`: behind/diagonal attacker.
- `ATTACK_AIRBORNE`: restrained movement focused on attacker + contact zone.
- No manual look control.

## Task 6: V3 Three.js prototype scene

Create:
- `src/game/v3/render/V3CourtView.ts`
- `src/game/v3/render/V3PlayerView.ts`
- `src/game/v3/render/V3BallView.ts`
- `src/game/v3/render/V3ForecastView.ts`
- `src/game/v3/render/V3Scene.ts`

Requirements:
- Placeholder players use simple real 3D geometry, not textured plane character parts.
- Ball uses the real physics/world radius for position but render scale applies `getReadableBallScale` using projected pixel radius.
- Forecast region is visible before attack contact and narrows by stage.
- Controlled player has a subtle ring.
- Court/net remain readable; first pass can be simpler than legacy gym.

## Task 7: Persistent mobile controls + screen

Create:
- `src/ui/v3/V3Hud.tsx`
- `src/ui/v3/V3MovePad.tsx`
- `src/app/screens/V3MatchScreen.tsx`
- update V3-specific styles
- minimally update `src/app/App.tsx`

Requirements:
- Left virtual pad returns x/z vector, not one number.
- Right controls are stable positions: ACTION, DIVE, JUMP/BLOCK.
- Attack gesture uses the action zone only when airborne.
- Score + controlled player + subtle phase/read feedback.
- `?v3=1` opts into V3 match after difficulty selection; normal route keeps legacy ReworkMatchScreen.
- V3 does not mark tutorial complete or replace production flow yet.

## Task 8: Mobile E2E / visual audit

Update/add Playwright tests:
- V3 query loads the V3 screen.
- both movement axes are accepted.
- forecast exists before contact.
- early buffered receive is observable.
- projected ball diameter meets minimum on supported landscape sizes.
- one scripted full rally can reset/score.
- no-query legacy match still loads.

Capture wide/compact landscape screenshots for manual visual audit before declaring the slice usable.

## Task 9: Gate

- Focused V3 tests GREEN.
- typecheck GREEN.
- full `npm run verify` GREEN.
- mobile E2E GREEN.
- review branch diff to confirm legacy/rework production files are unchanged except the explicit App routing adapter if needed.
- Temporary diagnostic workflow removed before PR/merge.
