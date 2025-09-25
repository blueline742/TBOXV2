import { useRef, useState, useMemo } from 'react'
import { Mesh, TextureLoader } from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { Text, Html } from '@react-three/drei'
import useGameStore from '@/stores/gameStore'
import { CardData } from '@/stores/cardStore'

interface CardProps {
  card: CardData
  position: [number, number, number]
  side: 'player' | 'opponent'
  index: number
}

export function Card({ card, position, side, index }: CardProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const {
    selectedCardId,
    targetCardId,
    phase,
    currentTurn,
    selectCard,
    selectTarget
  } = useGameStore()

  const isSelected = selectedCardId === card.id
  const isTarget = targetCardId === card.id
  const isDead = card.hp <= 0
  const isFrozen = card.debuffs.some(d => d.type === 'frozen')
  const isBurned = card.debuffs.some(d => d.type === 'burned')
  const isPoisoned = card.debuffs.some(d => d.type === 'poisoned')
  const isStunned = card.debuffs.some(d => d.type === 'stunned')

  const canBeSelected = phase === 'player_turn' && side === 'player' && !isDead && !isStunned
  const canBeTargeted = phase === 'player_turn' && side === 'opponent' && !isDead

  const placeholderTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 356
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 356)
      gradient.addColorStop(0, side === 'player' ? '#4a5568' : '#742a2a')
      gradient.addColorStop(1, side === 'player' ? '#2d3748' : '#5a1a1a')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 256, 356)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(card.name, 128, 178)
    }
    const texture = new TextureLoader().load(canvas.toDataURL())
    return texture
  }, [card.name, side])

  useFrame((state) => {
    if (!meshRef.current) return

    if (isSelected) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.05
    } else if (hovered && (canBeSelected || canBeTargeted)) {
      meshRef.current.position.y = position[1] + 0.2
    } else {
      meshRef.current.position.y = position[1]
    }

    if (isDead) {
      meshRef.current.rotation.x = -Math.PI / 2
      meshRef.current.position.y = -0.4
    } else {
      meshRef.current.rotation.x = side === 'player' ? -0.1 : 0.1
    }
  })

  const handleClick = () => {
    if (canBeSelected) {
      selectCard(isSelected ? null : card.id)
    } else if (canBeTargeted) {
      selectTarget(isTarget ? null : card.id)
    }
  }

  const cardColor = useMemo(() => {
    if (isDead) return '#333333'
    if (isFrozen) return '#4FC3F7'
    if (isBurned) return '#FF6B6B'
    if (isPoisoned) return '#66BB6A'
    if (isStunned) return '#FFB74D'
    return '#ffffff'
  }, [isDead, isFrozen, isBurned, isPoisoned, isStunned])

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.2, 1.8, 0.05]} />
        <meshStandardMaterial
          map={placeholderTexture}
          color={cardColor}
          emissive={isSelected ? '#ffaa00' : isTarget ? '#ff0000' : '#000000'}
          emissiveIntensity={isSelected || isTarget ? 0.3 : 0}
        />
      </mesh>

      {!isDead && (
        <>
          <Html
            position={[0, 1.2, 0]}
            center
            style={{
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            <div className="text-white text-xs bg-black/70 px-2 py-1 rounded">
              {card.hp}/{card.maxHp} HP
            </div>
          </Html>

          {card.debuffs.length > 0 && (
            <Html
              position={[0, -1, 0]}
              center
              style={{
                userSelect: 'none',
                pointerEvents: 'none'
              }}
            >
              <div className="flex gap-1">
                {card.debuffs.map((debuff, i) => (
                  <div
                    key={i}
                    className={`text-xs px-1 rounded ${
                      debuff.type === 'frozen' ? 'bg-blue-500' :
                      debuff.type === 'burned' ? 'bg-red-500' :
                      debuff.type === 'poisoned' ? 'bg-green-500' :
                      'bg-orange-500'
                    } text-white`}
                  >
                    {debuff.type[0].toUpperCase()}
                    {debuff.duration > 0 && `:${debuff.duration}`}
                  </div>
                ))}
              </div>
            </Html>
          )}
        </>
      )}

      {isSelected && (
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#ffaa00" opacity={0.5} transparent />
        </mesh>
      )}

      {isTarget && (
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#ff0000" opacity={0.5} transparent />
        </mesh>
      )}
    </group>
  )
}