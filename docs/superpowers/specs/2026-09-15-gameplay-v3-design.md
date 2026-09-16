# Gameplay V3 Design

Date: 2026-09-15
Branch: `rebuild/gameplay-v3`
Status: Approved direction, implementation not started

## 1. Purpose

Rebuild the playable volleyball match loop around mobile-first readability and player agency instead of extending the current `rework` loop.

The success condition is not visual polish. The first milestone must prove that a player can reliably understand, predict, move, receive, set, approach, spike, and block on a phone without feeling that the ball arrives before the input can be made.

The existing `rework` implementation remains intact until V3 is proven better in an actual playable match.

## 2. Core Problems to Solve

The current implementation has several structural problems:

- The ball is rendered at a fixed world-space radius, so distant balls become visually too small.
- The fixed 2.5D camera makes depth, ball approach speed, and player-to-ball distance hard to read.
- Receive availability appears late, after the ball is already close enough that a human mobile player has little reaction time.
- Movement is effectively one-dimensional with strong assist behavior, reducing the feeling of directly controlling a player.
- The current character representation is articulated 2D planes in 3D space, which limits the quality ceiling even if more animations are added.
- The game communicates too much through context-sensitive button labels and too little through readable body motion, ball trajectory, anticipation, and court positioning.

V3 addresses these at the system level instead of tuning individual thresholds.

## 3. Product Direction

V3 combines four qualities:

1. Arcade readability and impact.
2. Direct third-person player control.
3. Volleyball-specific anticipation and positioning.
4. Simple enough controls for touchscreens.

The player should not wait for a button to light up after the ball arrives. The player should read the opponent, move before contact, prepare the appropriate action, and then execute with timing.

This means the game is built around:

`read -> move -> prepare -> contact -> choose next action`

rather than:

`wait for prompt -> press button`.

## 4. Match Format

The first complete V3 version uses 3v3:

- KAI: attacking wing / all-round attacker.
- REN: setter-oriented player.
- HINA: receive / defense-oriented player.

All three can still receive, set, attack, and block. Their ratings and motion characteristics influence quality rather than hard-locking actions.

3v3 is intentional. It keeps rotation, responsibility, camera framing, AI coordination, and touch controls understandable while still producing real volleyball sequences.

## 5. Control Modes

### 5.1 Team Control - default

The game predicts the player most likely to make the next meaningful touch and transfers control early enough for the human to prepare.

Examples:

- Opponent serves toward HINA: HINA becomes controlled before the ball crosses into the playable receive window.
- HINA receives: REN becomes the likely controlled setter.
- REN sets to KAI: control transitions to KAI before the approach begins.

The controlled player is shown with a subtle ring and camera bias, not a large floor marker.

The player may manually switch using a small dedicated switch control if needed.

### 5.2 Ace Control - later

Optional mode where KAI remains the controlled player whenever possible. This is not part of the first V3 prototype because it adds positioning and teammate-AI complexity before the core game feel is proven.

## 6. Camera

Replace `FIXED_2_5D` with a third-person follow camera.

The camera must keep three things readable whenever possible:

- controlled player,
- ball,
- net / opponent context.

The camera uses state-dependent composition rather than a single fixed transform.

### Camera states

- `DEFENSE`: behind and slightly above the controlled defender, wider FOV.
- `SET_BUILDUP`: slightly higher framing to expose setter and attackers.
- `ATTACK_APPROACH`: behind / diagonal to the attacker, moderate compression of depth.
- `ATTACK_AIRBORNE`: camera tracks attacker and ball contact zone with limited movement to prevent nausea.
- `BLOCK`: near-net defensive framing, wider horizontal view.
- `SERVE`: staged behind server.

The camera must never require manual look control in V3 prototype.

## 7. Ball Readability

Physics radius and render readability are separated.

### Physics

Use a realistic approximate volleyball radius in world units.

### Rendering

Maintain a minimum projected screen size so the ball never becomes unreadably small on supported mobile landscape sizes.

Visual aids:

- clear panel colors / outline,
- soft floor shadow,
- subtle trail at high speed,
- stronger short trail after a hard spike,
- landing prediction indicator when appropriate,
- visible spin later if cheap enough.

The projected minimum ball size is a rendering rule only. Collision does not grow with distance.

## 8. Prediction Instead of Late Reaction

This is the central gameplay change.

### 8.1 Defensive forecast

Before an opponent strike, V3 produces an uncertainty region for likely landing location.

It is not a guaranteed exact answer.

The region narrows as more information becomes available:

1. opponent setter target,
2. attacker approach lane,
3. attacker body alignment,
4. contact moment,
5. actual ball trajectory.

The player can therefore start moving before the ball is hit.

### 8.2 Difficulty controls information quality

Difficulty changes forecast quality, movement assistance, and timing leniency more than raw ball speed.

Proposed baseline:

