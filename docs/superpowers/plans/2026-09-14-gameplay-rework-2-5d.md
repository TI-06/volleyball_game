# Gameplay Rework 2.5D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current three-player-switching 3D match experience with a smartphone-first 2.5D playable slice where the user controls KAI only and the core rally is RECEIVE -> REN AI SET -> JUMP -> SPIKE, using a fixed camera, one-axis movement, and two fixed action zones.

**Architecture:** Keep the existing match state, scoring, ball physics, character abilities, difficulty profiles, persistence, and Cloudflare deployment. Build a new isolated `src/game/rework/` runtime and a new `ReworkMatchScreen` beside the current match implementation; do not retrofit the old switching runtime. Once the new slice passes focused tests and mobile E2E, switch the app match route to the new screen while leaving old files available until the rework stabilizes.

**Tech Stack:** React 19.3, TypeScript 5.9, Three.js r186, Vitest 5, Testing Library, Playwright 1.63, Vite 8, Cloudflare Vite plugin.

**Spec:** `docs/superpowers/specs/2026-09-14-gameplay-rework-2-5d-design.md`

## Global Constraints

- Smartphone landscape only for the playable match surface.
- 3 vs 3, one set to 15, win by two, hard cap at 20 remain unchanged.
- First rework playable slice controls `KAI` only; `REN` and `HINA` are teammate AI.
- No automatic or manual player switching in the rework match.
- Fixed 2.5D camera during normal rally; no COURT/PLAYER/ACTION camera cuts.
- Left input is one-axis drag; right input is two fixed zones: `PLAY` and `POWER`.
- `PLAY` owns receive/emergency touch actions; `POWER` owns serve/jump/spike/block actions.
- First slice uses FLOAT SERVE only. Jump serve remains deferred.
- Rework presentation must not render the current primitive/capsule humanoids.
- Character presentation uses 2.5D toon proxies/sprites with readable silhouettes.
- Reuse existing scoring, abilities, CPU difficulty, records, settings, and Cloudflare configuration.
- Do not add GitHub Actions during this rework branch.
- Run all implementation through TDD; every task ends with focused verification and a commit.

---

## File Structure

### New gameplay domain

- `src/game/rework/types.ts` — rework-only input/state contracts and action labels.
- `src/game/rework/movement.ts` — one-axis user movement plus width-axis assist math.
- `src/game/rework/actionResolver.ts` — maps rally state to fixed `PLAY`/`POWER` labels.
- `src/game/rework/teammateAI.ts` — REN/HINA role decisions for receive/set/cover.
- `src/game/rework/cpuAI.ts` — adapter that constrains existing CPU difficulty data to the new 2.5D court roles.
- `src/game/rework/runtime.ts` — authoritative rework match stepper; composes existing pure actions and `stepMatch()`.
- `src/game/rework/feedback.ts` — short hit-stop/zoom/shake intents; no camera cuts.

### New input/UI

- `src/ui/rework/MovementStrip.tsx` — left 40% horizontal drag control.
- `src/ui/rework/DualActionPad.tsx` — fixed `PLAY` and `POWER` zones, including POWER hold/release/swipe.
- `src/ui/rework/ReworkHud.tsx` — score, focus identity, timing/approach markers, no switch cards.
- `src/app/screens/ReworkMatchScreen.tsx` — fixed-step React/Three host for the new runtime.
- `src/styles/rework-match.css` — isolated layout and touch rules for the rework screen.

### New rendering

- `src/game/rework/render/ReworkScene.ts` — scene lifecycle and fixed 2.5D framing.
- `src/game/rework/render/ReworkCamera.ts` — fixed side/diagonal camera with small dynamic zoom only.
- `src/game/rework/render/ToonPlayerProxy.ts` — non-capsule 2.5D player proxy with pose states.
- `src/game/rework/render/ReworkCourtView.ts` — court presentation tuned for side readability.
- `src/game/rework/render/ReworkMarkers.ts` — receive landing, approach, attack lane, and block-read markers.

