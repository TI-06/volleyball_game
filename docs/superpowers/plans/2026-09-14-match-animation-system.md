# Match Animation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one complete 15-point CPU volleyball match visually readable and enjoyable by stabilizing serves and replacing static player pose swaps with a reusable 2.5D articulated animation system shared across all six players.

**Architecture:** Keep the existing Three.js court, rally logic, scoring, AI, and `ReworkScene`. Replace fixed `ToonPlayerProxy` pose textures behind a new render-only rig/motion layer. Game logic remains authoritative for contacts; rendering consumes `MatchState` and `ReworkEvent` through `VisualIntent`. Serve trajectory generation becomes a pure solver used by `performServe`, with tests that simulate the real ball physics through net crossing and landing.

**Tech Stack:** TypeScript 5.9, React 19, Three.js 0.186, Vitest 5, Playwright 1.63, Vite 8, Cloudflare Workers Static Assets.

**Spec:** `docs/superpowers/specs/2026-09-14-match-animation-system-design.md`

## Global Constraints

- Node.js must remain `>=22.12.0`.
- Do not add a full 3D character engine, skeletal animation dependency, motion-capture runtime, or SVG DOM runtime.
- Keep Three.js as the rendering engine and React as the app/HUD layer.
- Keep the existing fixed 2.5D camera concept; do not add rally camera cuts that can make the ball disappear from view.
- Preserve the existing scoring, 15-point match, five CPU difficulties, persistence, RESULT, and REMATCH behavior.
- Character visual parameters must not silently change gameplay ability values.
- Ball contact timing from gameplay logic is authoritative; visual animation must align to it rather than drive it.
- DPR remains capped at 1.5 unless measured evidence proves a change is safe.
- Six players must render simultaneously at 844x390 and 932x430 landscape sizes.
- Do not add育成, gacha, PvP, accounts, rankings, additional schools, or extra characters until this plan is complete.
- Avoid noisy GitHub Actions changes; verify locally or with focused diagnostics before introducing any normal failing CI workflow.

---

## File Structure

New files are intentionally split by single responsibility.

```text
src/game/actions/
  serveTrajectory.ts              # pure trajectory solver and safety checks

src/game/rework/render/character/
  visualRig.ts                    # joint hierarchy and rig transforms
  characterSkin.ts                # skin/asset descriptors and visual profile
  motionTypes.ts                  # shared motion/keyframe types
  motionClips.ts                  # common motion library
  motionPlayer.ts                 # playback, interpolation, blending
  visualIntent.ts                 # MatchState/ReworkEvent -> VisualIntent
  ArticulatedPlayerView.ts        # Three.js articulated player renderer

src/game/rework/render/
  ReworkScene.ts                  # wires new player views into the scene
  ReworkMarkers.ts                # serve target and ownership markers

src/game/rework/
  runtime.ts                      # feeds target/aggression into serve solver

src/ui/rework/
  DualActionPad.tsx               # expose serve aim/charge input cleanly
  ReworkHud.tsx                   # optional serve-target visual state plumbing

public/assets/characters/
  kai/...
  ren/...
  hina/...
  shin/...
  gou/...
  yu/...

tests/unit/game/
  serveTrajectory.test.ts

tests/unit/render/
  visualIntent.test.ts
  motionPlayer.test.ts
  visualRig.test.ts
  characterSkin.test.ts

tests/integration/game/
  reworkServeLanding.test.ts
  reworkPowerControls.test.ts

tests/integration/render/
  reworkAnimationFlow.test.ts

tests/e2e/
  mobile-match.spec.ts
```

`ToonPlayerProxy.ts` remains temporarily during Tasks 3-7 as a fallback. It is removed only after all six players use `ArticulatedPlayerView` and the render tests are GREEN.

---

### Task 1: Serve Trajectory Solver

**Files:**
- Create: `src/game/actions/serveTrajectory.ts`
- Create: `tests/unit/game/serveTrajectory.test.ts`
- Modify: `src/game/actions/serve.ts`

**Interfaces:**
- Consumes: `Vec3`, `COURT`, `BALL_GRAVITY`, serve origin, target, and aggression.
- Produces:

```ts
export interface ServeTrajectoryInput {
  origin: Vec3;
  target: Vec3;
  aggression: number;
  netHeight: number;
}

export interface ServeTrajectory {
  velocity: Vec3;
  flightSeconds: number;
  predictedNetHeight: number;
}

export function solveServeTrajectory(input: ServeTrajectoryInput): ServeTrajectory;
export function predictServePosition(origin: Vec3, velocity: Vec3, seconds: number): Vec3;
```

