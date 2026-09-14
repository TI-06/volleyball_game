# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a smartphone-landscape 3vs3 CPU volleyball prototype whose core rally loop is playable in-browser and deployable to Cloudflare, with direct touch control, deterministic match simulation, ally/CPU AI, contextual actions, camera states, tutorial/result flow, and six distinct starter characters.

**Architecture:** React owns menus/HUD and app flow. A framework-independent TypeScript simulation owns match rules, players, ball, AI, timing windows, and character switching. Three.js only renders simulation state and performs camera/animation presentation; it must not own authoritative match rules. Phase 1 remains client-only with localStorage persistence. Cloudflare serves the built SPA through Workers Static Assets. No GitHub Actions workflow is added during early implementation; verification is local/manual to avoid noisy failure notifications.

**Tech Stack:** TypeScript, React, Vite, Three.js, Vitest, Testing Library, Playwright, Cloudflare Workers Static Assets.

**Spec:** `docs/superpowers/specs/2026-09-14-phase1-core-game-design.md`

## Global Constraints

- Primary target is smartphone landscape web.
- Match format is 3vs3, one 15-point set, deuce from 14-14, hard cap 20.
- Phase 1 has CPU play only; no PvP, account, server DB, gacha, progression, monetization, or 6vs6.
- Player outcome must depend on user input plus character ability; abilities must not become flat success probabilities.
- CPU may inspect game state and historic tendencies but must never read raw user input to counter it.
- Default switching mode is `STANDARD`; `CASUAL` and `MANUAL` are supported settings.
- Camera modes are `COURT`, `PLAYER`, and `ACTION`; full first-person is out of scope.
- Character art direction is original high-energy Japanese youth sports anime; do not reproduce copyrighted characters, uniforms, names, logos, or exact visual designs.
- Phase 1 persistence is localStorage only.
- Deployment target is Cloudflare Workers Static Assets.
- Do not add scheduled/push GitHub Actions during foundation work. If CI is added later, add one consolidated PR workflow only after local verification is stable.

---

## Planned file map

```text
src/
  app/
    App.tsx                 # screen routing and app state
    screens/
      TitleScreen.tsx
      DifficultyScreen.tsx
      MatchScreen.tsx
      ResultScreen.tsx
      TutorialScreen.tsx
  game/
    core/
      types.ts              # shared domain types
      constants.ts          # court/rules/timing constants
      createMatch.ts        # initial deterministic state
      stepMatch.ts          # authoritative fixed-step simulation entry
      rally.ts              # serve/rally/point transitions
      scoring.ts            # score, deuce and match end rules
    characters/
      roster.ts             # six starter definitions
      abilities.ts          # ability -> gameplay helper functions
    input/
      inputTypes.ts
      characterSwitch.ts
      actionResolver.ts
    ball/
      ballPhysics.ts
      ballCorrection.ts
    ai/
      allyAI.ts
      cpuAI.ts
      difficulty.ts
      tendencyTracker.ts
    actions/
      serve.ts
      receive.ts
      set.ts
      spike.ts
      block.ts
      dive.ts
    camera/
      cameraDirector.ts
    render/
      GameScene.ts          # Three scene lifetime
      CourtView.ts
      PlayerView.ts
      BallView.ts
      CameraView.ts
  ui/
    MatchHud.tsx
    VirtualStick.tsx
    ActionButton.tsx
    CharacterSwitcher.tsx
  persistence/
    settingsStore.ts
    recordStore.ts
  styles/
    app.css
    match.css
public/
  assets/
    models/.gitkeep
    audio/.gitkeep
    textures/.gitkeep
tests/
  unit/
  integration/
  e2e/
wrangler.jsonc
vite.config.ts
playwright.config.ts
vitest.config.ts
```

---

### Task 1: Project foundation and local verification

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/styles/app.css`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces: Vite React application, `npm run dev`, `npm run build`, `npm run test`, `npm run test:e2e`, `npm run typecheck`.

- [ ] **Step 1: Add the minimum package scripts and dependencies**

Use scripts with exactly these responsibilities:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "typecheck": "tsc -b --pretty false",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "preview": "vite preview",
    "deploy": "npm run build && wrangler deploy"
  }
}
```

Runtime dependencies: `react`, `react-dom`, `three`. Development dependencies: TypeScript, Vite React plugin, React/DOM typings, Three typings, Vitest, jsdom, Testing Library React, Playwright, Wrangler, Cloudflare Vite plugin if required by current supported configuration.

- [ ] **Step 2: Write a smoke test before app implementation**

