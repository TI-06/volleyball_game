# Gameplay V3 Serve / Serve Receive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic home serving and CPU serve reception to V3 without regressing the existing receive/attack/block loop.

**Architecture:** Add a pure `actions/serve.ts` rules module, then extend the existing fixed-step runtime with optional serve-enabled openings. Keep direct opponent-attack fixtures intact for existing tests and visual audits. Add serve-specific camera/HUD presentation only after runtime behavior is green.

**Tech Stack:** TypeScript, React, Three.js, Vitest, Playwright, GitHub Actions diagnostics.

**Spec:** `docs/superpowers/specs/2026-09-17-gameplay-v3-serve-design.md`

## Global Constraints

- Keep `src/game/rework/` untouched.
- Preserve deterministic fixed-step runtime behavior.
- Persistent control locations do not move.
- Serve input uses ACTION plus left-stick horizontal aim; no jump serve in this increment.
- Existing visual-audit fixtures may still start from direct attack states.
- GitHub diagnostics must continue exposing internal GREEN/RED while avoiding failed-run email noise.
- Do not merge to main before mobile visual review.

---

### Task 1: Pure Serve Rules

**Files:**
- Create: `src/game/v3/actions/serve.ts`
- Create: `tests/unit/game/v3/serve.test.ts`

**Interfaces:**
- Produces: `V3ServeLane = 'LEFT' | 'MIDDLE' | 'RIGHT'`
- Produces: `V3ServeOutcome = 'ACE' | 'IN_PLAY' | 'FAULT'`
- Produces: `serveLaneFromMove(moveX: number): V3ServeLane`
- Produces: `resolveServeQuality(timingOffsetSeconds: number): V3ContactQuality`
- Produces: `resolveServeOutcome(input: { seed: number; rallyIndex: number; quality: V3ContactQuality; lane: V3ServeLane }): V3ServeOutcome`

- [ ] **Step 1: Write failing lane/timing/outcome tests**

Test exact lane boundaries, timing windows (`0.09 / 0.18 / 0.30`), MISS -> FAULT, and deterministic repeated outcome for identical inputs.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/serve.test.ts`

Expected: FAIL because `actions/serve.ts` does not exist.

- [ ] **Step 3: Implement minimal pure serve rules**

Use no global randomness. Hash only `seed`, `rallyIndex`, `quality`, and `lane` inside `resolveServeOutcome`. Keep quality dominant over lane.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/unit/game/v3/serve.test.ts`

Expected: all serve unit tests PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add deterministic V3 serve rules`

---

### Task 2: Serve-Enabled Runtime Opening

**Files:**
- Modify: `src/game/v3/types.ts`
- Modify: `src/game/v3/core/runtime.ts`
- Create: `tests/unit/game/v3/serveRuntime.test.ts`

**Interfaces:**
- Add phases: `SERVE_PREP`, `SERVE_FLIGHT`
- Add opening kind: `V3RallyOpening = 'HOME_SERVE' | 'AWAY_SERVE' | 'OPPONENT_ATTACK'`
- Add event: `{ type: 'SERVE'; quality: V3ContactQuality; lane: V3ServeLane; outcome: V3ServeOutcome; actorId: string }`
- Add constructor: `createV3ServeRuntime(seed?: number, serverSide?: 'home' | 'away'): V3RuntimeState`

- [ ] **Step 1: Write failing runtime tests**

Cover:

1. home serve begins in `SERVE_PREP`, controls KAI, and exposes deterministic target lane,
2. ACTION near ideal contact creates serve event and enters `SERVE_FLIGHT`,
3. missing/late ACTION creates FAULT and CPU point,
4. ACE gives home point,
5. IN_PLAY transitions to existing opponent attack without score change,
6. away serve starts with HINA receive ownership and early forecast,
7. buffered ACTION on away serve can resolve receive and reach `SET_BUILDUP`,
8. rally winner becomes next server in serve-enabled flow,
9. `createV3Runtime()` direct attack behavior remains unchanged for existing fixtures.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/serveRuntime.test.ts tests/unit/game/v3/runtime.test.ts`

Expected: serve runtime tests FAIL for missing phases/API while legacy V3 runtime tests stay GREEN.

- [ ] **Step 3: Implement deterministic serve state**

Add serve metadata to `V3RallyRuntime` only as needed: opening kind, target lane/target point, serve contact/receive times, and serve-enabled flag. During `SERVE_PREP`, use `input.move.x` as aim and do not move KAI from the baseline. During `SERVE_FLIGHT`, update ball position with a deterministic arc.

For CPU serve, reuse the existing receive resolver rather than duplicating receive-quality logic.

