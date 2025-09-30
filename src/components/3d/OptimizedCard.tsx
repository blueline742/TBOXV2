import { useRef, useState, useEffect, memo, useMemo } from 'react'
import { Mesh, Vector3 } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useCard, useSelection, useGamePhase, useCurrentTurn } from '@/stores/optimizedGameStore'
import { CardData } from '@/stores/cardStore'
import { useCardTexture } from '@/utils/texturePreloader'

interface OptimizedCardProps {
  cardId: string
  position: [number, number, number]
  side: 'player' | 'opponent'
  index: number
  onScreenPositionUpdate?: (cardId: string, side: 'player' | 'opponent', screenPos: { x: number; y: number }) => void
}

// Memoized component - only re-renders when its specific card data changes
export const OptimizedCard = memo(({ cardId, position, side, index, onScreenPositionUpdate }: OptimizedCardProps) => {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [previousHp, setPreviousHp] = useState<number | null>(null)
  const [damageFlash, setDamageFlash] = useState(false)
  const [healFlash, setHealFlash] = useState(false)

  const { camera, size } = useThree()

  // Optimized selectors - only subscribe to what we need
  const card = useCard(side, cardId)
  const { selectedCardId, targetCardId, selectCard, selectTarget } = useSelection()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()

  if (!card) return null

  const isSelected = selectedCardId === cardId
  const isTarget = targetCardId === cardId
  const isDead = card.hp <= 0

  // Memoize debuff checks - prevents recalculating every frame
  const debuffFlags = useMemo(() => ({
    isFrozen: card.debuffs.some(d => d.type === 'frozen'),
    isBurned: card.debuffs.some(d => d.type === 'burned'),
    isPoisoned: card.debuffs.some(d => d.type === 'poisoned'),
    isStunned: card.debuffs.some(d => d.type === 'stunned')
  }), [card.debuffs])

  const { isFrozen, isBurned, isPoisoned, isStunned } = debuffFlags

  // Load texture from preloaded cache
  const texture = useCardTexture(card.texture)

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

  // Animation with performance optimizations
  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Distance culling - skip animations for distant cards
    const distance = meshRef.current.position.distanceTo(state.camera.position)
    if (distance > 20) return

    // Update screen position for DOM overlay (throttled to every 3rd frame for performance)
    if (onScreenPositionUpdate && state.clock.elapsedTime % 0.05 < delta) {
      const vector = new Vector3()
      meshRef.current.getWorldPosition(vector)
      vector.project(camera)

      const x = (vector.x * 0.5 + 0.5) * size.width
      const y = (-(vector.y * 0.5) + 0.5) * size.height - 80 // Offset for position above card

      onScreenPositionUpdate(cardId, side, { x, y })
    }

    // Hover animation
    const targetY = hovered && !isDead ? 0.3 : 0
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.1

    // Selection glow
    if (isSelected) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.1
    }

    // Death animation - stop when scale reaches minimum
    if (isDead && meshRef.current.scale.x > 0.11) {
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

      {/* HP and debuffs now handled by DOM overlay - removed Html component for performance */}

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