- `performServe(...)` continues returning `BallState`; no caller-visible API break in this task.

- [ ] **Step 1: Write failing central-serve trajectory tests**

Create `tests/unit/game/serveTrajectory.test.ts` with deterministic assertions that the solver reaches the target plane and clears the net:

```ts
import { describe, expect, it } from 'vitest';
import { COURT } from '../../../src/game/core/constants';
import {
  predictServePosition,
  solveServeTrajectory,
} from '../../../src/game/actions/serveTrajectory';

describe('solveServeTrajectory', () => {
  it.each([0.58, 0.74, 0.9])('clears the net and reaches a central target at aggression %s', (aggression) => {
    const origin = { x: 0, y: 2.35, z: -(COURT.length / 2 + 0.35) };
    const target = { x: 0, y: 0, z: 6.7 };
    const result = solveServeTrajectory({ origin, target, aggression, netHeight: COURT.netHeight });

    const netT = result.flightSeconds * ((0 - origin.z) / (target.z - origin.z));
    const atNet = predictServePosition(origin, result.velocity, netT);
    const atLanding = predictServePosition(origin, result.velocity, result.flightSeconds);

    expect(atNet.y).toBeGreaterThan(COURT.netHeight + 0.2);
    expect(atLanding.x).toBeCloseTo(target.x, 2);
    expect(atLanding.z).toBeCloseTo(target.z, 2);
    expect(atLanding.y).toBeCloseTo(0, 2);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- tests/unit/game/serveTrajectory.test.ts
```

Expected: FAIL because `serveTrajectory.ts` does not exist.

- [ ] **Step 3: Implement the minimal ballistic solver**

Create `src/game/actions/serveTrajectory.ts`. Clamp aggression to `[0,1]`, choose a flight time from aggression, compute `vx/vz` from horizontal displacement and compute `vy` so the target lands at `y=0` under `BALL_GRAVITY`:

```ts
import { BALL_GRAVITY } from '../ball/ballPhysics';
import type { Vec3 } from '../core/types';

export interface ServeTrajectoryInput {
  origin: Vec3;
  target: Vec3;
  aggression: number;
  netHeight: number;
}

export interface ServeTrajectory {
  velocity: Vec3;
  flightSeconds: number;
  predictedNetHeight: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function predictServePosition(origin: Vec3, velocity: Vec3, seconds: number): Vec3 {
  return {
    x: origin.x + velocity.x * seconds,
    y: origin.y + velocity.y * seconds - 0.5 * BALL_GRAVITY * seconds * seconds,
    z: origin.z + velocity.z * seconds,
  };
}

export function solveServeTrajectory(input: ServeTrajectoryInput): ServeTrajectory {
  const aggression = clamp01(input.aggression);
  const flightSeconds = 1.24 - aggression * 0.28;
  const velocity = {
    x: (input.target.x - input.origin.x) / flightSeconds,
    y: (input.target.y - input.origin.y + 0.5 * BALL_GRAVITY * flightSeconds * flightSeconds) / flightSeconds,
    z: (input.target.z - input.origin.z) / flightSeconds,
  };
  const netFraction = (0 - input.origin.z) / (input.target.z - input.origin.z);
  const netT = Math.max(0, Math.min(flightSeconds, flightSeconds * netFraction));
  const predictedNetHeight = predictServePosition(input.origin, velocity, netT).y;
  return { velocity, flightSeconds, predictedNetHeight };
}
```

If the first RED->GREEN run shows clearance below `netHeight + 0.2`, adjust only the flight-time mapping until all three central cases clear safely. Do not add randomness.

- [ ] **Step 4: Wire `performServe` to the solver**

Replace the current fixed FLOAT horizontal/vertical speed calculation in `src/game/actions/serve.ts` with:

```ts
const trajectory = solveServeTrajectory({
  origin,
  target,
  aggression: normalizedPower,
  netHeight: COURT.netHeight,
});
```

Use `trajectory.velocity` as the base velocity. Preserve existing `lastTouchedBy`, `lastContact`, `spin`, `inPlay`, and jump-serve behavior unless a focused test demonstrates they must change.

- [ ] **Step 5: Run unit tests and existing serve integration tests**

