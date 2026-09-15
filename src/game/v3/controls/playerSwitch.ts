import type { V3Vec2 } from '../types';

export interface SwitchCandidate {
  id: string;
  position: V3Vec2;
  maxSpeed: number;
  recoveryUntil?: number;
}

export interface ChooseReceiveControllerInput {
  players: readonly SwitchCandidate[];
  currentPlayerId: string;
  forecastCenter: V3Vec2;
  now: number;
  contactAt: number;
  minimumSwitchLeadSeconds?: number;
}

export interface ReceiveControllerChoice {
  playerId: string;
  leadSeconds: number;
}

function arrivalSeconds(player: SwitchCandidate, target: V3Vec2, now: number): number {
  const speed = Number.isFinite(player.maxSpeed) && player.maxSpeed > 0 ? player.maxSpeed : 0.001;
  const distance = Math.hypot(player.position.x - target.x, player.position.z - target.z);
  const recovery = Math.max(0, (player.recoveryUntil ?? 0) - now);
  return recovery + distance / speed;
}

export function chooseReceiveController(
  input: ChooseReceiveControllerInput,
): ReceiveControllerChoice {
  const secondsToContact = Math.max(0, input.contactAt - input.now);
  const minimumLead = input.minimumSwitchLeadSeconds ?? 0.55;
  const current = input.players.find((player) => player.id === input.currentPlayerId);

  const ranked = input.players
    .map((player) => ({
      player,
      leadSeconds: secondsToContact - arrivalSeconds(player, input.forecastCenter, input.now),
    }))
    .sort((a, b) => b.leadSeconds - a.leadSeconds || a.player.id.localeCompare(b.player.id));

  const best = ranked[0];
  if (!best) return { playerId: input.currentPlayerId, leadSeconds: 0 };
  if (best.player.id === input.currentPlayerId) {
    return { playerId: best.player.id, leadSeconds: best.leadSeconds };
  }

  if (best.leadSeconds < minimumLead && current) {
    const currentLead = secondsToContact - arrivalSeconds(current, input.forecastCenter, input.now);
    return { playerId: current.id, leadSeconds: currentLead };
  }

  return { playerId: best.player.id, leadSeconds: best.leadSeconds };
}
