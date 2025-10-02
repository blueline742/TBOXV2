'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface VFXResurrectionProps {
  position: [number, number, number]
  onComplete: () => void
}

export function VFXResurrection({ position, onComplete }: VFXResurrectionProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const beamRef = useRef<THREE.Mesh>(null!)
  const sparklesRef = useRef<THREE.Points>(null!)
  const ringsRef = useRef<THREE.Group>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  const progress = useRef(0)
  const duration = 2.5 // 2.5 seconds total

  // Golden beam of light (vertical column)
  const beamGeometry = useMemo(() => new THREE.CylinderGeometry(0.6, 0.2, 4, 16, 1, true), [])

  const beamMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0 },
        goldCore: { value: new THREE.Color(0xffd700) }, // Gold
        goldGlow: { value: new THREE.Color(0xffed4e) }  // Bright gold
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform vec3 goldCore;
        uniform vec3 goldGlow;
        varying vec2 vUv;
        varying vec3 vPosition;

        void main() {
          // Vertical gradient (bright at bottom, fades to top)
          float vertical = 1.0 - vUv.y;

          // Radial gradient from center
          float radial = 1.0 - abs(vUv.x - 0.5) * 2.0;

          // Animated upward waves
          float wave1 = sin(vUv.y * 10.0 - time * 3.0) * 0.5 + 0.5;
          float wave2 = sin(vUv.y * 15.0 - time * 4.0) * 0.5 + 0.5;

          // Combine effects
          float intensity = vertical * radial * (wave1 * 0.4 + wave2 * 0.3 + 0.3);

          // Color mixing
          vec3 finalColor = mix(goldGlow, goldCore, radial);

          gl_FragColor = vec4(finalColor, intensity * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  }, [])

  // Sparkle particles (golden sparkles rising upward)
  const sparkleCount = 100
  const sparkles = useMemo(() => {
    const positions = new Float32Array(sparkleCount * 3)
    const velocities = new Float32Array(sparkleCount * 3)
    const scales = new Float32Array(sparkleCount)
    const colors = new Float32Array(sparkleCount * 3)

    for (let i = 0; i < sparkleCount; i++) {
      const i3 = i * 3

      // Start in a cylinder around the beam
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.8
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = -2 + Math.random() * 0.5 // Start at bottom
      positions[i3 + 2] = Math.sin(angle) * radius

      // Upward velocity with slight spiral
      velocities[i3] = Math.cos(angle) * 0.3
      velocities[i3 + 1] = 2 + Math.random() * 1.5 // Upward speed
      velocities[i3 + 2] = Math.sin(angle) * 0.3

      // Random sizes
      scales[i] = 0.02 + Math.random() * 0.04

      // Golden colors
      colors[i3] = 0.9 + Math.random() * 0.1     // R - high (golden)
      colors[i3 + 1] = 0.7 + Math.random() * 0.3 // G - medium-high (golden)
      colors[i3 + 2] = 0.1 + Math.random() * 0.2 // B - low (golden)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))
    geometry.setAttribute('scale', new THREE.BufferAttribute(scales, 1))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    return geometry
  }, [])

  const sparkleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: new THREE.TextureLoader().load(
        'data:image/svg+xml;base64,' +
        btoa('<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="14" fill="white"/></svg>')
      )
    })
  }, [])

  // Expanding rings (3 rings expanding outward)
  const rings = useMemo(() => {
    const ringGeometry = new THREE.RingGeometry(0.3, 0.4, 32)
    return [
      { geometry: ringGeometry, delay: 0 },
      { geometry: ringGeometry, delay: 0.3 },
      { geometry: ringGeometry, delay: 0.6 }
    ]
  }, [])

  useFrame((state, delta) => {
    progress.current += delta
    const t = Math.min(progress.current / duration, 1)

    if (progress.current >= duration) {
      onComplete()
      return
    }

    // Update beam
    if (beamRef.current && beamMaterial.uniforms) {
      beamMaterial.uniforms.time.value = progress.current

      // Fade in, stay, fade out
      if (t < 0.2) {
        beamMaterial.uniforms.opacity.value = t / 0.2
      } else if (t > 0.8) {
        beamMaterial.uniforms.opacity.value = (1 - t) / 0.2
      } else {
        beamMaterial.uniforms.opacity.value = 1
      }

      // Rise up slightly
      beamRef.current.position.y = Math.sin(t * Math.PI) * 0.5
    }

    // Update sparkles
    if (sparklesRef.current) {
      const positions = sparkles.attributes.position.array as Float32Array
      const velocities = sparkles.attributes.velocity.array as Float32Array

      for (let i = 0; i < sparkleCount; i++) {
        const i3 = i * 3

        // Move sparkles upward
        positions[i3] += velocities[i3] * delta
        positions[i3 + 1] += velocities[i3 + 1] * delta
        positions[i3 + 2] += velocities[i3 + 2] * delta

        // Reset if too high
        if (positions[i3 + 1] > 2) {
          const angle = Math.random() * Math.PI * 2
          const radius = Math.random() * 0.8
          positions[i3] = Math.cos(angle) * radius
          positions[i3 + 1] = -2
          positions[i3 + 2] = Math.sin(angle) * radius
        }
      }

      sparkles.attributes.position.needsUpdate = true

      // Fade sparkles in/out
      if (t < 0.2) {
        sparkleMaterial.opacity = t / 0.2
      } else if (t > 0.7) {
        sparkleMaterial.opacity = (1 - t) / 0.3
      } else {
        sparkleMaterial.opacity = 1
      }
    }

    // Update expanding rings
    if (ringsRef.current) {
      ringsRef.current.children.forEach((ring, index) => {
        const ringDelay = index * 0.3
        const ringProgress = Math.max(0, (progress.current - ringDelay) / 1.5)

        if (ringProgress > 0 && ringProgress < 1) {
          // Expand
          const scale = 0.3 + ringProgress * 2
          ring.scale.set(scale, scale, 1)

          // Fade out as expanding
          const material = (ring as THREE.Mesh).material as THREE.MeshBasicMaterial
          material.opacity = (1 - ringProgress) * 0.6
        }
      })
    }

    // Update point light
    if (lightRef.current) {
      // Pulse light intensity
      lightRef.current.intensity = Math.sin(t * Math.PI) * 3
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Main golden beam */}
      <mesh ref={beamRef} geometry={beamGeometry} material={beamMaterial} />

      {/* Sparkle particles */}
      <points ref={sparklesRef} geometry={sparkles} material={sparkleMaterial} />

      {/* Expanding rings */}
      <group ref={ringsRef} rotation={[Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
        {rings.map((ring, i) => (
          <mesh key={i} geometry={ring.geometry}>
            <meshBasicMaterial
              color="#ffd700"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Point light for scene illumination */}
      <pointLight ref={lightRef} color="#ffd700" intensity={0} distance={5} decay={2} />
    </group>
  )
}
