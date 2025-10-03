import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { VFXEmitter, VFXParticles } from 'wawa-vfx'

interface VFXIceNovaProps {
  position: [number, number, number]
  onComplete?: () => void
}

export function VFXIceNova({ position, onComplete }: VFXIceNovaProps) {
  const groupRef = useRef<THREE.Group>(null)
  const shockwaveRef = useRef<THREE.Mesh>(null)
  const iceRingRef = useRef<THREE.Mesh>(null)
  const groundFrostRef = useRef<THREE.Mesh>(null)
  const [emitterConfig] = useState({
    particleCount: 500,
    initialRadius: 0.1,
    maxRadius: 15,
    duration: 3,
    startTime: Date.now()
  })

  // Create ice crystal particles
  const particlePositions = useRef<Float32Array>(new Float32Array(emitterConfig.particleCount * 3))
  const particleVelocities = useRef<Float32Array>(new Float32Array(emitterConfig.particleCount * 3))

  useEffect(() => {
    // Initialize particle positions in a ring pattern
    for (let i = 0; i < emitterConfig.particleCount; i++) {
      const angle = (Math.PI * 2 * i) / emitterConfig.particleCount + Math.random() * 0.2
      const radius = 0.1
      particlePositions.current[i * 3] = Math.cos(angle) * radius
      particlePositions.current[i * 3 + 1] = Math.random() * 0.5
      particlePositions.current[i * 3 + 2] = Math.sin(angle) * radius

      // Outward velocities
      const speed = 2 + Math.random() * 3
      particleVelocities.current[i * 3] = Math.cos(angle) * speed
      particleVelocities.current[i * 3 + 1] = Math.random() * 2
      particleVelocities.current[i * 3 + 2] = Math.sin(angle) * speed
    }

    // Cleanup after effect duration
    const timer = setTimeout(() => {
      onComplete?.()
    }, emitterConfig.duration * 1000)

    return () => clearTimeout(timer)
  }, [onComplete, emitterConfig.duration, emitterConfig.particleCount])

  useFrame((state) => {
    const elapsed = (Date.now() - emitterConfig.startTime) / 1000
    const progress = Math.min(elapsed / emitterConfig.duration, 1)

    // Animate expanding shockwave ring
    if (shockwaveRef.current) {
      const scale = 0.1 + progress * 10
      shockwaveRef.current.scale.set(scale, 1, scale)
      if (!Array.isArray(shockwaveRef.current.material) && 'opacity' in shockwaveRef.current.material) {
        shockwaveRef.current.material.opacity = 1 - progress
      }
      shockwaveRef.current.rotation.y = elapsed * 0.5
    }

    // Animate ice ring spreading
    if (iceRingRef.current) {
      const ringScale = 0.1 + progress * 8
      iceRingRef.current.scale.set(ringScale, 1, ringScale)
      if (!Array.isArray(iceRingRef.current.material) && 'opacity' in iceRingRef.current.material) {
        iceRingRef.current.material.opacity = 0.8 * (1 - progress * 0.5)
      }
    }

    // Animate ground frost texture
    if (groundFrostRef.current) {
      const frostScale = progress * 12
      groundFrostRef.current.scale.set(frostScale, 1, frostScale)
      if (!Array.isArray(groundFrostRef.current.material) && 'opacity' in groundFrostRef.current.material) {
        groundFrostRef.current.material.opacity = 0.6 * (1 - progress * 0.3)
      }
      if (!Array.isArray(groundFrostRef.current.material) && 'emissiveIntensity' in groundFrostRef.current.material) {
        groundFrostRef.current.material.emissiveIntensity = 2 * (1 - progress)
      }
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Central ice explosion */}
      <group position={[0, 0.5, 0]}>
        <VFXEmitter
          emitter="iceBurst"
          autoStart={true}
          settings={{
            loop: false,
            duration: 2,
            nbParticles: 200,
            spawnMode: "burst",
            particlesLifetime: [1.5, 2],
            startPositionMin: [0, 0, 0],
            startPositionMax: [0, 0, 0],
            directionMin: [-3, 3, -3],
            directionMax: [3, 7, 3],
            size: [0.05, 0.3],
            speed: [3, 6],
            colorStart: ["#00ddff", "#88ffff"],
            colorEnd: ["#ffffff", "#aaffff"],
          }}
        />
      </group>

      {/* Radial ice shards burst */}
      <group position={[0, 0.2, 0]}>
        <VFXEmitter
          emitter="iceShards"
          autoStart={true}
          settings={{
            loop: false,
            duration: 2.5,
            nbParticles: 300,
            spawnMode: "burst",
            particlesLifetime: [2, 2.5],
            startPositionMin: [0, 0, 0],
            startPositionMax: [0, 0, 0],
            directionMin: [-8, -1, -8],
            directionMax: [8, 1, 8],
            size: [0.1, 0.5],
            speed: [4, 8],
            colorStart: ["#88ddff", "#aaffff"],
            colorEnd: ["#ffffff", "#ccffff"],
          }}
        />
      </group>

      {/* Expanding shockwave ring */}
      <mesh ref={shockwaveRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[0.8, 1, 64]} />
        <meshStandardMaterial
          color={0x00aaff}
          emissive={0x00ddff}
          emissiveIntensity={3}
          transparent
          opacity={1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary ice ring */}
      <mesh ref={iceRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.5, 0.7, 32]} />
        <meshStandardMaterial
          color={0xaaeeff}
          emissive={0x88ccff}
          emissiveIntensity={2}
          transparent
          opacity={0.8}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>

      {/* Ground frost effect */}
      <mesh ref={groundFrostRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1, 64]} />
        <meshStandardMaterial
          color={0xffffff}
          emissive={0x88ddff}
          emissiveIntensity={2}
          transparent
          opacity={0.6}
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>

      {/* Rotating ice crystals - commented out due to API mismatch */}
      {/* {Array.from({ length: 8 }).map((_, i) => {
        const angle = (Math.PI * 2 * i) / 8
        const radius = 2
        return (
          <VFXEmitter
            key={`crystal-${i}`}
            position={[Math.cos(angle) * radius, 0.3, Math.sin(angle) * radius]}
            startSize={0.2}
            endSize={0.01}
            particleCount={50}
            lifetime={1.5}
            velocity={[0, 3, 0]}
            velocityRandomness={1}
            color={new THREE.Color(0x88eeff)}
            endColor={new THREE.Color(0xffffff)}
            gravity={[0, -1, 0]}
            fadeOut={0.5}
            delay={i * 0.1}
          />
        )
      })} */}

      {/* Ambient ice fog - commented out due to API mismatch */}
      {/* <VFXParticles
        particleCount={100}
        startPosition={[0, 0, 0]}
        endPosition={[0, 2, 0]}
        startSize={2}
        endSize={3}
        lifetime={3}
        velocity={[0, 0.5, 0]}
        velocityRandomness={0.5}
        startColor={new THREE.Color(0x88ccff)}
        endColor={new THREE.Color(0xffffff)}
        opacity={0.3}
        fadeIn={0.5}
        fadeOut={0.5}
        blending={THREE.NormalBlending}
      /> */}

      {/* Point light for dramatic effect */}
      <pointLight
        position={[0, 1, 0]}
        color={0x00ddff}
        intensity={10}
        distance={15}
      />

      {/* Rim lighting */}
      <pointLight
        position={[0, 0.1, 0]}
        color={0x88eeff}
        intensity={5}
        distance={10}
      />
    </group>
  )
}