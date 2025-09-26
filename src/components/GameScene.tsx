'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei'
import { Suspense, useEffect, useState } from 'react'
import useOptimizedGameStore, { useGamePhase, useCurrentTurn, useGameActions } from '@/stores/optimizedGameStore'
import { Table } from './3d/Table'
import { Card } from './3d/Card'
import { SpellEffect } from './3d/Effects'
import { VFXFireball } from './3d/VFXFireball'
import { VFXLightning } from './3d/VFXLightning'
import VFXSystem from './vfx/VFXSystem'
import { aiSelectAction, executeAbility, applyAbilityEffects, processDebuffDamage } from '@/utils/abilityLogic'
import { SpellEffectData } from './GameUI'

export function GameScene() {
  const store = useOptimizedGameStore()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()
  const { endTurn } = useGameActions()

  // Convert Maps to arrays for rendering
  const playerCards = Array.from(store.playerCards.values())
  const opponentCards = Array.from(store.opponentCards.values())

  const [activeEffects, setActiveEffects] = useState<Array<{
    id: string
    type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison' | 'fireball' | 'chain_lightning'
    position: [number, number, number]
    sourcePosition?: [number, number, number]
    targetPosition?: [number, number, number]
    targetPositions?: [number, number, number][]  // For multi-target effects
  }>>([])

  // Listen for spell effects from GameUI
  useEffect(() => {
    const handleSpellEffect = (event: CustomEvent<SpellEffectData>) => {
      const effectData = event.detail
      console.log('[GAMESCENE DEBUG] Received spell effect:', effectData)

      setActiveEffects(prev => [...prev, {
        id: effectData.id,
        type: effectData.type,
        position: effectData.position,
        sourcePosition: effectData.sourcePosition,
        targetPosition: effectData.targetPosition
      }])

      // Auto-remove effect after duration
      const duration = 2000
      setTimeout(() => {
        removeEffect(effectData.id)
      }, duration)
    }

    window.addEventListener('spellEffect' as any, handleSpellEffect)
    return () => window.removeEventListener('spellEffect' as any, handleSpellEffect)
  }, [])

  useEffect(() => {
    if (phase === 'opponent_turn') {
      const timer = setTimeout(() => {
        const action = aiSelectAction(opponentCards, playerCards)

        if (action) {
          const sourceCard = opponentCards.find(c => c.id === action.cardId)
          const targetCard = action.targetId
            ? [...playerCards, ...opponentCards].find(c => c.id === action.targetId)
            : null

          if (sourceCard) {
            const ability = sourceCard.abilities[action.abilityIndex]
            const result = executeAbility(ability, sourceCard, targetCard || null, opponentCards, playerCards)

            if (result.success) {
              // Use visual effect from result or determine from ability
              const effectType = result.visualEffect ||
                                (ability.effect === 'freeze' ? 'freeze' :
                                ability.effect === 'burn' ? 'fire' :
                                ability.heal ? 'heal' :
                                ability.damage && ability.damage >= 30 ? 'fire' :
                                'fire')

              const effectPosition: [number, number, number] = targetCard
                ? [targetCard.position?.[0] || 0, 1, targetCard.position?.[2] || 0]
                : [0, 1, 0]

              const sourcePosition: [number, number, number] = sourceCard.position || [0, 1, 0]

              setActiveEffects(prev => [...prev, {
                id: `effect-${Date.now()}`,
                type: effectType,
                position: sourcePosition,
                sourcePosition: sourcePosition,
                targetPosition: effectPosition
              }])


              applyAbilityEffects(result, useOptimizedGameStore.getState())

              setTimeout(() => {
                processDebuffDamage(useOptimizedGameStore.getState())
                store.checkWinCondition()
              }, 500)
            }
          }
        }

        setTimeout(() => {
          endTurn()
        }, 2500)
      }, 1500)

      return () => clearTimeout(timer)
    }
  }, [phase, currentTurn])

  const removeEffect = (id: string) => {
    console.log('[GAMESCENE DEBUG] Removing effect:', id)
    setActiveEffects(prev => prev.filter(e => e.id !== id))
  }

  return (
    <Canvas shadows className="w-full h-full">
      <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={50} />
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 4} // 45° for less fishbowl effect
        maxPolarAngle={Math.PI / 2.5} // ~72° max
        minDistance={5}
        maxDistance={15}
        enableZoom={true}
        zoomSpeed={0.5}
      />

      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <Suspense fallback={null}>
        <Environment preset="night" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />

        <Table />

        {playerCards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            position={card.position || [(-3 + index * 2) as number, 0, 2]}
            side="player"
            index={index}
          />
        ))}

        {opponentCards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            position={card.position || [(-3 + index * 2) as number, 0, -2]}
            side="opponent"
            index={index}
          />
        ))}

        <VFXSystem />

        {activeEffects.map(effect => (
          effect.type === 'fireball' ? (
            <VFXFireball
              key={effect.id}
              position={effect.sourcePosition || effect.position}
              target={effect.targetPosition || [0, 0, -2]}
              onComplete={() => removeEffect(effect.id)}
            />
          ) : effect.type === 'lightning' || effect.type === 'chain_lightning' ? (
            <VFXLightning
              key={effect.id}
              startPosition={effect.sourcePosition || effect.position}
              endPosition={effect.targetPosition || [0, 0, -2]}
              onComplete={() => removeEffect(effect.id)}
            />
          ) : (
            <SpellEffect
              key={effect.id}
              type={effect.type as 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison'}
              position={effect.position}
              targetPosition={effect.targetPosition}
              duration={2}
              onComplete={() => removeEffect(effect.id)}
            />
          )
        ))}
      </Suspense>
    </Canvas>
  )
}