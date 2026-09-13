import * as THREE from 'three';
import type { CharacterDefinition } from '../characters/roster';
import type { PlayerState } from '../core/types';

const HEIGHT_SCALE: Record<CharacterDefinition['heightClass'], number> = {
  SHORT: 0.9,
  MEDIUM: 1,
  TALL: 1.08,
  VERY_TALL: 1.16,
};

export class PlayerView {
  readonly group = new THREE.Group();
  private readonly heightScale: number;

  constructor(
    readonly playerId: string,
    character: CharacterDefinition,
    side: 'home' | 'away',
  ) {
    this.heightScale = HEIGHT_SCALE[character.heightClass];
    const jerseyColor = side === 'home' ? 0x102b48 : 0x7a2027;
    const accentColor = new THREE.Color(character.accent);
    const skin = new THREE.MeshToonMaterial({ color: 0xe0ad87 });
    const jersey = new THREE.MeshToonMaterial({ color: jerseyColor });
    const accent = new THREE.MeshToonMaterial({ color: accentColor });
    const dark = new THREE.MeshToonMaterial({ color: 0x111923 });

    const torso = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.72, 5, 8),
      jersey,
    );
    torso.position.y = 1.22 * this.heightScale;
    torso.scale.y = this.heightScale;
    torso.castShadow = true;
    this.group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), skin);
    head.position.y = 2.02 * this.heightScale;
    head.castShadow = true;
    this.group.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.265, 10, 8), dark);
    hair.scale.set(1, 0.62, 1);
    hair.position.y = 2.14 * this.heightScale;
    this.group.add(hair);

    const shoulderStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.08, 0.34),
      accent,
    );
    shoulderStripe.position.y = 1.58 * this.heightScale;
    this.group.add(shoulderStripe);

    const limbGeometry = new THREE.CapsuleGeometry(0.09, 0.56, 4, 6);
    for (const x of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(limbGeometry, dark);
      leg.position.set(x, 0.48 * this.heightScale, 0);
      leg.scale.y = this.heightScale;
      leg.castShadow = true;
      this.group.add(leg);
    }

    this.group.rotation.y = side === 'home' ? 0 : Math.PI;
  }

  update(player: PlayerState): void {
    this.group.position.set(player.position.x, player.position.y, player.position.z);
    const airborneStretch = player.isAirborne ? 1.03 : 1;
    this.group.scale.set(airborneStretch, airborneStretch, airborneStretch);
  }
}