### Existing files intentionally reused

- `src/game/core/stepMatch.ts`
- `src/game/core/scoring.ts`
- `src/game/core/rally.ts`
- `src/game/actions/serve.ts`
- `src/game/actions/receive.ts`
- `src/game/actions/set.ts`
- `src/game/actions/spike.ts`
- `src/game/actions/block.ts`
- `src/game/ball/ballPhysics.ts`
- `src/game/characters/roster.ts`
- `src/game/characters/abilities.ts`
- `src/game/ai/difficulty.ts`
- `src/persistence/*`

### Existing files changed only at integration time

- `src/app/App.tsx` — route MATCH to `ReworkMatchScreen` after slice gate passes.
- `src/app/screens/TutorialScreen.tsx` — rewrite instructions for the new controls after the runtime works.
- `src/styles/app.css` — only if global portrait guard needs the new screen selector.
- `tests/e2e/mobile-match.spec.ts` — replace old switch-card assertions with rework control assertions.

---

### Task 1: Lock the rework input and state contracts

**Files:**
- Create: `src/game/rework/types.ts`
- Create: `src/game/rework/movement.ts`
- Create: `tests/unit/game/rework/movement.test.ts`

**Interfaces:**
- Produces: `ReworkInput`, `ReworkActionLabel`, `ReworkRuntimeState`, `clampFocusAxis(axis: number): number`, `assistFocusPosition(...)`.
- Consumes: `MatchState`, `CpuDifficulty`, `ContactQuality`, existing player/ball types.

- [ ] **Step 1: Write the failing one-axis movement tests**

```ts
import { describe, expect, it } from 'vitest';
import { assistFocusPosition, clampFocusAxis } from '../../../../src/game/rework/movement';

describe('rework one-axis movement', () => {
  it('clamps drag input to -1..1', () => {
    expect(clampFocusAxis(3)).toBe(1);
    expect(clampFocusAxis(-4)).toBe(-1);
  });

  it('keeps user depth input authoritative while softly assisting width', () => {
    const next = assistFocusPosition({ x: -3, z: -5 }, { x: 2, z: -2 }, 0.75, 1 / 60);
    expect(next.z).toBeGreaterThan(-5);
    expect(next.x).toBeGreaterThan(-3);
    expect(next.x).toBeLessThan(2);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- tests/unit/game/rework/movement.test.ts`
Expected: FAIL because `src/game/rework/movement.ts` does not exist.

- [ ] **Step 3: Add the rework contracts**

```ts
export type ReworkActionLabel =
  | 'NONE'
  | 'RECEIVE'
  | 'SET'
  | 'TIP'
  | 'SERVE'
  | 'JUMP'
  | 'SPIKE'
  | 'BLOCK_READY';

export interface ReworkSwipe {
  x: number;
  y: number;
  durationMs: number;
}

export interface ReworkInput {
  moveAxis: number;
  playPressed: boolean;
  powerPressed: boolean;
  powerReleased: boolean;
  powerSwipe: ReworkSwipe | null;
}

export interface ReworkRuntimeState {
  match: MatchState;
  difficulty: CpuDifficulty;
  focusPlayerId: 'home-0';
  playLabel: ReworkActionLabel;
  powerLabel: ReworkActionLabel;
  blockHoldStartedAt: number | null;
  lastEvent: ReworkEvent | null;
}
```

Define `ReworkEvent` as a small event contract carrying `type`, `actorId`, optional `quality`, and optional numeric `value`; do not import the old switching runtime event type.

- [ ] **Step 4: Implement one-axis movement helpers**

