'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Stars, useHelper } from '@react-three/drei'
import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import * as THREE from 'three'
import useOptimizedGameStore, { useGamePhase, useCurrentTurn, useGameActions } from '@/stores/optimizedGameStore'
import { Table } from './3d/Table'
import { Card } from './3d/Card'
import { SpellEffect } from './3d/Effects'
import { Skybox } from './3d/Skybox'
import { VFXFireball } from './3d/VFXFireball'
import { VFXLightning } from './3d/VFXLightning'
import { VFXIceNova } from './3d/VFXIceNova'
import { VFXIceNovaShockwave } from './3d/VFXIceNovaShockwave'
import { VFXBatteryDrain } from './3d/VFXBatteryDrain'
import { VFXChaosShuffle } from './3d/VFXChaosShuffle'
import { VFXSwordStrike } from './3d/VFXSwordStrike'
import { VFXWhirlwindSlash } from './3d/VFXWhirlwindSlash'
import { VFXShieldBubble } from './3d/VFXShieldBubble'
import { VFXFireBreath } from './3d/VFXFireBreath'
import { VFXMechaRoar } from './3d/VFXMechaRoar'
import { VFXExtinctionProtocol } from './3d/VFXExtinctionProtocol'
import { VFXWaterSquirt } from './3d/VFXWaterSquirt'
import { VFXBathBomb } from './3d/VFXBathBomb'
import { VFXDuckSwarm } from './3d/VFXDuckSwarm'
import { VFXLaserBeam } from './3d/VFXLaserBeam'
import { VFXShieldBoost } from './3d/VFXShieldBoost'
import { VFXResurrection } from './3d/VFXResurrection'
import VFXSystem from './vfx/VFXSystem'
import { VFXPrewarmer } from './vfx/VFXPrewarmer'
import { aiSelectAction, executeAbility, applyAbilityEffects, processDebuffDamage } from '@/utils/abilityLogic'
import { SpellEffectData } from './GameUI'
import { preloadCardTextures, preloadSceneAssets } from '@/utils/texturePreloader'
import { CardOverlay, CardPosition } from './CardOverlay'
import { DynamicCamera } from './3d/DynamicCamera'
import { LoadingScreen } from './LoadingScreen'
import { CardStatusUI } from './CardStatusUI'

