import { useRef, useState, useMemo, useEffect } from 'react'
import { Mesh, Vector3 } from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useCard, useSelection, useGamePhase, useCurrentTurn } from '@/stores/optimizedGameStore'
import { CardData } from '@/stores/cardStore'
import { FireAuraEffect } from './FireAuraEffect'
import { DamageNumbers } from './DamageNumbers'
import { useCardTexture } from '@/utils/texturePreloader'

interface CardProps {
  card: CardData
  position: [number, number, number]
  side: 'player' | 'opponent'
  index: number
  onScreenPositionUpdate?: (cardId: string, side: 'player' | 'opponent', screenPos: { x: number; y: number }) => void
}

export function Card({ card: initialCard, position, side, index, onScreenPositionUpdate }: CardProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [previousHp, setPreviousHp] = useState(initialCard.hp)
  const [damageFlash, setDamageFlash] = useState(false)
  const [healFlash, setHealFlash] = useState(false)

  const { camera, size } = useThree()

  // Use optimized selectors
  const card = useCard(side, initialCard.id) || initialCard
  const { selectedCardId, targetCardId, selectCard, selectTarget } = useSelection()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()

  const isSelected = selectedCardId === card.id
  const isTarget = targetCardId === card.id
  const isDead = card.hp <= 0

  // Memoize debuff checks for performance
  const debuffFlags = useMemo(() => ({
    isFrozen: card.debuffs.some(d => d.type === 'frozen'),
    isBurned: card.debuffs.some(d => d.type === 'burned'),
    isPoisoned: card.debuffs.some(d => d.type === 'poisoned'),
    isStunned: card.debuffs.some(d => d.type === 'stunned'),
    hasFireAura: card.debuffs.find(d => d.type === 'fire_aura'),
  }), [card.debuffs])

  const { isFrozen, isBurned, isPoisoned, isStunned, hasFireAura } = debuffFlags
  const fireAuraStacks = hasFireAura?.stacks || 0

  // Detect HP changes for visual feedback
  useEffect(() => {
    if (card.hp < previousHp) {
      // Damage taken
      setDamageFlash(true)
      // console.log(`[CARD DEBUG] ${card.name} took ${previousHp - card.hp} damage`)
      setTimeout(() => setDamageFlash(false), 500)
    } else if (card.hp > previousHp) {
      // Healing received
      setHealFlash(true)
      setTimeout(() => setHealFlash(false), 500)
    }
    setPreviousHp(card.hp)
  }, [card.hp, previousHp, card.name])

  const canBeSelected = phase === 'player_turn' && side === 'player' && !isDead && !isStunned
  const canBeTargeted = phase === 'player_turn' && side === 'opponent' && !isDead

  // Load the actual card texture from preloaded cache
  const texture = useCardTexture(card.texture || '/wizardnft.webp')

  useFrame((state, delta) => {
    if (!meshRef.current) return

    // Update screen position for debuff overlay (only if card has debuffs - performance optimization)
    if (onScreenPositionUpdate && card.debuffs.length > 0 && state.clock.elapsedTime % 0.1 < delta) {
      const vector = new Vector3()
      meshRef.current.getWorldPosition(vector)
      vector.project(camera)

      const x = (vector.x * 0.5 + 0.5) * size.width
      const y = (-(vector.y * 0.5) + 0.5) * size.height - 100

      onScreenPositionUpdate(card.id, side, { x, y })
    }

    // Apply vertical animations relative to the mesh's origin (0,0,0)
    if (isDead) {
      // Stop death animation when complete
      if (meshRef.current.position.y > -0.35) {
        meshRef.current.position.y = -0.4
        meshRef.current.rotation.x = -Math.PI / 2
      }
    } else {
      meshRef.current.position.y = 0 // Start at origin
      if (isSelected) {
        meshRef.current.position.y += Math.sin(state.clock.elapsedTime * 3) * 0.05
      } else if (hovered && (canBeSelected || canBeTargeted)) {
        meshRef.current.position.y += 0.2
      }
      meshRef.current.rotation.x = side === 'player' ? -0.1 : 0.1
    }

    // Apply damage shake effect (additive)
    if (damageFlash) {
      const shake = Math.sin(state.clock.elapsedTime * 50) * 0.02
      meshRef.current.position.x += shake
      meshRef.current.position.z += shake
    }
  })

  const handleClick = () => {
    // In auto-battle mode, only allow targeting enemy cards
    if (canBeTargeted && side === 'opponent') {
      selectTarget(card.id)
    } else if (canBeSelected && side === 'player') {
      // Optional: disable card selection in auto-battle mode
      // For now, still allow it for visibility but it won't affect auto-selection
      selectCard(isSelected ? null : card.id)
    }
  }

  const cardColor = useMemo(() => {
    if (damageFlash) return '#ff0000' // Red flash on damage
    if (healFlash) return '#00ff00'   // Green flash on heal
    if (isDead) return '#333333'
    if (hasFireAura) {
      // Intensify orange glow based on stacks
      const intensity = fireAuraStacks
      return intensity === 3 ? '#ff4500' : intensity === 2 ? '#ff6600' : '#ff8800'
    }
    if (isFrozen) return '#4FC3F7'
    if (isBurned) return '#FF6B6B'
    if (isPoisoned) return '#66BB6A'
    if (isStunned) return '#FFB74D'
    return '#ffffff'
  }, [isDead, isFrozen, isBurned, isPoisoned, isStunned, damageFlash, healFlash, hasFireAura, fireAuraStacks])

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
        <boxGeometry args={[1.5, 2, 0.1]} />
        <meshStandardMaterial
          map={texture}
          color={cardColor}
          emissive={
            damageFlash ? '#ff0000' :
            healFlash ? '#00ff00' :
            isSelected ? '#ffaa00' :
            isTarget ? '#ff0000' :
            '#000000'
          }
          emissiveIntensity={
            damageFlash || healFlash ? 0.8 :
            isSelected || isTarget ? 0.3 :
            0
          }
        />
      </mesh>

      {/* HP and debuffs now handled by DOM overlay for better performance */}

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

      {/* Fire Aura Effect */}
      {hasFireAura && fireAuraStacks > 0 && !isDead && (
        <FireAuraEffect stacks={fireAuraStacks} />
      )}

      {/* Damage Numbers - Always active to show damage/healing */}
      <DamageNumbers
        card={initialCard}
        position={[0, 0, 0]}
        side={side}
      />
    </group>
  )
}