'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { extend } from '@react-three/fiber'

// Custom shader material for fire particles
const fireBreathVertexShader = `
  uniform float time;
  uniform vec3 targetPosition;
  uniform vec3 sourcePosition;
  uniform float progress;

  attribute float particleTime;
  attribute float particleSpeed;
  attribute float particleSize;
  attribute vec3 particleOffset;

  varying float vOpacity;
  varying vec2 vUv;
  varying float vHeat;

  void main() {
    vUv = uv;

    // Calculate particle position along the stream
    float adjustedProgress = progress - particleTime * 0.5;
    adjustedProgress = clamp(adjustedProgress, 0.0, 1.0);

    // Cone spread calculation
    vec3 direction = targetPosition - sourcePosition;
    float distance = length(direction);
    vec3 normalizedDir = normalize(direction);

    // Position along the stream
    vec3 streamPos = sourcePosition + normalizedDir * (adjustedProgress * distance * particleSpeed);

    // Add minimal cone spread for focused beam
    float spread = adjustedProgress * 0.15;  // Much tighter beam
    vec3 offset = particleOffset * spread;

    // Add subtle turbulence for flickering flame effect
    float turbulence = sin(time * 6.0 + particleTime * 12.0) * 0.08;
    offset.x += turbulence * adjustedProgress;
    offset.y += sin(time * 4.0 + particleTime * 10.0) * 0.05 * adjustedProgress;
    offset.z += cos(time * 5.0 + particleTime * 8.0) * 0.03 * adjustedProgress;

    // Minimal rising motion for focused beam
    offset.y += adjustedProgress * 0.08;

    vec3 finalPosition = streamPos + offset;

    // Size grows then shrinks (smaller for focused beam)
    float sizeCurve = sin(adjustedProgress * 3.14159);
    float finalSize = particleSize * sizeCurve * (0.8 + adjustedProgress * 0.2);

    // Opacity fades out
    vOpacity = (1.0 - adjustedProgress) * 0.6;
    vOpacity *= smoothstep(0.0, 0.1, adjustedProgress); // Fade in

    // Heat intensity for color
    vHeat = 1.0 - adjustedProgress * 0.7;

    vec4 mvPosition = modelViewMatrix * vec4(finalPosition, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = finalSize * (150.0 / -mvPosition.z);
  }
`

const fireBreathFragmentShader = `
  uniform sampler2D map;
  uniform float time;

  varying float vOpacity;
  varying vec2 vUv;
  varying float vHeat;

  void main() {
    vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
    vec4 texture = texture2D(map, uv);

    // Create radial gradient for particle shape
    float dist = distance(gl_PointCoord, vec2(0.5));
    float alpha = smoothstep(0.5, 0.0, dist);

    // Fire colors - from yellow-orange to deep red
    vec3 hotColor = vec3(1.0, 0.7, 0.2);  // Yellow-orange
    vec3 midColor = vec3(1.0, 0.3, 0.0);   // Deep orange
    vec3 coolColor = vec3(0.6, 0.05, 0.0); // Dark red

    vec3 fireColor;
    if (vHeat > 0.5) {
      fireColor = mix(midColor, hotColor, (vHeat - 0.5) * 2.0);
    } else {
      fireColor = mix(coolColor, midColor, vHeat * 2.0);
    }

    // Add some variation
    fireColor += vec3(sin(time * 10.0) * 0.05, cos(time * 8.0) * 0.03, 0.0);

    gl_FragColor = vec4(fireColor, alpha * vOpacity);
  }
`

// Heat distortion shader for post-processing effect
const heatDistortionVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const heatDistortionFragmentShader = `
  uniform float time;
  uniform float intensity;
  varying vec2 vUv;

  void main() {
    vec2 distortedUv = vUv;

    // Heat shimmer effect
    float wave1 = sin(vUv.y * 30.0 + time * 5.0) * 0.01;
    float wave2 = cos(vUv.x * 20.0 + time * 3.0) * 0.01;
    distortedUv += vec2(wave1, wave2) * intensity;

    // Output as transparent with distortion stored in alpha
    gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
  }
`

