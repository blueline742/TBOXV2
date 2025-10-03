import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

const FireAuraMaterial = shaderMaterial(
  {
    time: 0,
    intensity: 1,
    color1: new THREE.Color('#ff4500'),
    color2: new THREE.Color('#ffa500'),
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
      float elevation = sin(pos.x * 3.0 + time) * 0.1;
      elevation += cos(pos.z * 2.0 + time * 1.5) * 0.05;
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
      float flame = sin(vUv.y * 10.0 - time * 3.0) * 0.5 + 0.5;
      flame *= 1.0 - vUv.y;
      flame = pow(flame, 2.0);

      vec3 color = mix(color1, color2, flame + vElevation);
      float alpha = flame * opacity * intensity;

      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ FireAuraMaterial })

// Declare for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      fireAuraMaterial: any
    }
  }
}

interface FireAuraEffectProps {
  stacks: number
  position?: [number, number, number]
}

export function FireAuraEffect({ stacks, position = [0, 0, 0] }: FireAuraEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)
  const particlesRef = useRef<THREE.Points>(null)

  // Use useMemo to create stable particle geometry that doesn't recreate on every render
  // Always use max possible particle count to avoid buffer resize issues
  const particleGeometry = useMemo(() => {
    const maxStacks = 3
    const particlesPerStack = 20
    const count = particlesPerStack * maxStacks // Always allocate for max stacks
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = 0.8 + Math.random() * 0.3
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = Math.random() * 2 - 0.5
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    return geometry
  }, []) // Empty dependency array - create once and reuse

  // Update draw range based on current stacks
  useMemo(() => {
    if (particleGeometry) {
      particleGeometry.setDrawRange(0, 20 * stacks)
    }
  }, [stacks, particleGeometry])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
    if (particlesRef.current && particlesRef.current.geometry.attributes.position) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.3

      // Animate particles upward
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      // Only animate the visible particles based on current stack count
      const visibleParticles = 20 * stacks * 3
      for (let i = 1; i < visibleParticles; i += 3) {
        positions[i] += 0.02
        if (positions[i] > 2) {
          positions[i] = -0.5
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group position={position}>
      {/* Flat fire ring on floor - rotated to lay flat */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} raycast={false}>
        <ringGeometry args={[0.6, 1, 32]} />
        {/* @ts-ignore */}
        <fireAuraMaterial
          ref={materialRef}
          transparent
          side={THREE.DoubleSide}
          intensity={stacks / 3}
          color1={stacks === 3 ? '#ff0000' : stacks === 2 ? '#ff3300' : '#ff6600'}
          color2={stacks === 3 ? '#ffff00' : stacks === 2 ? '#ffaa00' : '#ff8800'}
          opacity={0.5 + stacks * 0.1}
        />
      </mesh>

      {/* Ember particles floating on floor */}
      <points ref={particlesRef} geometry={particleGeometry} raycast={false}>
        <pointsMaterial
          size={0.08}
          color={stacks === 3 ? '#ff0000' : stacks === 2 ? '#ff4500' : '#ff6600'}
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}