# Gameplay V3 Rally Actions Implementation Plan

**Goal:** Turn the V3 foundation into a deterministic volleyball interaction loop where the player can prepare early, receive, choose a set, approach/jump, choose an attack, and block without waiting for last-frame button prompts.

**Architecture:** Keep the action model pure and renderer-independent. Action modules consume player/ball context and produce quality/intent data. A small rally state machine connects them after the individual rules are tested. Existing `rework` action code remains unchanged.

**Spec:** `docs/superpowers/specs/2026-09-15-gameplay-v3-design.md`

## Task 1: Receive quality from preparation, position, and timing

Create:
- `src/game/v3/actions/receive.ts`
- `tests/unit/game/v3/receive.test.ts`

Requirements:
- `resolveReceiveQuality` returns `PERFECT | GOOD | BAD | MISS`.
- Normal difficulty should not require frame-perfect input.
- A buffered action can be prepared before contact; quality is resolved at contact.
- Strong baseline windows: PERFECT <= 0.12 s and <= 0.55 m; GOOD <= 0.24 s and <= 1.0 m; BAD <= 0.38 s and <= 1.55 m; otherwise MISS.
- Moving too fast at contact can degrade one grade but does not automatically miss.

TDD: test exact boundary examples before implementation.

## Task 2: Explicit dive reach and recovery

Create:
- `src/game/v3/actions/dive.ts`
- `tests/unit/game/v3/dive.test.ts`

Requirements:
- Dive extends horizontal reach in chosen direction.
- Normal standing contact reach baseline 1.35 m; dive target reach 2.55 m.
- Dive recovery baseline 0.85 s.
- A dive cannot be immediately chained while recovery is active.

## Task 3: Set target selection

Create:
- `src/game/v3/actions/set.ts`
- `tests/unit/game/v3/set.test.ts`

Requirements:
- Three explicit lanes: `LEFT`, `MIDDLE`, `RIGHT`.
- Directional x input chooses lane: <= -0.35 LEFT, >= 0.35 RIGHT, otherwise MIDDLE.
- Hold duration chooses LOW/NORMAL/HIGH trajectory; clamp excessive holds.
- Poor receive quality removes LOW/quick option rather than silently failing.

## Task 4: Approach, jump timing, and attack intent

Create:
- `src/game/v3/actions/attack.ts`
- `tests/unit/game/v3/attack.test.ts`

Requirements:
- Jump quality: PERFECT <= 0.09 s; GOOD <= 0.18 s; BAD <= 0.30 s; otherwise MISS.
- Gesture intent: short gesture = TIP; dominant horizontal-right = LINE; dominant horizontal-left = CROSS; otherwise POWER.
- Attack can only resolve from an airborne/attack-ready state in the later state machine.

## Task 5: Block timing and alignment

Create:
- `src/game/v3/actions/block.ts`
- `tests/unit/game/v3/block.test.ts`

Requirements:
- Resolve `STUFF | TOUCH | DEFLECT | MISS` from timing and lateral alignment.
- Good early anticipation is rewarded; pressing only after contact should miss.
- Baseline: STUFF <= 0.11 s and <= 0.45 m, TOUCH <= 0.20 s and <= 0.8 m, DEFLECT <= 0.30 s and <= 1.2 m.

## Task 6: Early automatic player switching

Create:
- `src/game/v3/controls/playerSwitch.ts`
- `tests/unit/game/v3/playerSwitch.test.ts`

Requirements:
- Select the home player with earliest estimated arrival to forecast center.
- Account for current recovery state with an arrival penalty.
- Return both `playerId` and `leadSeconds`.
- Do not switch if the next player would receive less than 0.55 s of useful control lead unless current player is clearly unable to reach.

## Task 7: V3 rally state machine

Create:
- `src/game/v3/core/rallyFlow.ts`
- `tests/unit/game/v3/rallyFlow.test.ts`

Requirements:
- Legal first prototype flow:
  `DEFENSE_READ -> RECEIVE_PREP -> SET_BUILDUP -> ATTACK_APPROACH -> ATTACK_AIRBORNE -> OPPONENT_DEFENSE`.
- State transitions are driven by explicit events, never by UI label availability.
- Invalid out-of-order events leave state unchanged.

Update V3 phase union as needed.

## Task 8: Regression gate

Run focused V3 suite + typecheck after each GREEN slice.
At milestone end run `npm run verify` and confirm no `src/game/rework/` files changed.
