'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// Animated flame shader material
const FlameMaterial = shaderMaterial(
  {
    time: 0,
    intensity: 0.5,
  },
  // Vertex shader
  `
    uniform float time;
    varying vec2 vUv;
    varying float vDisplacement;

    void main() {
      vUv = uv;

      vec3 pos = position;
      // Flame flicker displacement
      float displacement = sin(pos.y * 3.0 + time * 5.0) * 0.1 * pos.y;
      displacement += sin(pos.x * 4.0 + time * 7.0) * 0.05 * pos.y;
      pos.x += displacement;
      pos.z += displacement * 0.5;

      vDisplacement = displacement;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;
    varying float vDisplacement;

    void main() {
      // Flame color gradient from yellow to red
      vec3 color1 = vec3(1.0, 0.8, 0.1); // Yellow
      vec3 color2 = vec3(1.0, 0.3, 0.0); // Orange
      vec3 color3 = vec3(0.8, 0.0, 0.0); // Red

      float gradient = vUv.y;
      vec3 color = mix(color1, color2, gradient);
      color = mix(color, color3, gradient * gradient);

      // Flickering effect
      float flicker = sin(time * 8.0 + vUv.y * 10.0) * 0.1 + 0.9;
      color *= flicker * intensity;

      // Fade out at top
      float alpha = (1.0 - vUv.y) * 0.5;

      gl_FragColor = vec4(color, alpha);
    }
  `
)

extend({ FlameMaterial })

interface CartoonTorchProps {
  positions: Array<[number, number, number]>
}

export function CartoonTorch({ positions }: CartoonTorchProps) {
  const flameRefs = useRef<THREE.Mesh[]>([])
  const lightRefs = useRef<THREE.PointLight[]>([])
  const materialRefs = useRef<any[]>([])

  // Simple torch stick geometry
  const stickGeometry = useMemo(() => new THREE.CylinderGeometry(0.05, 0.08, 1.2, 8), [])

  // Flame geometry (cone-like) - bigger for visibility
  const flameGeometry = useMemo(() => new THREE.ConeGeometry(0.22, 0.6, 8), [])

  // Animate flames
  useFrame((state) => {
    materialRefs.current.forEach((mat, index) => {
      if (mat) {
        mat.time = state.clock.elapsedTime
      }

      // Smooth flicker light intensity
      if (lightRefs.current[index]) {
        const flicker = Math.sin(state.clock.elapsedTime * 3 + index) * 0.08 + 0.92
        lightRefs.current[index].intensity = 2 * flicker
      }
    })
  })

  return (
    <>
      {positions.map((pos, index) => (
        <group key={index} position={pos}>
          {/* Torch stick */}
          <mesh geometry={stickGeometry} position={[0, 0.6, 0]}>
            <meshStandardMaterial color="#4a2511" roughness={0.8} />
          </mesh>

          {/* Animated flame */}
          <mesh
            ref={(el: THREE.Mesh | null) => { if (el) flameRefs.current[index] = el }}
            geometry={flameGeometry}
            position={[0, 1.4, 0]}
          >
            {/* @ts-ignore */}
            <flameMaterial
              ref={(el: any) => { if (el) materialRefs.current[index] = el }}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
            />
          </mesh>

          {/* Flickering point light - subtle torch ambience */}
          <pointLight
            ref={(el: THREE.PointLight | null) => { if (el) lightRefs.current[index] = el }}
            position={[0, 1.4, 0]}
            color="#ff9944"
            intensity={2}
            distance={18}
            decay={0.8}
          />
        </group>
      ))}
    </>
  )
}

// TypeScript declaration for custom material
declare global {
  namespace JSX {
    interface IntrinsicElements {
      flameMaterial: any
    }
  }
}
