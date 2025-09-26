import { useRef, useState, useEffect, memo } from 'react'
import { Mesh, TextureLoader } from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useCard, useSelection, useGamePhase, useCurrentTurn } from '@/stores/optimizedGameStore'
import { CardData } from '@/stores/cardStore'

interface OptimizedCardProps {
  cardId: string
  position: [number, number, number]
  side: 'player' | 'opponent'
  index: number
}

// Memoized component - only re-renders when its specific card data changes
export const OptimizedCard = memo(({ cardId, position, side, index }: OptimizedCardProps) => {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [previousHp, setPreviousHp] = useState<number | null>(null)
  const [damageFlash, setDamageFlash] = useState(false)
  const [healFlash, setHealFlash] = useState(false)

  // Optimized selectors - only subscribe to what we need
  const card = useCard(side, cardId)
  const { selectedCardId, targetCardId, selectCard, selectTarget } = useSelection()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()

  if (!card) return null

  const isSelected = selectedCardId === cardId
  const isTarget = targetCardId === cardId
  const isDead = card.hp <= 0
  const isFrozen = card.debuffs.some(d => d.type === 'frozen')
  const isBurned = card.debuffs.some(d => d.type === 'burned')
  const isPoisoned = card.debuffs.some(d => d.type === 'poisoned')
  const isStunned = card.debuffs.some(d => d.type === 'stunned')

  // Load texture
  const texture = useLoader(TextureLoader, card.texture || '/placeholder.png')

  // HP change detection
  useEffect(() => {
    if (previousHp !== null && card.hp !== previousHp) {
      if (card.hp < previousHp) {
        setDamageFlash(true)
        setTimeout(() => setDamageFlash(false), 500)
      } else if (card.hp > previousHp) {
        setHealFlash(true)
        setTimeout(() => setHealFlash(false), 500)
      }
    }
    setPreviousHp(card.hp)
  }, [card.hp, previousHp])

  // Animation
  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Hover animation
    const targetY = hovered && !isDead ? 0.3 : 0
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1

    // Selection glow
    if (isSelected) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }

    // Death animation
    if (isDead) {
      meshRef.current.rotation.x += delta * 0.5
      meshRef.current.position.y -= delta * 0.3
      meshRef.current.scale.setScalar(Math.max(0.1, meshRef.current.scale.x - delta * 0.5))
    }

    // Frozen effect
    if (isFrozen) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.02
    }
  })

  const handleClick = () => {
    if (isDead) return

    if (side === 'player' && currentTurn === 'player' && phase === 'player_turn') {
      if (selectedCardId === cardId) {
        selectCard(null)
      } else {
        selectCard(cardId)
      }
    } else if (selectedCardId && side === 'opponent') {
      selectTarget(cardId)
    }
  }

  const handlePointerOver = () => {
    if (!isDead) {
      setHovered(true)
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1.5, 2, 0.1]} />
        <meshStandardMaterial
          map={texture}
          color={
            damageFlash ? '#ff0000' :
            healFlash ? '#00ff00' :
            isDead ? '#333333' :
            isFrozen ? '#aaccff' :
            isBurned ? '#ff6600' :
            isPoisoned ? '#66ff66' :
            '#ffffff'
          }
          emissive={
            isSelected ? '#ffff00' :
            isTarget ? '#ff0000' :
            '#000000'
          }
          emissiveIntensity={isSelected || isTarget ? 0.3 : 0}
        />
      </mesh>

      {/* HP Display */}
      <Html
        center
        distanceFactor={10}
        position={[0, -1.5, 0]}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="bg-black/80 px-2 py-1 rounded text-white text-xs font-bold">
            {card.name}
          </div>
          <div className="bg-black/80 px-2 py-1 rounded text-white text-xs">
            {card.hp}/{card.maxHp} HP
          </div>
          {card.debuffs.length > 0 && (
            <div className="flex gap-1">
              {isFrozen && <span className="text-cyan-300 text-xs">❄️</span>}
              {isBurned && <span className="text-orange-400 text-xs">🔥</span>}
              {isPoisoned && <span className="text-green-400 text-xs">☠️</span>}
              {isStunned && <span className="text-yellow-400 text-xs">⚡</span>}
            </div>
          )}
        </div>
      </Html>

      {/* Selection Ring */}
      {isSelected && (
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.5} />
        </mesh>
      )}

      {/* Target Ring */}
      {isTarget && (
        <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 32]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
})

OptimizedCard.displayName = 'OptimizedCard'