Run:

```bash
npm test -- tests/unit/game/serveTrajectory.test.ts tests/integration/game/reworkPowerControls.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/actions/serveTrajectory.ts src/game/actions/serve.ts tests/unit/game/serveTrajectory.test.ts
git commit -m "fix: solve float serves toward safe landing targets"
```

---

### Task 2: Real Physics Serve-IN Regression Matrix

**Files:**
- Create: `tests/integration/game/reworkServeLanding.test.ts`
- Modify: `src/game/rework/runtime.ts`
- Modify: `tests/integration/game/reworkPowerControls.test.ts`

**Interfaces:**
- Consumes: existing `createReworkRuntime`, `stepReworkRuntime`, `integrateBall`, and `ReworkSwipe`.
- Produces: a regression matrix proving normal left/center/right serves at weak/medium/strong holds cross the net and land IN.

- [ ] **Step 1: Write the failing 3x3 serve landing matrix**

Use the actual runtime to charge and release the serve, then advance ball physics until the rally ends or the ball reaches floor height. The test should cover swipe X values `-70`, `0`, `70` and hold frame counts `1`, `18`, `36`.

Core assertion pattern:

```ts
it.each([
  [-70, 1], [-70, 18], [-70, 36],
  [0, 1], [0, 18], [0, 36],
  [70, 1], [70, 18], [70, 36],
])('lands a normal serve in bounds: swipe=%i holdFrames=%i', (swipeX, holdFrames) => {
  let runtime = createReworkRuntime(7100 + swipeX + holdFrames, 'NORMAL');
  runtime = stepReworkRuntime(runtime, { ...idle(), powerPressed: true }, 1 / 60);
  for (let i = 0; i < holdFrames; i += 1) runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
  runtime = stepReworkRuntime(runtime, {
    ...idle(),
    powerReleased: true,
    powerSwipe: swipeX === 0 ? null : { x: swipeX, y: 0, durationMs: 260 },
  }, 1 / 60);

  let crossedNet = false;
  for (let frame = 0; frame < 240 && runtime.match.ball.inPlay; frame += 1) {
    if (runtime.match.ball.position.z > 0) crossedNet = true;
    runtime = stepReworkRuntime(runtime, idle(), 1 / 60);
  }

  expect(crossedNet).toBe(true);
  expect(runtime.match.score.home).toBeGreaterThanOrEqual(0);
  expect(Math.abs(runtime.match.ball.position.x)).toBeLessThanOrEqual(4.5 + 0.15);
});
```

Record the last positive-side position before point resolution if `stepMatch` resets the ball during point handling; assert against that recorded landing position rather than the post-reset ball.

- [ ] **Step 2: Run and confirm the current implementation fails at least one matrix case**

Run:

```bash
npm test -- tests/integration/game/reworkServeLanding.test.ts
```

Expected before final tuning: one or more cases fail net-crossing or in-bounds landing.

- [ ] **Step 3: Normalize runtime serve targets to safe normal-play bounds**

Keep `serveTarget` pure and clamp normal swipe targets inside a safety margin:

```ts
const SERVE_SIDE_MARGIN = 0.7;
const SERVE_BASE_Z = 6.55;

function serveTarget(swipe: ReworkSwipe | null): Vec3 {
  const lane = clamp((swipe?.x ?? 0) / 80, -1, 1);
  const maxX = COURT.width / 2 - SERVE_SIDE_MARGIN;
  return { x: -lane * maxX, y: 0, z: SERVE_BASE_Z };
}
```

Do not implement deliberate risky line serves yet; this task is only the reliable default serve.

- [ ] **Step 4: Upgrade `reworkPowerControls.test.ts` to assert viable serve trajectory**

After release, assert that the served ball's velocity and target direction are finite and forward. Keep existing hold/release behavior checks.

- [ ] **Step 5: Run focused and full unit/integration verification**

```bash
npm test -- tests/unit/game/serveTrajectory.test.ts tests/integration/game/reworkServeLanding.test.ts tests/integration/game/reworkPowerControls.test.ts
npm run verify
```

Expected: all GREEN.

- [ ] **Step 6: Commit**

```bash
git add src/game/rework/runtime.ts tests/integration/game/reworkServeLanding.test.ts tests/integration/game/reworkPowerControls.test.ts
git commit -m "test: guarantee normal serves cross the net and land in"
```

---

### Task 3: Shared Visual Rig Data Model

