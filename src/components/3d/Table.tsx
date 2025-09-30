import { useRef, useMemo, useLayoutEffect } from 'react'
import { Mesh, InstancedMesh, Object3D, Color, Matrix4 } from 'three'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useOptimizedGameStore from '@/stores/optimizedGameStore'

// Component for dynamic health-based hexagon colors
function HealthHexagons() {
  const store = useOptimizedGameStore()
  const playerCards = Array.from(store.playerCards.values())
  const opponentCards = Array.from(store.opponentCards.values())

  // Helper to get color based on HP percentage
  const getHealthColor = (hp: number, maxHp: number) => {
    const percent = hp / maxHp
    if (percent > 0.5) {
      // Green to yellow gradient
      const t = (percent - 0.5) * 2 // 0 to 1
      return new THREE.Color().lerpColors(
        new THREE.Color('#fbbf24'), // yellow
        new THREE.Color('#22c55e'), // green
        t
      )
    } else {
      // Red to yellow gradient
      const t = percent * 2 // 0 to 1
      return new THREE.Color().lerpColors(
        new THREE.Color('#ef4444'), // red
        new THREE.Color('#fbbf24'), // yellow
        t
      )
    }
  }

  return (
    <>
      {/* Player hexagons */}
      {[-3, -1, 1, 3].map((x, i) => {
        const card = playerCards[i]
        const color = card && card.hp > 0
          ? getHealthColor(card.hp, card.maxHp)
          : new THREE.Color('#45b7d1') // Default blue when no card/dead

        // Calculate arc angle based on HP (0 to 2π)
        const hpPercent = card && card.hp > 0 ? card.hp / card.maxHp : 1
        const thetaLength = hpPercent * Math.PI * 2

        return (
          <mesh
            key={`player-slot-${i}`}
            position={[x, -0.97, 2]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Rotate to start from top
          >
            <ringGeometry args={[0.9, 1.1, 6, 1, 0, thetaLength]} />
            <meshBasicMaterial
              color={color}
              opacity={card && card.hp > 0 ? 0.6 : 0.2}
              transparent
            />
          </mesh>
        )
      })}

      {/* Opponent hexagons */}
      {[-3, -1, 1, 3].map((x, i) => {
        const card = opponentCards[i]
        const color = card && card.hp > 0
          ? getHealthColor(card.hp, card.maxHp)
          : new THREE.Color('#ff6b6b') // Default red when no card/dead

        // Calculate arc angle based on HP (0 to 2π)
        const hpPercent = card && card.hp > 0 ? card.hp / card.maxHp : 1
        const thetaLength = hpPercent * Math.PI * 2

        return (
          <mesh
            key={`opponent-slot-${i}`}
            position={[x, -0.97, -2]}
            rotation={[-Math.PI / 2, 0, Math.PI / 2]} // Rotate to start from top
          >
            <ringGeometry args={[0.9, 1.1, 6, 1, 0, thetaLength]} />
            <meshBasicMaterial
              color={color}
              opacity={card && card.hp > 0 ? 0.6 : 0.2}
              transparent
            />
          </mesh>
        )
      })}
    </>
  )
}

export function Table() {
  const tableRef = useRef<Mesh>(null)
  const blocksRef = useRef<InstancedMesh>(null)
  const diceRef = useRef<InstancedMesh>(null)
  const marblesRef = useRef<InstancedMesh>(null)

  // Create instanced toy blocks around the edges
  const blockCount = 20

  // Initialize block transforms and colors after mount
  useLayoutEffect(() => {
    if (!blocksRef.current) return

    const temp = new Object3D()
    const colors = [
      new Color('#ff6b6b'), // red
      new Color('#4ecdc4'), // teal
      new Color('#45b7d1'), // blue
      new Color('#f9ca24'), // yellow
      new Color('#6c5ce7'), // purple
      new Color('#a29bfe'), // lavender
    ]

    for (let i = 0; i < blockCount; i++) {
      const angle = (i / blockCount) * Math.PI * 2
      const radius = 6 + Math.random() * 0.5
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = -0.8 + Math.random() * 0.2

      temp.position.set(x, y, z)
      temp.rotation.set(
        Math.random() * 0.3,
        Math.random() * Math.PI * 2,
        Math.random() * 0.3
      )
      temp.scale.setScalar(0.3 + Math.random() * 0.2)
      temp.updateMatrix()

      blocksRef.current.setMatrixAt(i, temp.matrix)
      const color = colors[Math.floor(Math.random() * colors.length)]
      blocksRef.current.setColorAt(i, color)
    }

    if (blocksRef.current.instanceColor) {
      blocksRef.current.instanceColor.needsUpdate = true
    }
    if (blocksRef.current.instanceMatrix) {
      blocksRef.current.instanceMatrix.needsUpdate = true
    }

    // Initialize marbles
    if (marblesRef.current) {
      const marbleTemp = new Object3D()
      for (let i = 0; i < 10; i++) {
        marbleTemp.position.set(
          (Math.random() - 0.5) * 12,
          -0.85,
          (Math.random() - 0.5) * 8
        )
        marbleTemp.updateMatrix()
        marblesRef.current.setMatrixAt(i, marbleTemp.matrix)
      }
      if (marblesRef.current.instanceMatrix) {
        marblesRef.current.instanceMatrix.needsUpdate = true
      }
    }
  }, [])

  // Animated floating dice
  useFrame(({ clock }) => {
    if (diceRef.current) {
      diceRef.current.rotation.x = Math.sin(clock.elapsedTime * 0.5) * 0.1
      diceRef.current.rotation.y = clock.elapsedTime * 0.3
    }
  })

  return (
    <group>
      {/* Main play surface - Wooden toy box bottom */}
      <mesh
        ref={tableRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1, 0]}
        receiveShadow
        castShadow
      >
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial
          map={null} // You could add a wood texture here
          color="#8b6f47"
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Wood grain detail overlay */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.99, 0]}
      >
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial
          color="#6b5637"
          opacity={0.3}
          transparent
          roughness={0.9}
        />
      </mesh>

      {/* Toy box walls */}
      {/* Back wall */}
      <mesh position={[0, -0.3, -5.5]} receiveShadow castShadow>
        <boxGeometry args={[14, 1.5, 0.3]} />
        <meshStandardMaterial color="#a0826d" roughness={0.8} />
      </mesh>

      {/* Front wall (lower for visibility) */}
      <mesh position={[0, -0.6, 5.5]} receiveShadow castShadow>
        <boxGeometry args={[14, 0.8, 0.3]} />
        <meshStandardMaterial color="#a0826d" roughness={0.8} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-7.15, -0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.3, 1.5, 11]} />
        <meshStandardMaterial color="#a0826d" roughness={0.8} />
      </mesh>

      {/* Right wall */}
      <mesh position={[7.15, -0.3, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.3, 1.5, 11]} />
        <meshStandardMaterial color="#a0826d" roughness={0.8} />
      </mesh>

      {/* Play area markings - chalk-like drawings */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.98, 0]}
      >
        <planeGeometry args={[10, 6]} />
        <meshBasicMaterial
          color="#ffffff"
          opacity={0.1}
          transparent
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Card placement guides - now with dynamic health colors */}
      <HealthHexagons />

      {/* Instanced toy blocks scattered around */}
      <instancedMesh
        ref={blocksRef}
        args={[undefined, undefined, blockCount]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.3}
          metalness={0.1}
          vertexColors
        />
      </instancedMesh>

      {/* Decorative dice */}
      <group ref={diceRef}>
        <mesh position={[-5.5, -0.5, 0]} castShadow>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#f9ca24" roughness={0.3} />
        </mesh>
        <mesh position={[5.5, -0.5, 0]} castShadow>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#ff6b6b" roughness={0.3} />
        </mesh>
      </group>

      {/* Scattered marbles using instanced mesh for performance */}
      <instancedMesh ref={marblesRef} args={[undefined, undefined, 10]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color="#4ecdc4"
          roughness={0.1}
          metalness={0.8}
          envMapIntensity={2}
        />
      </instancedMesh>

      {/* Center divider line - like a chalk line */}
      <mesh
        rotation={[-Math.PI / 2, 0, 1.56]}
        position={[0, -0.95, 0]}
      >
        <planeGeometry args={[0.1, 6]} />
        <meshBasicMaterial color="#ffffff" opacity={0.5} transparent />
      </mesh>

      {/* Playful "VS" text in the center */}
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.7, 8]} />
        <meshBasicMaterial color="#9f6022ff" opacity={0.9} transparent />
      </mesh>
    </group>
  )
}