`clampFocusAxis()` clamps to `[-1, 1]`. `assistFocusPosition()` moves the user-controlled depth axis at full requested speed, while width-axis assistance approaches the target at 75% maximum influence and never teleports.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- tests/unit/game/rework/movement.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/rework/types.ts src/game/rework/movement.ts tests/unit/game/rework/movement.test.ts
git commit -m "feat: define 2.5d focus-player movement"
```

---

### Task 2: Add fixed PLAY/POWER action resolution

**Files:**
- Create: `src/game/rework/actionResolver.ts`
- Create: `tests/unit/game/rework/actionResolver.test.ts`

**Interfaces:**
- Consumes: `MatchState`, focus player id `home-0`.
- Produces: `resolveReworkActions(state): { play: ReworkActionLabel; power: ReworkActionLabel }`.

- [ ] **Step 1: Write RED tests for muscle-memory controls**

```ts
it('keeps receive on PLAY and jump on POWER', () => {
  const state = rallyWithIncomingBallToKai();
  expect(resolveReworkActions(state)).toEqual({ play: 'RECEIVE', power: 'NONE' });

  const set = teammateSetToKai();
  expect(resolveReworkActions(set)).toEqual({ play: 'NONE', power: 'JUMP' });
});

it('never exposes player switching', () => {
  const actions = resolveReworkActions(teammateSetToKai());
  expect(Object.values(actions)).not.toContain('SWITCH');
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/unit/game/rework/actionResolver.test.ts`
Expected: FAIL because resolver is missing.

- [ ] **Step 3: Implement the resolver**

Rules:
- `SERVE_READY` + KAI server => `power: 'SERVE'`.
- Incoming opponent ball on home side and KAI in receive range => `play: 'RECEIVE'`.
- Teammate SET toward KAI, KAI grounded => `power: 'JUMP'`.
- Teammate SET toward KAI, KAI airborne => `power: 'SPIKE'`.
- Opponent SET while KAI is front-row/block assignment => `power: 'BLOCK_READY'`.
- No branch returns a player-switch action.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/unit/game/rework/actionResolver.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/rework/actionResolver.ts tests/unit/game/rework/actionResolver.test.ts
git commit -m "feat: add fixed play and power action mapping"
```

---

### Task 3: Build REN/HINA teammate AI around the focus player

**Files:**
- Create: `src/game/rework/teammateAI.ts`
- Create: `tests/unit/game/rework/teammateAI.test.ts`

**Interfaces:**
- Produces: `decideTeammateRoles(state: MatchState): ReworkTeammateDecision[]`.
- Decision roles: `RECEIVE`, `SET`, `COVER`, `APPROACH`, `BASE`.

- [ ] **Step 1: Write RED tests for the three first-touch cases**

```ts
it('uses REN as setter after KAI first touch', () => {
  const decisions = decideTeammateRoles(afterReceiveBy('home-0'));
  expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-1', role: 'SET' }));
});

it('uses HINA as emergency setter after REN first touch', () => {
  const decisions = decideTeammateRoles(afterReceiveBy('home-1'));
  expect(decisions).toContainEqual(expect.objectContaining({ playerId: 'home-2', role: 'SET' }));
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/unit/game/rework/teammateAI.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement deterministic teammate role selection**

Rules:
- KAI first touch => REN SET, HINA COVER.
- REN first touch => HINA SET, KAI APPROACH.
- HINA first touch => REN SET, KAI APPROACH.
- Opponent attack => HINA primary rear receive coverage, REN secondary coverage, KAI remains user-controlled.
- AI reads only `MatchState`, never raw user pointer data.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- tests/unit/game/rework/teammateAI.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/rework/teammateAI.ts tests/unit/game/rework/teammateAI.test.ts
git commit -m "feat: add focus-player teammate roles"
```

---

### Task 4: Build the new rally runtime through RECEIVE -> AI SET -> JUMP -> SPIKE

**Files:**
- Create: `src/game/rework/runtime.ts`
- Create: `tests/integration/game/reworkRuntime.test.ts`

**Interfaces:**
- Consumes: `createMatch(seed)`, existing action functions, `stepMatch(state, input, dt)`, rework input, teammate decisions.
- Produces: `createReworkRuntime(seed, difficulty): ReworkRuntimeState`, `stepReworkRuntime(runtime, input, dt): ReworkRuntimeState`.

- [ ] **Step 1: Write a RED end-to-end rally test**

```ts
it('completes KAI RECEIVE -> REN SET -> KAI JUMP -> KAI SPIKE without switching control', () => {
  let runtime = createReworkRuntime(42, 'NORMAL');
  runtime = fixtureIncomingServeToKai(runtime);

  runtime = stepReworkRuntime(runtime, pressPlay(), 1 / 60);
  expect(runtime.lastEvent?.type).toBe('RECEIVE');
  expect(runtime.focusPlayerId).toBe('home-0');

  runtime = runUntil(runtime, (r) => r.match.ball.lastContact === 'SET');
  expect(runtime.match.ball.lastTouchedBy).toBe('home-1');

  runtime = stepReworkRuntime(runtime, pressPower(), 1 / 60);
  expect(runtime.match.players.find((p) => p.id === 'home-0')?.isAirborne).toBe(true);

  runtime = stepReworkRuntime(runtime, swipePower({ x: 120, y: -30 }), 1 / 60);
  expect(runtime.lastEvent?.type).toBe('SPIKE');
  expect(runtime.focusPlayerId).toBe('home-0');
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/integration/game/reworkRuntime.test.ts`
Expected: FAIL because rework runtime is missing.

- [ ] **Step 3: Implement runtime initialization**

`createReworkRuntime()` uses the existing `createMatch()` state and keeps `home-0` as the focus player for the entire match. It does not instantiate or call the old character-switching runtime.

- [ ] **Step 4: Implement KAI receive**

Use existing receive timing/action helpers. Apply width assistance before contact, preserve user-controlled depth positioning, emit a rework `RECEIVE` event, and leave control on `home-0`.

- [ ] **Step 5: Implement teammate SET execution**

When teammate AI selects REN/HINA as `SET`, move that teammate toward the playable set point and invoke existing `performSet()`. A good first touch biases toward QUICK/NORMAL; a poor first touch uses HIGH. Set target is KAI's approach lane, not KAI's exact instantaneous position.

- [ ] **Step 6: Implement user jump and spike**

`POWER` press while grounded invokes KAI jump. While airborne and a teammate SET is playable, POWER swipe maps horizontal swipe direction to attack lane and swipe magnitude to POWER/TIP. Invoke existing `performSpike()` and emit spike speed.

- [ ] **Step 7: Keep scoring delegated to `stepMatch()`**

After movement/actions, call existing `stepMatch()` once per fixed step so floor/out/point/match-over behavior remains one source of truth.

- [ ] **Step 8: Run focused integration test**

Run: `npm test -- tests/integration/game/reworkRuntime.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/game/rework/runtime.ts tests/integration/game/reworkRuntime.test.ts
git commit -m "feat: add 2.5d focus-player rally runtime"
```

---

### Task 5: Add block hold/release and float serve to the new runtime

**Files:**
- Modify: `src/game/rework/types.ts`
- Modify: `src/game/rework/runtime.ts`
- Modify: `src/game/rework/actionResolver.ts`
- Test: `tests/integration/game/reworkRuntime.test.ts`

**Interfaces:**
- POWER hold starts block readiness or serve charge.
- POWER release performs block jump or float serve.

- [ ] **Step 1: Add RED tests**

```ts
it('uses one POWER hold/release sequence for block timing', () => {
  let runtime = fixtureOpponentSet(createReworkRuntime(7, 'NORMAL'));
  runtime = stepReworkRuntime(runtime, holdPower(), 1 / 60);
  expect(runtime.blockHoldStartedAt).not.toBeNull();

  runtime = stepReworkRuntime(runtime, releasePower(), 1 / 60);
  expect(runtime.match.players.find((p) => p.id === 'home-0')?.isAirborne).toBe(true);
});

it('uses FLOAT serve only in the first rework slice', () => {
  const runtime = stepReworkRuntime(fixtureKaiServeReady(), releaseChargedPower(0.6), 1 / 60);
  expect(runtime.lastEvent?.type).toBe('SERVE');
  expect(runtime.match.ball.lastContact).toBe('SERVE');
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/integration/game/reworkRuntime.test.ts`
Expected: new cases FAIL.

- [ ] **Step 3: Implement block hold/release**

Store `blockHoldStartedAt` when POWER is held during opponent SET. On release, compute timing from opponent attack development and launch KAI jump. Block contact itself is automatic while KAI is airborne and a legal opponent SPIKE enters hand reach; do not require another tap.

- [ ] **Step 4: Implement float serve charge/release**

During KAI serve, POWER hold duration maps to normalized power, horizontal drag lane maps to target x, and release calls existing `performServe(..., 'FLOAT', power)`. Do not expose jump serve.

- [ ] **Step 5: Run focused tests and commit**

Run: `npm test -- tests/integration/game/reworkRuntime.test.ts`
Expected: PASS.

```bash
git add src/game/rework tests/integration/game/reworkRuntime.test.ts
git commit -m "feat: add rework block and float serve controls"
```

---

### Task 6: Build the fixed 2.5D renderer with non-capsule character proxies

**Files:**
- Create: `src/game/rework/render/ReworkCamera.ts`
- Create: `src/game/rework/render/ReworkCourtView.ts`
- Create: `src/game/rework/render/ToonPlayerProxy.ts`
- Create: `src/game/rework/render/ReworkMarkers.ts`
- Create: `src/game/rework/render/ReworkScene.ts`
- Create: `tests/unit/game/rework/render.test.ts`

**Interfaces:**
- `ReworkScene.update(state, presentation, dt)` consumes match/runtime state only.
- `ToonPlayerProxy` exposes pose states `IDLE | RUN | RECEIVE | SET | JUMP | SPIKE | BLOCK | LAND | CELEBRATE`.
- Camera never switches modes.

- [ ] **Step 1: Write RED camera/visual contract tests**

```ts
it('keeps one fixed camera intent during normal rally', () => {
  expect(getReworkCameraFrame(normalRally())).toMatchObject({ mode: 'FIXED_2_5D' });
  expect(getReworkCameraFrame(spikeRally())).toMatchObject({ mode: 'FIXED_2_5D' });
});

it('does not use primitive capsule presentation', () => {
  expect(REWORK_PLAYER_PRESENTATION).toBe('TOON_PROXY_2_5D');
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/unit/game/rework/render.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement fixed camera**

Use one perspective/orthographic-like side-diagonal composition. Net stays near screen center, focus player stays visible, and framing may zoom out modestly to keep ball/net/focus/relevant attacker in view. Do not invoke `cameraDirector.ts`.

- [ ] **Step 4: Implement toon proxies**

Do not reuse `PlayerView`. Build a layered 2.5D proxy using flat planes/shapes with a readable torso silhouette, limbs, hair silhouette, face plane, jersey number, and strong team/character accents. KAI/REN/HINA silhouettes must differ at 844x390 without reading labels.

- [ ] **Step 5: Implement markers**

Render receive landing/timing ring, KAI approach zone, three attack lanes during airborne spike window, and opponent attack/block read marker. Hide markers when not actionable.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- tests/unit/game/rework/render.test.ts`
Expected: PASS.

```bash
git add src/game/rework/render tests/unit/game/rework/render.test.ts
git commit -m "feat: add fixed 2.5d match presentation"
```

---

### Task 7: Replace virtual stick/switch cards with the new mobile controls

**Files:**
- Create: `src/ui/rework/MovementStrip.tsx`
- Create: `src/ui/rework/DualActionPad.tsx`
- Create: `src/ui/rework/ReworkHud.tsx`
- Create: `src/styles/rework-match.css`
- Create: `tests/unit/ui/reworkControls.test.tsx`

**Interfaces:**
- `MovementStrip({ onAxis })` emits only `number` in `[-1,1]`.
- `DualActionPad` keeps PLAY on the upper/right fixed zone and POWER on lower/right fixed zone; positions never swap.

- [ ] **Step 1: Write RED UI tests**

```tsx
it('renders exactly two fixed action zones and no switch cards', () => {
  render(<ReworkHud {...fixtureProps} />);
  expect(screen.getByRole('button', { name: /PLAY/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /POWER/ })).toBeInTheDocument();
  expect(screen.queryByLabelText('操作選手切替')).not.toBeInTheDocument();
});

it('movement strip ignores vertical drag', () => {
  // pointer down -> vertical-only move -> axis remains 0
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/unit/ui/reworkControls.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement movement strip**

The left 40% screen is touchable. Horizontal displacement from pointer-down maps to axis; vertical movement does not affect output. Use pointer capture and `touch-action: none`.

- [ ] **Step 4: Implement dual action pad**

PLAY supports tap. POWER supports press, hold, release, and swipe while preserving the same physical location. Minimum interactive size is 88px for each zone, with safe-area padding.

- [ ] **Step 5: Implement HUD and CSS**

Keep score top center, KAI identity compact, event feedback near impact area, no character switch row. At 844x390 and 932x430 there must be no horizontal overflow and no overlap between movement and action zones.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- tests/unit/ui/reworkControls.test.tsx`
Expected: PASS.

```bash
git add src/ui/rework src/styles/rework-match.css tests/unit/ui/reworkControls.test.tsx
git commit -m "feat: add two-button 2.5d mobile controls"
```

---

### Task 8: Integrate the new screen without deleting the old implementation

**Files:**
- Create: `src/app/screens/ReworkMatchScreen.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/main.tsx` or stylesheet import location if needed
- Test: `tests/unit/app/ReworkMatchScreen.test.tsx`

**Interfaces:**
- `ReworkMatchScreen` keeps the existing `MatchScreenProps` external contract needed by `App`: seed, difficulty, tutorial, finish callback.
- It ignores legacy switch/camera behavior internally; compatibility props may remain temporarily only to keep `App` migration small.

- [ ] **Step 1: Write RED integration test**

```tsx
it('renders the 2.5d match surface with KAI focus and no switcher', () => {
  render(<ReworkMatchScreen {...props} />);
  expect(screen.getByTestId('rework-match-screen')).toBeInTheDocument();
  expect(screen.getByText('KAI')).toBeInTheDocument();
  expect(screen.queryByLabelText('操作選手切替')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/unit/app/ReworkMatchScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement fixed-step host**

Use the existing 60Hz accumulator pattern, portrait pause behavior, result timer cleanup, and local result stats pattern. Instantiate `ReworkScene`, not `GameScene`; step `stepReworkRuntime`, not any old runtime.

- [ ] **Step 4: Switch App MATCH route to ReworkMatchScreen**

Keep Title/Difficulty/Result/persistence unchanged. Do not delete `MatchScreen.tsx`, `GameScene.ts`, `VirtualStick.tsx`, or switcher files in this task.

- [ ] **Step 5: Run focused app tests**

Run: `npm test -- tests/unit/app/ReworkMatchScreen.test.tsx tests/unit/app/App.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app src/main.tsx tests/unit/app/ReworkMatchScreen.test.tsx
git commit -m "feat: route matches through 2.5d gameplay rework"
```

---

### Task 9: Rewrite the tutorial for the new muscle-memory controls

**Files:**
- Modify: `src/app/screens/TutorialScreen.tsx`
- Modify/Create: `tests/unit/app/TutorialScreen.test.tsx`

**Interfaces:**
- Tutorial sequence: move -> PLAY RECEIVE -> POWER JUMP -> POWER SWIPE SPIKE -> POWER HOLD/RELEASE BLOCK.
- It must not mention SET control or character switching for KAI mode.

- [ ] **Step 1: Write RED tutorial copy/progression tests**

```tsx
expect(screen.getByText(/PLAY.*RECEIVE/)).toBeInTheDocument();
expect(screen.queryByText(/セッターに切り替/)).not.toBeInTheDocument();
```

- [ ] **Step 2: Run and confirm RED**

Run: `npm test -- tests/unit/app/TutorialScreen.test.tsx`
Expected: FAIL against old copy.

- [ ] **Step 3: Rewrite tutorial**

Use five concise steps:
1. 左ドラッグでKAIのネット距離を調整。
2. PLAYでRECEIVE。
3. RENのトスに合わせてPOWERでJUMP。
4. 空中でPOWERをスワイプしてSPIKE。
5. 相手SET中にPOWERを長押しし、タイミングで離してBLOCK。

- [ ] **Step 4: Run focused tests and commit**

Run: `npm test -- tests/unit/app/TutorialScreen.test.tsx`
Expected: PASS.

```bash
git add src/app/screens/TutorialScreen.tsx tests/unit/app/TutorialScreen.test.tsx
git commit -m "feat: teach 2.5d rally controls"
```

---

### Task 10: Mobile E2E playable-slice gate

**Files:**
- Modify: `tests/e2e/mobile-match.spec.ts`
- Modify: `playwright.config.ts` only if project names need clearer rework naming.

**Interfaces:**
- Rework match must pass at 844x390 and 932x430.

- [ ] **Step 1: Replace legacy assertions with rework assertions**

E2E must assert:
- `rework-match-screen` is visible.
- exactly two action zones are present.
- no character-switch UI is present.
- no horizontal overflow.
- each action zone respects safe-area gutters.
- portrait overlay pauses match and rotating back resumes.

- [ ] **Step 2: Add a basic pointer-flow smoke test**

Simulate horizontal movement-strip pointer input and verify KAI indicator/player screen position changes. Trigger the visible PLAY/POWER zone when actionable and verify the control stays in the same physical zone after the label changes.

- [ ] **Step 3: Run E2E**

Run: `npm run test:e2e`
Expected: both landscape projects PASS.

- [ ] **Step 4: Run full local gate**

Run: `npm run verify:full`
Expected: typecheck, unit/integration tests, build, and both Playwright projects PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/mobile-match.spec.ts playwright.config.ts
git commit -m "test: gate 2.5d mobile playable slice"
```

---

### Task 11: Visual/play-feel acceptance and PR preparation

**Files:**
- Modify only files found necessary from the manual acceptance pass.
- Update: `README.md` with the new control summary after acceptance.

**Interfaces:**
- No new gameplay subsystem is introduced in this task.

- [ ] **Step 1: Manual 844x390 acceptance**

Verify one complete rally where KAI receives, REN sets, KAI jumps and spikes. Fail the gate if the player has to identify a newly controlled teammate, if the camera cuts, or if old capsule PlayerView characters appear.

- [ ] **Step 2: Manual 932x430 acceptance**

Verify the same rally and a block attempt. PLAY and POWER must remain in fixed locations through all labels.

- [ ] **Step 3: Character readability check**

At normal match zoom, KAI, REN, and HINA must be distinguishable by silhouette/pose without reading text labels. If not, adjust `ToonPlayerProxy` before proceeding.

- [ ] **Step 4: Update README**

Replace the Phase 1 control summary with: one focus player, one-axis movement assist, PLAY/POWER controls, fixed 2.5D camera.

- [ ] **Step 5: Verify no GitHub Actions were added**

Run locally: `find .github -maxdepth 2 -type f` or confirm `.github/workflows` remains absent.

- [ ] **Step 6: Final verification**

Run:

```bash
npm ci
npm run verify:full
npm run preview
```

Expected: all commands exit 0; preview opens the rework match successfully.

- [ ] **Step 7: Commit and open Draft PR**

```bash
git add README.md src tests
 git commit -m "docs: finalize 2.5d gameplay rework slice"
```

Open the PR from `feat/gameplay-rework-2-5d` to `main` only after the verification commands above are green. Keep it Draft until manual mobile acceptance is complete.
