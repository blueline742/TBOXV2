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
      console.log('[VFX] Warming up particle systems...')
      // Set warmup complete after emitters have had time to render and compile shaders
      const timer = setTimeout(() => {
        hasWarmedUp.current = true
        console.log('[VFX] Warmup complete - shaders should be compiled')
      }, 2000) // Increased from 500ms to 2000ms to ensure all shaders compile
      return () => clearTimeout(timer)
    }
  }, [])

  // Stop rendering after warmup is complete
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
            duration: 0.5,
            nbParticles: 10, // More particles to trigger all shader paths
            spawnMode: 'burst',
            particlesLifetime: [0.1, 0.2],
            startPositionMin: [0, 0, 0],
            startPositionMax: [0.1, 0.1, 0.1],
            directionMin: [0, 0, 0],
            directionMax: [0.1, 0.1, 0.1],
            size: [0.05, 0.1],
            speed: [0.1, 0.5],
            colorStart: ['#ffffff'],
            colorEnd: ['#000000'],
          }}
        />
      ))}
    </group>
  )
}
