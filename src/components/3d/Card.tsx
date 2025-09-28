import { useRef, useState, useMemo, useEffect } from 'react'
import { Mesh, TextureLoader } from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useCard, useSelection, useGamePhase, useCurrentTurn } from '@/stores/optimizedGameStore'
import { CardData } from '@/stores/cardStore'
import { FireAuraEffect } from './FireAuraEffect'
import { DamageNumbers } from './DamageNumbers'

interface CardProps {
  card: CardData
  position: [number, number, number]
  side: 'player' | 'opponent'
  index: number
}

export function Card({ card: initialCard, position, side, index }: CardProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [previousHp, setPreviousHp] = useState(initialCard.hp)
  const [damageFlash, setDamageFlash] = useState(false)
  const [healFlash, setHealFlash] = useState(false)

  // Use optimized selectors
  const card = useCard(side, initialCard.id) || initialCard
  const { selectedCardId, targetCardId, selectCard, selectTarget } = useSelection()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()

  const isSelected = selectedCardId === card.id
  const isTarget = targetCardId === card.id
  const isDead = card.hp <= 0
  const isFrozen = card.debuffs.some(d => d.type === 'frozen')
  const isBurned = card.debuffs.some(d => d.type === 'burned')
  const isPoisoned = card.debuffs.some(d => d.type === 'poisoned')
  const isStunned = card.debuffs.some(d => d.type === 'stunned')
  const hasFireAura = card.debuffs.find(d => d.type === 'fire_aura')
  const fireAuraStacks = hasFireAura?.stacks || 0

  // Detect HP changes for visual feedback
  useEffect(() => {
    if (card.hp < previousHp) {
      // Damage taken
      setDamageFlash(true)
      console.log(`[CARD DEBUG] ${card.name} took ${previousHp - card.hp} damage`)
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

  // Load the actual card texture
  const texture = useLoader(TextureLoader, card.texture || '/wizardnft.png')

  useFrame((state) => {
    if (!meshRef.current) return

    // Apply vertical animations relative to the mesh's origin (0,0,0)
    if (isDead) {
      meshRef.current.position.y = -0.4
      meshRef.current.rotation.x = -Math.PI / 2
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

      {!isDead && (
        <>
          <Html
            position={[0, 1.3, 0.1]}
            center
            distanceFactor={10}
            style={{
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            <div className="flex flex-col items-center gap-1">
              {card.debuffs.length > 0 && (
                <div className="flex gap-1 mb-1">
                  {card.debuffs.map((debuff, i) => {
                    // Define icons and colors for each debuff type
                    const debuffDisplay = {
                      frozen: { icon: '❄️', bg: 'bg-blue-500/90', label: 'Frozen' },
                      burned: { icon: '🔥', bg: 'bg-red-500/90', label: 'Burn' },
                      fire_aura: { icon: '🔥', bg: 'bg-orange-600/90', label: 'Fire Aura' },
                      poisoned: { icon: '☠️', bg: 'bg-green-600/90', label: 'Poison' },
                      stunned: { icon: '⚡', bg: 'bg-yellow-600/90', label: 'Stun' }
                    }[debuff.type] || { icon: '⚠️', bg: 'bg-gray-600/90', label: debuff.type }

                    return (
                      <div
                        key={i}
                        className={`${debuffDisplay.bg} px-1.5 py-0.5 rounded flex items-center gap-1 text-white`}
                        title={`${debuffDisplay.label}: ${debuff.damage ? `${debuff.damage * (debuff.stacks || 1)} dmg/turn` : 'No damage'} ${debuff.duration > 0 ? `(${debuff.duration} turns)` : ''}`}
                      >
                        <span className="text-sm">{debuffDisplay.icon}</span>
                        {debuff.type === 'fire_aura' && debuff.stacks && debuff.stacks > 1 && (
                          <span className="text-xs font-bold">{debuff.stacks}</span>
                        )}
                        {debuff.damage && (
                          <span className="text-xs font-semibold">
                            {debuff.damage * (debuff.stacks || 1)}
                          </span>
                        )}
                        {debuff.duration > 0 && debuff.duration < 999 && (
                          <span className="text-xs opacity-75">({debuff.duration})</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="bg-black/80 rounded-lg px-2 py-1">
                <div className="w-20 bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${(card.hp / card.maxHp) * 100}%`,
                      background: card.hp / card.maxHp > 0.5 ?
                        'linear-gradient(to right, #10b981, #22c55e)' :
                        card.hp / card.maxHp > 0.25 ?
                        'linear-gradient(to right, #f59e0b, #fbbf24)' :
                        'linear-gradient(to right, #dc2626, #ef4444)'
                    }}
                  />
                </div>
                <div className="text-white text-xs text-center mt-0.5">
                  {card.hp}/{card.maxHp} HP
                </div>
              </div>
            </div>
          </Html>
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