Create `tests/unit/app/App.test.tsx` asserting the app renders `VOLLEYBALL` and a `CPU MATCH` button.

- [ ] **Step 3: Run the test and verify RED**

Run: `npm test -- tests/unit/app/App.test.tsx`
Expected: FAIL because the screen is not implemented.

- [ ] **Step 4: Implement the minimal title screen shell**

`App.tsx` renders a landscape-safe root, game title, and CPU match button. Do not add routing library yet; screen state is sufficient for Phase 1.

- [ ] **Step 5: Verify foundation**

Run:

```bash
npm run typecheck
npm test
npm run build
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: scaffold phase1 web game foundation"
```

---

### Task 2: Authoritative match domain and scoring

**Files:**
- Create: `src/game/core/types.ts`
- Create: `src/game/core/constants.ts`
- Create: `src/game/core/createMatch.ts`
- Create: `src/game/core/scoring.ts`
- Create: `src/game/core/rally.ts`
- Create: `src/game/core/stepMatch.ts`
- Test: `tests/unit/game/scoring.test.ts`
- Test: `tests/unit/game/createMatch.test.ts`

**Interfaces:**
- Produces: `MatchState`, `PlayerState`, `BallState`, `TeamSide`, `RallyPhase`, `createMatch(seed?: number): MatchState`, `awardPoint(state, side): MatchState`, `isMatchOver(state): boolean`, `stepMatch(state, input, dt): MatchState`.

- [ ] **Step 1: Write scoring RED tests**

Cover exactly:

```ts
expect(awardPoint(stateAt(14, 13), 'home').score).toEqual({ home: 15, away: 13 });
expect(isMatchOver(stateAt(15, 13))).toBe(true);
expect(isMatchOver(stateAt(15, 14))).toBe(false);
expect(isMatchOver(stateAt(19, 19))).toBe(false);
expect(isMatchOver(stateAt(20, 19))).toBe(true);
```

- [ ] **Step 2: Implement scoring**

Rules: normal win at >=15 and two-point lead; 20 is a hard cap and immediately wins.

- [ ] **Step 3: Write deterministic initial-state RED test**

Assert `createMatch(123)` creates three players per side, score 0-0, a serve-ready rally, and the same state for repeated identical seeds.

- [ ] **Step 4: Implement deterministic state creation and fixed-step shell**

Simulation owns timestamps in seconds and accepts `dt`; rendering must never mutate match state directly.

- [ ] **Step 5: Run tests and typecheck**

```bash
npm test -- tests/unit/game/scoring.test.ts tests/unit/game/createMatch.test.ts
npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add src/game/core tests/unit/game
git commit -m "feat: add deterministic match state and scoring"
```

---

### Task 3: Six starter characters and ability helpers

**Files:**
- Create: `src/game/characters/roster.ts`
- Create: `src/game/characters/abilities.ts`
- Test: `tests/unit/game/abilities.test.ts`

**Interfaces:**
- Produces: `CharacterDefinition`, `STARTER_ROSTER`, `getReceiveAssist(character)`, `getSpikeTimingWindow(character)`, `getBlockReach(character)`, `getMovementProfile(character)`.

Starter roster IDs must be stable:

```ts
'kai' | 'ren' | 'hina' | 'shin' | 'gou' | 'yu'
```

The first team uses Kai/Ren/Hina. The rival CPU team uses Shin/Gou/Yu. Each character has role, archetype, visual accent token, height class, and numeric abilities for power, speed, jump, spike, receive, set, block, decision.

- [ ] **Step 1: Write RED tests proving abilities change assistance, not auto-success**

Examples:

```ts
expect(getSpikeTimingWindow(highSpike)).toBeGreaterThan(getSpikeTimingWindow(lowSpike));
expect(getReceiveAssist(highReceive).predictionError).toBeLessThan(getReceiveAssist(lowReceive).predictionError);
expect(getMovementProfile(fast).maxSpeed).toBeGreaterThan(getMovementProfile(slow).maxSpeed);
```

- [ ] **Step 2: Define the six starter profiles**

Use role-distinct but balanced starting values. No character should exceed 95 or fall below 35 in Phase 1.

- [ ] **Step 3: Implement ability helper functions with clamped interpolation**

