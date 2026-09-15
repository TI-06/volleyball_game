# Gameplay V3 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the isolated V3 gameplay foundation that proves direct 2D movement, readable ball presentation rules, anticipatory landing forecasts, and early buffered inputs before implementing full receive/set/spike actions.

**Architecture:** V3 lives entirely under `src/game/v3/` and does not modify the legacy/rework simulation. Pure TypeScript modules own deterministic state, movement, prediction, and input buffering. Rendering code later consumes presentation values but cannot mutate simulation rules.

**Tech Stack:** TypeScript 5.9, Vitest 5, React 19, Three.js 0.186, Vite 8.

**Spec:** `docs/superpowers/specs/2026-09-15-gameplay-v3-design.md`

## Global Constraints

- Primary target is smartphone landscape web.
- Match format remains 3v3.
- Existing `src/game/rework/` remains untouched during this plan.
- Do not make the ball physically larger to solve readability; physics and projected presentation size stay separate.
- Do not solve reaction difficulty by simply slowing every ball.
- V3 movement is direct two-axis court movement, not one-axis lane correction.
- Normal defensive preparation supports roughly 350-500 ms of pre-contact input buffering.
- Simulation functions remain deterministic and Three.js-independent.
- Tests are written and observed RED before production implementation.
- A temporary diagnostic GitHub workflow may be used only because the current execution environment cannot clone the repository; it must always exit success while reporting the actual test exit code in logs, and it must be removed before the V3 branch is merged.

---

## File map for this plan

```text
src/game/v3/
  types.ts                         # V3-owned Vec2, input and forecast types
  core/
    createV3State.ts               # deterministic V3 prototype state
    movement.ts                    # direct 2D court movement/clamping
  controls/
    inputBuffer.ts                 # early action buffering and expiry
  prediction/
    landingForecast.ts             # trajectory-derived uncertainty region
  render/
    ballReadability.ts             # projected minimum ball-size rule

tests/unit/game/v3/
  createV3State.test.ts
  movement.test.ts
  inputBuffer.test.ts
  landingForecast.test.ts
  ballReadability.test.ts
```

### Task 1: Deterministic V3 state boundary

**Files:**
- Create: `tests/unit/game/v3/createV3State.test.ts`
- Create: `src/game/v3/types.ts`
- Create: `src/game/v3/core/createV3State.ts`

**Interfaces:**
- Produces: `V3Vec2`, `V3PlayerState`, `V3PrototypeState`, `createV3PrototypeState(seed?: number): V3PrototypeState`.
- The initial controlled player is `home-2` (HINA) for the defensive prototype so the first V3 slice starts from receive play rather than serving.

- [ ] **Step 1: Write the failing deterministic-state test**

```ts
import { describe, expect, it } from 'vitest';
import { createV3PrototypeState } from '../../../../src/game/v3/core/createV3State';

describe('V3 prototype state', () => {
  it('creates the same defensive 3v3 state for the same seed', () => {
    const first = createV3PrototypeState(73);
    const second = createV3PrototypeState(73);
    expect(first).toEqual(second);
    expect(first.players).toHaveLength(6);
    expect(first.controlledPlayerId).toBe('home-2');
    expect(first.phase).toBe('DEFENSE_READ');
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/createV3State.test.ts`
Expected: FAIL because `src/game/v3/core/createV3State.ts` does not exist.

- [ ] **Step 3: Implement the minimum state/types**

Use an isolated V3 state rather than reusing mutable `MatchState` directly. Store `seed`, `time`, `phase`, `controlledPlayerId`, six lightweight player states, and a lightweight ball snapshot. No action/scoring rules in this task.

- [ ] **Step 4: Verify GREEN plus typecheck**

Run:
```bash
npm test -- tests/unit/game/v3/createV3State.test.ts
npm run typecheck
```
Expected: PASS.

### Task 2: Direct two-axis player movement

**Files:**
- Create: `tests/unit/game/v3/movement.test.ts`
- Create: `src/game/v3/core/movement.ts`

**Interfaces:**
- Produces: `normalizeMoveInput(input: V3Vec2): V3Vec2` and `moveControlledPlayer(position, input, speed, dt): V3Vec2`.
- Home court bounds are width `[-4.25, 4.25]` and depth `[-8.55, -0.45]`, leaving a small safety margin from lines/net.

- [ ] **Step 1: Write RED tests**

