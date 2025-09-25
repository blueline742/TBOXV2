import { useRef } from 'react'
import { Mesh } from 'three'
import { MeshReflectorMaterial } from '@react-three/drei'

export function Table() {
  const tableRef = useRef<Mesh>(null)

  return (
    <group>
      <mesh
        ref={tableRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[12, 8]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={2048}
          mixBlur={1}
          mixStrength={50}
          roughness={0.9}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#2a4a2a"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>

      <mesh position={[0, -0.6, 0]} receiveShadow>
        <boxGeometry args={[12.5, 0.2, 8.5]} />
        <meshStandardMaterial color="#1a2a1a" />
      </mesh>

      {[-3, -1, 1, 3].map((x, i) => (
        <mesh
          key={`player-slot-${i}`}
          position={[x, -0.49, 2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.4, 1.8]} />
          <meshBasicMaterial color="#334433" opacity={0.3} transparent />
        </mesh>
      ))}

      {[-3, -1, 1, 3].map((x, i) => (
        <mesh
          key={`opponent-slot-${i}`}
          position={[x, -0.49, -2]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1.4, 1.8]} />
          <meshBasicMaterial color="#443333" opacity={0.3} transparent />
        </mesh>
      ))}
    </group>
  )
}