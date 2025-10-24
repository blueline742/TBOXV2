import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXPuppetShowProps {
  targetPosition: [number, number, number]  // Ally becoming untargetable
  onComplete?: () => void
}

// Theater stage effect with curtains and spotlights making ally untargetable
export function VFXPuppetShow({ targetPosition, onComplete }: VFXPuppetShowProps) {
  const groupRef = useRef<THREE.Group>(null)
  const curtainLeftRef = useRef<THREE.Mesh>(null)
  const curtainRightRef = useRef<THREE.Mesh>(null)
  const spotlightRef = useRef<THREE.SpotLight>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 2.0

  useEffect(() => {
    if (onComplete && progress >= 1) {
      setTimeout(onComplete, 500)
    }
  }, [progress, onComplete])

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000
    const t = Math.min(elapsed / duration, 1)
    setProgress(t)

    if (groupRef.current) {
      // Spotlight rotation
      if (spotlightRef.current) {
        const swayAngle = Math.sin(state.clock.elapsedTime * 2) * 0.2
        spotlightRef.current.position.x = targetPosition[0] + Math.sin(swayAngle) * 0.5
        spotlightRef.current.target.position.set(
          targetPosition[0],
          targetPosition[1],
          targetPosition[2]
        )
        spotlightRef.current.target.updateMatrixWorld()
      }

      // Curtain animation (open during effect)
      if (curtainLeftRef.current && curtainRightRef.current) {
        const openAmount = Math.sin(t * Math.PI) * 1.2 // Opens then closes
        curtainLeftRef.current.position.x = -openAmount
        curtainRightRef.current.position.x = openAmount
      }
    }
  })

  return (
    <group ref={groupRef} position={targetPosition}>
      {/* Stage floor */}
      <mesh position={[0, -0.99, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial
          color="#8b4513"
          emissive="#4a2409"
          emissiveIntensity={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Red curtains */}
      <mesh
        ref={curtainLeftRef}
        position={[-0.5, 1, -0.5]}
      >
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial
          color="#8b0000"
          emissive="#4a0000"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh
        ref={curtainRightRef}
        position={[0.5, 1, -0.5]}
      >
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial
          color="#8b0000"
          emissive="#4a0000"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Spotlight from above */}
      <spotLight
        ref={spotlightRef}
        position={[0, 3, 0]}
        angle={0.3}
        penumbra={0.5}
        intensity={progress * 5}
        color="#ffff99"
        castShadow
      />

      {/* Stage lights ring */}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const radius = 1.2
        const flicker = Math.sin(Date.now() * 0.01 + i * 2) * 0.3 + 0.7
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              -0.8,
              Math.sin(angle) * radius
            ]}
          >
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshBasicMaterial
              color="#ffff00"
              transparent
              opacity={progress * flicker}
            />
          </mesh>
        )
      })}

      {/* Protective theater barrier */}
      <mesh rotation={[0, Date.now() * 0.001, 0]}>
        <torusGeometry args={[1.5, 0.05, 8, 32]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={progress * 0.3}
        />
      </mesh>

      {/* Sparkles around the protected ally */}
      {progress > 0.3 && Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + Date.now() * 0.001
        const radius = 0.8 + Math.sin(Date.now() * 0.003 + i) * 0.2
        const height = Math.sin(Date.now() * 0.002 + i * 0.5) * 0.5 + 0.5
        return (
          <mesh
            key={`sparkle-${i}`}
            position={[
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius
            ]}
          >
            <octahedronGeometry args={[0.05]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={(progress - 0.3) * 1.5}
            />
          </mesh>
        )
      })}

      {/* "SHOWTIME" text effect (using simple geometry) */}
      {progress > 0.5 && (
        <group position={[0, 2, 0]}>
          <mesh>
            <planeGeometry args={[1.5, 0.3]} />
            <meshBasicMaterial
              color="#ffd700"
              transparent
              opacity={(progress - 0.5) * 2}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Audience applause effect (small clapping particles) */}
      {progress > 0.7 && Array.from({ length: 20 }, (_, i) => {
        const x = (Math.random() - 0.5) * 3
        const z = 1 + Math.random() * 2
        const y = -0.5 + Math.random() * 0.5
        return (
          <mesh
            key={`applause-${i}`}
            position={[x, y, z]}
          >
            <sphereGeometry args={[0.03, 4, 4]} />
            <meshBasicMaterial
              color="#ffcccc"
              transparent
              opacity={(progress - 0.7) * 2}
            />
          </mesh>
        )
      })}

      {/* Main protective glow */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={progress * 0.15}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}