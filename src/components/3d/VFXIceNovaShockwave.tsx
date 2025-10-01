'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Frost wave shader (same as sound wave but with ice colors)
const frostWaveVertexShader = `
  uniform float time;
  uniform float progress;
  uniform vec3 sourcePosition;
  attribute float waveOffset;
  attribute float waveSpeed;
  attribute float waveSize;

  varying float vOpacity;
  varying float vIntensity;

  void main() {
    // Expand outward as rings
    float expandProgress = progress * waveSpeed;
    float radius = expandProgress * 8.0 + waveOffset * 2.0;

    // Create ring shape
    float angle = position.x * 6.28318;
    vec3 ringPos = sourcePosition + vec3(
      cos(angle) * radius,
      position.y * 0.5 + sin(time * 3.0 + waveOffset * 5.0) * 0.1,
      sin(angle) * radius
    );

    // Fade out as it expands
    vOpacity = (1.0 - expandProgress) * 0.5;
    vOpacity *= smoothstep(0.0, 0.1, expandProgress);
    vIntensity = 1.0 - expandProgress * 0.6;

    vec4 mvPosition = modelViewMatrix * vec4(ringPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = waveSize * (100.0 / -mvPosition.z);
  }
`

const frostWaveFragmentShader = `
  varying float vOpacity;
  varying float vIntensity;

  void main() {
    // Create circular particle
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(gl_PointCoord, center);
    float alpha = smoothstep(0.5, 0.3, dist);

    // Ice colors - from white to light blue to deep blue
    vec3 hotColor = vec3(0.9, 0.95, 1.0);  // Almost white with blue tint
    vec3 midColor = vec3(0.4, 0.7, 1.0);   // Light blue
    vec3 coolColor = vec3(0.1, 0.3, 0.8);  // Deep blue

    vec3 color;
    if (vIntensity > 0.5) {
      color = mix(midColor, hotColor, (vIntensity - 0.5) * 2.0);
    } else {
      color = mix(coolColor, midColor, vIntensity * 2.0);
    }

    gl_FragColor = vec4(color, alpha * vOpacity);
  }
`

// Shockwave distortion shader with ice colors
const iceShockwaveVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const iceShockwaveFragmentShader = `
  uniform float progress;
  uniform vec3 sourcePosition;
  varying vec2 vUv;

  void main() {
    // Create expanding ring effect
    float radius = progress * 5.0;
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);

    // Ring with soft edges
    float ring = smoothstep(radius - 0.3, radius, dist) * smoothstep(radius + 0.3, radius, dist);

    // Frost distortion color - icy blue
    vec3 color = vec3(0.5, 0.8, 1.0);
    float alpha = ring * (1.0 - progress) * 0.3;

    gl_FragColor = vec4(color, alpha);
  }
`

interface VFXIceNovaShockwaveProps {
  sourcePosition: [number, number, number]
  targetPositions?: [number, number, number][]
  onComplete: () => void
}

export function VFXIceNovaShockwave({ sourcePosition, targetPositions, onComplete }: VFXIceNovaShockwaveProps) {
  const { camera } = useThree()
  const frostWaveMeshRef = useRef<THREE.Points>(null)
  const shockwaveMeshRef = useRef<THREE.Mesh>(null)
  const progressRef = useRef(0)
  const timeRef = useRef(0)
  const originalCameraPosition = useRef<THREE.Vector3>()
  const shakeIntensity = useRef(0)

  // Setup frost wave particles (same as sound waves but ice colored)
  const { geometry: waveGeometry, material: waveMaterial } = useMemo(() => {
    const particleCount = 100 // Particles for frost waves
    const positions = new Float32Array(particleCount * 3)
    const waveOffsets = new Float32Array(particleCount)
    const waveSpeeds = new Float32Array(particleCount)
    const waveSizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3

      // Particles distributed in rings
      positions[i3] = i / particleCount  // Used as angle in shader
      positions[i3 + 1] = 0
      positions[i3 + 2] = 0

      // Stagger waves for multiple rings
      waveOffsets[i] = (i % 5) * 0.2  // Create 5 rings
      waveSpeeds[i] = 0.8 + Math.random() * 0.4
      waveSizes[i] = 8 + Math.random() * 12
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('waveOffset', new THREE.BufferAttribute(waveOffsets, 1))
    geometry.setAttribute('waveSpeed', new THREE.BufferAttribute(waveSpeeds, 1))
    geometry.setAttribute('waveSize', new THREE.BufferAttribute(waveSizes, 1))

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        progress: { value: 0 },
        sourcePosition: { value: new THREE.Vector3(...sourcePosition) }
      },
      vertexShader: frostWaveVertexShader,
      fragmentShader: frostWaveFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })

    return { geometry, material }
  }, [sourcePosition])

  // Setup shockwave plane with ice colors
  const { geometry: shockGeometry, material: shockMaterial } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(20, 20)

    const material = new THREE.ShaderMaterial({
      uniforms: {
        progress: { value: 0 },
        sourcePosition: { value: new THREE.Vector3(...sourcePosition) }
      },
      vertexShader: iceShockwaveVertexShader,
      fragmentShader: iceShockwaveFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    })

    return { geometry, material }
  }, [sourcePosition])

  useEffect(() => {
    // Store original camera position
    originalCameraPosition.current = camera.position.clone()

    // Ice nova sound would go here

    return () => {
      // Cleanup
      waveGeometry.dispose()
      waveMaterial.dispose()
      shockGeometry.dispose()
      shockMaterial.dispose()
    }
  }, [waveGeometry, waveMaterial, shockGeometry, shockMaterial, camera])

  useFrame((state, delta) => {
    if (!frostWaveMeshRef.current || !shockwaveMeshRef.current) return

    timeRef.current += delta
    progressRef.current += delta * 0.5 // 2 second duration

    // Update uniforms
    waveMaterial.uniforms.time.value = timeRef.current
    waveMaterial.uniforms.progress.value = progressRef.current
    shockMaterial.uniforms.progress.value = progressRef.current

    // Camera shake effect (same as Mecha Roar)
    if (progressRef.current < 0.5) {
      // Intense shake at the beginning
      shakeIntensity.current = (0.5 - progressRef.current) * 0.4
    } else {
      // Fade out shake
      shakeIntensity.current *= 0.9
    }

    // Apply camera shake
    if (originalCameraPosition.current && shakeIntensity.current > 0.01) {
      camera.position.x = originalCameraPosition.current.x + (Math.random() - 0.5) * shakeIntensity.current
      camera.position.y = originalCameraPosition.current.y + (Math.random() - 0.5) * shakeIntensity.current
      camera.position.z = originalCameraPosition.current.z + (Math.random() - 0.5) * shakeIntensity.current * 0.5
    }

    // Complete effect
    if (progressRef.current >= 1) {
      // Reset camera position
      if (originalCameraPosition.current) {
        camera.position.copy(originalCameraPosition.current)
      }
      onComplete()
    }
  })

  return (
    <group>
      {/* Frost wave particles */}
      <points ref={frostWaveMeshRef} geometry={waveGeometry} material={waveMaterial} />

      {/* Shockwave plane (ground effect) */}
      <mesh
        ref={shockwaveMeshRef}
        geometry={shockGeometry}
        material={shockMaterial}
        position={[sourcePosition[0], 0.01, sourcePosition[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      />

      {/* Light effect with ice blue color */}
      <pointLight
        position={[sourcePosition[0], sourcePosition[1] + 1, sourcePosition[2]]}
        color="#4488ff"
        intensity={1.5 * (1 - progressRef.current)}
        distance={5}
        decay={2}
      />
    </group>
  )
}