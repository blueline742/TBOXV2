import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXSurgeryProps {
  targetPositions?: [number, number, number][]  // Multiple allies
  onComplete?: () => void
}

// Surgical cleanse effect removing DOTs from all allies
export function VFXSurgery({ targetPositions = [], onComplete }: VFXSurgeryProps) {
  const groupRef = useRef<THREE.Group>(null)
  const scalpelRef = useRef<THREE.Mesh>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 2.5

  useEffect(() => {
    if (onComplete && progress >= 1) {
      setTimeout(onComplete, 300)
    }
  }, [progress, onComplete])

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000
    const t = Math.min(elapsed / duration, 1)
    setProgress(t)

    // Animate surgical scalpel
    if (scalpelRef.current) {
      const angle = state.clock.elapsedTime * 3
      scalpelRef.current.position.x = Math.cos(angle) * 2
      scalpelRef.current.position.z = Math.sin(angle) * 2
      scalpelRef.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3
      scalpelRef.current.rotation.y = angle
      scalpelRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 5) * 0.2
    }
  })

  // Default to center position if no targets provided
  const positions = targetPositions.length > 0 ? targetPositions : [[0, 0, 0] as [number, number, number]]

  return (
    <group ref={groupRef}>
      {/* Surgical scalpel */}
      <mesh ref={scalpelRef}>
        {/* Blade */}
        <mesh>
          <boxGeometry args={[0.05, 0.3, 0.02]} />
          <meshStandardMaterial
            color="#c0c0c0"
            metalness={0.9}
            roughness={0.1}
            emissive="#ffffff"
            emissiveIntensity={0.2}
            transparent
            opacity={progress}
          />
        </mesh>
        {/* Handle */}
        <mesh position={[0, -0.2, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
          <meshStandardMaterial
            color="#4169e1"
            transparent
            opacity={progress}
          />
        </mesh>
      </mesh>

      {/* Cleansing waves at each target position */}
      {positions.map((pos, index) => (
        <group key={index} position={pos}>
          {/* Cleansing pulse wave */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.1, 0.8 + progress * 1.5, 32]} />
            <meshBasicMaterial
              color="#00bfff"
              transparent
              opacity={(1 - progress) * 0.5}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Extracting poison/fire particles */}
          {Array.from({ length: 8 }, (_, i) => {
            const angle = (i / 8) * Math.PI * 2
            const radius = 0.5 + progress * 1.5
            const height = progress * 2
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * radius,
                  height,
                  Math.sin(angle) * radius
                ]}
              >
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial
                  color={i % 2 === 0 ? '#ff4444' : '#8b008b'} // Red for fire, purple for poison
                  transparent
                  opacity={(1 - progress) * 0.8}
                />
              </mesh>
            )
          })}

          {/* Clean aura effect */}
          <mesh>
            <sphereGeometry args={[1, 16, 16]} />
            <meshBasicMaterial
              color="#87ceeb"
              transparent
              opacity={progress * 0.2}
              side={THREE.BackSide}
            />
          </mesh>

          {/* Medical cross symbol */}
          <group position={[0, 0.5 + progress, 0]} scale={[progress, progress, progress]}>
            <mesh>
              <boxGeometry args={[0.08, 0.4, 0.08]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={progress * 0.8} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.3, 0.08, 0.08]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={progress * 0.8} />
            </mesh>
          </group>

          {/* Point light */}
          <pointLight color="#00bfff" intensity={progress * 2} distance={3} />
        </group>
      ))}

      {/* Operating room light effect */}
      <spotLight
        position={[0, 5, 0]}
        angle={0.5}
        penumbra={0.3}
        intensity={progress * 4}
        color="#ffffff"
        target-position={[0, 0, 0]}
      />

      {/* Surgery complete flash */}
      {progress > 0.8 && (
        <mesh>
          <sphereGeometry args={[5, 16, 16]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={(progress - 0.8) * 0.3}
            side={THREE.BackSide}
          />
        </mesh>
      )}
    </group>
  )
}