All conversion functions clamp inputs to `[0,100]`; never branch on character ID for core math.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/unit/game/abilities.test.ts
npm run typecheck
git add src/game/characters tests/unit/game/abilities.test.ts
git commit -m "feat: define starter roster and ability effects"
```

---

### Task 4: Ball simulation and playable correction

**Files:**
- Create: `src/game/ball/ballPhysics.ts`
- Create: `src/game/ball/ballCorrection.ts`
- Test: `tests/unit/game/ballPhysics.test.ts`
- Test: `tests/unit/game/ballCorrection.test.ts`

**Interfaces:**
- Produces: `integrateBall(ball, dt): BallState`, `applySpin(ball, dt): BallState`, `correctReceiveTrajectory(ball, target, quality): BallState`, `predictLanding(ball): Vec3`.

- [ ] **Step 1: Write RED tests for deterministic gravity and landing prediction**

Test that identical initial state and dt sequence gives identical output; vertical velocity decreases under gravity; predicted landing remains within court coordinates for a legal receive.

- [ ] **Step 2: Implement minimal 3D vector integration**

Use simple explicit/semi-implicit integration owned by game code. Three.js vectors may be used as values but Three's physics is not authoritative.

- [ ] **Step 3: Write correction RED tests**

`PERFECT` receive must move the resulting target closer to setter target than `GOOD`; `BAD` must preserve most natural physical error.

- [ ] **Step 4: Implement bounded correction**

Correction only applies after a valid contact event and cannot teleport a ball across the court or erase net/out errors.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/game/ballPhysics.test.ts tests/unit/game/ballCorrection.test.ts
git add src/game/ball tests/unit/game/ball*.test.ts
git commit -m "feat: add deterministic volleyball flight simulation"
```

---

### Task 5: Touch input, contextual ACTION, and character switching

**Files:**
- Create: `src/game/input/inputTypes.ts`
- Create: `src/game/input/actionResolver.ts`
- Create: `src/game/input/characterSwitch.ts`
- Create: `src/ui/VirtualStick.tsx`
- Create: `src/ui/ActionButton.tsx`
- Create: `src/ui/CharacterSwitcher.tsx`
- Test: `tests/unit/game/actionResolver.test.ts`
- Test: `tests/unit/game/characterSwitch.test.ts`

**Interfaces:**
- Produces: `PlayerInput`, `ActionKind`, `resolveAction(state, controlledPlayerId): ActionKind | null`, `getSwitchCandidate(state, mode): SwitchDecision`, `requestManualSwitch(...)`.

- [ ] **Step 1: Write action resolution RED tests**

Cover `SERVE`, `RECEIVE`, `DIVE`, `SET`, `JUMP`, `SPIKE`, `BLOCK`, and `null` when no contextual action is valid.

- [ ] **Step 2: Implement action resolver as pure logic**

UI receives the resolved action and only displays it; button rendering must not contain volleyball rules.

- [ ] **Step 3: Write switching RED tests**

Verify STANDARD selects the likely receiver, does not forcibly switch during a non-cancellable action, and manual selection becomes a queued switch if needed. MANUAL returns no automatic switch.

- [ ] **Step 4: Implement switch logic**

Default automatic warning lead is 0.35s. Strong active movement delays automatic switching; explicit manual selection outranks automatic selection.

- [ ] **Step 5: Implement touch components**

Left side uses a floating-origin virtual stick. Right action button changes icon/label from `ActionKind`. Bottom cards select one of three home players.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- tests/unit/game/actionResolver.test.ts tests/unit/game/characterSwitch.test.ts
npm run typecheck
git add src/game/input src/ui tests/unit/game/actionResolver.test.ts tests/unit/game/characterSwitch.test.ts
git commit -m "feat: add mobile controls and player switching"
```

---

### Task 6: Volleyball actions and rally loop

**Files:**
- Create: `src/game/actions/serve.ts`
- Create: `src/game/actions/receive.ts`
- Create: `src/game/actions/set.ts`
- Create: `src/game/actions/spike.ts`
- Create: `src/game/actions/block.ts`
- Create: `src/game/actions/dive.ts`
- Modify: `src/game/core/stepMatch.ts`
- Modify: `src/game/core/rally.ts`
- Test: `tests/integration/game/rallyFlow.test.ts`
- Test: `tests/unit/game/actions.test.ts`

**Interfaces:**
- Produces: contact result types `PERFECT | GREAT | GOOD | BAD | MISS`, attack intent `POWER | CROSS | LINE | TIP | BLOCK_OUT`, set intent `QUICK | NORMAL | HIGH`.

- [ ] **Step 1: Write RED tests for timing classification**

Use deterministic timestamps around a contact target and assert the five result bands.

- [ ] **Step 2: Implement receive/dive/set/spike/block calculations**

The calculations consume input timing, player position, ball state, and ability helper values. No action directly increments score except the rally/scoring layer after the resulting ball state is resolved.

- [ ] **Step 3: Write a full rally integration RED test**

Simulate: CPU serve -> home receive -> set -> spike -> away miss -> home point. Assert phase transitions and final score `1-0`.

- [ ] **Step 4: Wire actions into `stepMatch`**

Use a stable fixed-step update (`1/60` simulation seconds recommended); render frames may interpolate but rules advance through fixed steps.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/game/actions.test.ts tests/integration/game/rallyFlow.test.ts
git add src/game/actions src/game/core tests/unit/game/actions.test.ts tests/integration/game/rallyFlow.test.ts
git commit -m "feat: implement playable rally action loop"
```

