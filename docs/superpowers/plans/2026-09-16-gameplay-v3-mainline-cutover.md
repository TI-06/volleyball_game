# Gameplay V3 Mainline Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote Gameplay V3 to the only playable game flow and remove the legacy gameplay stack from the source tree while preserving a green build and deterministic tests.

**Architecture:** `App` becomes a thin launcher for `V3MatchScreen`; prototype query gating, legacy title/difficulty/result flow, old persistence coupling, old `game/rework`, old base gameplay runtime, and legacy UI/tests are removed when no longer referenced. V3 remains deterministic and testable independently from Three.js presentation.

**Tech Stack:** React 19, TypeScript 5.9, Three.js 0.186, Vite 8, Vitest 5, Playwright 1.63.

**Spec:** `docs/superpowers/specs/2026-09-15-gameplay-v3-design.md`

## Global Constraints

- Mobile-first landscape controls remain the primary play surface.
- Simulation logic stays independent of Three.js presentation.
- Use deterministic fixed-step runtime updates.
- Do not inflate physics collision radii to make the ball visually larger.
- Do not copy copyrighted anime characters or character designs.
- Existing Git history is the archive for removed gameplay; do not keep dead source solely for rollback.
- No permanent GitHub Actions workflow is added for this phase.

---

### Task 1: Make V3 the default application flow

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `tests/unit/app/V3PrototypeRoute.test.tsx`
- Delete/replace legacy app-flow tests that only assert title/difficulty/result routing.

**Interfaces:**
- Produces: `App(): JSX.Element` that renders `V3MatchScreen` without requiring `?v3=1`.
- Keeps: local-only `v3audit=1` behavior inside `V3MatchScreen`.

- [ ] **Step 1: Write the failing route test**

```tsx
it('launches gameplay v3 at the normal root URL', () => {
  window.history.replaceState({}, '', '/');
  render(<App />);
  expect(screen.getByTestId('v3-match-screen')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- tests/unit/app/V3PrototypeRoute.test.tsx`
Expected: FAIL because `/` still renders the legacy title flow.

- [ ] **Step 3: Reduce `App` to the V3 launcher**

```tsx
import { V3MatchScreen } from './screens/V3MatchScreen';

export function App() {
  return <V3MatchScreen seed={73} />;
}
```

Remove legacy screen state, difficulty, result persistence, tutorial lifecycle, and `v3PrototypeEnabled()` from `App.tsx`.

- [ ] **Step 4: Run focused route/screen tests**

Run: `npm test -- tests/unit/app/V3PrototypeRoute.test.tsx tests/unit/app/V3MatchScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/App.tsx tests/unit/app/V3PrototypeRoute.test.tsx tests/unit/app/V3MatchScreen.test.tsx
git commit -m "refactor: promote gameplay v3 to default app"
```

### Task 2: Remove legacy application screens and persistence coupling

**Files:**
- Delete: legacy `src/app/screens/*` files except `V3MatchScreen.tsx` when they are no longer imported.
- Delete: `src/persistence/` if no V3 source imports it.
- Delete: legacy app tests for result/tutorial/rematch/match-seed flows.
- Modify: `src/main.tsx` imports if legacy CSS becomes unused.

**Interfaces:**
- Consumes: Task 1 root flow.
- Produces: application layer with only the V3 match surface and its direct dependencies.

- [ ] **Step 1: Search the branch for legacy screen/persistence imports**

Run: `grep -R "TitleScreen\|DifficultyScreen\|ResultScreen\|ReworkMatchScreen\|persistence/" -n src tests`
Expected: only files scheduled for deletion or migration.

- [ ] **Step 2: Delete unreferenced legacy app/persistence files and their tests**

Remove files only after Task 1 tests prove the V3 root works.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS with no unresolved legacy imports.

- [ ] **Step 4: Commit**

```bash
git add -A src/app src/persistence tests/unit/app tests/integration/app
git commit -m "refactor: remove legacy application flow"
```

### Task 3: Remove the legacy gameplay/runtime/render stack

