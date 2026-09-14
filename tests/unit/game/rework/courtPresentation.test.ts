import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ReworkCourtView } from '../../../../src/game/rework/render/ReworkCourtView';

describe('rework court presentation', () => {
  it('builds a readable indoor gym shell around the playable court', () => {
    const court = new ReworkCourtView();
    const names = new Set<string>();
    court.group.traverse((object: THREE.Object3D) => {
      if (object.name) names.add(object.name);
    });

    expect(names).toContain('gym-floor-surround');
    expect(names).toContain('gym-back-wall');
    expect(names).toContain('gym-bleachers-left');
    expect(names).toContain('gym-bleachers-right');
    expect(names).toContain('gym-scoreboard');
    expect([...names].filter((name) => name.startsWith('gym-ceiling-light-')).length).toBeGreaterThanOrEqual(4);

    court.dispose();
  });
});
