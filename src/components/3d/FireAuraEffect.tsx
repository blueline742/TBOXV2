import { useRef } from 'react'
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

interface FireAuraEffectProps {
  stacks: number
  position?: [number, number, number]
}

export function FireAuraEffect({ stacks, position = [0, 0, 0] }: FireAuraEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<any>(null)
  const particlesRef = useRef<THREE.Points>(null)

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime
    }
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.3

      // Animate particles upward
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.02
        if (positions[i] > 2) {
          positions[i] = -0.5
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  // Create particle geometry
  const particleCount = 20 * stacks
  const particlePositions = new Float32Array(particleCount * 3)

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2
    const radius = 0.8 + Math.random() * 0.3
    particlePositions[i * 3] = Math.cos(angle) * radius
    particlePositions[i * 3 + 1] = Math.random() * 2 - 0.5
    particlePositions[i * 3 + 2] = Math.sin(angle) * radius
  }

  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))

  return (
    <group position={position}>
      {/* Flame aura cylinder */}
      <mesh ref={meshRef} position={[0, 0.5, 0]}>
        <cylinderGeometry args={[1, 0.8, 2, 16, 8, true]} />
        <fireAuraMaterial
          ref={materialRef}
          transparent
          side={THREE.DoubleSide}
          intensity={stacks / 3}
          color1={stacks === 3 ? '#ff0000' : stacks === 2 ? '#ff3300' : '#ff6600'}
          color2={stacks === 3 ? '#ffff00' : stacks === 2 ? '#ffaa00' : '#ff8800'}
          opacity={0.3 + stacks * 0.1}
        />
      </mesh>

      {/* Ember particles */}
      <points ref={particlesRef}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color={stacks === 3 ? '#ff0000' : stacks === 2 ? '#ff4500' : '#ff6600'}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Glow effect */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshBasicMaterial
          color={stacks === 3 ? '#ff0000' : stacks === 2 ? '#ff4500' : '#ff8800'}
          transparent
          opacity={0.15 * stacks}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}