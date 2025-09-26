import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'

interface LightningEffectProps {
  startPosition: [number, number, number]
  targetPositions: [number, number, number][]  // Multiple targets for chain lightning
  duration?: number
  onComplete?: () => void
  isChain?: boolean  // true for chain lightning, false for single zap
}

// Generate a jagged lightning path between two points
function generateLightningPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number = 8
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  points.push(start.clone())

  for (let i = 1; i < segments - 1; i++) {
    const t = i / (segments - 1)
    const point = start.clone().lerp(end.clone(), t)

    // Add random offset perpendicular to the line
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.3
    )
    point.add(offset)
    points.push(point)
  }

  points.push(end.clone())
  return points
}

export function LightningEffect({
  startPosition,
  targetPositions,
  duration = 0.5,
  onComplete,
  isChain = false
}: LightningEffectProps) {
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef<number>(Date.now())
  const lightRef = useRef<THREE.PointLight>(null)
  const currentTargetIndex = useRef(0)

  console.log('[LIGHTNING] Created:', { startPosition, targetPositions, isChain })

  // Generate lightning bolts
  const lightningPaths = useMemo(() => {
    const paths: THREE.Vector3[][] = []

    if (isChain && targetPositions.length > 1) {
      // Chain lightning: connect from start to first target, then between targets
      let currentStart = new THREE.Vector3(...startPosition)

      for (let i = 0; i < targetPositions.length; i++) {
        const target = new THREE.Vector3(...targetPositions[i])
        paths.push(generateLightningPath(currentStart, target, 10))
        currentStart = target  // Next bolt starts from this target
      }
    } else {
      // Single or multi-target zap: all bolts originate from start
      for (const targetPos of targetPositions) {
        const start = new THREE.Vector3(...startPosition)
        const end = new THREE.Vector3(...targetPositions[0])
        paths.push(generateLightningPath(start, end, 8))
      }
    }

    return paths
  }, [startPosition, targetPositions, isChain])

  useFrame(() => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1.0)

    // Flicker effect
    const flicker = Math.random() > 0.3 ? 1 : 0.3
    groupRef.current.visible = flicker > 0.5

    // Animate light intensity
    if (lightRef.current) {
      lightRef.current.intensity = (1 - progress) * 10 * flicker
    }

    // For chain lightning, show bolts sequentially
    if (isChain && targetPositions.length > 1) {
      const segmentDuration = duration / targetPositions.length
      currentTargetIndex.current = Math.floor(elapsed / segmentDuration)
    }

    if (progress >= 1) {
      if (onComplete) {
        console.log('[LIGHTNING] Complete')
        onComplete()
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Lightning bolts */}
      {lightningPaths.map((path, index) => {
        // For chain lightning, only show current and previous bolts
        const shouldShow = !isChain || index <= currentTargetIndex.current

        return shouldShow ? (
          <group key={index}>
            {/* Main bolt */}
            <Line
              points={path}
              color="#4488ff"
              lineWidth={3}
              transparent
              opacity={0.9}
            />

            {/* Glow effect - wider, more transparent */}
            <Line
              points={path}
              color="#88ccff"
              lineWidth={8}
              transparent
              opacity={0.3}
            />

            {/* Core - bright white */}
            <Line
              points={path}
              color="#ffffff"
              lineWidth={1}
              transparent
              opacity={1}
            />
          </group>
        ) : null
      })}

      {/* Light source at start position */}
      <pointLight
        ref={lightRef}
        position={startPosition}
        color="#4488ff"
        intensity={5}
        distance={10}
      />

      {/* Impact effects at target positions */}
      {targetPositions.map((pos, index) => {
        const shouldShow = !isChain || index <= currentTargetIndex.current
        return shouldShow ? (
          <mesh key={index} position={pos}>
            <sphereGeometry args={[0.3, 8, 8]} />
            <meshBasicMaterial
              color="#88ccff"
              transparent
              opacity={0.5}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ) : null
      })}

      {/* Electric particles around targets */}
      {targetPositions.map((pos, index) => {
        const shouldShow = !isChain || index <= currentTargetIndex.current
        return shouldShow ? (
          <group key={`particles-${index}`} position={pos}>
            {[...Array(5)].map((_, i) => (
              <mesh
                key={i}
                position={[
                  (Math.random() - 0.5) * 1,
                  (Math.random() - 0.5) * 1,
                  (Math.random() - 0.5) * 1
                ]}
              >
                <sphereGeometry args={[0.05, 4, 4]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.8}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            ))}
          </group>
        ) : null
      })}
    </group>
  )
}