- Beginner: accurate forecast, strong movement assist, very generous timing.
- Easy: broad forecast, moderate assist.
- Normal: useful but imperfect forecast, light assist.
- Hard: short-lived and less precise forecast, weak assist.
- Ace: minimal forecast, almost no assist.

This keeps higher difficulty demanding without making the game feel physically impossible.

## 9. Input Model

Mobile landscape is the primary input target.

### Left side

Virtual stick / drag zone for 2D court movement.

The user can move on both court axes, constrained to legal player movement bounds.

### Right side

Persistent action controls rather than frequently changing labeled buttons.

Prototype actions:

- `ACTION`: context-sensitive contact action, but usable early through input buffering.
- `DIVE`: explicit emergency defensive action.
- `JUMP/BLOCK`: explicit vertical action near attack or block contexts.

Attack direction uses swipe after / during jump depending on contact state.

The UI may change icons or glow intensity by context, but the location and fundamental meaning of controls stay stable.

## 10. Input Buffering

Inputs may be made before the exact legal contact frame.

A buffered action records:

- input type,
- input timestamp,
- intended direction if applicable,
- expiry time.

For Normal difficulty, the initial design target is roughly 350-500 ms of pre-contact buffering for defensive preparation. Final numbers are tuned from playtesting.

The buffer does not guarantee success. It means the player can prepare in advance.

Contact quality still depends on:

- distance to ideal contact point,
- body orientation / movement state,
- action timing relative to contact,
- player ability,
- ball difficulty.

## 11. Receive and Dive

### Receive

The player moves into the forecast area and may press ACTION before the ball enters contact distance.

The character enters a prepared receive posture.

At contact, quality is resolved as:

- PERFECT,
- GOOD,
- BAD,
- MISS.

A successful receive generates an intentional playable pass target rather than simply reflecting the ball.

### Dive

DIVE is player-selected, not a label that appears only at the last moment.

The player dives in the current movement / gesture direction.

A dive has meaningful recovery cost. It can save a rally but may leave the diver unavailable for the immediate next action.

## 12. Set

When the controlled player is setting:

- movement remains available,
- three primary attack options are presented spatially,
- directional input selects target lane,
- hold duration or a simple modifier influences height.

The initial prototype does not need dozens of set types.

Required first options:

- left / outside,
- middle / quick-ish,
- right.

Bad receives reduce available set quality and can shrink or remove faster options.

## 13. Attack

Attack is built around a readable sequence:

`set read -> approach -> plant -> jump -> contact -> landing`.

### Approach

The attacker gets an understated suggested approach lane. No large opaque route markers.

Player movement matters. Starting too late or from the wrong position reduces attack quality.

### Jump timing

Jump timing uses generous game-feel windows rather than rhythm-game precision.

Initial Normal target: approximately +/-180 ms around the ideal jump trigger, then tune by device playtest.

### Airborne attack

During the jump, the player sees the opposing block.

Swipe / tap determines attack intent:

- left/up diagonal: cross,
- up: power,
- right/up diagonal: line,
- short tap / short movement: tip.

The exact screen-direction mapping may invert by camera orientation but intent must remain consistent.

### Impact

Hard / perfect contacts use short hit stop, stronger audio, camera impulse, and a brief ball trail. Hit stop should be in the tens of milliseconds, not long enough to break flow.

## 14. Block

Blocking is anticipatory.

The player reads opposing set and approach, moves laterally at the net, and presses block before contact.

Results include:

- clean stuff block,
- controlled touch,
- deflection,
- late / early miss.

Jump timing and lateral alignment both matter.

## 15. Player Switching

Automatic switching happens before the action window, not at contact.

Switch scoring considers:

- predicted first-touch owner,
- distance and estimated arrival time,
- current role in the planned sequence,
- recovery / airborne state,
- whether switching would create an unfair surprise.

A switch should usually happen while the player still has enough time to move meaningfully.

A short transition aid may briefly show the new controlled player's expected task.

## 16. Characters

The existing articulated plane characters are not the target renderer for final V3.

However, the first gameplay prototype deliberately does not block on production-quality character art.

### Prototype

Use simple but clearly readable 3D placeholder bodies or low-complexity rigs to prove movement, camera, contact timing, and court readability.

### Production character target

Later replace with stylized 3D skinned meshes:

- approximately 6.5-7 head proportions,
- anime-inspired but original identity,
- cel/toon shading,
- clear silhouettes,
- differentiated height / limb proportions / stance,
- strong hair and uniform silhouette recognition.

Required motion family eventually includes idle, ready, split step, run, shuffle, receive, dive, recover, set, jump set, approach sequence, plant, takeoff, airborne swing, tip, landing, block movement, block jump, celebration, and frustration.

Ball contact must synchronize to actual hand / forearm contact frames instead of merely playing an animation after a logical event.

## 17. Architecture

