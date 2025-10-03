/**
 * VFX Prewarmer - Prevents stuttering on first spell cast
 *
 * The issue: When a VFX effect plays for the first time, the GPU needs to:
 * 1. Compile shaders (causes stutter)
 * 2. Allocate particle buffers (causes stutter)
 *
 * Solution: Emit a tiny burst from each particle system at game start
 * to force shader compilation and buffer allocation before gameplay.
 */

export interface VFXPrewarmerRef {
  warmupAllEffects: () => void
}

// List of all particle system emitters that need prewarming
export const VFX_EMITTERS = [
  // Core effects
  'fireballTrail',
  'smokeTrail',
  'lightningSparks',
  'explosion',
  'explosionSmoke',
  'impact',
  'heal',
  'buff',

  // Spell effects
  'bathBombBurst',
  'bubbleStream',
  'duckFeathers',
  'rocketTrail',
  'waterDroplets',
  'swordSlash',
  'whirlwind',
  'chaosSmoke',
  'chaosSparkles',
  'energyDrain',
  'iceBurst',
  'iceShards',
] as const

export type VFXEmitterName = typeof VFX_EMITTERS[number]