export function GameScene() {
  const store = useOptimizedGameStore()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()
  const { endTurn } = useGameActions()

  // Track card positions for debuff overlay
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([])

  // Dynamic FOV based on aspect ratio for better mobile experience
  const [fov, setFov] = useState(50)

  useEffect(() => {
    const updateFov = () => {
      const aspectRatio = window.innerWidth / window.innerHeight
      // Portrait or narrow screens get wider FOV
      setFov(aspectRatio < 1 ? 70 : aspectRatio < 1.3 ? 60 : 50)
    }

    updateFov()
    window.addEventListener('resize', updateFov)
    return () => window.removeEventListener('resize', updateFov)
  }, [])

  // Preload all textures and scene assets on mount
  useEffect(() => {
    preloadCardTextures()
    preloadSceneAssets()
  }, [])

  // Pre-warm VFX shaders to prevent first-use lag
  useEffect(() => {
    const warmupEffects = [
      {
        id: 'warmup-whirlwind',
        type: 'whirlwind_slash',
        position: [1000, 1000, 1000] as [number, number, number],
        sourcePosition: [1000, 1000, 1000] as [number, number, number],
        targetPositions: [[1001, 1000, 1000] as [number, number, number]],
        targetId: 'warmup'
      },
      {
        id: 'warmup-sword',
        type: 'sword_strike',
        position: [1000, 1000, 1000] as [number, number, number],
        sourcePosition: [1000, 1000, 1000] as [number, number, number],
        targetPosition: [1001, 1000, 1000] as [number, number, number],
        targetId: 'warmup'
      },
      {
        id: 'warmup-fireball',
        type: 'fireball',
        position: [1000, 1000, 1000] as [number, number, number],
        sourcePosition: [1000, 1000, 1000] as [number, number, number],
        targetPosition: [1001, 1000, 1000] as [number, number, number],
        targetId: 'warmup'
      }
    ]

    // Trigger warmup effects after scene loads
    const timer = setTimeout(() => {
      warmupEffects.forEach((effect, index) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('spellEffect', { detail: effect }))
        }, index * 50) // Stagger to avoid overwhelming GPU
      })
    }, 500) // Wait for scene to be ready

    return () => clearTimeout(timer)
  }, [])

  // Callback for cards to update their screen positions (only for debuff display)
  const handleScreenPositionUpdate = useCallback((cardId: string, side: 'player' | 'opponent', screenPosition: { x: number; y: number }) => {
    setCardPositions(prev => {
      const existing = prev.find(p => p.cardId === cardId && p.side === side)
      if (existing) {
        return prev.map(p =>
          p.cardId === cardId && p.side === side ? { ...p, screenPosition } : p
        )
      } else {
        return [...prev, { cardId, side, screenPosition }]
      }
    })
  }, [])

  // Convert Maps to arrays for rendering
  const playerCards = Array.from(store.playerCards.values())
  const opponentCards = Array.from(store.opponentCards.values())

  const [activeEffects, setActiveEffects] = useState<Array<{
    id: string
    type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison' | 'fireball' | 'chain_lightning' | 'ice_nova' | 'battery_drain' | 'chaos_shuffle' | 'sword_strike' | 'whirlwind_slash' | 'shield' | 'fire_breath' | 'mecha_roar' | 'extinction_protocol' | 'water_squirt' | 'bath_bomb' | 'duck_swarm' | 'laser_beam' | 'shield_boost' | 'resurrection'
    position: [number, number, number]
    sourcePosition?: [number, number, number]
    targetPosition?: [number, number, number]
    targetPositions?: [number, number, number][]  // For multi-target effects
    enemyPositions?: [number, number, number][]  // For Battery Drain
    allyPositions?: [number, number, number][]  // For Bath Bomb / Battery Drain
  }>>([])

  // Listen for spell effects from GameUI
  useEffect(() => {
    const handleSpellEffect = (event: CustomEvent<SpellEffectData>) => {
      const effectData = event.detail

      setActiveEffects(prev => {
        // Check if effect with this ID already exists
        if (prev.some(e => e.id === effectData.id)) {
          return prev
        }
        return [...prev, {
          id: effectData.id,
          type: effectData.type,
          position: effectData.position,
          sourcePosition: effectData.sourcePosition,
          targetPosition: effectData.targetPosition,
          targetPositions: effectData.targetPositions,
          enemyPositions: effectData.enemyPositions,
          allyPositions: effectData.allyPositions
        }]
      })

      // Auto-remove effect after duration (longer for multi-rocket effects)
      const duration = effectData.type === 'extinction_protocol' ? 3500 : 2000
      setTimeout(() => {
        removeEffect(effectData.id)
      }, duration)
    }

    window.addEventListener('spellEffect' as any, handleSpellEffect)
    return () => window.removeEventListener('spellEffect' as any, handleSpellEffect)
  }, [])

  useEffect(() => {
    // AI COMPLETELY DISABLED - opponent_turn phase exists but does nothing
    if (phase === 'opponent_turn') {
      // Just notify that it's opponent's turn, no AI action
      const thinkingEvent = new CustomEvent('aiActionComplete', {
        detail: { message: "Opponent's turn - waiting for action..." }
      })
      window.dispatchEvent(thinkingEvent)
    }
  }, [phase])

  const removeEffect = (id: string) => {
    // console.log('[GAMESCENE DEBUG] Removing effect:', id)
    setActiveEffects(prev => prev.filter(e => e.id !== id))
  }

  return (
    <>
    <LoadingScreen />
    <Canvas shadows className="w-full h-full">
      <PerspectiveCamera makeDefault position={[0, 8, 10]} fov={fov} />
      <DynamicCamera />
      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 4} // 45° for less fishbowl effect
        maxPolarAngle={Math.PI / 2.5} // ~72° max
        minDistance={5}
        maxDistance={15}
        enableZoom={true}
        zoomSpeed={0.5}
        enableDamping={true}
        dampingFactor={0.05}
      />

      {/* Natural room lighting setup */}
      {/* Warm ambient light - like room lighting */}
      <ambientLight intensity={0.6} color="#fff5e6" />

      {/* Main sunlight coming through window */}
      <directionalLight
        position={[5, 12, 8]}
        intensity={1.2}
        color="#fffaf0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Secondary fill light - softer shadows */}
      <directionalLight
        position={[-5, 8, 5]}
        intensity={0.4}
        color="#e6f3ff"
      />

      {/* Rim light for depth */}
      <pointLight
        position={[0, 5, -8]}
        intensity={0.5}
        color="#ffd700"
        distance={15}
        decay={2}
      />

      {/* Soft uplight from table surface */}
      <pointLight
        position={[0, 0, 0]}
        intensity={0.3}
        color="#fff8dc"
        distance={20}
      />

      <Suspense fallback={null}>
        {/* Custom skybox background */}
        <Skybox />

        {/* Optional: Keep stars for additional atmosphere, or remove if not needed */}
        {/* <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade /> */}

        <Table />

        {playerCards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            position={card.position || [(-3 + index * 2) as number, 0, 2]}
            side="player"
            index={index}
            onScreenPositionUpdate={handleScreenPositionUpdate}
          />
        ))}

        {opponentCards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            position={card.position || [(-3 + index * 2) as number, 0, -2]}
            side="opponent"
            index={index}
            onScreenPositionUpdate={handleScreenPositionUpdate}
          />
        ))}

        <VFXSystem />
        <VFXPrewarmer />

        {activeEffects.map(effect => {
          if (effect.type === 'fire_breath') {
            console.log('[FIRE BREATH VFX] Effect data:', {
              hasEnemyPositions: !!effect.enemyPositions,
              enemyPositionsLength: effect.enemyPositions?.length,
              enemyPositions: effect.enemyPositions,
              targetPosition: effect.targetPosition
            })

            // Handle multi-target fire breath (Fire Aura)
            if (effect.enemyPositions && effect.enemyPositions.length > 0) {
              console.log('[FIRE BREATH VFX] Rendering multi-target with', effect.enemyPositions.length, 'targets')
              return (
                <group key={effect.id}>
                  {effect.enemyPositions.map((targetPos, idx) => (
                    <VFXFireBreath
                      key={`${effect.id}-${idx}`}
                      sourcePosition={effect.sourcePosition || effect.position}
                      targetPosition={targetPos}
                      onComplete={idx === 0 ? () => removeEffect(effect.id) : () => {}}
                    />
                  ))}
                </group>
              )
            }
            // Single target fire breath (Mecha Dino)
            console.log('[FIRE BREATH VFX] Rendering single-target')
            return (
              <VFXFireBreath
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPosition={effect.targetPosition || [0, 0, -2]}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'mecha_roar') {
            return (
              <VFXMechaRoar
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPositions={effect.targetPositions}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'battery_drain') {
            return (
              <VFXBatteryDrain
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                enemyPositions={effect.enemyPositions || []}
                allyPositions={effect.allyPositions || []}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'chaos_shuffle') {
            return (
              <VFXChaosShuffle
                key={effect.id}
                position={effect.position}
                enemyPositions={effect.enemyPositions || []}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'ice_nova') {
            return (
              <VFXIceNovaShockwave
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPositions={effect.targetPositions}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'fireball') {
            return (
              <VFXFireball
                key={effect.id}
                position={effect.sourcePosition || effect.position}
                target={effect.targetPosition || [0, 0, -2]}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'lightning' || effect.type === 'chain_lightning') {
            return (
              <VFXLightning
                key={effect.id}
                startPosition={effect.sourcePosition || effect.position}
                endPosition={effect.targetPosition || [0, 0, -2]}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'sword_strike') {
            return (
              <VFXSwordStrike
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPosition={effect.targetPosition || [0, 0, -2]}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'whirlwind_slash') {
            return (
              <VFXWhirlwindSlash
                key={effect.id}
                position={effect.sourcePosition || effect.position}
                targetPositions={effect.targetPositions}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'extinction_protocol') {
            return (
              <VFXExtinctionProtocol
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPositions={effect.targetPositions || []}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'water_squirt') {
            return (
              <VFXWaterSquirt
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPosition={effect.targetPosition || [0, 0, -2]}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'bath_bomb') {
            return (
              <VFXBathBomb
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                allyPositions={effect.allyPositions || []}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'duck_swarm') {
            return (
              <VFXDuckSwarm
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPositions={effect.targetPositions || []}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'laser_beam') {
            return (
              <VFXLaserBeam
                key={effect.id}
                sourcePosition={effect.sourcePosition || effect.position}
                targetPosition={effect.targetPosition || [0, 0, -2]}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'shield_boost') {
            // Check for multiple targets (allies)
            if (effect.targetPositions && effect.targetPositions.length > 1) {
              return effect.targetPositions.map((pos, idx) => (
                <VFXShieldBoost
                  key={`${effect.id}-${idx}`}
                  position={pos}
                  onComplete={() => {
                    if (idx === effect.targetPositions!.length - 1) {
                      removeEffect(effect.id)
                    }
                  }}
                />
              ))
            }
            // Single target fallback
            return (
              <VFXShieldBoost
                key={effect.id}
                position={effect.targetPosition || effect.position}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'shield') {
            // If targetPositions exists with multiple positions, render multiple shields
            if (effect.targetPositions && effect.targetPositions.length > 1) {
              return effect.targetPositions.map((pos, idx) => (
                <VFXShieldBubble
                  key={`${effect.id}-${idx}`}
                  position={pos}
                  onComplete={() => {
                    if (idx === effect.targetPositions!.length - 1) {
                      removeEffect(effect.id)
                    }
                  }}
                />
              ))
            }
            // Single shield
            return (
              <VFXShieldBubble
                key={effect.id}
                position={effect.targetPosition || effect.position}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else if (effect.type === 'resurrection') {
            // Resurrection effect for multiple dead allies
            if (effect.targetPositions && effect.targetPositions.length > 0) {
              return effect.targetPositions.map((pos, idx) => (
                <VFXResurrection
                  key={`${effect.id}-${idx}`}
                  position={pos}
                  onComplete={() => {
                    if (idx === effect.targetPositions!.length - 1) {
                      removeEffect(effect.id)
                    }
                  }}
                />
              ))
            }
            // Single target fallback
            return (
              <VFXResurrection
                key={effect.id}
                position={effect.targetPosition || effect.position}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          } else {
            return (
              <SpellEffect
                key={effect.id}
                type={effect.type as 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison'}
                position={effect.position}
                targetPosition={effect.targetPosition}
                duration={2}
                onComplete={() => removeEffect(effect.id)}
              />
            )
          }
        })}
      </Suspense>
    </Canvas>
    <CardOverlay cards={cardPositions} />
    <CardStatusUI />
    </>
  )
}