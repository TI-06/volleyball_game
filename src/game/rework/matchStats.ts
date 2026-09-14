import type { ReworkEvent } from './types';

export interface ReworkMatchStats {
  highestSpikeKmh: number;
  perfectCount: number;
  spikeKills: number;
  blockPoints: number;
  perfectPasses: number;
  longestRally: number;
  currentRallyContacts: number;
  pendingHomeFinisher: 'SPIKE' | 'BLOCK' | null;
}

const CONTACT_EVENTS = new Set<ReworkEvent['type']>([
  'SERVE',
  'RECEIVE',
  'SET',
  'SPIKE',
  'BLOCK',
]);

function isAwayActor(event: ReworkEvent): boolean {
  return event.actorId?.startsWith('away-') ?? false;
}

export function createReworkMatchStats(): ReworkMatchStats {
  return {
    highestSpikeKmh: 0,
    perfectCount: 0,
    spikeKills: 0,
    blockPoints: 0,
    perfectPasses: 0,
    longestRally: 0,
    currentRallyContacts: 0,
    pendingHomeFinisher: null,
  };
}

export function recordReworkEvent(
  source: ReworkMatchStats,
  event: ReworkEvent,
): ReworkMatchStats {
  const next: ReworkMatchStats = { ...source };

  if (CONTACT_EVENTS.has(event.type)) {
    next.currentRallyContacts += 1;
  }

  if (event.actorId === 'home-0' && event.quality === 'PERFECT') {
    next.perfectCount += 1;
  }

  if (event.type === 'RECEIVE' && event.actorId === 'home-0' && event.quality === 'PERFECT') {
    next.perfectPasses += 1;
  }

  if (event.type === 'SPIKE' && event.actorId === 'home-0') {
    next.pendingHomeFinisher = 'SPIKE';
    if (event.value) {
      next.highestSpikeKmh = Math.max(next.highestSpikeKmh, event.value);
    }
  } else if (event.type === 'BLOCK' && event.actorId === 'home-0') {
    next.pendingHomeFinisher = 'BLOCK';
  } else if (isAwayActor(event) && CONTACT_EVENTS.has(event.type)) {
    next.pendingHomeFinisher = null;
  }

  if (event.type === 'POINT') {
    next.longestRally = Math.max(next.longestRally, next.currentRallyContacts);
    if ((event.value ?? 0) > 0) {
      if (next.pendingHomeFinisher === 'SPIKE') next.spikeKills += 1;
      if (next.pendingHomeFinisher === 'BLOCK') next.blockPoints += 1;
    }
    next.currentRallyContacts = 0;
    next.pendingHomeFinisher = null;
  }

  return next;
}
