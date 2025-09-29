import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Trail } from '@react-three/drei'

interface SimpleFireballProps {
  startPosition: [number, number, number]
  targetPosition: [number, number, number]
  duration?: number
  onComplete?: () => void
}

export function SimpleFireball({
  startPosition,
  targetPosition,
  duration = 1.5,
  onComplete
}: SimpleFireballProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const startTime = useRef<number>(Date.now())
  const trailRef = useRef<THREE.Mesh>(null)

  // console.log('[SIMPLE FIREBALL] Created:', { startPosition, targetPosition })

  useFrame(() => {
    if (!meshRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1.0)

    if (progress >= 1) {
      if (onComplete) {
        // console.log('[SIMPLE FIREBALL] Complete')
        onComplete()
      }
      return
    }

    // Interpolate position from start to target
    const startVec = new THREE.Vector3(...startPosition)
    const targetVec = new THREE.Vector3(...targetPosition)
    const currentPos = startVec.clone().lerp(targetVec, progress)

    // Add parabolic arc for natural trajectory
    currentPos.y += Math.sin(progress * Math.PI) * 1.0 // Arc height

    meshRef.current.position.copy(currentPos)

    // Pulsing scale effect
    const scale = 1 + Math.sin(elapsed * 10) * 0.2
    meshRef.current.scale.set(scale, scale, scale)
  })

  return (
    <>
      <Trail
        width={5}
        length={10}
        color={new THREE.Color(0xff6600)}
        attenuation={(width) => width}
      >
        <mesh ref={meshRef} position={startPosition}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#ff6600"
            emissive="#ff4400"
            emissiveIntensity={2}
            toneMapped={false}
          />
        </mesh>
      </Trail>

      {/* Add a glow effect */}
      <mesh position={meshRef.current?.position}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Point light for illumination */}
      <pointLight
        position={meshRef.current?.position}
        color="#ff6600"
        intensity={3}
        distance={5}
      />
    </>
  )
}