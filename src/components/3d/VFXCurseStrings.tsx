import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geometryPool } from '@/utils/vfxPool'

interface VFXCurseStringsProps {
  targetPosition: [number, number, number]
  onComplete?: () => void
}

// Purple/dark strings wrapping around the target, reducing healing
export function VFXCurseStrings({ targetPosition, onComplete }: VFXCurseStringsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const stringsRef = useRef<THREE.Mesh[]>([])
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 2.0 // 2 seconds animation

  // Create multiple string geometries wrapping around the target
  const stringCount = 8

  // Use pre-created geometries from pool (memoized to prevent recreation)
  const stringGeometries = useMemo(() => {
    const geometries: (THREE.BufferGeometry | null)[] = []
    for (let i = 0; i < stringCount; i++) {
      const geometry = geometryPool.getTubeGeometry('curse-strings', i)
      geometries.push(geometry)
    }
    return geometries
  }, []) // Only create once

  // Pre-calculate particle positions to avoid Date.now() in render
  const particlePositions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i / 12) * Math.PI * 2
      const radius = 0.8
      return { angle, radius, index: i }
    })
  }, [])

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
      // Rotate the entire group slowly
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5

      // Animate string opacity and movement
      stringsRef.current.forEach((string, i) => {
        if (string) {
          // Wave animation
          const wave = Math.sin(state.clock.elapsedTime * 3 + i * 0.5) * 0.05
          string.position.y = wave

          // Fade in during first half, stay visible
          if (string.material && 'opacity' in string.material) {
            string.material.opacity = Math.min(t * 2, 0.8)
          }
        }
      })
    }
  })

  return (
    <group ref={groupRef} position={targetPosition}>
      {/* Dark purple strings - using pooled geometries */}
      {stringGeometries.map((geometry, i) => (
        geometry && (
          <mesh
            key={i}
            geometry={geometry}
            ref={(el) => {
              if (el) stringsRef.current[i] = el
            }}
          >
            <meshStandardMaterial
              color="#4a0080"
              emissive="#2a0050"
              emissiveIntensity={0.5}
              transparent
              opacity={0}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>
        )
      ))}

      {/* Central curse glow */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial
          color="#8b00ff"
          transparent
          opacity={progress * 0.4}
        />
      </mesh>

      {/* Curse particles - optimized with pre-calculated positions */}
      {particlePositions.map(({ angle, radius, index }) => (
        <mesh
          key={`particle-${index}`}
          position={[
            Math.cos(angle) * radius,
            Math.sin(progress * 10 + index) * 0.5,
            Math.sin(angle) * radius
          ]}
        >
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial
            color="#ff00ff"
            transparent
            opacity={progress * 0.6}
          />
        </mesh>
      ))}

      {/* Purple point light for ambiance */}
      <pointLight color="#8b00ff" intensity={2} distance={4} />

      {/* Ground curse mark */}
      <mesh
        position={[0, -0.99, 0]}
        rotation={[-Math.PI / 2, 0, progress * Math.PI * 2]}
      >
        <ringGeometry args={[0.3, 0.8, 6]} />
        <meshBasicMaterial
          color="#4a0080"
          transparent
          opacity={progress * 0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}