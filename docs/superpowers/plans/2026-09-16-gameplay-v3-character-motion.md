# Gameplay V3 Character Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder capsule/block players with original stylized 3D volleyball characters whose visible poses communicate Ready, Run, Receive, Dive, Set, Approach, Jump, Spike, Block, and Landing states.

**Architecture:** Keep gameplay simulation authoritative and presentation-only animation derived from runtime state. Build a reusable articulated character rig in Three.js with character-specific proportions/colors for KAI, REN, and HINA first, then map runtime phases/events and movement vectors to pose clips without changing ball physics or gameplay outcome logic.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.186, Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-15-gameplay-v3-design.md`

## Global Constraints

- Characters must be original and may use anime-volleyball energy without copying protected character designs.
- Target proportions are stylized 6.5–7 heads tall with clear mobile silhouettes.
- Animation is presentation-only and must not mutate deterministic gameplay state.
- Mobile landscape readability is more important than anatomical micro-detail.
- KAI / REN / HINA need distinct silhouettes and role-readable poses.
- Opponent characters can initially reuse the same rig family with alternate palettes/proportions.
- No external runtime animation dependency is added unless the existing Three.js stack cannot express the required poses.

---

### Task 1: Define presentation motion states independent from gameplay phases

**Files:**
- Create: `src/game/v3/presentation/characterMotion.ts`
- Test: `tests/unit/game/v3/characterMotion.test.ts`

**Interfaces:**
- Produces: `V3CharacterMotionState = 'READY' | 'RUN' | 'RECEIVE' | 'DIVE' | 'SET' | 'APPROACH' | 'JUMP' | 'SPIKE' | 'BLOCK' | 'LAND'`.
- Produces: `deriveCharacterMotion(input): V3CharacterMotionState`.

- [ ] **Step 1: Write failing tests for phase/event/movement mapping**

```ts
expect(deriveCharacterMotion({ phase: 'DEFENSE_READ', speed: 0, lastEvent: null, controlled: true })).toBe('READY');
expect(deriveCharacterMotion({ phase: 'DEFENSE_READ', speed: 2, lastEvent: null, controlled: true })).toBe('RUN');
expect(deriveCharacterMotion({ phase: 'SET_BUILDUP', speed: 0, lastEvent: { type: 'SET' }, controlled: false })).toBe('SET');
expect(deriveCharacterMotion({ phase: 'ATTACK_AIRBORNE', speed: 0, lastEvent: { type: 'JUMP' }, controlled: true })).toBe('JUMP');
expect(deriveCharacterMotion({ phase: 'DEFENSE_READ', speed: 0, lastEvent: { type: 'RECEIVE', quality: 'GOOD' }, controlled: true })).toBe('RECEIVE');
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/characterMotion.test.ts`
Expected: module/function missing.

- [ ] **Step 3: Implement deterministic presentation mapping**

Priority order for short-lived event poses: DIVE/RECEIVE/SET/JUMP/SPIKE/BLOCK/LAND; otherwise derive RUN vs READY from horizontal speed and phase.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/unit/game/v3/characterMotion.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/v3/presentation/characterMotion.ts tests/unit/game/v3/characterMotion.test.ts
git commit -m "feat: derive v3 character motion states"
```

### Task 2: Build a reusable articulated stylized character rig

**Files:**
- Create: `src/game/v3/render/character/V3CharacterRig.ts`
- Create: `src/game/v3/render/character/characterProfiles.ts`
- Test: `tests/unit/game/v3/characterProfiles.test.ts`

**Interfaces:**
- Produces: `V3CharacterProfile` with `id`, `height`, `shoulderWidth`, `legLength`, `jersey`, `accent`, `skin`, `hair`.
- Produces: `createV3CharacterRig(profile): V3CharacterRig` with root, named joints, meshes, `setPose`, `setFocus`, `dispose`.

- [ ] **Step 1: Write profile tests for KAI / REN / HINA distinctness**

```ts
expect(profileFor('kai')).not.toEqual(profileFor('ren'));
expect(profileFor('hina').height).toBeLessThan(profileFor('kai').height);
expect(new Set(['kai','ren','hina'].map(id => profileFor(id).jersey))).toHaveLength(3);
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/characterProfiles.test.ts`
Expected: missing module.

- [ ] **Step 3: Implement profiles**

Use original palettes and proportions. KAI: athletic/tall all-round silhouette; REN: lean setter silhouette; HINA: lower compact defensive stance silhouette.

- [ ] **Step 4: Implement articulated rig**

Use a root group plus pelvis, torso, neck/head, upper/lower arms, upper/lower legs, shoes, and simple hair geometry. Store joint groups by semantic names rather than manipulating raw meshes from `V3Scene`.

- [ ] **Step 5: Run tests + typecheck**

Run: `npm test -- tests/unit/game/v3/characterProfiles.test.ts && npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/game/v3/render/character tests/unit/game/v3/characterProfiles.test.ts
git commit -m "feat: add stylized v3 character rigs"
```

### Task 3: Add pose library for volleyball actions

**Files:**
- Create: `src/game/v3/render/character/V3PoseLibrary.ts`
- Test: `tests/unit/game/v3/characterPoses.test.ts`

