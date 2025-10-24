import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXMedicationProps {
  targetPosition: [number, number, number]
  onComplete?: () => void
}

// Medical cross and healing particles for medication effect
export function VFXMedication({ targetPosition, onComplete }: VFXMedicationProps) {
  const groupRef = useRef<THREE.Group>(null)
  const crossRef = useRef<THREE.Group>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 2.0

  useEffect(() => {
    if (onComplete && progress >= 1) {
      setTimeout(onComplete, 300)
    }
  }, [progress, onComplete])

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000
    const t = Math.min(elapsed / duration, 1)
    setProgress(t)

    if (crossRef.current) {
      // Rotate the medical cross
      crossRef.current.rotation.y = state.clock.elapsedTime * 2

      // Pulse effect
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5) * 0.1
      crossRef.current.scale.set(pulse, pulse, pulse)
    }
  })

  return (
    <group ref={groupRef} position={targetPosition}>
      {/* Medical cross symbol */}
      <group ref={crossRef}>
        {/* Vertical bar */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.1, 0.6, 0.1]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={progress * 0.8} />
        </mesh>
        {/* Horizontal bar */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.4, 0.1, 0.1]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={progress * 0.8} />
        </mesh>
      </group>

      {/* Healing particles floating upward */}
      {Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2
        const radius = 0.5 + Math.random() * 0.3
        const height = (Date.now() * 0.001 + i * 0.2) % 2
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius
            ]}
          >
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial
              color="#00ff88"
              transparent
              opacity={progress * 0.6 * (1 - height / 2)}
            />
          </mesh>
        )
      })}

      {/* Pill capsules orbiting */}
      {Array.from({ length: 3 }, (_, i) => {
        const angle = (i / 3) * Math.PI * 2 + Date.now() * 0.002
        const radius = 0.8
        return (
          <group
            key={`pill-${i}`}
            position={[
              Math.cos(angle) * radius,
              0.5 + Math.sin(Date.now() * 0.003 + i) * 0.2,
              Math.sin(angle) * radius
            ]}
            rotation={[0, angle, Math.PI / 4]}
          >
            {/* Pill capsule shape */}
            <mesh>
              <capsuleGeometry args={[0.06, 0.15, 4, 8]} />
              <meshStandardMaterial
                color={i % 2 === 0 ? '#ff0000' : '#0000ff'}
                emissive={i % 2 === 0 ? '#ff0000' : '#0000ff'}
                emissiveIntensity={0.2}
                transparent
                opacity={progress * 0.9}
              />
            </mesh>
          </group>
        )
      })}

      {/* Green healing glow */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#00ff00"
          transparent
          opacity={progress * 0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ground healing circle */}
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.9, 32]} />
        <meshBasicMaterial
          color="#00ff00"
          transparent
          opacity={progress * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Point light for glow */}
      <pointLight color="#00ff00" intensity={progress * 3} distance={4} />
    </group>
  )
}