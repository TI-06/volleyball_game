# Gameplay V3 Serve / Serve Receive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic mobile-first serve and serve-receive opening to the current V3 rally loop without regressing the existing receive/set/attack/block gameplay.

**Architecture:** Extend the existing fixed-step V3 runtime instead of creating a separate match engine. Serve state lives in pure runtime data; Three.js remains presentation-only. CPU serve routes into the existing receive flow, while player serve uses the same persistent mobile controls and then hands control to defense.

**Tech Stack:** TypeScript, React, Three.js, Vitest, Playwright, GitHub Actions diagnostics.

**Spec:** `docs/superpowers/specs/2026-09-15-gameplay-v3-design.md`

## Global Constraints

- Mobile landscape remains the primary input target.
- Simulation remains fixed-step and deterministic by seed.
- Physics and render presentation remain separate.
- No manual camera look control.
- Inputs should be bufferable rather than requiring last-frame prompts.
- Existing receive -> set -> attack and block -> cover flows must remain green.
- Initial serve scope is intentionally small: one player serve mechanic and one CPU serve mechanic; no jump/floater taxonomy yet.
- Main branch is not modified until this branch passes unit, typecheck, build, and mobile E2E gates.

---

### Task 1: Serve phases and deterministic serve state

**Files:**
- Modify: `src/game/v3/types.ts`
- Modify: `src/game/v3/core/runtime.ts`
- Test: `tests/unit/game/v3/serveRuntime.test.ts`

**Interfaces:**
- Produces rally phases `SERVE_READY`, `SERVE_FLIGHT`, and existing `DEFENSE_READ`.
- Produces pure serve metadata on runtime state: server side, target, contact time, landing time.

- [ ] **Step 1: Write failing runtime tests**

Test that a deterministic seed creates a CPU-serve opening and another deterministic setup can create a home-serve opening; both expose stable target/contact timing.

- [ ] **Step 2: Run tests and verify RED**

Run `npm test -- tests/unit/game/v3/serveRuntime.test.ts`.
Expected: fail because serve phases/state do not exist.

- [ ] **Step 3: Implement minimal serve state**

Add serve phases/types and deterministic serve metadata. Keep existing post-serve rally structures unchanged.

- [ ] **Step 4: Run focused tests and typecheck**

Run `npm test -- tests/unit/game/v3/serveRuntime.test.ts && npm run typecheck`.
Expected: PASS.

- [ ] **Step 5: Commit**

Commit message: `feat: add deterministic serve runtime state`.

### Task 2: CPU serve into existing receive flow

**Files:**
- Modify: `src/game/v3/core/runtime.ts`
- Test: `tests/unit/game/v3/serveRuntime.test.ts`

**Interfaces:**
- CPU serve starts at away baseline, crosses net, and resolves into existing HINA receive ownership.
- Forecast appears before the receive contact window.
- ACTION/DIVE buffering remains the same receive API.

- [ ] **Step 1: Add failing CPU serve-receive tests**

Assert serve ball positions before/after contact, early forecast visibility, HINA control before reception, and successful ACTION leading to `SET_BUILDUP`.

- [ ] **Step 2: Verify RED**

Run focused tests and confirm only new expectations fail.

- [ ] **Step 3: Implement CPU serve trajectory and handoff**

Use deterministic interpolation for toss/contact/flight. At serve flight start, transition to defensive read early enough for movement and buffered receive.

- [ ] **Step 4: Verify focused + existing runtime tests**

Run `npm test -- tests/unit/game/v3/serveRuntime.test.ts tests/unit/game/v3/runtime.test.ts`.

- [ ] **Step 5: Commit**

Commit message: `feat: route cpu serve into receive flow`.

### Task 3: Player serve input

**Files:**
- Create: `src/game/v3/actions/serve.ts`
- Modify: `src/game/v3/core/runtime.ts`
- Test: `tests/unit/game/v3/serve.test.ts`
- Test: `tests/unit/game/v3/serveRuntime.test.ts`