**Files:**
- Delete: `src/game/rework/`
- Delete: legacy gameplay modules under `src/game/` that are not imported by `src/game/v3/`
- Delete: legacy render/UI modules no longer imported by V3.
- Delete: matching legacy unit/integration tests.
- Keep or relocate only genuinely shared constants/utilities used by V3.

**Interfaces:**
- Consumes: imports from `src/game/v3/**` and `src/ui/v3/**` as the whitelist.
- Produces: a source tree whose gameplay code path is V3-only.

- [ ] **Step 1: Build a dependency whitelist from V3 imports**

Inspect `src/game/v3/**`, `src/app/screens/V3MatchScreen.tsx`, and `src/ui/v3/**`. Any legacy module retained must have an active import from those files.

- [ ] **Step 2: Move shared fixed-step constants into V3 if necessary**

If `V3MatchScreen` is the only remaining consumer of `src/game/core/constants.ts`, create `src/game/v3/core/constants.ts`:

```ts
export const V3_FIXED_STEP_SECONDS = 1 / 60;
```

Then update `V3MatchScreen` to consume `V3_FIXED_STEP_SECONDS`.

- [ ] **Step 3: Delete unused gameplay/render/UI modules and corresponding tests**

Delete by dependency evidence, not by name alone.

- [ ] **Step 4: Run TypeScript and all remaining Vitest tests**

Run: `npm run typecheck && npm test`
Expected: PASS; test count may decrease because legacy coverage is intentionally removed.

- [ ] **Step 5: Commit**

```bash
git add -A src/game src/ui tests
git commit -m "refactor: remove legacy volleyball runtime"
```

### Task 4: Replace prototype naming and preserve reproducible visual audit

**Files:**
- Modify: `src/app/screens/V3MatchScreen.tsx`
- Modify: `src/styles/v3-match.css`
- Modify: `tests/e2e/v3-prototype.spec.ts` (rename if useful to `gameplay.spec.ts`).

**Interfaces:**
- Produces: player-facing copy with no `PROTOTYPE` label.
- Keeps: `v3audit=1` localhost-only deterministic freeze for screenshot comparison.

- [ ] **Step 1: Write failing UI expectations for production naming**

```tsx
expect(screen.queryByText('GAMEPLAY V3')).not.toBeInTheDocument();
expect(screen.getByText('VOLLEYBALL')).toBeInTheDocument();
```

- [ ] **Step 2: Run focused test and confirm RED**

Run: `npm test -- tests/unit/app/V3MatchScreen.test.tsx`
Expected: FAIL while prototype badge remains.

- [ ] **Step 3: Replace prototype badge/copy with production HUD copy**

Keep phase/score information but remove prototype-facing terminology.

- [ ] **Step 4: Update E2E root URL to `/` and audit URL to `/?v3audit=1`**

Keep 844×390 and 932×430 landscape coverage.

- [ ] **Step 5: Run focused UI + E2E**

Run: `npm test -- tests/unit/app/V3MatchScreen.test.tsx && npx playwright test tests/e2e/v3-prototype.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/screens/V3MatchScreen.tsx src/styles/v3-match.css tests/e2e tests/unit/app/V3MatchScreen.test.tsx
git commit -m "feat: make gameplay v3 the production match surface"
```

### Task 5: Final cutover verification

**Files:**
- No production changes unless verification identifies a real defect.

**Interfaces:**
- Produces: verified V3-only baseline for the character phase.

- [ ] **Step 1: Confirm no legacy runtime entry points remain**

Run searches for `ReworkMatchScreen`, `/rework/`, `TitleScreen`, `DifficultyScreen`, and `ResultScreen` in `src/`.
Expected: zero active source references.

- [ ] **Step 2: Run full verification**

Run: `npm run verify:full`
Expected: exit 0.

- [ ] **Step 3: Inspect production bundle warning/output**

Record bundle size; treat the existing >500 kB warning as non-blocking unless it materially regresses.

- [ ] **Step 4: Commit any verification-only test corrections, otherwise leave tree clean**
