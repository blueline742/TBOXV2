import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
// import { Fireball } from 'wawa-vfx' // Not exported by wawa-vfx

interface WawaFireballProps {
  startPosition: [number, number, number]
  targetPosition: [number, number, number]
  duration?: number
  onComplete?: () => void
}

export function WawaFireball({
  startPosition,
  targetPosition,
  duration = 1.5,
  onComplete
}: WawaFireballProps) {
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef<number>(Date.now())

  // console.log('[WAWA FIREBALL] Created:', { startPosition, targetPosition })

  useFrame(() => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1.0)

    if (progress >= 1) {
      if (onComplete) {
        // console.log('[WAWA FIREBALL] Complete')
        onComplete()
      }
      return
    }

    // Interpolate position from start to target
    const startVec = new THREE.Vector3(...startPosition)
    const targetVec = new THREE.Vector3(...targetPosition)
    const currentPos = startVec.clone().lerp(targetVec, progress)

    // Add parabolic arc for natural trajectory
    currentPos.y += Math.sin(progress * Math.PI) * 1.5 // Higher arc

    groupRef.current.position.copy(currentPos)

    // Point fireball towards target
    const direction = targetVec.clone().sub(currentPos).normalize()
    groupRef.current.lookAt(
      currentPos.x + direction.x,
      currentPos.y + direction.y,
      currentPos.z + direction.z
    )
  })

  return (
    <group ref={groupRef} position={startPosition}>
      {/* Fireball component not available in wawa-vfx */}
      {/* <Fireball
        scale={[0.5, 0.5, 0.5]}
        speed={2}
        opacity={1}
        color="#ff6600"
      /> */}
      {/* Placeholder - simple sphere */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color="#ff6600"
          emissive="#ff3300"
          emissiveIntensity={2}
        />
      </mesh>
    </group>
  )
}