'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Stars } from '@react-three/drei'
import { Suspense, useEffect, useState } from 'react'
import useGameStore from '@/stores/gameStore'
import { Table } from './3d/Table'
import { Card } from './3d/Card'
import { SpellEffect } from './3d/Effects'
import { aiSelectAction, executeAbility, applyAbilityEffects, processDebuffDamage } from '@/utils/abilityLogic'

export function GameScene() {
  const {
    playerCards,
    opponentCards,
    phase,
    currentTurn,
    endTurn,
    checkWinCondition
  } = useGameStore()

  const [activeEffects, setActiveEffects] = useState<Array<{
    id: string
    type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison'
    position: [number, number, number]
  }>>([])

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
              const effectType = ability.effect === 'freeze' ? 'freeze' :
                                ability.effect === 'burn' ? 'fire' :
                                ability.heal ? 'heal' :
                                ability.damage && ability.damage > 30 ? 'lightning' :
                                'fire'

              const effectPosition: [number, number, number] = targetCard
                ? [targetCard.position?.[0] || 0, 1, targetCard.position?.[2] || 0]
                : [0, 1, 0]

              setActiveEffects(prev => [...prev, {
                id: `effect-${Date.now()}`,
                type: effectType,
                position: effectPosition
              }])

              applyAbilityEffects(result, useGameStore.getState())

              setTimeout(() => {
                processDebuffDamage(useGameStore.getState())
                checkWinCondition()
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
    setActiveEffects(prev => prev.filter(e => e.id !== id))
  }

  return (
    <Canvas shadows className="w-full h-full">
      <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={50} />
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 3}
        minDistance={8}
        maxDistance={20}
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
            position={[(-3 + index * 2) as number, 0, 2]}
            side="player"
            index={index}
          />
        ))}

        {opponentCards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            position={[(-3 + index * 2) as number, 0, -2]}
            side="opponent"
            index={index}
          />
        ))}

        {activeEffects.map(effect => (
          <SpellEffect
            key={effect.id}
            type={effect.type}
            position={effect.position}
            duration={2}
            onComplete={() => removeEffect(effect.id)}
          />
        ))}
      </Suspense>
    </Canvas>
  )
}