---

### Task 7: Ally AI, CPU difficulty, and tendency reading

**Files:**
- Create: `src/game/ai/difficulty.ts`
- Create: `src/game/ai/tendencyTracker.ts`
- Create: `src/game/ai/allyAI.ts`
- Create: `src/game/ai/cpuAI.ts`
- Test: `tests/unit/game/allyAI.test.ts`
- Test: `tests/unit/game/cpuAI.test.ts`

**Interfaces:**
- Produces: `CpuDifficulty = 'BEGINNER' | 'NORMAL' | 'HARD' | 'EXPERT' | 'MASTER'`, `DifficultyProfile`, `decideAllyIntent(state, playerId)`, `decideCpuIntent(state, playerId, profile, history)`.

Difficulty profiles use reaction-delay ranges approximately:

```text
BEGINNER 0.50-0.80s
NORMAL   0.35-0.55s
HARD     0.22-0.40s
EXPERT   0.12-0.25s
MASTER   0.07-0.16s
```

- [ ] **Step 1: Write ally state RED tests**

Assert the non-controlled home players adopt useful roles: receiver covers predicted landing, setter moves to set zone after a valid pass, attacker enters approach instead of chasing the ball.

- [ ] **Step 2: Implement ally AI state machine**

States are `RECEIVE`, `SET`, `APPROACH`, `BLOCK`, `COVER`, `RECOVER`. Low decision ability adds prediction/reaction error but never intentional nonsensical movement.

- [ ] **Step 3: Write CPU fairness RED tests**

Given identical visible state/history, changing raw uncommitted player input must not change CPU decision. Higher difficulty may react faster and choose better open-space/attack options.

- [ ] **Step 4: Implement CPU attack selection**

