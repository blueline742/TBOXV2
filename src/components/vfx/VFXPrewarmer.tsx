'use client'

import { useEffect, useRef } from 'react'
import { VFXEmitter } from 'wawa-vfx'
import { VFX_EMITTERS } from '@/utils/vfxPrewarmer'

/**
 * VFXPrewarmer - Prevents first-frame stutter when spells are cast
 *
 * Emits a tiny invisible burst from each particle system on mount
 * to force GPU shader compilation before actual gameplay
 */
export function VFXPrewarmer() {
  const hasWarmedUp = useRef(false)

  useEffect(() => {
    if (!hasWarmedUp.current) {
      hasWarmedUp.current = true
      console.log('[VFX] Warming up particle systems...')
    }
  }, [])

  // Don't render during warmup - these are just for shader compilation
  if (hasWarmedUp.current) {
    return null
  }

  return (
    <group position={[0, -1000, 0]}>
      {/* Render all emitters off-screen with minimal particles */}
      {VFX_EMITTERS.map((emitterName) => (
        <VFXEmitter
          key={emitterName}
          emitter={emitterName}
          autoStart={true}
          settings={{
            loop: false,
            duration: 0.1,
            nbParticles: 1, // Just 1 particle to compile the shader
            spawnMode: 'burst',
            particlesLifetime: [0.1, 0.1],
            startPositionMin: [0, 0, 0],
            startPositionMax: [0, 0, 0],
            directionMin: [0, 0, 0],
            directionMax: [0, 0, 0],
            size: [0.01, 0.01],
            speed: [0, 0],
            colorStart: ['#000000'],
            colorEnd: ['#000000'],
          }}
        />
      ))}
    </group>
  )
}
