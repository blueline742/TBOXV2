'use client'

import { useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function LogoBanner() {
  const groupRef = useRef<THREE.Group>(null)
  // Load logo texture - using useMemo equivalent via useTexture
  const logoTexture = useTexture('/finalwebpbackground.webp')

  // Gentle swaying animation
  useFrame((state) => {
    if (groupRef.current) {
      // Sway between -5 and +5 degrees
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.087 // 0.087 radians ≈ 5 degrees
    }
  })

  return (
    <group ref={groupRef} position={[0, 1.5, -6]}>
      {/* Left pole - closer together (2.5 instead of 3) and taller (5.5 instead of 4) */}
      <mesh position={[-2.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 5.5, 16]} />
        <meshStandardMaterial color="#654321" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Right pole - closer together (2.5 instead of 3) and taller (5.5 instead of 4) */}
      <mesh position={[2.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 5.5, 16]} />
        <meshStandardMaterial color="#654321" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Banner with logo - adjusted width to match closer poles */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <planeGeometry args={[4.5, 2]} />
        <meshStandardMaterial
          map={logoTexture}
          transparent={true}
          side={THREE.DoubleSide}
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      {/* Decorative top caps - adjusted positions */}
      <mesh position={[-2.5, 2.75, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[2.5, 2.75, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}
