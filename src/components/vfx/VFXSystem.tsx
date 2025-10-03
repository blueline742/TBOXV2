'use client';

import React, { forwardRef } from 'react';
import { VFXParticles, AppearanceMode, RenderMode } from 'wawa-vfx';
import * as THREE from 'three';

export interface VFXSystemRef {
  emitFireball: (position: THREE.Vector3, direction: THREE.Vector3) => void;
  emitLightning: (startPos: THREE.Vector3, endPos: THREE.Vector3) => void;
  emitExplosion: (position: THREE.Vector3, intensity?: number) => void;
  emitImpact: (position: THREE.Vector3, color?: string) => void;
  emitHeal: (position: THREE.Vector3) => void;
  emitBuff: (position: THREE.Vector3, color?: string) => void;
}

const VFXSystem = forwardRef<VFXSystemRef>(() => {
  // For now, we'll just set up the particle systems
  // The actual emission will be handled differently

  return (
    <>
      {/* Fireball particles */}
      <VFXParticles
        name="fireballTrail"
        settings={{
          nbParticles: 10000,
          gravity: [0, -2, 0],
          fadeSize: [0, 0.8],
          fadeAlpha: [0, 0.9],
          renderMode: RenderMode.Billboard,
          intensity: 5,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      <VFXParticles
        name="smokeTrail"
        settings={{
          nbParticles: 5000,
          gravity: [0, 1, 0],
          fadeSize: [0, 0.5],
          fadeAlpha: [0.2, 0.8],
          renderMode: RenderMode.Billboard,
          intensity: 1,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeInOutQuad",
          blendingMode: THREE.NormalBlending,
        }}
      />

      {/* Lightning particles */}
      <VFXParticles
        name="lightningSparks"
        settings={{
          nbParticles: 10000,
          gravity: [0, 0, 0],
          fadeSize: [0, 0.9],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.StretchBillboard,
          stretchScale: 3,
          intensity: 10,
          appearance: AppearanceMode.Square,
          easeFunction: "easeOutExpo",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Explosion particles */}
      <VFXParticles
        name="explosion"
        settings={{
          nbParticles: 10000,
          gravity: [0, -5, 0],
          fadeSize: [0, 0.7],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.Billboard,
          intensity: 8,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutCubic",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      <VFXParticles
        name="explosionSmoke"
        settings={{
          nbParticles: 5000,
          gravity: [0, 2, 0],
          fadeSize: [0, 0.3],
          fadeAlpha: [0.1, 0.9],
          renderMode: RenderMode.Billboard,
          intensity: 1,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeInOutQuad",
          blendingMode: THREE.NormalBlending,
        }}
      />

      {/* Impact particles */}
      <VFXParticles
        name="impact"
        settings={{
          nbParticles: 5000,
          gravity: [0, -10, 0],
          fadeSize: [0, 0.8],
          fadeAlpha: [0, 0.9],
          renderMode: RenderMode.Billboard,
          intensity: 3,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Heal particles */}
      <VFXParticles
        name="heal"
        settings={{
          nbParticles: 5000,
          gravity: [0, 0, 0],
          fadeSize: [0.2, 0.8],
          fadeAlpha: [0, 0.7],
          renderMode: RenderMode.Billboard,
          intensity: 3,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeInOutSine",
          blendingMode: THREE.AdditiveBlending,
          shadingHooks: {
            fragmentBeforeOutput: /* glsl */ `
              float pulse = 0.5 + 0.5 * sin(uTime * 5.0 + vProgress * 10.0);
              finalColor.rgb *= pulse;
              finalColor.g = 1.0;
            `,
          },
        }}
      />

      {/* Buff particles */}
      <VFXParticles
        name="buff"
        settings={{
          nbParticles: 2000,
          gravity: [0, 0, 0],
          fadeSize: [0.1, 0.9],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.Billboard,
          intensity: 4,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeInOutQuad",
          blendingMode: THREE.AdditiveBlending,
          shadingHooks: {
            fragmentBeforeOutput: /* glsl */ `
              float sparkle = 0.3 + 0.7 * sin(uTime * 20.0 + vProgress * 15.0);
              finalColor.rgb *= sparkle;
            `,
          },
        }}
      />

      {/* Bath Bomb particles */}
      <VFXParticles
        name="bathBombBurst"
        settings={{
          nbParticles: 5000,
          gravity: [0, -2, 0],
          fadeSize: [0.2, 0.8],
          fadeAlpha: [0, 0.9],
          renderMode: RenderMode.Billboard,
          intensity: 3,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      <VFXParticles
        name="bubbleStream"
        settings={{
          nbParticles: 3000,
          gravity: [0, 0, 0],
          fadeSize: [0.1, 0.7],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.Billboard,
          intensity: 2,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeInOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Duck Swarm particles */}
      <VFXParticles
        name="duckFeathers"
        settings={{
          nbParticles: 5000,
          gravity: [0, -1, 0],
          fadeSize: [0.1, 0.6],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.Billboard,
          intensity: 2,
          appearance: AppearanceMode.Square,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.NormalBlending,
        }}
      />

      {/* Extinction Protocol particles */}
      <VFXParticles
        name="rocketTrail"
        settings={{
          nbParticles: 10000,
          gravity: [0, 0, 0],
          fadeSize: [0.2, 0.9],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.StretchBillboard,
          stretchScale: 2,
          intensity: 6,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutCubic",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Water Squirt particles */}
      <VFXParticles
        name="waterDroplets"
        settings={{
          nbParticles: 5000,
          gravity: [0, -5, 0],
          fadeSize: [0.1, 0.6],
          fadeAlpha: [0, 0.7],
          renderMode: RenderMode.Billboard,
          intensity: 2,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.NormalBlending,
        }}
      />

      {/* Sword Strike particles */}
      <VFXParticles
        name="swordSlash"
        settings={{
          nbParticles: 3000,
          gravity: [0, 0, 0],
          fadeSize: [0.2, 0.8],
          fadeAlpha: [0, 0.9],
          renderMode: RenderMode.StretchBillboard,
          stretchScale: 1.5,
          intensity: 4,
          appearance: AppearanceMode.Square,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Whirlwind Slash particles */}
      <VFXParticles
        name="whirlwind"
        settings={{
          nbParticles: 3000,
          gravity: [0, 0, 0],
          fadeSize: [0.2, 0.8],
          fadeAlpha: [0, 0.9],
          renderMode: RenderMode.StretchBillboard,
          stretchScale: 1.5,
          intensity: 4,
          appearance: AppearanceMode.Square,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Chaos Shuffle particles */}
      <VFXParticles
        name="chaosSmoke"
        settings={{
          nbParticles: 10000,
          gravity: [0, 0.5, 0],
          fadeSize: [0.1, 0.6],
          fadeAlpha: [0.1, 0.9],
          renderMode: RenderMode.Billboard,
          intensity: 3,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      <VFXParticles
        name="chaosSparkles"
        settings={{
          nbParticles: 5000,
          gravity: [0, -2, 0],
          fadeSize: [0.1, 0.4],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.Billboard,
          intensity: 5,
          appearance: AppearanceMode.Square,
          easeFunction: "easeInOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Battery Drain particles */}
      <VFXParticles
        name="energyDrain"
        settings={{
          nbParticles: 5000,
          gravity: [0, 0, 0],
          fadeSize: [0.1, 0.5],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.StretchBillboard,
          stretchScale: 2,
          intensity: 4,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeInQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      {/* Ice Nova particles */}
      <VFXParticles
        name="iceBurst"
        settings={{
          nbParticles: 8000,
          gravity: [0, -2, 0],
          fadeSize: [0.2, 0.7],
          fadeAlpha: [0, 0.9],
          renderMode: RenderMode.Billboard,
          intensity: 6,
          appearance: AppearanceMode.Circular,
          easeFunction: "easeOutCubic",
          blendingMode: THREE.AdditiveBlending,
        }}
      />

      <VFXParticles
        name="iceShards"
        settings={{
          nbParticles: 6000,
          gravity: [0, -4, 0],
          fadeSize: [0.1, 0.4],
          fadeAlpha: [0, 0.8],
          renderMode: RenderMode.StretchBillboard,
          stretchScale: 2,
          intensity: 4,
          appearance: AppearanceMode.Square,
          easeFunction: "easeOutQuad",
          blendingMode: THREE.AdditiveBlending,
        }}
      />
    </>
  );
});

VFXSystem.displayName = 'VFXSystem';

export default VFXSystem;