BEGINNER favors obvious open attacks. NORMAL adds basic course choice. HARD considers blocker position. EXPERT uses defensive gaps and occasional tips. MASTER additionally uses tracked tendencies. Add bounded randomness seeded from match RNG.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/game/allyAI.test.ts tests/unit/game/cpuAI.test.ts
git add src/game/ai tests/unit/game/allyAI.test.ts tests/unit/game/cpuAI.test.ts
git commit -m "feat: add fair ally and cpu volleyball ai"
```

---

### Task 8: Three.js court, placeholder characters, and camera director

**Files:**
- Create: `src/game/render/GameScene.ts`
- Create: `src/game/render/CourtView.ts`
- Create: `src/game/render/PlayerView.ts`
- Create: `src/game/render/BallView.ts`
- Create: `src/game/render/CameraView.ts`
- Create: `src/game/camera/cameraDirector.ts`
- Create: `public/assets/models/.gitkeep`
- Create: `public/assets/textures/.gitkeep`
- Test: `tests/unit/game/cameraDirector.test.ts`

**Interfaces:**
- Produces: `CameraMode = 'COURT' | 'PLAYER' | 'ACTION'`, `getCameraIntent(state): CameraIntent`. Renderer consumes `MatchState` read-only.

- [ ] **Step 1: Write camera RED tests**

Normal rally -> COURT; receive/set focus -> PLAYER; spike/important block -> ACTION. `LOW` suppresses nonessential action transitions; `OFF` stays COURT except framing required to keep ball visible.

- [ ] **Step 2: Implement camera director pure logic**

Camera transition duration defaults to 0.2-0.35s and never decides match outcomes.

- [ ] **Step 3: Implement placeholder 3D scene**

Create regulation-proportioned stylized court, net, ball, and six simple toon-shaded humanoid placeholders with distinct height/accent color per character. These are disposable gameplay placeholders, not final character art.

- [ ] **Step 4: Bind renderer to immutable simulation snapshots**

Interpolate displayed positions between fixed simulation ticks; do not mutate domain objects.

- [ ] **Step 5: Verify mobile rendering manually**

Use browser device emulation at representative landscape sizes including 844x390 and 932x430. Confirm all six players, net, ball, and action area remain visible.

- [ ] **Step 6: Commit**

```bash
git add src/game/render src/game/camera public/assets tests/unit/game/cameraDirector.test.ts
git commit -m "feat: render 3d court and action cameras"
```

---

### Task 9: Match HUD, screens, tutorial, result, and persistence

**Files:**
- Create: `src/app/screens/TitleScreen.tsx`
- Create: `src/app/screens/DifficultyScreen.tsx`
- Create: `src/app/screens/MatchScreen.tsx`
- Create: `src/app/screens/ResultScreen.tsx`
- Create: `src/app/screens/TutorialScreen.tsx`
- Create: `src/ui/MatchHud.tsx`
- Create: `src/persistence/settingsStore.ts`
- Create: `src/persistence/recordStore.ts`
- Create: `src/styles/match.css`
- Modify: `src/app/App.tsx`
- Test: `tests/unit/persistence/stores.test.ts`
- Test: `tests/integration/app/matchFlow.test.tsx`

**Interfaces:**
- Produces local persistence for unlocked difficulty, best score, highest spike speed, Perfect count, switch mode, and camera mode.

- [ ] **Step 1: Write persistence RED tests**

Invalid/missing localStorage must fall back safely. Stored version key is `volleyball-game:v1`. Unknown future fields are ignored.

- [ ] **Step 2: Implement settings/record stores**

No server calls. Difficulty unlock rule: HARD win unlocks EXPERT; EXPERT win unlocks MASTER. BEGINNER/NORMAL/HARD are initially selectable.

- [ ] **Step 3: Write UI flow RED test**

Title -> CPU MATCH -> difficulty -> match shell -> result -> rematch/difficulty/title.

- [ ] **Step 4: Implement screens and HUD**

Landscape HUD: floating stick left, contextual action right, three player cards bottom center, score top center, current player small top-left. Avoid health/stamina bars.

- [ ] **Step 5: Implement first-run tutorial**

Guided sequence: move to predicted landing -> RECEIVE -> swipe set target -> JUMP -> aim/spike -> BLOCK. Tutorial advances from actual successful inputs, not timer-only slides.

- [ ] **Step 6: Verify and commit**

```bash
npm test -- tests/unit/persistence/stores.test.ts tests/integration/app/matchFlow.test.tsx
npm run typecheck
git add src/app src/ui src/persistence src/styles tests/unit/persistence tests/integration/app
git commit -m "feat: add mobile match flow tutorial and records"
```

---

### Task 10: Cloudflare deployment and quiet release verification

**Files:**
- Create: `wrangler.jsonc`
- Modify: `vite.config.ts`
- Create: `tests/e2e/mobile-match.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Produces: Cloudflare-deployable SPA and local verification commands.

- [ ] **Step 1: Add an E2E RED test**

At landscape mobile viewport, verify title, difficulty selection, match HUD, visible Action button, and no horizontal document overflow.

- [ ] **Step 2: Configure Cloudflare Workers Static Assets**

Configure built static assets from `dist` with SPA navigation fallback. Do not add a scheduled worker or background job.

- [ ] **Step 3: Verify locally before any remote CI**

Run exactly:

```bash
npm run typecheck
npm test
npm run build
npm run test:e2e
```

All must pass locally before deployment.

- [ ] **Step 4: Deploy manually**

Run:

```bash
npm run deploy
```

Verify the returned Cloudflare URL on an actual smartphone or responsive browser mode.

- [ ] **Step 5: Keep GitHub notification noise low**

Do **not** add a GitHub Actions workflow in this task. Record local verification commands in README. CI can be added later as one consolidated PR-only workflow after the prototype is stable.

- [ ] **Step 6: Commit**

```bash
git add wrangler.jsonc vite.config.ts tests/e2e/mobile-match.spec.ts README.md
git commit -m "chore: prepare cloudflare deployment and mobile e2e"
```

---

## Plan self-review

- Spec coverage: gameplay rules, controls, switching, six characters, ball simulation, ally/CPU AI, camera, UI, tutorial, result, local persistence, Three.js rendering, testing, and Cloudflare deployment all have explicit tasks.
- Scope exclusions remain excluded: no growth system, gacha, PvP, server DB, auth, monetization, ranking, 6vs6, or final character production art.
- Notification constraint is explicit: no GitHub Actions during foundation implementation; verification remains local/manual until stable.
- Shared type/function names are defined once and reused consistently across tasks.
- No implementation step depends on final art assets; placeholder models unblock gameplay-first iteration.
