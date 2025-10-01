import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { VFXEmitter, VFXParticles } from 'wawa-vfx'

interface EnhancedLightningProps {
  startPosition: [number, number, number]
  targetPositions: [number, number, number][]
  duration?: number
  onComplete?: () => void
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

export function EnhancedLightning({
  startPosition,
  targetPositions,
  duration = 0.8,
  onComplete
}: EnhancedLightningProps) {
  const groupRef = useRef<THREE.Group>(null)
  const startTime = useRef<number>(Date.now())
  const lightRef = useRef<THREE.PointLight>(null)
  const emitterRefs = useRef<any[]>([])
  const particleId = useMemo(() => `lightning-${Date.now()}`, [])

  // console.log('[ENHANCED LIGHTNING] Created:', { startPosition, targetPositions })

  // Generate lightning bolts
  const lightningPaths = useMemo(() => {
    const paths: THREE.Vector3[][] = []

    // Create bolts to each target
    for (const targetPos of targetPositions) {
      const start = new THREE.Vector3(...startPosition)
      const end = new THREE.Vector3(...targetPos)
      paths.push(generateLightningPath(start, end, 10))
    }

    return paths
  }, [startPosition, targetPositions])

  useEffect(() => {
    // Start all emitters
    emitterRefs.current.forEach(emitter => {
      if (emitter && emitter.startEmitting) {
        emitter.startEmitting()
      }
    })

    // Cleanup after duration
    const timer = setTimeout(() => {
      if (onComplete) {
        // console.log('[ENHANCED LIGHTNING] Complete')
        onComplete()
      }
    }, duration * 1000)

    return () => clearTimeout(timer)
  }, [duration, onComplete])

  useFrame(() => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000
    const progress = Math.min(elapsed / duration, 1.0)

    // Flicker effect
    const flicker = Math.random() > 0.2 ? 1 : 0.3
    groupRef.current.visible = flicker > 0.5

    // Animate light intensity
    if (lightRef.current) {
      lightRef.current.intensity = (1 - progress) * 15 * flicker
    }
  })

  return (
    <group ref={groupRef}>
      {/* Particle system definition - shared by all emitters */}
      <VFXParticles
        name={particleId}
        settings={{
          nbParticles: 10000,
          gravity: [0, -2, 0], // Slight downward gravity for sparks
          fadeSize: [0.2, 0.8], // Fade in and out
          fadeOpacity: [0.1, 0.9],
          renderMode: 'Billboard' as any,
          intensity: 5, // Bright electric particles
        }}
      />

      {/* Lightning bolts */}
      {lightningPaths.map((path, index) => (
        <group key={index}>
          {/* Main bolt */}
          <Line
            points={path}
            color="#4488ff"
            lineWidth={4}
            transparent
            opacity={0.9}
          />

          {/* Glow effect */}
          <Line
            points={path}
            color="#88ccff"
            lineWidth={10}
            transparent
            opacity={0.3}
          />

          {/* Core */}
          <Line
            points={path}
            color="#ffffff"
            lineWidth={2}
            transparent
            opacity={1}
          />

          {/* Particle emitter at target for electric sparks */}
          <VFXEmitter
            ref={el => emitterRefs.current[index] = el}
            emitter={particleId}
            position={targetPositions[index]}
            settings={{
              loop: false,
              duration: duration,
              nbParticles: 100,
              spawnMode: 'burst',
              delay: 0,

              // Particle lifetime
              particlesLifetime: [0.2, 0.5],

              // Start from impact point with small spread
              startPositionMin: [-0.2, -0.1, -0.2],
              startPositionMax: [0.2, 0.1, 0.2],

              // No rotation needed for sparks
              startRotationMin: [0, 0, 0],
              startRotationMax: [0, 0, 0],
              rotationSpeedMin: [0, 0, 0],
              rotationSpeedMax: [0, 0, 0],

              // Sparks fly outward in all directions
              directionMin: [-1, -0.5, -1],
              directionMax: [1, 2, 1], // More upward bias

              // Small spark size
              size: [0.02, 0.08],

              // Fast moving sparks
              speed: [2, 8],

              // Electric blue/white colors
              colorStart: ['#ffffff', '#88ccff', '#4488ff'],
              colorEnd: ['#4488ff', '#2244aa', '#000033'],
            }}
          />
        </group>
      ))}

      {/* Central emitter at source for initial burst */}
      <VFXEmitter
        emitter={particleId}
        position={startPosition}
        settings={{
          loop: false,
          duration: 0.2, // Quick burst at start
          nbParticles: 200,
          spawnMode: 'burst',
          delay: 0,

          particlesLifetime: [0.3, 0.6],

          // Wider spread from source
          startPositionMin: [-0.3, -0.1, -0.3],
          startPositionMax: [0.3, 0.1, 0.3],

          startRotationMin: [0, 0, 0],
          startRotationMax: [0, 0, 0],
          rotationSpeedMin: [0, 0, 0],
          rotationSpeedMax: [0, 0, 0],

          // Particles shoot towards targets (roughly forward)
          directionMin: [-0.5, -0.2, -1.5],
          directionMax: [0.5, 0.5, -0.5],

          size: [0.03, 0.1],
          speed: [5, 15],

          colorStart: ['#ffffff', '#aaddff'],
          colorEnd: ['#4488ff', '#002266'],
        }}
      />

      {/* Light source at start position */}
      <pointLight
        ref={lightRef}
        position={startPosition}
        color="#4488ff"
        intensity={10}
        distance={15}
      />

      {/* Additional lights at impact points */}
      {targetPositions.map((pos, index) => (
        <pointLight
          key={`light-${index}`}
          position={pos}
          color="#88ccff"
          intensity={5}
          distance={5}
        />
      ))}
    </group>
  )
}