import { useRef } from 'react'
import { Mesh } from 'three'
import * as THREE from 'three'

export function Table() {
  const tableRef = useRef<Mesh>(null)

  return (
    <group>
      {/* Mirror-like surface using standard materials */}
      <mesh
        ref={tableRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.05}
          metalness={0.95}
          envMapIntensity={1}
        />
      </mesh>

      {/* Subtle glow effect underneath */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.01, 0]}
      >
        <planeGeometry args={[12, 8]} />
        <meshBasicMaterial
          color="#4444ff"
          opacity={0.1}
          transparent
        />
      </mesh>

      {/* Optional subtle grid overlay for card positions */}
      {[-3, -1, 1, 3].map((x, i) => (
        <mesh
          key={`player-slot-${i}`}
          position={[x, -0.99, 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.4, 1.8]} />
          <meshBasicMaterial color="#ffffff" opacity={0.03} transparent />
        </mesh>
      ))}

      {[-3, -1, 1, 3].map((x, i) => (
        <mesh
          key={`opponent-slot-${i}`}
          position={[x, -0.99, -2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.4, 1.8]} />
          <meshBasicMaterial color="#ffffff" opacity={0.03} transparent />
        </mesh>
      ))}
    </group>
  )
}