**Files:**
- Create: `src/game/rework/render/character/visualRig.ts`
- Create: `src/game/rework/render/character/motionTypes.ts`
- Create: `tests/unit/render/visualRig.test.ts`

**Interfaces:**
- Produces:

```ts
export type JointName =
  | 'root' | 'hips' | 'chest' | 'neck' | 'head'
  | 'shoulderL' | 'shoulderR' | 'elbowL' | 'elbowR' | 'wristL' | 'wristR'
  | 'hipL' | 'hipR' | 'kneeL' | 'kneeR' | 'ankleL' | 'ankleR';

export interface JointTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface VisualRigDefinition {
  parentByJoint: Record<JointName, JointName | null>;
  bindPose: Record<JointName, JointTransform>;
}

export interface MotionKeyframe {
  at: number;
  joints: Partial<Record<JointName, Partial<JointTransform>>>;
}

export interface MotionClip {
  id: string;
  durationMs: number;
  loop: boolean;
  contactAt?: number;
  keyframes: MotionKeyframe[];
}
```

- [ ] **Step 1: Write failing hierarchy and bind-pose tests**

Test that root has no parent, wrists descend from elbows, ankles descend from knees, and every `JointName` has a bind transform.

- [ ] **Step 2: Run focused test and confirm RED**

```bash
npm test -- tests/unit/render/visualRig.test.ts
```

- [ ] **Step 3: Implement the shared rig definition**

Use one normalized rig with symmetrical default limbs. Keep the data numeric and DOM-free. Export:

```ts
export const DEFAULT_VISUAL_RIG: VisualRigDefinition;
export function cloneRigPose(definition?: VisualRigDefinition): Record<JointName, JointTransform>;
```

- [ ] **Step 4: Run test and typecheck**

```bash
npm test -- tests/unit/render/visualRig.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/game/rework/render/character/visualRig.ts src/game/rework/render/character/motionTypes.ts tests/unit/render/visualRig.test.ts
git commit -m "feat: add shared articulated player rig"
```

---

### Task 4: Character Skin and Visual Profiles

**Files:**
- Create: `src/game/rework/render/character/characterSkin.ts`
- Create: `tests/unit/render/characterSkin.test.ts`
- Create asset directories under `public/assets/characters/{kai,ren,hina,shin,gou,yu}/`

**Interfaces:**
- Consumes: existing `CharacterId`.
- Produces:

```ts
export interface CharacterVisualProfile {
  heightScale: number;
  shoulderScale: number;
  legScale: number;
  armScale: number;
  headScale: number;
  motionSpeed: number;
  approachStride: number;
  jumpVisualScale: number;
  landingWeight: number;
}

export interface CharacterSkin {
  id: CharacterId;
  visual: CharacterVisualProfile;
  parts: Record<string, string>;
}

export const CHARACTER_SKINS: Record<CharacterId, CharacterSkin>;
```

- [ ] **Step 1: Write failing completeness tests for all six characters**

Require each skin to define at least head, face, hairFront, hairBack, torso, both upper arms, both forearms, both thighs, both shins, and both shoes. Require every numeric profile field to be finite and positive.

- [ ] **Step 2: Run focused test and confirm RED**

```bash
npm test -- tests/unit/render/characterSkin.test.ts
```

- [ ] **Step 3: Implement profile data**

Use KAI as baseline `1.0`. REN stays near baseline; HINA is slightly smaller/faster visually; GOU is broader/taller; SHIN/YU remain distinct without changing gameplay stats. Keep all values within safe visual ranges such as `0.85..1.15` except height where `0.9..1.1` is acceptable.

- [ ] **Step 4: Add first-pass original character part assets**

Create original high-school volleyball character part assets. Keep filenames stable and independent of motion clips. Do not copy any copyrighted anime character design, uniform, logo, hairstyle combination, or facial design one-to-one.

- [ ] **Step 5: Run completeness tests and typecheck**

```bash
npm test -- tests/unit/render/characterSkin.test.ts
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/game/rework/render/character/characterSkin.ts tests/unit/render/characterSkin.test.ts public/assets/characters
git commit -m "feat: add reusable character skins and visual profiles"
```

---

### Task 5: Motion Player and Interpolation

**Files:**
- Create: `src/game/rework/render/character/motionPlayer.ts`
- Create: `tests/unit/render/motionPlayer.test.ts`

