import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FireballProps {
  startPosition: [number, number, number]
  targetPosition: [number, number, number]
  onComplete: () => void
  duration?: number
}

export function Fireball({ startPosition, targetPosition, onComplete, duration = 1 }: FireballProps) {
  const groupRef = useRef<THREE.Group>(null)
  const fireballRef = useRef<THREE.Group>(null)
  const trailRef = useRef<THREE.InstancedMesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const startTime = useRef(Date.now())
  const [exploded, setExploded] = useState(false)

  // Debug positions
  console.log('[FIREBALL DEBUG] Start:', startPosition, 'Target:', targetPosition)

  // Trail particles setup
  const trailCount = 30
  const trailPositions = useRef<THREE.Vector3[]>([])

  useEffect(() => {
    // Initialize trail positions
    for (let i = 0; i < trailCount; i++) {
      trailPositions.current.push(new THREE.Vector3(...startPosition))
    }
  }, [])

  useFrame(() => {
    if (!groupRef.current || !fireballRef.current || exploded) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1)

    // Calculate position along parabolic arc
    const start = new THREE.Vector3(...startPosition)
    const target = new THREE.Vector3(...targetPosition)

    // Linear interpolation for X and Z
    const currentX = start.x + (target.x - start.x) * progress
    const currentZ = start.z + (target.z - start.z) * progress

    // Parabolic arc for Y (goes up then down)
    const arcHeight = 2.0  // Higher arc to be visible from default camera angle
    const currentY = start.y + (target.y - start.y) * progress +
                    arcHeight * 4 * progress * (1 - progress)

    // Update fireball group position (not using initial position anymore)
    groupRef.current.position.set(currentX, currentY, currentZ)

    // Reset fireball local position since we're moving the group
    fireballRef.current.position.set(0, 0, 0)

    // Rotate fireball
    fireballRef.current.rotation.x += 0.1
    fireballRef.current.rotation.y += 0.15

    // Pulsing scale
    const scale = 1 + Math.sin(elapsed * 10) * 0.1
    fireballRef.current.scale.setScalar(scale)

    // Update light to follow the fireball
    if (lightRef.current) {
      lightRef.current.position.set(0, 0, 0)  // Light is relative to group now
      lightRef.current.intensity = 5 + Math.sin(elapsed * 20) * 2  // Brighter light
    }

    // Update trail particles
    if (trailRef.current) {
      trailPositions.current.unshift(new THREE.Vector3(currentX, currentY, currentZ))
      trailPositions.current.pop()

      const dummy = new THREE.Object3D()
      for (let i = 0; i < trailCount; i++) {
        const pos = trailPositions.current[i]
        dummy.position.copy(pos)

        // Add some randomness to trail
        dummy.position.x += (Math.random() - 0.5) * 0.1
        dummy.position.y += (Math.random() - 0.5) * 0.1
        dummy.position.z += (Math.random() - 0.5) * 0.1

        // Scale down trail particles based on age
        const trailScale = (1 - i / trailCount) * 0.5
        dummy.scale.setScalar(trailScale)

        dummy.updateMatrix()
        trailRef.current.setMatrixAt(i, dummy.matrix)
      }
      trailRef.current.instanceMatrix.needsUpdate = true
    }

    // Check if reached target
    if (progress >= 1) {
      setExploded(true)
      setTimeout(onComplete, 300) // Allow time for explosion
    }
  })

  return (
    <group ref={groupRef} position={startPosition}>
      {/* Main fireball group */}
      <group ref={fireballRef}>
        {/* Outer fireball - larger and brighter */}
        <mesh>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial
            color="#ff6600"
            emissive="#ff3300"
            emissiveIntensity={3}
            transparent
            opacity={0.95}
          />
        </mesh>

        {/* Inner core - larger */}
        <mesh>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshBasicMaterial
            color="#ffff00"
            transparent
            opacity={0.9}
            blending={2}
          />
        </mesh>

        {/* Extra glow layer */}
        <mesh>
          <sphereGeometry args={[0.6, 8, 8]} />
          <meshBasicMaterial
            color="#ff3300"
            transparent
            opacity={0.3}
            blending={2}
          />
        </mesh>
      </group>

      {/* Trail particles */}
      <instancedMesh ref={trailRef} args={[undefined, undefined, trailCount]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshBasicMaterial
          color="#ff4400"
          transparent
          opacity={0.6}
          blending={2}
        />
      </instancedMesh>

      {/* Dynamic light - brighter and warmer */}
      <pointLight
        ref={lightRef}
        color="#ff9900"
        intensity={8}
        distance={12}
      />

      {/* Explosion on impact - position is already at target via groupRef */}
      {exploded && (
        <>
          {/* Explosion sphere */}
          <mesh scale={[2, 2, 2]}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial
              color="#ff0000"
              transparent
              opacity={0.5}
              blending={2}
            />
          </mesh>
          {/* Explosion light */}
          <pointLight color="#ff3300" intensity={10} distance={10} />
        </>
      )}
    </group>
  )
}