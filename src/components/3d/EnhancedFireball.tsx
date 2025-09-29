import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Trail, Points } from '@react-three/drei'

interface EnhancedFireballProps {
  startPosition: [number, number, number]
  targetPosition: [number, number, number]
  duration?: number
  onComplete?: () => void
}

export function EnhancedFireball({
  startPosition,
  targetPosition,
  duration = 1.5,
  onComplete
}: EnhancedFireballProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef<number>(Date.now())
  const trailRef = useRef<THREE.Mesh>(null)
  const fireParticlesRef = useRef<THREE.Points>(null)
  const smokeParticlesRef = useRef<THREE.Points>(null)
  const explosionParticlesRef = useRef<THREE.Points>(null)
  const debrisParticlesRef = useRef<THREE.Points>(null)
  const shockwaveRef = useRef<THREE.Mesh>(null)
  const hasExploded = useRef(false)

  // console.log('[ENHANCED FIREBALL] Created:', { startPosition, targetPosition })

  // Generate fire particle positions (small flames around the fireball)
  const fireParticlePositions = useMemo(() => {
    const positions: Float32Array = new Float32Array(50 * 3) // 50 fire particles
    let index = 0

    for (let i = 0; i < 50; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = 0.2 + Math.random() * 0.3

      positions[index++] = Math.sin(phi) * Math.cos(theta) * radius
      positions[index++] = Math.sin(phi) * Math.sin(theta) * radius
      positions[index++] = Math.cos(phi) * radius
    }

    return positions
  }, [])

  // Generate smoke trail particle positions
  const smokeParticlePositions = useMemo(() => {
    const positions: Float32Array = new Float32Array(30 * 3) // 30 smoke particles
    let index = 0

    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30
      const radius = Math.random() * 0.4

      positions[index++] = Math.cos(angle) * radius
      positions[index++] = Math.random() * 0.2
      positions[index++] = Math.sin(angle) * radius
    }

    return positions
  }, [])

  // Generate explosion particle positions
  const explosionParticlePositions = useMemo(() => {
    const positions: Float32Array = new Float32Array(150 * 3) // 150 explosion particles
    let index = 0

    for (let i = 0; i < 150; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const radius = 0.1

      positions[index++] = Math.sin(phi) * Math.cos(theta) * radius
      positions[index++] = Math.sin(phi) * Math.sin(theta) * radius
      positions[index++] = Math.cos(phi) * radius
    }

    return positions
  }, [])

  // Generate debris particle positions (chunks flying outward)
  const debrisParticlePositions = useMemo(() => {
    const positions: Float32Array = new Float32Array(50 * 3) // 50 debris chunks
    let index = 0

    for (let i = 0; i < 50; i++) {
      // Start from ground level
      positions[index++] = 0
      positions[index++] = 0
      positions[index++] = 0
    }

    return positions
  }, [])

  useFrame(() => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1.0)

    // Interpolate position from start to target
    const startVec = new THREE.Vector3(...startPosition)
    const targetVec = new THREE.Vector3(...targetPosition)
    const currentPos = startVec.clone().lerp(targetVec, progress)

    // Add parabolic arc for natural trajectory
    currentPos.y += Math.sin(progress * Math.PI) * 1.2 // Higher arc

    groupRef.current.position.copy(currentPos)

    // Rotate fireball
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.05
      meshRef.current.rotation.y += 0.08
      meshRef.current.rotation.z += 0.03

      // Pulsing scale effect
      const scale = 1 + Math.sin(elapsed * 15) * 0.2
      meshRef.current.scale.set(scale, scale, scale)
    }

    // Animate fire particles around the fireball
    if (fireParticlesRef.current) {
      const positions = fireParticlesRef.current.geometry.attributes.position
      const basePositions = fireParticlePositions

      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3
        const time = elapsed * 5 + i * 0.1
        const wobble = 0.1

        positions.array[i3] = basePositions[i3] + Math.sin(time) * wobble
        positions.array[i3 + 1] = basePositions[i3 + 1] + Math.cos(time * 1.3) * wobble
        positions.array[i3 + 2] = basePositions[i3 + 2] + Math.sin(time * 0.7) * wobble
      }

      positions.needsUpdate = true

      // Rotate entire particle system
      fireParticlesRef.current.rotation.y += 0.02
    }

    // Animate smoke trail particles
    if (smokeParticlesRef.current) {
      const positions = smokeParticlesRef.current.geometry.attributes.position
      const basePositions = smokeParticlePositions

      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3
        const drift = elapsed * 0.5

        positions.array[i3] = basePositions[i3] + (Math.random() - 0.5) * drift
        positions.array[i3 + 1] = basePositions[i3 + 1] - drift // Rise up
        positions.array[i3 + 2] = basePositions[i3 + 2] + (Math.random() - 0.5) * drift
      }

      positions.needsUpdate = true

      // Fade smoke over time
      if (smokeParticlesRef.current.material instanceof THREE.PointsMaterial) {
        smokeParticlesRef.current.material.opacity = Math.max(0, 0.3 - progress * 0.3)
      }
    }

    // Trigger explosion at the end
    if (progress >= 0.9 && !hasExploded.current) {
      hasExploded.current = true
      // console.log('[ENHANCED FIREBALL] Exploding!')
    }

    // Animate explosion particles
    if (explosionParticlesRef.current && hasExploded.current) {
      const positions = explosionParticlesRef.current.geometry.attributes.position
      const basePositions = explosionParticlePositions
      const explosionProgress = (progress - 0.9) / 0.1 // 0 to 1 in last 10% of animation

      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3
        const expansion = explosionProgress * 4 // Expand outward faster

        // Get direction from center
        const dirX = basePositions[i3]
        const dirY = basePositions[i3 + 1]
        const dirZ = basePositions[i3 + 2]

        positions.array[i3] = targetVec.x + dirX * expansion
        positions.array[i3 + 1] = targetVec.y + dirY * expansion + Math.abs(dirY) * explosionProgress * 2
        positions.array[i3 + 2] = targetVec.z + dirZ * expansion
      }

      positions.needsUpdate = true

      // Fade explosion
      if (explosionParticlesRef.current.material instanceof THREE.PointsMaterial) {
        explosionParticlesRef.current.material.opacity = Math.max(0, 1 - explosionProgress * 1.5)
      }

      // Show explosion particles
      explosionParticlesRef.current.visible = true
    }

    // Animate debris particles (chunks flying outward and falling)
    if (debrisParticlesRef.current && hasExploded.current) {
      const positions = debrisParticlesRef.current.geometry.attributes.position
      const explosionProgress = (progress - 0.9) / 0.1

      for (let i = 0; i < positions.count / 3; i++) {
        const i3 = i * 3
        const angle = (Math.PI * 2 * i) / (positions.count / 3)
        const speed = 3 + Math.random() * 2
        const horizontalExpansion = explosionProgress * speed

        // Debris flies outward and falls with gravity
        positions.array[i3] = targetVec.x + Math.cos(angle) * horizontalExpansion
        positions.array[i3 + 1] = targetVec.y + explosionProgress * 2 - (explosionProgress * explosionProgress) * 4 // Arc trajectory
        positions.array[i3 + 2] = targetVec.z + Math.sin(angle) * horizontalExpansion
      }

      positions.needsUpdate = true

      // Fade debris
      if (debrisParticlesRef.current.material instanceof THREE.PointsMaterial) {
        debrisParticlesRef.current.material.opacity = Math.max(0, 1 - explosionProgress)
      }

      debrisParticlesRef.current.visible = true
    }

    // Animate shockwave
    if (shockwaveRef.current && hasExploded.current) {
      const explosionProgress = (progress - 0.9) / 0.1
      const scale = explosionProgress * 5 // Expand quickly

      shockwaveRef.current.scale.set(scale, 0.1, scale)
      shockwaveRef.current.position.copy(targetVec)

      if (shockwaveRef.current.material instanceof THREE.MeshBasicMaterial) {
        shockwaveRef.current.material.opacity = Math.max(0, 0.5 - explosionProgress * 0.5)
      }

      shockwaveRef.current.visible = true
    }

    if (progress >= 1) {
      if (onComplete) {
        // console.log('[ENHANCED FIREBALL] Complete')
        onComplete()
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Fire trail effect */}
      <Trail
        width={6}
        length={12}
        color={new THREE.Color(0xff6600)}
        attenuation={(width) => width * 0.8}
      >
        {/* Main fireball core */}
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color="#ff4400"
            emissive="#ff2200"
            emissiveIntensity={3}
            toneMapped={false}
          />
        </mesh>
      </Trail>

      {/* Fire particles around the fireball */}
      <Points ref={fireParticlesRef} positions={fireParticlePositions}>
        <pointsMaterial
          color="#ffaa00"
          size={0.08}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation={true}
        />
      </Points>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer glow */}
      <mesh>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshBasicMaterial
          color="#ff8800"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Smoke trail particles */}
      <Points ref={smokeParticlesRef} positions={smokeParticlePositions}>
        <pointsMaterial
          color="#444444"
          size={0.15}
          transparent
          opacity={0.3}
          blending={THREE.NormalBlending}
          depthWrite={false}
          sizeAttenuation={true}
        />
      </Points>

      {/* Point light for illumination */}
      <pointLight
        color="#ff6600"
        intensity={5}
        distance={8}
      />

      {/* Explosion particles (initially hidden) */}
      <Points
        ref={explosionParticlesRef}
        positions={explosionParticlePositions}
        visible={false}
      >
        <pointsMaterial
          color="#ffff00"
          size={0.12}
          transparent
          opacity={1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation={true}
        />
      </Points>

      {/* Explosion flash light */}
      {hasExploded.current && (
        <pointLight
          position={targetPosition}
          color="#ffaa00"
          intensity={20}
          distance={10}
        />
      )}
    </group>
  )
}