**Interfaces:**
- Consumes: `MotionClip`, `JointTransform`, rig bind pose.
- Produces:

```ts
export interface MotionSample {
  pose: Record<JointName, JointTransform>;
  normalizedTime: number;
  atContact: boolean;
}

export class MotionPlayer {
  play(clip: MotionClip, nowMs: number, blendMs?: number): void;
  sample(nowMs: number): MotionSample;
  get currentClipId(): string | null;
}
```

- [ ] **Step 1: Write failing interpolation tests**

Cover midpoint rotation/position interpolation, looping idle clips, non-loop completion, `contactAt`, and blend from one clip to another without an instantaneous pose jump.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/render/motionPlayer.test.ts
```

- [ ] **Step 3: Implement deterministic interpolation**

Use normalized keyframe time `[0,1]`, linear interpolation for transforms initially, and optional easing only where encoded by clips. Keep the player independent from Three.js and `performance.now()` by passing `nowMs` explicitly.

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- tests/unit/render/motionPlayer.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/game/rework/render/character/motionPlayer.ts tests/unit/render/motionPlayer.test.ts
git commit -m "feat: add deterministic motion playback and blending"
```

---

### Task 6: Common Volleyball Motion Library

**Files:**
- Create: `src/game/rework/render/character/motionClips.ts`
- Create: `tests/unit/render/motionClips.test.ts`

**Interfaces:**
- Produces:

```ts
export type MotionClipId =
  | 'idle_ready'
  | 'shuffle_left' | 'shuffle_right'
  | 'run_forward' | 'run_back'
  | 'receive_ready' | 'receive_contact' | 'receive_recover'
  | 'set_enter' | 'set_contact' | 'set_recover'
  | 'serve_ready' | 'serve_toss' | 'serve_swing' | 'serve_followthrough'
  | 'spike_approach_1' | 'spike_approach_2' | 'spike_plant'
  | 'spike_takeoff' | 'spike_airborne_cock' | 'spike_contact'
  | 'spike_followthrough' | 'land'
  | 'block_shuffle' | 'block_takeoff' | 'block_press' | 'block_land'
  | 'celebrate_short' | 'frustrated_short';

export const MOTION_CLIPS: Record<MotionClipId, MotionClip>;
```

- [ ] **Step 1: Write failing library integrity tests**

Require all 29 IDs, `durationMs > 0`, sorted keyframes from `0` to `1`, valid joints only, and `contactAt` on SERVE/RECEIVE/SET/SPIKE/BLOCK contact clips.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/render/motionClips.test.ts
```

- [ ] **Step 3: Implement the first full motion set**

Create readable exaggerated sports poses, not subtle realism. Key principles:

```ts
// receive: hips lower, chest forward, wrists meet in front
// set: elbows out, wrists above forehead, short knee extension
// spike approach: alternating legs + counter-swing arms
// spike plant: both legs compress, arms sweep backward
// takeoff: legs extend, arms drive upward
// cock: hitting shoulder externally rotated, opposite arm guides
// contact: hitting arm extended above/front of head
// block: both shoulders flexed, elbows extended, wrists above net plane
```

Keep animation durations in a readable range; avoid contact poses shorter than roughly 70ms on 60fps displays.

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- tests/unit/render/motionClips.test.ts tests/unit/render/motionPlayer.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/game/rework/render/character/motionClips.ts tests/unit/render/motionClips.test.ts
git commit -m "feat: add shared volleyball motion library"
```

---

### Task 7: Visual Intent State Machine

**Files:**
- Create: `src/game/rework/render/character/visualIntent.ts`
- Create: `tests/unit/render/visualIntent.test.ts`

**Interfaces:**
- Produces:

```ts
export type VisualIntent =
  | 'READY'
  | 'MOVE_LEFT' | 'MOVE_RIGHT' | 'MOVE_FORWARD' | 'MOVE_BACK'
  | 'RECEIVE'
  | 'SET'
  | 'SERVE'
  | 'SPIKE_APPROACH' | 'SPIKE_JUMP' | 'SPIKE_CONTACT'
  | 'BLOCK'
  | 'CELEBRATE'
  | 'FRUSTRATED';

export interface VisualIntentState {
  intent: VisualIntent;
  contactEvent: ReworkEvent | null;
}

export function resolveVisualIntent(
  match: MatchState,
  player: PlayerState,
  latestEvent: ReworkEvent | null,
): VisualIntentState;
```

