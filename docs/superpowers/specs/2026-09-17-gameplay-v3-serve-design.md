# Gameplay V3 Serve / Serve Receive Design

Date: 2026-09-17
Branch: `rebuild/v3-mainline-characters`
Status: Approved incremental design

## 1. Goal

Extend the current V3 rally slice with a readable, mobile-first opening phase so rallies can begin from a serve instead of always starting from an opponent attack.

The player must be able to:

- serve with intentional left / middle / right placement,
- press early enough to prepare rather than react to a late prompt,
- receive a CPU serve with the existing forecast + buffered receive model,
- continue directly into the existing receive -> set -> attack loop,
- keep the current quick-block / cover behavior intact.

## 2. Scope

This increment adds two opening flows:

1. **Home serve**: KAI is staged behind the baseline. The left stick selects serve lane and ACTION times contact. The serve can be PERFECT / GOOD / BAD / MISS. A legal serve either scores an ace or becomes a CPU-controlled first contact that transitions into the existing opponent attack flow.
2. **CPU serve**: HINA becomes the controlled receiver before contact. A broad forecast appears early and narrows during flight. ACTION / DIVE may be buffered before the receive window, then the existing receive-quality rules continue into SET BUILDUP.

Not in this increment:

- jump serve,
- float/topspin selection,
- manual toss height,
- six-player rotation,
- service substitution,
- detailed CPU reception formations,
- difficulty-specific serve tuning.

## 3. Rally Opening State

Add serve phases without rewriting the existing rally phases:

- `SERVE_PREP`
- `SERVE_FLIGHT`
- existing `DEFENSE_READ` is reused for CPU-serve receive after the serve enters flight.

Add a rally opening discriminator:

- `HOME_SERVE`
- `AWAY_SERVE`
- `OPPONENT_ATTACK`

The current deterministic attack opener remains available so existing unit scenarios and visual-audit fixtures do not need to be rewritten all at once.

## 4. Serve Input

### Home serve

- KAI is the controlled player.
- Movement does not move KAI off the service spot during `SERVE_PREP`; horizontal stick input instead selects a target lane.
- Target mapping:
  - x <= -0.34: LEFT
  - -0.34 < x < 0.34: MIDDLE
  - x >= 0.34: RIGHT
- ACTION is a buffered serve-contact input.
- Ideal contact is deterministic and visible through body/ball motion; the player is not waiting for a button label change.

Initial timing quality:

- PERFECT: absolute offset <= 0.09 s
- GOOD: <= 0.18 s
- BAD: <= 0.30 s
- MISS: > 0.30 s or no input before contact expiry

MISS is a service fault and awards the CPU a point.

### CPU serve receive

- HINA becomes controlled before the serve crosses the net.
- Existing 2D movement remains active.
- Existing ACTION / DIVE buffering remains active.
- Receive quality uses the same receive resolver as other defensive contacts.

## 5. Ball and Forecast

### Home serve ball

The ball starts behind KAI at the home baseline, rises through a short toss, then travels over the net toward the selected target lane.

The physical ball remains unchanged; only its deterministic trajectory changes.

### CPU serve ball

The ball starts at the away baseline, crosses the net with a readable arc, and lands on the home side.

Forecast rules:

- early flight: broad uncertainty,
- after net crossing: narrower uncertainty,
- final approach: flight-confirmed landing indicator.

The existing projected minimum ball size remains unchanged.

## 6. Serve Resolution

Add a pure serve action module with:

- `serveLaneFromMove(moveX)`
- `resolveServeQuality(timingOffsetSeconds)`
- `resolveServeOutcome(...)`

Serve outcomes:

- `ACE`
- `IN_PLAY`
- `FAULT`

`ACE` and `IN_PLAY` are deterministic from seed, rally index, serve quality, and lane. Wide serves may be marginally harder for CPU reception, but quality must remain the dominant factor.

When `IN_PLAY`, the CPU reception is represented as a deterministic transition into the existing opponent attack opener rather than adding a full CPU pass/set simulation in this increment.

## 7. Point / Next Server Rule

For serve-enabled match flow, the side that wins a rally serves the next rally.

- home point -> next opening `HOME_SERVE`
- away point -> next opening `AWAY_SERVE`

Existing test helpers may continue creating `OPPONENT_ATTACK` directly.

## 8. Camera and HUD

### Camera

- `SERVE_PREP`: staged behind KAI, slightly lower and wider than attack camera, with the net and target court visible.
- CPU serve receive uses the existing defensive third-person camera.
- `SERVE_FLIGHT` blends toward the normal defensive context without manual camera control.

### HUD

Persistent control locations do not move.

During home serve:

- ACTION enabled,
- DIVE disabled,
- JUMP disabled,
- attack swipe pad disabled,
- phase text: `SERVE`,
- detail text: `LEFT / MIDDLE / RIGHT` plus current timing readiness where useful.

During CPU serve receive:

- phase text: `SERVE RECEIVE`,
- ACTION / DIVE enabled early,
- JUMP disabled.

## 9. Architecture

New file:

- `src/game/v3/actions/serve.ts`: pure lane / timing / outcome rules.

Modified files:

- `src/game/v3/types.ts`: serve phases.
- `src/game/v3/core/runtime.ts`: optional serve-enabled opening state and deterministic serve flight.
- `src/game/v3/render/camera.ts`: serve camera pose.
- `src/app/screens/V3MatchScreen.tsx`: serve HUD/control gating and serve-enabled runtime entry.
- `tests/unit/game/v3/serve.test.ts`
- `tests/unit/game/v3/serveRuntime.test.ts`
- `tests/unit/game/v3/camera.test.ts`
- `tests/unit/app/V3MatchScreen.test.tsx`
- `tests/e2e/serve.spec.ts`

Three.js remains presentation-only. Serve scoring and trajectory selection remain deterministic runtime logic.

## 10. Compatibility

- Do not modify or delete `src/game/rework/`.
- Existing V3 quick-block tests remain valid.
- Existing visual-audit scenarios remain direct-state fixtures and do not need to begin with a serve.
- Temporary diagnostics continue to exit success externally while exposing internal `DIAGNOSTIC_STATUS` to avoid GitHub failure-email noise.

## 11. Acceptance Criteria

This increment is complete when:

1. Home serve can intentionally choose left / middle / right target lanes.
2. Early/late serve timing produces deterministic quality and faults.
3. A legal serve produces ACE or IN_PLAY without random nondeterminism.
4. IN_PLAY transitions into existing opponent offense without awarding a point prematurely.
5. CPU serve gives HINA an early readable receive forecast and accepts buffered ACTION / DIVE.
6. Successful serve receive reaches SET BUILDUP.
7. Home/away rally winner becomes next server in serve-enabled flow.
8. Serve camera keeps KAI, ball, net, and target court readable on both mobile landscape viewports.
9. Existing receive, attack, block, cover, character, typecheck, build, and E2E gates remain green.
10. The branch remains unmerged until visual review is complete.
