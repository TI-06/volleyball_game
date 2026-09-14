# Gameplay Rework 2.5D Plan Amendment

This amendment is mandatory before the rendering/UI integration tasks in `2026-09-14-gameplay-rework-2-5d.md`.

## Why this task was added

During Task 4 implementation review, the original plan was found to be incomplete: KAI's user-controlled rally could progress, but non-focus teammate receive contacts and the opponent CPU's receive -> set -> attack loop were not yet assigned an implementation task. Without them, a full 3vs3 match cannot complete reliably.

This does not change the approved product design. It completes the 3vs3 simulation required by the design.

---

### Mandatory Task A: Complete non-focus defense and CPU 2.5D rally AI

**Files:**
- Create: `src/game/rework/cpuAI.ts`
- Modify: `src/game/rework/teammateAI.ts`
- Modify: `src/game/rework/runtime.ts`
- Test: `tests/integration/game/reworkRuntime.test.ts`
- Create: `tests/unit/game/rework/cpuAI.test.ts`

**Interfaces:**
- `decideCpuRoles(state, difficulty): ReworkCpuDecision[]`
- `tryAutomaticTeammateContact(state): { match; event }`
- CPU decision roles: `RECEIVE | SET | APPROACH | BLOCK | COVER | SERVE`.
- All AI consumes observable `MatchState` plus existing difficulty parameters only.

- [ ] **Step 1: Write RED teammate-defense integration tests**

Add a rally where an opponent serve lands in HINA's assigned lane and KAI is not the receiver. The test must show HINA contacting the ball and REN becoming the second-touch setter without changing `focusPlayerId` from `home-0`.

- [ ] **Step 2: Write RED CPU three-touch tests**

Create a deterministic away-side rally fixture and assert:

```ts
expect(events).toContain('RECEIVE');
expect(events).toContain('SET');
expect(events).toContain('SPIKE');
```

The CPU must never read `ReworkInput` or raw pointer values.

- [ ] **Step 3: Implement teammate automatic receive**

When `decideTeammateRoles()` assigns HINA or REN to `RECEIVE`, move that player toward the predicted landing point. If the ball enters legal contact range, call existing `performReceive()` using that character's ability and a deterministic timing offset derived from difficulty-neutral teammate skill. Emit a rework receive event.

- [ ] **Step 4: Implement CPU role decisions**

Use existing `DIFFICULTY_PROFILES` for reaction delay/prediction error only. Preserve SHIN/GOU/YU character abilities. Typical sequence:

- incoming home serve/spike -> best eligible receiver
- first touch -> YU sets unless YU was first toucher, then SHIN emergency sets
- set -> SHIN/GOU approaches
- home set/spike -> GOU/SHIN block assignment

- [ ] **Step 5: Execute CPU contacts in `runtime.ts`**

The new rework runtime owns the CPU action sequence. Do not call the old switching `matchRuntime`. Reuse pure `performReceive`, `performSet`, `performSpike`, `performBlock`, `performServe`, and `stepMatch`.

- [ ] **Step 6: Verify a rally can cross the net multiple times**

Run a deterministic integration test for at least:

`home RECEIVE -> home SET -> home SPIKE -> away RECEIVE -> away SET -> away SPIKE`

The rally must remain `RALLY` until a floor/out result resolves a point.

- [ ] **Step 7: Commit**

```bash
git add src/game/rework tests/integration/game/reworkRuntime.test.ts tests/unit/game/rework/cpuAI.test.ts
git commit -m "feat: complete 2.5d rally ai loop"
```

## Execution order change

Complete this amendment immediately after the original Task 5 (block/serve runtime mechanics) and before the original rendering task. Do not route `App` to `ReworkMatchScreen` until this amendment's tests are green.