- [ ] **Step 1: Write failing intent tests**

Cover idle, lateral movement, receive event, setter event, home serve, set-to-KAI approach, airborne KAI, spike contact event, block event, positive point celebration, and away scoring frustration.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/unit/render/visualIntent.test.ts
```

- [ ] **Step 3: Implement resolver without changing gameplay state**

The resolver reads state only. It must never mutate `MatchState` or synthesize contacts. Prefer latest real `ReworkEvent` over velocity-derived guesses for contact actions.

- [ ] **Step 4: Verify GREEN**

```bash
npm test -- tests/unit/render/visualIntent.test.ts
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/game/rework/render/character/visualIntent.ts tests/unit/render/visualIntent.test.ts
git commit -m "feat: map match state to visual animation intent"
```

---

### Task 8: Articulated KAI Renderer

**Files:**
- Create: `src/game/rework/render/character/ArticulatedPlayerView.ts`
- Modify: `src/game/rework/render/ReworkScene.ts`
- Create: `tests/integration/render/reworkAnimationFlow.test.ts`

**Interfaces:**
- Consumes: `CharacterSkin`, `MotionPlayer`, `MOTION_CLIPS`, `resolveVisualIntent`.
- Produces:

```ts
export class ArticulatedPlayerView {
  readonly group: THREE.Group;
  constructor(characterId: CharacterId, side: TeamSide);
  setFocused(focused: boolean): void;
  playEvent(event: ReworkEvent): void;
  update(player: PlayerState, match: MatchState, nowMs: number): void;
  dispose(): void;
}
```

- [ ] **Step 1: Write failing KAI animation-flow integration test**

Instantiate the visual-controller logic without WebGL and assert clip transitions for:

```text
READY -> RECEIVE -> READY
READY -> SPIKE_APPROACH -> SPIKE_JUMP -> SPIKE_CONTACT -> land -> READY
SERVE -> serve_followthrough -> READY
```

Expose a small testable controller helper if needed; do not require a real `WebGLRenderer` in Vitest.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/integration/render/reworkAnimationFlow.test.ts
```

- [ ] **Step 3: Implement KAI articulated planes/sprites**

Create one Three.js object per visual part, attach it to joint groups, and drive joint transforms from `MotionPlayer.sample(nowMs)`. Cache textures once in the constructor/loader path. Do not regenerate Canvas textures per pose.

- [ ] **Step 4: Add KAI-only migration flag inside `ReworkScene`**

Use `ArticulatedPlayerView` for `home-0`; keep `ToonPlayerProxy` for the other five players in this task. Preserve selection ring, shadow, service-line staging, impact effects, and ball rendering.

- [ ] **Step 5: Run focused tests and build**

```bash
npm test -- tests/unit/render tests/integration/render/reworkAnimationFlow.test.ts
npm run build
```

Expected: GREEN.

- [ ] **Step 6: Commit**

```bash
git add src/game/rework/render/character/ArticulatedPlayerView.ts src/game/rework/render/ReworkScene.ts tests/integration/render/reworkAnimationFlow.test.ts
git commit -m "feat: render KAI with articulated 2.5d animation"
```

---

### Task 9: KAI Serve, Receive, Spike, and Block Readability Pass

**Files:**
- Modify: `src/game/rework/render/character/motionClips.ts`
- Modify: `src/game/rework/render/character/visualIntent.ts`
- Modify: `src/game/rework/render/ReworkImpactEffects.ts`
- Modify: `src/game/rework/render/ReworkCamera.ts`
- Modify: `tests/integration/render/reworkAnimationFlow.test.ts`

**Interfaces:**
- Consumes: KAI renderer from Task 8.
- Produces: readable pre-contact anticipation and post-contact recovery for all KAI core actions.

- [ ] **Step 1: Add failing assertions for pre-contact readability**

Require:
- RECEIVE has a ready/low pose before contact.
- SERVE includes toss before swing.
- SPIKE includes at least approach -> plant -> takeoff -> cock -> contact.
- BLOCK includes takeoff before press.

- [ ] **Step 2: Verify RED**

```bash
npm test -- tests/integration/render/reworkAnimationFlow.test.ts
```

- [ ] **Step 3: Tune clip sequencing and event synchronization**

Keep gameplay event contact authoritative. Where the event arrives late relative to anticipation, enter preparation states from match state and reserve the contact clip for the event frame.

