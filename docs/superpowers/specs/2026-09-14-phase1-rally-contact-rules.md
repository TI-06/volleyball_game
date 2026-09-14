# Phase 1 rally contact rules

This document supplements the Phase 1 core game design with the authoritative contact-state rules used by the playable prototype.

## Contact state

The ball remembers the most recent successful contact type:

- `SERVE`
- `RECEIVE`
- `DIVE`
- `SET`
- `SPIKE`
- `BLOCK`

A missed action does not replace the previous successful contact type.

## Three-touch flow

The normal attack flow is:

`RECEIVE / DIVE / BLOCK -> SET -> SPIKE`

The prototype does not resolve plays from character stats automatically. The contact state only determines which manual action or AI role is legal next.

## Emergency second touch

Every character can perform a basic set. The designated setter is preferred, but the rally must remain playable when the setter makes the first touch.

After a successful `RECEIVE`, `DIVE`, or `BLOCK`:

1. The first toucher cannot immediately take the second touch.
2. The remaining two players are evaluated for the second touch.
3. Set ability is the primary skill factor.
4. A designated setter receives a moderate role bonus.
5. Distance to the expected set zone is also considered so an unreachable setter is not selected blindly.
6. The selected second-touch player moves to the set zone while the remaining attacker starts an approach or cover route.

Examples:

- HINA receives -> REN is normally the second-touch setter.
- REN receives -> HINA normally becomes the emergency setter because her Set ability is higher than KAI's.
- YU receives -> SHIN normally becomes the rival emergency setter because his Set ability is higher than GOU's.

After the actual `SET`, control/AI transitions to the projected attacker. Standard/Casual auto-switch uses the short attack handoff delay rather than the normal receive-to-set warning delay.

## Block legality

A defender may prepare to jump while reading an opponent `SET`, but actual `BLOCK` contact is legal only after the opponent has made a `SPIKE` contact.

Therefore:

- a serve cannot be blocked;
- a set itself cannot be blocked as an attack;
- a blocker may jump during the set and make contact after the spike;
- CPU and player use the same rule.

## CPU fairness

CPU role selection is based only on observable match state: player positions, ball position/velocity, contact state, character abilities, and prior visible tendencies. It never reads raw player input.

CPU attack and block execution also use a real jump state before contact. Reaction delays from the selected difficulty remain in force during emergency second-touch and attack transitions.
