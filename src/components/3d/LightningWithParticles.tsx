import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line, Point, Points } from '@react-three/drei'

interface LightningWithParticlesProps {
  startPosition: [number, number, number]
  targetPositions: [number, number, number][]
  duration?: number
  onComplete?: () => void
  isChain?: boolean
}

// Generate a jagged lightning path
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

export function LightningWithParticles({
  startPosition,
  targetPositions,
  duration = 0.6,
  onComplete,
  isChain = false
}: LightningWithParticlesProps) {
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef<number>(Date.now())
  const lightRef = useRef<THREE.PointLight>(null)
  const particlesRef = useRef<THREE.Points>(null)
  const currentTargetIndex = useRef(0)

  // console.log('[LIGHTNING WITH PARTICLES] Created:', { startPosition, targetPositions, isChain })

  // Generate lightning bolts
  const lightningPaths = useMemo(() => {
    const paths: THREE.Vector3[][] = []

    if (isChain && targetPositions.length > 1) {
      // Chain lightning: connect from start to first target, then between targets
      let currentStart = new THREE.Vector3(...startPosition)

      for (let i = 0; i < targetPositions.length; i++) {
        const target = new THREE.Vector3(...targetPositions[i])
        paths.push(generateLightningPath(currentStart, target, 10))
        currentStart = target
      }
    } else {
      // Single or multi-target zap: all bolts originate from start
      for (const targetPos of targetPositions) {
        const start = new THREE.Vector3(...startPosition)
        const end = new THREE.Vector3(...targetPos)
        paths.push(generateLightningPath(start, end, 8))
      }
    }

    return paths
  }, [startPosition, targetPositions, isChain])

  // Generate particle positions around targets
  const particlePositions = useMemo(() => {
    const positions: Float32Array = new Float32Array(targetPositions.length * 30 * 3) // 30 particles per target
    let index = 0

    for (const targetPos of targetPositions) {
      for (let i = 0; i < 30; i++) {
        // Create particles in a sphere around each target
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        const radius = 0.3 + Math.random() * 0.5

        positions[index++] = targetPos[0] + Math.sin(phi) * Math.cos(theta) * radius
        positions[index++] = targetPos[1] + Math.sin(phi) * Math.sin(theta) * radius
        positions[index++] = targetPos[2] + Math.cos(phi) * radius
      }
    }

    return positions
  }, [targetPositions])

  // Generate particles at source
  const sourceParticlePositions = useMemo(() => {
    const positions: Float32Array = new Float32Array(50 * 3) // 50 particles at source
    let index = 0

    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50
      const radius = Math.random() * 0.4
      const height = Math.random() * 0.3

      positions[index++] = startPosition[0] + Math.cos(angle) * radius
      positions[index++] = startPosition[1] + height
      positions[index++] = startPosition[2] + Math.sin(angle) * radius
    }

    return positions
  }, [startPosition])

  useFrame(() => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1.0)

    // Flicker effect for lightning
    const flicker = Math.random() > 0.3 ? 1 : 0.3

    // Make bolt groups flicker
    if (groupRef.current.children[0]) {
      groupRef.current.children[0].visible = flicker > 0.5
    }

    // Animate particles - make them expand outward
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position
      const basePositions = particlePositions

      for (let i = 0; i < positions.count; i++) {
        const i3 = i * 3
        const expansion = progress * 2 // Expand over time
        const fadeOut = 1 - progress // Fade out

        positions.array[i3] = basePositions[i3] + (Math.random() - 0.5) * expansion * fadeOut
        positions.array[i3 + 1] = basePositions[i3 + 1] + Math.random() * expansion * fadeOut
        positions.array[i3 + 2] = basePositions[i3 + 2] + (Math.random() - 0.5) * expansion * fadeOut
      }

      positions.needsUpdate = true

      // Fade out particles
      if (particlesRef.current.material instanceof THREE.PointsMaterial) {
        particlesRef.current.material.opacity = (1 - progress) * 0.8
      }
    }

    // Animate light intensity
    if (lightRef.current) {
      lightRef.current.intensity = (1 - progress) * 15 * flicker
    }

    // For chain lightning, show bolts sequentially
    if (isChain && targetPositions.length > 1) {
      const segmentDuration = duration / targetPositions.length
      currentTargetIndex.current = Math.floor(elapsed / segmentDuration)
    }

    if (progress >= 1) {
      if (onComplete) {
        // console.log('[LIGHTNING WITH PARTICLES] Complete')
        onComplete()
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Lightning bolts container */}
      <group>
        {lightningPaths.map((path, index) => {
          // For chain lightning, only show current and previous bolts
          const shouldShow = !isChain || index <= currentTargetIndex.current

          return shouldShow ? (
            <group key={index}>
              {/* Main bolt */}
              <Line
                points={path}
                color="#6699ff"
                lineWidth={3}
                transparent
                opacity={0.9}
              />

              {/* Glow effect - wider, more transparent */}
              <Line
                points={path}
                color="#aaccff"
                lineWidth={8}
                transparent
                opacity={0.4}
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
      </group>

      {/* Source particles */}
      <Points positions={sourceParticlePositions}>
        <pointsMaterial
          color="#aaccff"
          size={0.05}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </Points>

      {/* Target impact particles */}
      <Points ref={particlesRef} positions={particlePositions}>
        <pointsMaterial
          color="#88aaff"
          size={0.08}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation={true}
        />
      </Points>

      {/* Light source at start position */}
      <pointLight
        ref={lightRef}
        position={startPosition}
        color="#6699ff"
        intensity={10}
        distance={12}
      />

      {/* Impact effects at target positions */}
      {targetPositions.map((pos, index) => {
        const shouldShow = !isChain || index <= currentTargetIndex.current
        return shouldShow ? (
          <group key={`impact-${index}`}>
            {/* Impact glow sphere */}
            <mesh position={pos}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <meshBasicMaterial
                color="#aaccff"
                transparent
                opacity={0.4}
                blending={THREE.AdditiveBlending}
              />
            </mesh>

            {/* Impact light */}
            <pointLight
              position={pos}
              color="#88aaff"
              intensity={3}
              distance={3}
            />
          </group>
        ) : null
      })}
    </group>
  )
}