- [ ] **Step 4: Tune impact feedback conservatively**

Keep FOV pulse small and short. Preserve the user's ability to see the ball. Do not add full-screen flashes or camera cuts.

- [ ] **Step 5: Run render tests, game tests, and build**

```bash
npm test -- tests/unit/render tests/integration/render tests/integration/game/reworkPowerControls.test.ts tests/integration/game/reworkSpikeTrajectory.test.ts
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/game/rework/render/character src/game/rework/render/ReworkImpactEffects.ts src/game/rework/render/ReworkCamera.ts tests/integration/render/reworkAnimationFlow.test.ts
git commit -m "feat: make KAI volleyball actions visually readable"
```

---

### Task 10: Apply Shared Rig to REN, HINA, and CPU Players

**Files:**
- Modify: `src/game/rework/render/ReworkScene.ts`
- Modify: `src/game/rework/render/character/characterSkin.ts`
- Modify: `src/game/rework/render/character/ArticulatedPlayerView.ts`
- Delete after verification: `src/game/rework/render/ToonPlayerProxy.ts`
- Modify tests that directly assert `TOON_PROXY_2_5D` if any remain.

**Interfaces:**
- Consumes: all shared animation APIs from Tasks 3-9.
- Produces: six articulated players using one rig and one motion library with character-specific assets and visual profiles.

- [ ] **Step 1: Write failing six-player construction test**

Assert each starter character ID can create a visual controller and maps to a complete `CharacterSkin` without fallback to KAI assets.

- [ ] **Step 2: Verify RED if any character still falls back**

```bash
npm test -- tests/unit/render tests/integration/render
```

- [ ] **Step 3: Replace all `ToonPlayerProxy` instances in `ReworkScene`**

Construct `ArticulatedPlayerView(character.id, player.side)` for every player. Keep the focus ring only on `home-0`.

- [ ] **Step 4: Apply visual-profile modifiers only in rendering**

Use `heightScale`, `shoulderScale`, `legScale`, `armScale`, `motionSpeed`, etc. Do not modify `PlayerState`, movement speed, jump height, or ability values from visual profiles.

- [ ] **Step 5: Remove obsolete fixed-pose proxy**

Delete `ToonPlayerProxy.ts` and any constants/tests that exist solely for fixed canvas-pose sprites.

- [ ] **Step 6: Verify all render/unit/integration tests and build**

```bash
npm test -- tests/unit/render tests/integration/render
npm run verify
```

- [ ] **Step 7: Commit**

```bash
git add -A src/game/rework/render tests/unit/render tests/integration/render
git commit -m "feat: animate all six players with shared rig"
```

---

### Task 11: Ownership, Landing, and Serve-Aim Visual Guidance

**Files:**
- Modify: `src/game/rework/render/markerState.ts`
- Modify: `src/game/rework/render/ReworkMarkers.ts`
- Modify: `src/ui/rework/DualActionPad.tsx`
- Modify: `src/ui/rework/ReworkHud.tsx`
- Modify: `src/app/screens/ReworkMatchScreen.tsx`
- Add/update relevant unit tests under `tests/unit/rework/` and UI tests under `tests/integration/app/`.

**Interfaces:**
- Consumes: `chooseHomeReceiveOwner`, existing marker state, current power hold/swipe input.
- Produces: one clear receive owner marker, attack/jump cue, and serve target preview.

- [ ] **Step 1: Write failing marker-state tests**

Assert:
- OUT-predicted balls show no home receive marker.
- only the chosen receive owner is highlighted.
- when KAI is selected for receive, his landing target is shown.
- SERVE_READY for KAI exposes a default opponent-court target.

- [ ] **Step 2: Verify RED**

Run the focused marker tests.

- [ ] **Step 3: Extend marker-state shape**

Use an explicit structure such as:

```ts
export interface ReworkMarkerState {
  focusedPlayerId: string;
  receiveOwnerId: string | null;
  ballLanding: { x: number; z: number } | null;
  serveTarget: { x: number; z: number; aggression: number } | null;
  attackTarget: { x: number; z: number } | null;
}
```

- [ ] **Step 4: Render subtle court-space guides**

Use low-opacity rings/lines. Do not cover character feet, ball, net, or action buttons.

- [ ] **Step 5: Keep controls contextual**

`DualActionPad` continues using the same POWER zone, but during SERVE it should visually communicate hold + aim + release. Avoid adding permanent extra buttons.

