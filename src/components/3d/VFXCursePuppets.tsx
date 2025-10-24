import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geometryPool } from '@/utils/vfxPool'

interface VFXCursePuppetsProps {
  sourcePosition: [number, number, number]  // Marionette position
  targetPosition: [number, number, number]  // Target being copied from
  onComplete?: () => void
}

// Puppet strings connecting to target, copying their ability
export function VFXCursePuppets({
  sourcePosition,
  targetPosition,
  onComplete
}: VFXCursePuppetsProps) {
  const groupRef = useRef<THREE.Group>(null)
  const stringsRef = useRef<THREE.Mesh[]>([])
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 2.5

  // Use pooled geometries and transform them to match source/target positions
  const stringGeometries = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = []
    const stringCount = 5

    for (let i = 0; i < stringCount; i++) {
      // Get pre-created geometry from pool
      const geometry = geometryPool.getTubeGeometry('curse-puppets', i)
      if (geometry) {
        // Clone and transform to match current positions
        const clonedGeometry = geometry.clone()

        // Calculate transformation
        const t = i / (stringCount - 1)
        const offsetX = sourcePosition[0]
        const offsetY = sourcePosition[1]
        const offsetZ = sourcePosition[2]

        // Translate geometry to match source position
        clonedGeometry.translate(offsetX, offsetY, offsetZ)

        geometries.push(clonedGeometry)
      }
    }

    return geometries
  }, [sourcePosition, targetPosition])

  useEffect(() => {
    if (onComplete && progress >= 1) {
      setTimeout(onComplete, 300)
    }
  }, [progress, onComplete])

  useFrame((state) => {
    const elapsed = (Date.now() - startTime.current) / 1000
    const t = Math.min(elapsed / duration, 1)
    setProgress(t)

    if (groupRef.current) {
      // Animate strings attaching
      stringsRef.current.forEach((string, i) => {
        if (string && string.material && 'opacity' in string.material) {
          // Strings appear one by one
          const delay = i * 0.1
          const localProgress = Math.max(0, Math.min(1, (t - delay) * 3))
          string.material.opacity = localProgress * 0.8

          // Vibration effect
          const vibration = Math.sin(state.clock.elapsedTime * 20 + i) * 0.01
          string.position.x = vibration
        }
      })
    }
  })

  return (
    <group ref={groupRef}>
      {/* Control strings - using pooled geometries */}
      {stringGeometries.map((geometry, i) => (
        <mesh
          key={i}
          geometry={geometry}
          ref={(el) => {
            if (el) stringsRef.current[i] = el
          }}
        >
          <meshStandardMaterial
            color="#ffffff"
            emissive="#aaaaaa"
            emissiveIntensity={0.3}
            transparent
            opacity={0}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}

      {/* Control cross above marionette */}
      <group position={[sourcePosition[0], sourcePosition[1] + 1.5, sourcePosition[2]]}>
        {/* Horizontal bar */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.6, 8]} />
          <meshStandardMaterial
            color="#8b4513"
            emissive="#4a2409"
            emissiveIntensity={0.2}
          />
        </mesh>
        {/* Vertical bar */}
        <mesh>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
          <meshStandardMaterial
            color="#8b4513"
            emissive="#4a2409"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      {/* Copying effect - energy flowing along strings */}
      {progress > 0.3 && (
        <>
          {/* Energy orbs traveling along strings */}
          {stringPaths.map((curve, i) => {
            const orbProgress = Math.max(0, Math.min(1, (progress - 0.3) * 2))
            const point = curve.getPoint(1 - orbProgress) // Travel from target to source
            return (
              <mesh key={`orb-${i}`} position={point}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial
                  color="#ffaa00"
                  transparent
                  opacity={0.8}
                />
              </mesh>
            )
          })}

          {/* Spell copy glow at target */}
          <mesh position={targetPosition}>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshBasicMaterial
              color="#ffaa00"
              transparent
              opacity={(progress - 0.3) * 0.3}
            />
          </mesh>

          {/* Spell received glow at source */}
          {progress > 0.7 && (
            <mesh position={sourcePosition}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshBasicMaterial
                color="#ff6600"
                transparent
                opacity={(progress - 0.7) * 0.5}
              />
            </mesh>
          )}
        </>
      )}

      {/* Ambient lights */}
      <pointLight
        position={[sourcePosition[0], sourcePosition[1] + 1, sourcePosition[2]]}
        color="#ffaa00"
        intensity={progress * 2}
        distance={4}
      />
      <pointLight
        position={targetPosition}
        color="#ff6600"
        intensity={progress * 1.5}
        distance={3}
      />

      {/* Magic circles */}
      <mesh
        position={[targetPosition[0], 0.1, targetPosition[2]]}
        rotation={[-Math.PI / 2, 0, progress * Math.PI * 4]}
      >
        <ringGeometry args={[0.4, 0.6, 32]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={progress * 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}