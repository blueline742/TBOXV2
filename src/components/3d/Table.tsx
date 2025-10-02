import { useRef, useMemo, useLayoutEffect } from 'react'
import { Mesh, InstancedMesh, Object3D, Color, Matrix4 } from 'three'
import * as THREE from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import useOptimizedGameStore from '@/stores/optimizedGameStore'
import { FloatingToyPlanes } from './FloatingToyPlanes'
import { InstancedToyDucks } from './InstancedToyDucks'
import { InstancedToyMix } from './InstancedToyMix'
import { LogoBanner } from './LogoBanner'

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

  // Fixed positions for sports balls (generated once)
  const ballPositions = useMemo(() => [
    [4.2, -0.85, -1.5],   // Football white
    [-3.8, -0.85, 2.1],   // Football black
    [2.5, -0.85, -2.8],   // Tennis 1
    [-5.1, -0.85, -0.7],  // Tennis 2
    [0.5, -0.85, 3.2],    // Basketball
    [-2.3, -0.85, -3.1],  // Snooker red
    [5.5, -0.85, 1.8],    // Snooker white
    [-4.5, -0.85, 3.5],   // Snooker yellow
    [3.7, -0.85, 0.9],    // Snooker green
    [-1.2, -0.85, -2.2],  // Snooker blue
  ], [])

  // Removed instanced toy blocks - replaced with 3D models

  // Removed animated dice - replaced with planes
  useFrame(({ clock }) => {
    // Dice animation removed
    if (false && diceRef.current) {
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

      {/* Instanced toy blocks - removed and replaced with 3D models */}

      {/* Decorative dice - removed and replaced with 3D plane models */}

      {/* Scattered sports balls - individual balls for distinct appearance */}
      {/* Football/Soccer balls */}
      <mesh position={ballPositions[0] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} />
      </mesh>
      <mesh position={ballPositions[1] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#000000" roughness={0.3} />
      </mesh>

      {/* Tennis balls */}
      <mesh position={ballPositions[2] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#ccff00" roughness={0.8} />
      </mesh>
      <mesh position={ballPositions[3] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.12, 12, 12]} />
        <meshStandardMaterial color="#ccff00" roughness={0.8} />
      </mesh>

      {/* Basketball */}
      <mesh position={ballPositions[4] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#ff7722" roughness={0.6} />
      </mesh>

      {/* Snooker balls */}
      <mesh position={ballPositions[5] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#cc0000" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={ballPositions[6] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={ballPositions[7] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#ffff00" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={ballPositions[8] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#00aa00" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={ballPositions[9] as [number, number, number]} castShadow>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#0066ff" roughness={0.1} metalness={0.8} />
      </mesh>

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

      {/* Decorative 3D models */}
      <FloatingToyPlanes />
      <InstancedToyDucks />
      <InstancedToyMix />

      {/* Logo Banner */}
      <LogoBanner />
    </group>
  )
}