For legal home `IN_PLAY`, transition to the existing opponent-attack opener with score and rally index preserved.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/unit/game/v3/serveRuntime.test.ts tests/unit/game/v3/runtime.test.ts tests/unit/game/v3/blockContinuation.test.ts`

Expected: all PASS.

- [ ] **Step 5: Run full V3 unit gate**

Run: `npm test -- tests/unit/game/v3 tests/unit/app/V3MatchScreen.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add V3 serve runtime openings`

---

### Task 3: Serve Camera and Screen Presentation

**Files:**
- Modify: `src/game/v3/render/camera.ts`
- Modify: `src/app/screens/V3MatchScreen.tsx`
- Modify: `tests/unit/game/v3/camera.test.ts`
- Modify: `tests/unit/app/V3MatchScreen.test.tsx`

**Interfaces:**
- `getV3CameraPose()` recognizes `SERVE_PREP`/`SERVE_FLIGHT`.
- V3 match screen uses `createV3ServeRuntime()` for normal V3 play, while visual-audit fixtures remain fixture-driven.
- HUD labels: `SERVE`, `SERVE RECEIVE`.

- [ ] **Step 1: Write failing camera/screen tests**

Require:

- serve camera behind home baseline with KAI, ball, net, and target court in front,
- home serve enables ACTION and disables DIVE/JUMP/ATTACK,
- serve receive enables ACTION/DIVE early and disables JUMP,
- phase presentation returns `SERVE` and `SERVE RECEIVE`,
- current block/cover labels remain unchanged.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/camera.test.ts tests/unit/app/V3MatchScreen.test.tsx`

Expected: new serve assertions FAIL only.

- [ ] **Step 3: Implement minimal presentation**

Add serve camera branch and serve control gating. Keep control positions unchanged. During home serve, use movement-pad x as target intent through runtime input; do not create a new UI control.

- [ ] **Step 4: Run GREEN**

Run the same command and require all PASS.

- [ ] **Step 5: Run typecheck/build**

Run: `npm run typecheck && npm run build`

Expected: exit 0; chunk-size warning is allowed.

- [ ] **Step 6: Commit**

Commit message: `feat: present V3 serve and serve receive`

---

### Task 4: Mobile E2E Serve Flow

**Files:**
- Create: `tests/e2e/serve.spec.ts`
- Modify only if required for stable debug attributes: `src/app/screens/V3MatchScreen.tsx`

**Interfaces:**
- E2E may use existing `v3:e2e-advance` manual fixed-step event.
- Expose only stable data attributes needed to assert serve lane, opening kind, and last serve outcome.

- [ ] **Step 1: Write failing E2E scenarios**

Add tests for both mobile landscape projects:

1. Home serve: start serve, use movement pad to choose a side lane, press ACTION in timing window, observe serve flight and non-FAULT result.
2. CPU serve receive: start away serve, verify forecast before contact, buffer ACTION early, reach `SET BUILDUP` without score change.
3. Capture `serve-prep`, `serve-flight`, and `serve-receive` screenshots.

- [ ] **Step 2: Run visual diagnostic**

Trigger the existing `[visual]` diagnostics workflow path. External workflow conclusion may remain success; inspect `E2E_EXIT` and `DIAGNOSTIC_STATUS` in logs.

Expected RED until screen/runtime contracts are wired correctly.

- [ ] **Step 3: Make only the minimum E2E-support changes**

Do not add production-only test shortcuts beyond existing manual fixed-step advancement and stable read-only debug attributes.

- [ ] **Step 4: Re-run visual diagnostic**

Expected: unit, typecheck, build, and Playwright all internal GREEN.

- [ ] **Step 5: Download artifact and visually inspect both mobile sizes**

Confirm:

- serve ball is visible at baseline and crossing net,
- target/read indicator does not hide players,
- controls do not overlap on compact viewport,
- KAI serve camera is understandable,
- HINA receive ownership is obvious before contact.

- [ ] **Step 6: Commit**

Commit message: `test: cover V3 serve flows on mobile`

---

### Task 5: Full Regression Gate

**Files:**
- No production changes unless a regression is found.

- [ ] **Step 1: Run fresh full diagnostics**

Require:

- all unit tests GREEN,
- typecheck GREEN,
- production build GREEN,
- all mobile E2E GREEN,
- visual artifact produced.

- [ ] **Step 2: Verify legacy/non-serve paths**

Confirm existing block STUFF/MISS/TOUCH/DEFLECT, receive->set->attack, direct visual-audit states, and legacy/rework route remain intact.

- [ ] **Step 3: Review branch diff**

Confirm no accidental edits to `src/game/rework/`, no generated artifacts committed, and no test-only behavior leaking into production outside the existing manual E2E hook.

- [ ] **Step 4: Keep branch unmerged**

Report the verified state and visual findings. Do not merge until the V3 serve slice has been visually accepted.
