'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

const IceAuraMaterial = shaderMaterial(
  {
    time: 0,
    intensity: 1,
    color1: new THREE.Color('#00ffff'),
    color2: new THREE.Color('#4fc3f7'),
    opacity: 0.6
  },
  // Vertex shader
  `
    uniform float time;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      vUv = uv;

      vec3 pos = position;
      // Slower, crystalline movement pattern
      float elevation = sin(pos.x * 4.0 + time * 0.5) * 0.08;
      elevation += cos(pos.z * 3.0 + time * 0.3) * 0.04;
      pos.y += elevation;
      vElevation = elevation;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform float intensity;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float opacity;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Crystalline frost pattern
      float frost = sin(vUv.y * 12.0 - time * 1.5) * 0.5 + 0.5;
      frost *= 1.0 - vUv.y;
      frost = pow(frost, 1.5);

      vec3 color = mix(color1, color2, frost + vElevation * 0.5);
      float alpha = frost * opacity * intensity;

      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ IceAuraMaterial })

interface IceAuraEffectProps {
  position?: [number, number, number]
}

export function IceAuraEffect({ position = [0, 0, 0] }: IceAuraEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)
  const particlesRef = useRef<THREE.Points>(null)

  // Ice crystal particles
  const particleGeometry = useMemo(() => {
    const count = 30 // Fewer particles for ice crystals
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 0.7 + Math.random() * 0.4
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.random() * 2 - 0.5
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    return geometry
  }, [])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime
    }
    if (meshRef.current) {
      // Slower rotation for frozen effect
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
    if (particlesRef.current && particlesRef.current.geometry.attributes.position) {
      particlesRef.current.rotation.y = -state.clock.elapsedTime * 0.2 // Counter-rotate

      // Slow floating ice crystals
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.01 // Slower rise
        if (positions[i] > 2) {
          positions[i] = -0.5
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group position={position}>
      {/* Ice aura cylinder */}
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1, 0.8, 2, 16, 8, true]} />
        {/* @ts-ignore */}
        <iceAuraMaterial
          ref={materialRef}
          transparent
          side={THREE.DoubleSide}
          intensity={1}
          color1={'#00ffff'}
          color2={'#4fc3f7'}
          opacity={0.5}
        />
      </mesh>

      {/* Ice crystal particles */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          size={0.08}
          color={'#a5f3fc'}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