Assert diagonal input magnitude is normalized to 1, x and z both move under diagonal input, and movement clamps to home-court bounds rather than assisting toward the ball.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/movement.test.ts`
Expected: FAIL because movement module is missing.

- [ ] **Step 3: Implement minimal direct movement**

Movement delta is `normalizedInput * speed * dt`. Do not add automatic width assistance or target seeking.

- [ ] **Step 4: Verify GREEN**

Run:
```bash
npm test -- tests/unit/game/v3/movement.test.ts
npm run typecheck
```
Expected: PASS.

### Task 3: Screen-space ball readability rule

**Files:**
- Create: `tests/unit/game/v3/ballReadability.test.ts`
- Create: `src/game/v3/render/ballReadability.ts`

**Interfaces:**
- Produces: `getReadableBallScale(projectedRadiusPx: number, minimumRadiusPx?: number): number`.
- Default minimum projected radius is `7` px, giving a minimum diameter of 14 px on mobile.
- Scale affects rendering only; physics radius is not accepted by this API and cannot be changed here.

- [ ] **Step 1: Write RED tests**

```ts
expect(getReadableBallScale(3.5)).toBeCloseTo(2);
expect(getReadableBallScale(7)).toBe(1);
expect(getReadableBallScale(14)).toBe(1);
```

Also assert invalid/zero projected radius returns a bounded maximum scale instead of Infinity.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/ballReadability.test.ts`
Expected: FAIL because module is missing.

- [ ] **Step 3: Implement presentation-only scaling**

Return `max(1, min(MAX_BALL_RENDER_SCALE, minimumRadiusPx / projectedRadiusPx))`; initial max render scale is `2.4`.

- [ ] **Step 4: Verify GREEN**

Run:
```bash
npm test -- tests/unit/game/v3/ballReadability.test.ts
npm run typecheck
```
Expected: PASS.

### Task 4: Anticipatory landing forecast

**Files:**
- Create: `tests/unit/game/v3/landingForecast.test.ts`
- Create: `src/game/v3/prediction/landingForecast.ts`

**Interfaces:**
- Produces `ForecastStage = 'SET_READ' | 'APPROACH_READ' | 'CONTACT_READ' | 'FLIGHT_CONFIRMED'`.
- Produces `LandingForecast { center: V3Vec2; radius: number; confidence: number; stage: ForecastStage }`.
- Produces `createLandingForecast(input): LandingForecast`.
- The input explicitly contains a deterministic `noiseSample` in `[-1,1]`; this keeps prediction math pure and reproducible.

- [ ] **Step 1: Write RED tests**

Assert forecast uncertainty shrinks monotonically from `SET_READ` to `FLIGHT_CONFIRMED`, center moves closer to `actualLanding` as stages progress, and identical input/noise gives identical output.

Expected baseline radii on NORMAL-like assistance: `2.6`, `1.8`, `1.05`, `0.42` metres before difficulty scaling.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/landingForecast.test.ts`
Expected: FAIL because module is missing.

- [ ] **Step 3: Implement deterministic convergence**

Use stage-specific blend values toward actual landing and stage-specific radius. Clamp centers to playable home court. Difficulty later supplies radius/error multipliers; this task exposes parameters rather than importing old CPU difficulty profiles.

- [ ] **Step 4: Verify GREEN**

Run:
```bash
npm test -- tests/unit/game/v3/landingForecast.test.ts
npm run typecheck
```
Expected: PASS.

### Task 5: Early action input buffer

**Files:**
- Create: `tests/unit/game/v3/inputBuffer.test.ts`
- Create: `src/game/v3/controls/inputBuffer.ts`

**Interfaces:**
- `V3BufferedActionKind = 'ACTION' | 'DIVE' | 'JUMP_BLOCK'`.
- `bufferAction(kind, now, direction?, windowSeconds?): V3BufferedAction`.
- `isBufferedActionActive(action, now): boolean`.
- `consumeBufferedAction(action, now): V3BufferedAction | null` returns the active action once and null when expired/consumed.
- Default buffer window is `0.45` seconds.

- [ ] **Step 1: Write RED tests**

Assert ACTION entered at `t=1.0` remains active at `1.40`, expires after `1.45`, preserves intended direction, and cannot be consumed twice.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/inputBuffer.test.ts`
Expected: FAIL because module is missing.

- [ ] **Step 3: Implement minimum immutable buffer model**

Represent consumption by returning a copied action with `consumed: true` from a dedicated `markBufferedActionConsumed` helper, and make active checks reject consumed actions. Do not connect volleyball contact rules yet.

- [ ] **Step 4: Verify GREEN**

Run:
```bash
npm test -- tests/unit/game/v3/inputBuffer.test.ts
npm run typecheck
```
Expected: PASS.

### Task 6: Foundation regression gate

**Files:**
- No production files required.
- Temporary verification workflow may be added under `.github/workflows/` only for this branch and must be removed before merge.

**Interfaces:**
- Foundation is complete only when all V3 focused tests, full Vitest suite, typecheck, and production build pass.

- [ ] **Step 1: Run focused V3 suite**

```bash
npm test -- tests/unit/game/v3
```

- [ ] **Step 2: Run full project gate**

```bash
npm run verify
```

Expected: existing legacy/rework behavior remains GREEN because this plan adds isolated V3 modules only.

- [ ] **Step 3: Review diff**

Confirm no files under `src/game/rework/` changed and no production route points users to incomplete V3 yet.

- [ ] **Step 4: Commit logical slices**

Use small commits such as:

```text
feat: add isolated gameplay v3 state and movement
feat: add v3 ball readability and landing forecast
feat: add v3 early action input buffer
```

Do not merge this foundation by itself as the user-facing replacement. Continue to Rally Actions after the foundation gate is GREEN.