interface VFXFireBreathProps {
  sourcePosition: [number, number, number]
  targetPosition: [number, number, number]
  onComplete: () => void
}

export function VFXFireBreath({ sourcePosition, targetPosition, onComplete }: VFXFireBreathProps) {
  const meshRef = useRef<THREE.Points>(null)
  const emberMeshRef = useRef<THREE.Points>(null)
  const explosionMeshRef = useRef<THREE.Points>(null)
  const progressRef = useRef(0)
  const timeRef = useRef(0)
  const hasExploded = useRef(false)

  // Create fire particle texture
  const fireTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 200, 50, 1)')  // Yellow-orange center
    gradient.addColorStop(0.3, 'rgba(255, 120, 0, 0.8)') // Orange
    gradient.addColorStop(0.6, 'rgba(200, 50, 0, 0.4)')  // Deep red-orange
    gradient.addColorStop(1, 'rgba(100, 0, 0, 0)')       // Fade to dark red

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)

    return new THREE.CanvasTexture(canvas)
  }, [])

  // Setup main fire stream particles
  const { geometry: fireGeometry, material: fireMaterial } = useMemo(() => {
    const particleCount = 50  // Reduced for multi-target performance
    const positions = new Float32Array(particleCount * 3)
    const particleTimes = new Float32Array(particleCount)
    const particleSpeeds = new Float32Array(particleCount)
    const particleSizes = new Float32Array(particleCount)
    const particleOffsets = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      // Start at source
      positions[i3] = sourcePosition[0]
      positions[i3 + 1] = sourcePosition[1]
      positions[i3 + 2] = sourcePosition[2]

      // Stagger particle emission
      particleTimes[i] = i / particleCount
      particleSpeeds[i] = 0.9 + Math.random() * 0.2  // More consistent speed
      particleSizes[i] = 12 + Math.random() * 15  // Smaller for focused beam

      // Random offset for focused beam
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.08  // Much tighter clustering
      particleOffsets[i3] = Math.cos(angle) * radius
      particleOffsets[i3 + 1] = Math.random() * 0.05 - 0.025  // Less vertical spread
      particleOffsets[i3 + 2] = Math.sin(angle) * radius
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('particleTime', new THREE.BufferAttribute(particleTimes, 1))
    geometry.setAttribute('particleSpeed', new THREE.BufferAttribute(particleSpeeds, 1))
    geometry.setAttribute('particleSize', new THREE.BufferAttribute(particleSizes, 1))
    geometry.setAttribute('particleOffset', new THREE.BufferAttribute(particleOffsets, 3))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        sourcePosition: { value: new THREE.Vector3(...sourcePosition) },
        targetPosition: { value: new THREE.Vector3(...targetPosition) },
        map: { value: fireTexture }
      },
      vertexShader: fireBreathVertexShader,
      fragmentShader: fireBreathFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: false
    })

    return { geometry, material }
  }, [sourcePosition, targetPosition, fireTexture])

  // Setup lingering ember particles
  const { geometry: emberGeometry, material: emberMaterial } = useMemo(() => {
    const particleCount = 10  // Minimal embers for multi-target
    const positions = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    const lifetimes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      // Random positions around target (tighter spread)
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.2  // Tighter ember spread
      positions[i3] = targetPosition[0] + Math.cos(angle) * radius
      positions[i3 + 1] = targetPosition[1] + Math.random() * 0.15
      positions[i3 + 2] = targetPosition[2] + Math.sin(angle) * radius

      sizes[i] = 10 + Math.random() * 20
      lifetimes[i] = Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1))

    const material = new THREE.PointsMaterial({
      size: 20,
      map: fireTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(1, 0.3, 0),
      opacity: 0
    })

    return { geometry, material }
  }, [targetPosition, fireTexture])

  // Setup explosion particles at impact
  const { geometry: explosionGeometry, material: explosionMaterial } = useMemo(() => {
    const particleCount = 15  // Minimal explosion for multi-target
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      // Start at target position
      positions[i3] = targetPosition[0]
      positions[i3 + 1] = targetPosition[1]
      positions[i3 + 2] = targetPosition[2]

      // Random explosion velocities (more focused)
      const speed = 0.3 + Math.random() * 0.7  // Less explosive spread
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.6  // More forward-focused

      velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
      velocities[i3 + 1] = Math.cos(phi) * speed * 0.5 + 0.3 // Bias upward
      velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed

      sizes[i] = 40 + Math.random() * 60
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    const material = new THREE.PointsMaterial({
      size: 50,
      map: fireTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: new THREE.Color(1.5, 0.8, 0.3),
      opacity: 0
    })

    return { geometry, material }
  }, [targetPosition, fireTexture])

  // Sound effect
  useEffect(() => {
    // Try fire breath sound first
    const audio = new Audio('/sounds/spell.mp3') // Using existing spell sound
    audio.volume = 0.5
    audio.playbackRate = 0.8 // Slower playback for deeper, more dragon-like sound
    audio.play().catch(() => {
      console.log('Fire breath sound playback failed - user interaction may be required')
    })
  }, [])

  useFrame((state, delta) => {
    timeRef.current += delta
    progressRef.current += delta * 0.8 // Control speed of effect

    // Update main fire stream
    if (fireMaterial && meshRef.current) {
      fireMaterial.uniforms.time.value = timeRef.current
      fireMaterial.uniforms.progress.value = progressRef.current

      // Trigger explosion when stream reaches target
      if (progressRef.current > 0.8 && !hasExploded.current) {
        hasExploded.current = true

        // Impact sound
        const impactAudio = new Audio('/sounds/hit.mp3') // Using existing hit sound
        impactAudio.volume = 0.4
        impactAudio.play().catch(() => {
          console.log('Impact sound playback failed')
        })
      }
    }

    // Update explosion
    if (hasExploded.current && explosionMeshRef.current) {
      const positions = explosionGeometry.attributes.position.array as Float32Array
      const velocities = explosionGeometry.attributes.velocity.array as Float32Array

      const explosionProgress = (progressRef.current - 0.8) * 5 // Fast expansion

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += velocities[i] * delta * 3
        positions[i + 1] += velocities[i + 1] * delta * 3 - delta * 2 // Gravity
        positions[i + 2] += velocities[i + 2] * delta * 3
      }

      explosionGeometry.attributes.position.needsUpdate = true
      explosionMaterial.opacity = Math.max(0, 1 - explosionProgress)
    }

    // Update embers
    if (emberMeshRef.current && progressRef.current > 1.2) {
      const emberProgress = (progressRef.current - 1.2) * 2
      emberMaterial.opacity = Math.max(0, 0.5 * (1 - emberProgress))

      // Float embers upward
      const positions = emberGeometry.attributes.position.array as Float32Array
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += delta * 0.2
      }
      emberGeometry.attributes.position.needsUpdate = true
    }

    // Complete effect
    if (progressRef.current > 2.5) {
      onComplete()
    }
  })

  return (
    <group>
      {/* Main fire stream */}
      <points ref={meshRef} geometry={fireGeometry} material={fireMaterial} />

      {/* Impact explosion - disabled for better performance */}
      {/* <points ref={explosionMeshRef} geometry={explosionGeometry} material={explosionMaterial} /> */}

      {/* Lingering embers - disabled for better performance */}
      {/* <points ref={emberMeshRef} geometry={emberGeometry} material={emberMaterial} /> */}

      {/* Point lights for illumination - reduced intensity */}
      <pointLight
        position={[
          sourcePosition[0] + (targetPosition[0] - sourcePosition[0]) * Math.min(1, progressRef.current),
          sourcePosition[1] + (targetPosition[1] - sourcePosition[1]) * Math.min(1, progressRef.current) + 0.5,
          sourcePosition[2] + (targetPosition[2] - sourcePosition[2]) * Math.min(1, progressRef.current)
        ]}
        color="#ff4400"
        intensity={0.4}
        distance={2}
        decay={2}
      />
    </group>
  )
}