**Interfaces:**
- Produces: `sampleV3Pose(state, normalizedTime, side): V3RigPose`.
- `V3RigPose` contains root offset/rotation plus joint Euler rotations for shoulders, elbows, hips, knees, torso, and head.

- [ ] **Step 1: Write pose invariants**

Tests must prove:
- RECEIVE lowers center of mass and brings forearms together.
- SET raises both hands above/forward of head.
- APPROACH has asymmetric stride and arm drive.
- JUMP moves root upward.
- SPIKE draws hitting arm back then forward across normalized time.
- BLOCK raises both arms vertically.
- DIVE lowers/extends root forward and arms toward floor.
- LAND compresses knees before returning toward READY.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/game/v3/characterPoses.test.ts`
Expected: missing pose library.

- [ ] **Step 3: Implement keyframed interpolation**

Use small explicit keyframe tables and linear/smoothstep interpolation; do not introduce a skeletal animation library.

- [ ] **Step 4: Run GREEN**

Run: `npm test -- tests/unit/game/v3/characterPoses.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/v3/render/character/V3PoseLibrary.ts tests/unit/game/v3/characterPoses.test.ts
git commit -m "feat: add volleyball pose library"
```

### Task 4: Replace placeholder avatars in V3Scene

**Files:**
- Modify: `src/game/v3/render/V3Scene.ts`
- Test: `tests/unit/game/v3/characterScene.test.ts` or equivalent pure adapter tests.

**Interfaces:**
- Consumes: `V3CharacterRig`, `deriveCharacterMotion`, `sampleV3Pose`.
- Produces: scene presentation where each player uses the articulated rig and pose state.

- [ ] **Step 1: Extract a pure presentation adapter test**

Given player position, previous position, runtime phase, control ID, and last event, assert selected motion state and normalized pose clock without constructing WebGL.

- [ ] **Step 2: Run RED**

Run focused adapter test.
Expected: missing adapter.

- [ ] **Step 3: Replace `createAvatar` capsule/block body construction**

Instantiate `V3CharacterRig` for each player and keep the focus ring in the rig or scene wrapper.

- [ ] **Step 4: Drive pose from runtime state**

Calculate horizontal speed from frame-to-frame position, map runtime/event to motion state, advance a presentation-only pose clock, sample/apply pose, and orient characters toward play.

- [ ] **Step 5: Verify disposal**

Ensure every geometry/material owned by each rig is disposed exactly once on scene disposal.

- [ ] **Step 6: Run unit tests + typecheck + build**

Run: `npm test -- tests/unit/game/v3 && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/game/v3/render/V3Scene.ts src/game/v3/render/character tests/unit/game/v3
git commit -m "feat: render animated gameplay v3 characters"
```

### Task 5: Improve contact readability and role identity

**Files:**
- Modify: `src/game/v3/render/character/characterProfiles.ts`
- Modify: `src/game/v3/render/character/V3PoseLibrary.ts`
- Modify: `src/styles/v3-match.css` only if HUD labels are required.
- Modify: `src/game/v3/render/V3Scene.ts` for optional name/role markers if readability needs them.

**Interfaces:**
- Produces: KAI/REN/HINA recognizable from silhouette/stance even without reading HUD text.

- [ ] **Step 1: Add presentation tests for role-specific base stance**

KAI ready stance is attack-neutral, REN stands closer to setter-ready hand position during SET_BUILDUP, HINA uses lower defensive knee/hip angles during DEFENSE_READ.

- [ ] **Step 2: Implement role offsets on top of shared poses**

Keep base motion shared; apply small profile-specific stance offsets rather than duplicating entire pose tables.

- [ ] **Step 3: Run V3 unit suite**

Run: `npm test -- tests/unit/game/v3`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/game/v3/render/character src/game/v3/render/V3Scene.ts tests/unit/game/v3
git commit -m "feat: differentiate v3 player roles visually"
```

### Task 6: Mobile visual audit and full regression

**Files:**
- Modify: `tests/e2e/v3-prototype.spec.ts` / renamed gameplay E2E only when assertions need updating.

**Interfaces:**
- Produces: verified production V3 visual baseline with articulated characters.

- [ ] **Step 1: Run mobile landscape screenshots at 844×390 and 932×430**

Check: ball visibility, player silhouette separation, no right-control overlap, receive stance legibility, jump/spike visibility, and no horizontal scrolling.

- [ ] **Step 2: Add/adjust E2E assertions for canvas/control layout**

Keep screenshot audit deterministic with `v3audit=1`; if action poses need screenshots, add a local-only audit phase query that selects a deterministic presentation pose without changing production gameplay behavior.

- [ ] **Step 3: Run full verification**

Run: `npm run verify:full`
Expected: exit 0.

- [ ] **Step 4: Review production bundle size and Three.js disposal warnings**

No runtime console errors or leaked renderer resources are acceptable.

- [ ] **Step 5: Commit final audit changes**

```bash
git add tests/e2e src/game/v3 src/styles/v3-match.css
git commit -m "test: verify animated gameplay v3 presentation"
```