- [ ] **Step 6: Run focused UI/render tests and build**

```bash
npm test -- tests/unit tests/integration/app tests/integration/render
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/game/rework/render src/ui/rework src/app/screens/ReworkMatchScreen.tsx tests
git commit -m "feat: clarify serve aim and rally ownership cues"
```

---

### Task 12: Full Match Release Gate

**Files:**
- Modify: `tests/e2e/mobile-match.spec.ts`
- Modify: existing integration tests only where current assertions no longer describe the new renderer.
- Modify: `docs/superpowers/reviews/2026-09-14-match-animation-review.md` (create review evidence file).

**Interfaces:**
- Consumes: complete serve + animation + guidance system.
- Produces: evidence that the game can play through a full 15-point match and rematch at both target smartphone sizes.

- [ ] **Step 1: Extend E2E for current 2.5D match shell**

At both Playwright projects (`844x390`, `932x430`) verify:

```text
start match
first KAI serve starts a rally
score changes over time
match remains interactive through multiple rallies
result screen appears when a winner reaches match condition
REMATCH starts a new match
no tutorial is re-shown after first completion
```

Use deterministic hooks/state injection already present in the test suite if waiting for a literal full 15-point CPU match would make E2E flaky. Keep one integration/soak-style test for true rally progression separately.

- [ ] **Step 2: Add one match-soak integration test**

Run the runtime with deterministic legal inputs/AI until winner or a generous frame cap. Assert a winner exists, no NaN positions/velocities occur, and score does not exceed hard cap rules.

- [ ] **Step 3: Run focused tests first**

```bash
npm test -- tests/unit/game/serveTrajectory.test.ts tests/integration/game/reworkServeLanding.test.ts tests/unit/render tests/integration/render
```

Expected: GREEN.

- [ ] **Step 4: Run full verification**

```bash
npm run verify:full
```

Expected:
- typecheck GREEN
- Vitest GREEN
- production build GREEN
- Playwright mobile E2E GREEN at 844x390 and 932x430

Do not claim completion if any command exits non-zero.

- [ ] **Step 5: Perform manual visual gate**

Check at smartphone landscape dimensions:

```text
serve normally enters opponent court
serve aim is understandable
receive owner is obvious
receive pose is visible before contact
REN set is visibly a set
KAI approach is visible before jump
jump and spike are separate readable actions
block has approach/takeoff/press
CPU three-touch attack is understandable
ball remains easy to follow
15-point match completes
RESULT -> REMATCH works
```

If any item is not visually clear, treat it as an implementation defect and return to the responsible task instead of documenting it as an acceptable limitation.

- [ ] **Step 6: Write verification evidence**

Create `docs/superpowers/reviews/2026-09-14-match-animation-review.md` containing exact commands, exit codes, test counts, target viewport results, and any non-blocking warnings such as Vite chunk size.

- [ ] **Step 7: Commit**

```bash
git add tests docs/superpowers/reviews/2026-09-14-match-animation-review.md
git commit -m "test: verify complete animated volleyball match"
```

---

## Plan Self-Review

### Spec coverage

- Stable normal serve and 3x3 landing matrix: Tasks 1-2.
- Shared logical skeleton and normalized rig: Task 3.
- Per-character parts and visual profile: Task 4.
- Continuous interpolation and blend: Task 5.
- All required volleyball motion clips: Task 6.
- Match/event -> visual intent separation: Task 7.
- KAI-first completion: Tasks 8-9.
- REN/HINA/CPU reuse of shared motion: Task 10.
- Ownership/landing/serve cues: Task 11.
- 844x390 / 932x430, 15-point match, RESULT/REMATCH, full verification: Task 12.
- No unrelated progression/PvP scope: Global Constraints.

### Placeholder scan

No TBD/TODO/"implement later" placeholders are allowed. Each task names concrete files, interfaces, tests, commands, and commit boundaries.

### Type consistency

- `MotionClip`, `MotionKeyframe`, `JointName`, and `JointTransform` originate in Task 3 and are consumed unchanged by Tasks 5-10.
- `CharacterVisualProfile` and `CharacterSkin` originate in Task 4 and are consumed by `ArticulatedPlayerView`.
- `VisualIntent` originates in Task 7 and is consumed by the visual controller only.
- Serve solver remains independent of rendering and preserves `performServe` caller behavior.
- Rendering does not mutate gameplay abilities or contact state.
