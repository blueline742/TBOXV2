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
import { VFXBatteryDrain } from './3d/VFXBatteryDrain'
import { VFXChaosShuffle } from './3d/VFXChaosShuffle'
import { VFXSwordStrike } from './3d/VFXSwordStrike'
import VFXSystem from './vfx/VFXSystem'
import { aiSelectAction, executeAbility, applyAbilityEffects, processDebuffDamage } from '@/utils/abilityLogic'
import { SpellEffectData } from './GameUI'
import { preloadCardTextures } from '@/utils/texturePreloader'
import { CardOverlay, CardPosition } from './CardOverlay'

export function GameScene() {
  const store = useOptimizedGameStore()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()
  const { endTurn } = useGameActions()

  // Track card screen positions for DOM overlay
  const [cardPositions, setCardPositions] = useState<CardPosition[]>([])

  // Preload all textures on mount
  useEffect(() => {
    preloadCardTextures()
  }, [])

  // Callback for cards to update their screen positions
  const handleScreenPositionUpdate = useCallback((cardId: string, side: 'player' | 'opponent', screenPosition: { x: number; y: number }) => {
    setCardPositions(prev => {
      const existing = prev.find(p => p.cardId === cardId && p.side === side)
      if (existing) {
        // Update existing position
        return prev.map(p =>
          p.cardId === cardId && p.side === side
            ? { ...p, screenPosition }
            : p
        )
      } else {
        // Add new position
        return [...prev, { cardId, side, screenPosition }]
      }
    })
  }, [])

  // Convert Maps to arrays for rendering
  const playerCards = Array.from(store.playerCards.values())
  const opponentCards = Array.from(store.opponentCards.values())

  const [activeEffects, setActiveEffects] = useState<Array<{
    id: string
    type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison' | 'fireball' | 'chain_lightning' | 'ice_nova' | 'battery_drain' | 'chaos_shuffle' | 'sword_strike'
    position: [number, number, number]
    sourcePosition?: [number, number, number]
    targetPosition?: [number, number, number]
    targetPositions?: [number, number, number][]  // For multi-target effects
    enemyPositions?: [number, number, number][]  // For Battery Drain
    allyPositions?: [number, number, number][]  // For Battery Drain
  }>>([])

  // Listen for spell effects from GameUI
  useEffect(() => {
    const handleSpellEffect = (event: CustomEvent<SpellEffectData>) => {
      const effectData = event.detail
      // console.log('[GAMESCENE DEBUG] Received spell effect:', effectData)

      setActiveEffects(prev => {
        // Check if effect with this ID already exists
        if (prev.some(e => e.id === effectData.id)) {
          // console.log('[GAMESCENE DEBUG] Effect already exists, skipping:', effectData.id)
          return prev
        }
        return [...prev, {
          id: effectData.id,
          type: effectData.type,
          position: effectData.position,
          sourcePosition: effectData.sourcePosition,
          targetPosition: effectData.targetPosition,
          enemyPositions: effectData.enemyPositions,
          allyPositions: effectData.allyPositions
        }]
      })

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

        {activeEffects.map(effect => {
          console.log('[GAMESCENE] Rendering effect type:', effect.type)
          if (effect.type === 'battery_drain') {
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
              <VFXIceNova
                key={effect.id}
                position={effect.position}
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
    </>
  )
}