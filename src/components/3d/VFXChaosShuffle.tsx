import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VFXEmitter, VFXParticles } from 'wawa-vfx'

interface VFXChaosShuffleProps {
  position: [number, number, number]
  enemyPositions?: [number, number, number][]
  onComplete?: () => void
}

export function VFXChaosShuffle({ position, enemyPositions = [], onComplete }: VFXChaosShuffleProps) {
  const groupRef = useRef<THREE.Group>(null)
  const smokeRef = useRef<THREE.Mesh>(null)
  const duration = 2.5

  console.log('[CHAOS SHUFFLE VFX] Enemy positions received:', enemyPositions)

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, duration * 1000)

    return () => clearTimeout(timer)
  }, [onComplete, duration])

  const startTime = useRef(Date.now())

  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1)

    // Animate central smoke/portal effect
    if (smokeRef.current) {
      smokeRef.current.rotation.y = elapsed * 2
      smokeRef.current.material.opacity = 0.5 * (1 - progress)
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.5
    }
  })

  return (
    <group ref={groupRef} position={[0, 1, 0]}>
      {/* Central rotating smoke portal */}
      <mesh ref={smokeRef} rotation={[0, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[1.5, 0.5, 16, 100]} />
        <meshStandardMaterial
          color={0xff00ff}
          emissive={0xff00ff}
          emissiveIntensity={2}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Purple/mystical smoke clouds using wawa-vfx - centered on torus */}
      <VFXEmitter
        position={[0, 0, 0]}
        startSize={1}
        endSize={3}
        particleCount={300}
        lifetime={2.5}
        velocity={[0, 2, 0]}
        velocityRandomness={2}
        color={new THREE.Color(0x8844ff)}
        endColor={new THREE.Color(0xff44ff)}
        gravity={[0, 0.5, 0]}
        fadeIn={0.1}
        fadeOut={0.8}
      />

      {/* Swirling magic particles - centered on torus */}
      <VFXParticles
        particleCount={500}
        startPosition={[0, 0, 0]}
        endPosition={[0, 2, 0]}
        startSize={0.3}
        endSize={0.05}
        lifetime={2}
        velocity={[0, 0, 0]}
        velocityRandomness={5}
        startColor={new THREE.Color(0xff00ff)}
        endColor={new THREE.Color(0x8800ff)}
        opacity={0.8}
        fadeOut={0.7}
        blending={THREE.AdditiveBlending}
      />

      {/* Individual smoke effects at each enemy position */}
      {enemyPositions.length > 0 && enemyPositions.map((pos, index) => {
        // Calculate relative position from center (group is at [0, 1, 0])
        const relativePos: [number, number, number] = [pos[0], pos[1] - 1, pos[2]]

        return (
          <group key={index} position={relativePos}>
            {/* Purple smoke puff at each card */}
            <VFXEmitter
              position={[0, 0, 0]}
              startSize={0.8}
              endSize={2}
              particleCount={100}
              lifetime={2}
              velocity={[0, 1, 0]}
              velocityRandomness={1.5}
              color={new THREE.Color(0xaa44ff)}
              endColor={new THREE.Color(0xff88ff)}
              gravity={[0, 0.2, 0]}
              fadeIn={0.1}
              fadeOut={0.6}
              delay={index * 0.1}
            />

            {/* Sparkles */}
            <VFXParticles
              particleCount={50}
              startPosition={[0, 0, 0]}
              endPosition={[0, 1.5, 0]}
              startSize={0.2}
              endSize={0.05}
              lifetime={1.5}
              velocity={[0, 0, 0]}
              velocityRandomness={2}
              startColor={new THREE.Color(0xffffff)}
              endColor={new THREE.Color(0xff44ff)}
              opacity={1}
              fadeOut={0.5}
              blending={THREE.AdditiveBlending}
              delay={index * 0.1}
            />

            {/* Glow sphere */}
            <pointLight
              position={[0, 0.5, 0]}
              color={0xff00ff}
              intensity={5}
              distance={3}
            />
          </group>
        )
      })}

      {/* Central mystical light */}
      <pointLight
        position={[0, 1, 0]}
        color={0xff00ff}
        intensity={20}
        distance={15}
      />
    </group>
  )
}