**Interfaces:**
- `ACTION` starts/commits a serve during `SERVE_READY`.
- Movement-stick horizontal input selects target lane.
- Timing maps to `PERFECT | GOOD | BAD | MISS`.
- Successful home serve hands control to defense after ball crosses the net.

- [ ] **Step 1: Write failing serve-quality tests**

Cover timing windows and left/middle/right target selection.

- [ ] **Step 2: Verify RED**

Run serve-focused unit tests.

- [ ] **Step 3: Implement minimal serve action resolver**

Keep one serve style. Direction comes from current stick x; timing comes from input timestamp relative to ideal contact.

- [ ] **Step 4: Connect serve to runtime**

During `SERVE_READY`, ACTION buffers/executes serve; `SERVE_FLIGHT` advances the ball deterministically.

- [ ] **Step 5: Verify focused tests**

Run serve, runtime, receive, and player-switch test suites.

- [ ] **Step 6: Commit**

Commit message: `feat: add player serve controls`.

### Task 4: Serve camera, HUD, and character presentation

**Files:**
- Modify: `src/game/v3/render/camera.ts`
- Modify: `src/app/screens/V3MatchScreen.tsx`
- Modify: `src/game/v3/presentation/characterPresentation.ts` or current equivalent
- Modify: `src/game/v3/presentation/characterPoses.ts` or current equivalent
- Test: `tests/unit/game/v3/camera.test.ts`
- Test: `tests/unit/app/V3MatchScreen.test.tsx`
- Test: relevant character presentation tests

**Interfaces:**
- `SERVE_READY`: staged behind server with court target visible.
- HUD labels: `SERVE` for player serve, `SERVE RECEIVE` for CPU serve.
- ACTION is enabled for serving; DIVE/BLOCK/ATTACK remain disabled until their phases.
- Server uses a readable serve pose before contact.

- [ ] **Step 1: Add failing camera/HUD/presentation tests**

Require serve-specific camera composition, button enablement, labels, and serve pose.

- [ ] **Step 2: Verify RED**

Run focused UI/camera/presentation tests.

- [ ] **Step 3: Implement minimal presentation**

Add serve camera branch and phase presentation without changing physics.

- [ ] **Step 4: Verify focused tests + build**

Run focused tests, `npm run typecheck`, and `npm run build`.

- [ ] **Step 5: Commit**

Commit message: `feat: present serve and serve receive states`.

### Task 5: Mobile E2E for both serve directions

**Files:**
- Create or modify: `tests/e2e/serve.spec.ts`
- Modify localhost-only E2E seed/manual stepping helper only if necessary.

**Interfaces:**
- CPU path: serve receive -> ACTION -> SET BUILDUP.
- Player path: target lane -> ACTION serve -> ball crosses net -> defensive continuation.
- Runs on compact and wide landscape projects.

- [ ] **Step 1: Add failing E2E tests**

Use manual fixed-step mode; input still comes through real DOM/touch controls.

- [ ] **Step 2: Verify RED**

Run visual diagnostics and ensure failure is due to missing serve UI/runtime behavior.

- [ ] **Step 3: Implement only required E2E-safe hooks**

Any deterministic seed override/manual advance remains localhost-only.

- [ ] **Step 4: Run full visual gate**

Expected: all unit tests, typecheck, production build, and all Playwright mobile tests GREEN.

- [ ] **Step 5: Inspect screenshots**

Check ball readability, server framing, target cue, receive preparation, and control overlap at 844x390 and 932x430.

- [ ] **Step 6: Commit**

Commit message: `test: verify serve and serve receive on mobile [visual]`.

### Task 6: Regression gate

**Files:**
- No product changes unless a regression is found.

- [ ] **Step 1: Run complete test suite**
- [ ] **Step 2: Run typecheck**
- [ ] **Step 3: Run production build**
- [ ] **Step 4: Run all mobile E2E**
- [ ] **Step 5: Confirm existing attack/block/cover screenshots and flows remain valid**
- [ ] **Step 6: Record final verified head SHA**
