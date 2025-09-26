import { useRef, useState, useEffect, Suspense } from 'react'
import { Mesh, Group, AnimationMixer, AnimationAction } from 'three'
import { useFrame, useLoader } from '@react-three/fiber'
import { Html, useGLTF, useAnimations } from '@react-three/drei'
import { useCard, useSelection, useGamePhase, useCurrentTurn } from '@/stores/optimizedGameStore'
import { CardData } from '@/stores/cardStore'
import * as THREE from 'three'

interface Card3DProps {
  card: CardData
  position: [number, number, number]
  side: 'player' | 'opponent'
  index: number
}

// Model mapping for different card types
const modelMap: Record<string, string> = {
  'Toy Wizard': '/wizardglb.glb',
  'Robot': '/soldierglb.glb', // Using soldier as placeholder for robot
  'Dragon': '/soldierglb.glb', // Using soldier as placeholder
  'Knight': '/soldierglb.glb',
  'Ninja': '/soldierglb.glb',
  'Healer': '/wizardglb.glb', // Using wizard as placeholder for healer
  'Pirate': '/soldierglb.glb',
  'Alien': '/soldierglb.glb',
}

function CardModel({ modelPath, card, isSelected, isDead, side }: {
  modelPath: string,
  card: CardData,
  isSelected: boolean,
  isDead: boolean,
  side: 'player' | 'opponent'
}) {
  const groupRef = useRef<Group>(null)
  const mixerRef = useRef<AnimationMixer | null>(null)
  const { scene, animations } = useGLTF(modelPath)
  const { actions, mixer } = useAnimations(animations, groupRef)

  const [hovered, setHovered] = useState(false)

  // Clone the scene to avoid sharing materials between instances
  const clonedScene = scene.clone()

  useEffect(() => {
    if (mixer) {
      mixerRef.current = mixer
    }
  }, [mixer])

  // Play idle animation if available
  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      const idleAction = actions[Object.keys(actions)[0]] // Get first animation
      if (idleAction) {
        idleAction.play()
      }
    }
  }, [actions])

  // Animation and effects
  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Update animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta)
    }

    // Hover effect
    const targetY = hovered && !isDead ? 0.3 : 0
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1

    // Selection rotation
    if (isSelected) {
      groupRef.current.rotation.y += delta * 0.5
    }

    // Death animation
    if (isDead) {
      groupRef.current.rotation.x += delta * 0.5
      groupRef.current.scale.setScalar(Math.max(0.1, groupRef.current.scale.x - delta * 0.5))
    }

    // Debuff effects
    const isFrozen = card.debuffs.some(d => d.type === 'frozen')
    if (isFrozen) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 10) * 0.02
    }
  })

  return (
    <group
      ref={groupRef}
      scale={0.5}
      rotation={[0, side === 'player' ? 0 : Math.PI, 0]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={clonedScene} />

      {/* Add glow effect for selected cards */}
      {isSelected && (
        <pointLight position={[0, 1, 0]} intensity={2} color="#ffff00" distance={3} />
      )}
    </group>
  )
}

export function Card3D({ card: initialCard, position, side, index }: Card3DProps) {
  const meshRef = useRef<Mesh>(null)
  const [previousHp, setPreviousHp] = useState(initialCard.hp)
  const [damageFlash, setDamageFlash] = useState(false)
  const [healFlash, setHealFlash] = useState(false)

  // Use optimized selectors
  const card = useCard(side, initialCard.id) || initialCard
  const { selectedCardId, targetCardId, selectCard, selectTarget } = useSelection()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()

  const isSelected = selectedCardId === initialCard.id
  const isTarget = targetCardId === initialCard.id
  const isDead = card.hp <= 0
  const isFrozen = card.debuffs.some(d => d.type === 'frozen')
  const isBurned = card.debuffs.some(d => d.type === 'burned')
  const isPoisoned = card.debuffs.some(d => d.type === 'poisoned')
  const isStunned = card.debuffs.some(d => d.type === 'stunned')

  // Get the model path for this card
  const modelPath = modelMap[card.name] || '/soldierglb.glb'

  // HP change detection
  useEffect(() => {
    if (card.hp < previousHp) {
      setDamageFlash(true)
      setTimeout(() => setDamageFlash(false), 500)
    } else if (card.hp > previousHp) {
      setHealFlash(true)
      setTimeout(() => setHealFlash(false), 500)
    }
    setPreviousHp(card.hp)
  }, [card.hp, previousHp])

  const handleClick = () => {
    if (isDead) return

    if (side === 'player' && currentTurn === 'player' && phase === 'player_turn') {
      if (selectedCardId === initialCard.id) {
        selectCard(null)
      } else {
        selectCard(initialCard.id)
      }
    } else if (selectedCardId && side === 'opponent') {
      selectTarget(initialCard.id)
    }
  }

  const handlePointerOver = () => {
    if (!isDead) {
      document.body.style.cursor = 'pointer'
    }
  }

  const handlePointerOut = () => {
    document.body.style.cursor = 'default'
  }

  return (
    <group position={position}>
      <Suspense fallback={
        <mesh>
          <boxGeometry args={[1, 2, 0.5]} />
          <meshStandardMaterial color="#666" />
        </mesh>
      }>
        <group
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <CardModel
            modelPath={modelPath}
            card={card}
            isSelected={isSelected}
            isDead={isDead}
            side={side}
          />
        </group>
      </Suspense>

      {/* Card base/platform */}
      <mesh
        position={[0, -0.1, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.8, 0.8, 0.2, 32]} />
        <meshStandardMaterial
          color={
            damageFlash ? '#ff0000' :
            healFlash ? '#00ff00' :
            isSelected ? '#ffff00' :
            isTarget ? '#ff6600' :
            side === 'player' ? '#4444ff' : '#ff4444'
          }
          emissive={isSelected || isTarget ? '#ffffff' : '#000000'}
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* HP and Status Display */}
      <Html
        center
        distanceFactor={10}
        position={[0, 2.5, 0]}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <div className="bg-black/90 px-3 py-1 rounded-lg text-white text-sm font-bold shadow-lg">
            {card.name}
          </div>

          {/* HP Bar */}
          <div className="bg-black/90 px-2 py-1 rounded-lg">
            <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300"
                style={{ width: `${(card.hp / card.maxHp) * 100}%` }}
              />
            </div>
            <div className="text-white text-xs text-center mt-1">
              {card.hp}/{card.maxHp} HP
            </div>
          </div>

          {/* Debuff Icons */}
          {card.debuffs.length > 0 && (
            <div className="flex gap-1 bg-black/70 px-2 py-1 rounded">
              {isFrozen && (
                <span className="text-cyan-300" title="Frozen">❄️</span>
              )}
              {isBurned && (
                <span className="text-orange-400" title="Burned">🔥</span>
              )}
              {isPoisoned && (
                <span className="text-green-400" title="Poisoned">☠️</span>
              )}
              {isStunned && (
                <span className="text-yellow-400" title="Stunned">⚡</span>
              )}
            </div>
          )}
        </div>
      </Html>

      {/* Selection Ring */}
      {isSelected && (
        <mesh
          position={[0, 0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[1.2, 1.5, 32]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Target Ring */}
      {isTarget && (
        <mesh
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[1.2, 1.5, 32]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Shadow */}
      <mesh
        position={[0, -0.15, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[2, 2]} />
        <shadowMaterial opacity={0.3} />
      </mesh>
    </group>
  )
}

// Preload models
useGLTF.preload('/wizardglb.glb')
useGLTF.preload('/soldierglb.glb')