Create V3 under a new isolated namespace:

```text
src/game/v3/
  core/
  controls/
  prediction/
  actions/
  ai/
  camera/
  render/
  presentation/
  types.ts
```

UI integration lives separately under:

```text
src/ui/v3/
src/app/screens/V3MatchScreen.tsx
```

The existing `src/game/rework/` path remains untouched except for any minimal top-level routing needed to launch the V3 prototype behind an explicit entry point.

### Major modules

- `core`: deterministic world state and fixed-step simulation.
- `controls`: movement intent, buffered actions, player switching.
- `prediction`: landing / receive uncertainty and attack-read state.
- `actions`: receive, set, attack, block resolution.
- `ai`: teammate and CPU decisions.
- `camera`: semantic camera states and transitions.
- `render`: court, readable ball, placeholder players, indicators.
- `presentation`: hit stop, camera impulse, event presentation data.

The simulation must remain independent from Three.js render objects.

## 18. Determinism and Time

Keep a fixed-step deterministic simulation so tests can reproduce sequences from a seed.

Presentation effects such as camera shake or hit stop must not mutate physics results unpredictably.

The UI render loop may interpolate between simulation states.

## 19. First Prototype Scope

The first implementation milestone is intentionally narrow.

Required:

- new V3 route / entry without deleting current match,
- third-person defense camera,
- 2D player movement,
- readable projected ball size,
- opponent attack sequence,
- landing forecast region,
- early receive preparation through input buffer,
- receive quality resolution,
- teammate / user set,
- attacker approach and jump,
- directional spike,
- simple block,
- basic score / rally reset,
- mobile landscape controls,
- deterministic tests.

Not required yet:

- production character models,
- career / progression changes,
- online PvP,
- 6v6 rotation,
- deep skill trees,
- commentary,
- elaborate crowd / stadium,
- full Ace Control mode,
- advanced tactical formations.

## 20. Test Strategy

### Unit tests

Cover at minimum:

- projected ball readability rule,
- forecast generation and convergence,
- buffered action expiry and activation,
- receive timing quality,
- dive state and recovery,
- set target selection,
- jump timing quality,
- attack intent from swipe,
- block timing / alignment,
- automatic player-switch lead time,
- deterministic simulation by seed.

### Integration tests

Script complete sequences:

- opponent attack -> user receives -> teammate sets -> user attacks,
- user receive -> user / teammate setting alternative,
- block touch -> recovery -> next contact,
- emergency dive -> teammate second touch.

### E2E

Mobile landscape Playwright tests must verify:

- V3 loads,
- player movement responds,
- forecast appears before contact,
- buffered receive can be entered early,
- ball remains visually detectable at far court distance,
- one complete rally can reach a score reset,
- current legacy/rework path still loads until V3 replacement is approved.

## 21. Performance Targets

Initial target devices are modern mobile browsers in landscape.

Goals:

- 60 fps target on normal devices,
- graceful 30+ fps fallback rather than input latency spikes,
- pixel ratio cap as needed,
- no excessive per-frame object allocation,
- pooled effects / indicators,
- no React state update every render frame.

Input latency and readability take priority over expensive visual effects.

## 22. Acceptance Criteria for Replacing Current Rework

The old playable loop is not deleted until all of the following are true:

1. V3 supports one complete playable rally sequence from opponent attack through player attack.
2. A user can begin defensive preparation before the opponent contact.
3. The ball remains clearly visible at far-court distance on target mobile landscape viewports.
4. Normal difficulty allows reliable reaction without requiring frame-perfect input.
5. Movement feels like direct player control rather than only lane correction.
6. Attack has a readable approach and satisfying contact.
7. Basic blocking is understandable without a late prompt.
8. Automated tests cover the new timing and prediction rules.
9. Existing non-match application flow remains intact.
10. The V3 prototype is judged subjectively more fun and more controllable than the current `rework` match.

Only after these are satisfied should the old `rework` match path be removed or replaced.

## 23. Implementation Order

1. V3 deterministic state/types and test harness.
2. 2D movement + third-person camera prototype.
3. ball projection/readability system.
4. opponent attack and landing forecast.
5. input buffer + receive/dive.
6. set selection and teammate coordination.
7. approach/jump/spike loop.
8. block loop.
9. auto player switching.
10. mobile HUD and E2E flow.
11. game-feel pass: hit stop, trail, camera impulse, sound hooks.
12. only after playability approval: production 3D character pipeline.

## 24. Non-Goals / Guardrails

- Do not tune the game by simply slowing every ball.
- Do not solve readability by increasing physical collision radius.
- Do not require manual camera control on mobile.
- Do not make major actions available only after a button label suddenly changes.
- Do not copy recognizable copyrighted character designs from existing volleyball anime/games.
- Do not delete the current match implementation before V3 passes the replacement acceptance criteria.
