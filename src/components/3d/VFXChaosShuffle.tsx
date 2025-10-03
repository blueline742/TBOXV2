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
      if (!Array.isArray(smokeRef.current.material) && 'opacity' in smokeRef.current.material) {
        smokeRef.current.material.opacity = 0.5 * (1 - progress)
      }
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

      {/* Purple/mystical smoke clouds */}
      <VFXEmitter
        emitter="chaosSmoke"
        autoStart={true}
        settings={{
          loop: false,
          duration: 2.5,
          nbParticles: 300,
          spawnMode: "time",
          particlesLifetime: [2, 2.5],
          startPositionMin: [0, 0, 0],
          startPositionMax: [0, 0, 0],
          directionMin: [-2, 1, -2],
          directionMax: [2, 3, 2],
          size: [1, 3],
          speed: [1, 2],
          colorStart: ["#8844ff", "#aa44ff"],
          colorEnd: ["#ff44ff", "#ff88ff"],
        }}
      />

      {/* Swirling magic sparkles */}
      <VFXEmitter
        emitter="chaosSparkles"
        autoStart={true}
        settings={{
          loop: false,
          duration: 2,
          nbParticles: 500,
          spawnMode: "time",
          particlesLifetime: [1.5, 2],
          startPositionMin: [-0.5, 0, -0.5],
          startPositionMax: [0.5, 0, 0.5],
          directionMin: [-5, 0, -5],
          directionMax: [5, 2, 5],
          size: [0.05, 0.3],
          speed: [2, 5],
          colorStart: ["#ff00ff", "#ffffff"],
          colorEnd: ["#8800ff", "#ff44ff"],
        }}
      />

      {/* Individual smoke effects at each enemy position */}
      {enemyPositions.length > 0 && enemyPositions.map((pos, index) => {
        // Calculate relative position from center (group is at [0, 1, 0])
        const relativePos: [number, number, number] = [pos[0], pos[1] - 1, pos[2]]

        return (
          <group key={index} position={relativePos}>
            {/* Purple smoke puff at card */}
            <VFXEmitter
              emitter="chaosSmoke"
              autoStart={true}
              settings={{
                loop: false,
                duration: 2,
                nbParticles: 100,
                spawnMode: "burst",
                particlesLifetime: [1.5, 2],
                startPositionMin: [0, 0, 0],
                startPositionMax: [0, 0, 0],
                directionMin: [-1.5, 0.5, -1.5],
                directionMax: [1.5, 1.5, 1.5],
                size: [0.8, 2],
                speed: [0.5, 1.5],
                colorStart: ["#aa44ff", "#8844ff"],
                colorEnd: ["#ff88ff", "#ff44ff"],
                delay: index * 0.1,
              }}
            />

            {/* Sparkles around card */}
            <VFXEmitter
              emitter="chaosSparkles"
              autoStart={true}
              settings={{
                loop: false,
                duration: 1.5,
                nbParticles: 50,
                spawnMode: "time",
                particlesLifetime: [1, 1.5],
                startPositionMin: [-0.2, 0, -0.2],
                startPositionMax: [0.2, 0, 0.2],
                directionMin: [-2, 0, -2],
                directionMax: [2, 1.5, 2],
                size: [0.05, 0.2],
                speed: [1, 3],
                colorStart: ["#ffffff", "#ff00ff"],
                colorEnd: ["#ff44ff", "#8800ff"],
                delay: index * 0.1,
              }}
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