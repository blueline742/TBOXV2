import { useEffect } from 'react'
import useOptimizedGameStore, {
  useGamePhase,
  useCurrentTurn,
  useTurnNumber,
  useWinner,
  useSelection,
  useGameActions,
  useAutoBattle,
  useCard,
  useCombatLog
} from '@/stores/optimizedGameStore'
import useCardStore from '@/stores/cardStore'
import useMultiplayerStore from '@/stores/multiplayerStore'
import { executeAbility, applyAbilityEffects } from '@/utils/abilityLogic'
import { CombatLog } from './CombatLog'
import { preloadTurnSounds, playYourTurnSound } from '@/utils/soundPlayer'

export interface SpellEffectData {
  id: string
  type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison' | 'fireball' | 'chain_lightning' | 'ice_nova' | 'battery_drain' | 'chaos_shuffle' | 'sword_strike'
  position: [number, number, number]
  targetId: string
  sourcePosition?: [number, number, number]
  targetPosition?: [number, number, number]
  targetPositions?: [number, number, number][]
  enemyPositions?: [number, number, number][]  // For Battery Drain
  allyPositions?: [number, number, number][]  // For Battery Drain
}

export function GameUI() {
  const store = useOptimizedGameStore()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()
  const turnNumber = useTurnNumber()
  const winner = useWinner()
  const { targetCardId, selectTarget } = useSelection()
  const { endTurn, resetGame, setCurrentTurn } = useGameActions()
  const { addCombatLogEntry } = useCombatLog()

  // Use Zustand auto-battle state instead of local state
  const {
    autoSelectedCardId,
    autoSelectedAbilityIndex,
    isWaitingForTarget,
    gameMessage,
    setAutoSelectedCard,
    setAutoSelectedAbility,
    setWaitingForTarget,
    setGameMessage
  } = useAutoBattle()

  // Convert Maps to arrays
  const playerCards = Array.from(store.playerCards.values())
  const opponentCards = Array.from(store.opponentCards.values())

  // Get the auto-selected card from store
  const autoSelectedCard = autoSelectedCardId
    ? [...playerCards, ...opponentCards].find(c => c.id === autoSelectedCardId) || null
    : null

  const { availableCards, initializeCards } = useCardStore()
  const { connectionStatus, endTurn: multiplayerEndTurn, selectTarget: multiplayerSelectTarget } = useMultiplayerStore()

  useEffect(() => {
    initializeCards()
    preloadTurnSounds() // Preload turn sounds on mount
  }, [initializeCards])

  // Initialize game and randomly select starting player (SINGLE PLAYER ONLY)
  useEffect(() => {
    // Skip if in multiplayer mode
    if (connectionStatus === 'in_game' || connectionStatus === 'connected') return

    if (availableCards.length > 0 && phase === 'setup') {
      const shuffled = [...availableCards].sort(() => Math.random() - 0.5)
      const playerDeck = shuffled.slice(0, 4).map((card, i) => ({
        ...card,
        id: `player-${i}`,
        position: [(-3 + i * 2) as number, 0, 2] as [number, number, number]
      }))
      const opponentDeck = shuffled.slice(4, 8).map((card, i) => ({
        ...card,
        id: `opponent-${i}`,
        position: [(-3 + i * 2) as number, 0, -2] as [number, number, number]
      }))

      store.setPlayerCards(playerDeck)
      store.setOpponentCards(opponentDeck)

      // Randomly select starting player
      const startingPlayer = Math.random() < 0.5 ? 'player' : 'opponent'
      setCurrentTurn(startingPlayer)
      store.setPhase(startingPlayer === 'player' ? 'player_turn' : 'opponent_turn')

      setGameMessage(`${startingPlayer === 'player' ? 'Your' : "Opponent's"} turn starts!`)
    }
  }, [availableCards, phase, setCurrentTurn, setGameMessage, store, connectionStatus])

  // Listen for AI action completion
  useEffect(() => {
    const handleAIActionComplete = (event: CustomEvent) => {
      setGameMessage(event.detail.message)
    }

    window.addEventListener('aiActionComplete' as any, handleAIActionComplete)
    return () => window.removeEventListener('aiActionComplete' as any, handleAIActionComplete)
  }, [setGameMessage])

  // Auto-select card and ability at the start of each turn (SINGLE PLAYER ONLY)
  useEffect(() => {
    // Skip if in multiplayer - server handles card selection
    if (connectionStatus === 'in_game') return

    // Only auto-select for player turns - let GameScene handle AI turns
    if (phase === 'player_turn' && !autoSelectedCardId) {
      // Add a small delay to prevent rapid cycling when turns switch
      const selectionTimer = setTimeout(() => {
        const activeTeam = playerCards
        const aliveCards = activeTeam.filter(card => card.hp > 0 && !card.debuffs.some(d => d.type === 'stunned' || d.type === 'frozen'))

        if (aliveCards.length === 0) {
          setGameMessage(`All your cards are unable to act! Click End Turn.`)
          return
        }

        // Randomly select a card
        const randomCard = aliveCards[Math.floor(Math.random() * aliveCards.length)]

        // Randomly select an ability
        const availableAbilities = randomCard.abilities.filter((_, index) => {
          const cooldown = randomCard.abilities[index].currentCooldown || 0
          return cooldown === 0
        })

        const randomAbilityIndex = availableAbilities.length > 0
          ? randomCard.abilities.indexOf(availableAbilities[Math.floor(Math.random() * availableAbilities.length)])
          : 0 // Fallback to first ability

        setAutoSelectedCard(randomCard.id)
        setAutoSelectedAbility(randomAbilityIndex)

        const ability = randomCard.abilities[randomAbilityIndex]
        setGameMessage(`${randomCard.name} prepares ${ability.name}! Select a target!`)

        // For player turn, wait for target selection
        setWaitingForTarget(true)
      }, 100) // Small delay to prevent rapid cycling

      return () => clearTimeout(selectionTimer)
    }
  }, [phase, autoSelectedCardId, playerCards, connectionStatus,
      setAutoSelectedCard, setAutoSelectedAbility, setWaitingForTarget, setGameMessage])

  // Auto-select target for opponent
  const autoSelectTarget = () => {
    if (!autoSelectedCard || autoSelectedAbilityIndex === null) return

    const ability = autoSelectedCard.abilities[autoSelectedAbilityIndex]
    let targetId: string | null = null

    switch (ability.targetType) {
      case 'single':
        const alivePlayerCards = playerCards.filter(c => c.hp > 0)
        if (alivePlayerCards.length > 0) {
          const randomTarget = alivePlayerCards[Math.floor(Math.random() * alivePlayerCards.length)]
          targetId = randomTarget.id
        }
        break
      case 'self':
        targetId = autoSelectedCard.id
        break
      case 'allies':
        const allyWithLowestHp = opponentCards
          .filter(c => c.hp > 0 && c.hp < c.maxHp)
          .sort((a, b) => a.hp - b.hp)[0]
        targetId = allyWithLowestHp ? allyWithLowestHp.id : autoSelectedCard.id
        break
      case 'all':
        // No specific target needed for 'all' type
        targetId = 'all'
        break
    }

    if (targetId) {
      executeAutoSelectedAbility(targetId)
    }
  }

  // Execute ability when target is selected (for both player and opponent)
  useEffect(() => {
    if (targetCardId && isWaitingForTarget && currentTurn === 'player') {
      // In multiplayer, send to server; in single player, execute locally
      if (connectionStatus === 'in_game') {
        multiplayerSelectTarget(targetCardId)
        setWaitingForTarget(false)
        selectTarget(null) // Clear selection
      } else {
        executeAutoSelectedAbility(targetCardId)
        setWaitingForTarget(false)
      }
    }
  }, [targetCardId, isWaitingForTarget, currentTurn, setWaitingForTarget, connectionStatus, multiplayerSelectTarget, selectTarget])

  const executeAutoSelectedAbility = (targetId: string) => {
    if (!autoSelectedCard || autoSelectedAbilityIndex === null) return

    const ability = autoSelectedCard.abilities[autoSelectedAbilityIndex]
    const targetCard = targetId === 'all' ? null : [...playerCards, ...opponentCards].find(c => c.id === targetId) || null

    const result = executeAbility(
      ability,
      autoSelectedCard,
      targetCard,
      currentTurn === 'player' ? playerCards : opponentCards,
      currentTurn === 'player' ? opponentCards : playerCards
    )

    if (result.success) {
      setGameMessage(result.message)

      // Create spell effect for visualization
      console.log('[GAMEUI DEBUG] Ability:', ability.name, 'Visual Effect:', result.visualEffect)
      if (result.visualEffect || ability.name === 'Pyroblast' || ability.name === 'Lightning Zap' || ability.name === 'Chaos Shuffle' || ability.name === 'Battery Drain') {
        const sourceIndex = (currentTurn === 'player' ? playerCards : opponentCards).findIndex(c => c.id === autoSelectedCard.id)
        const sourceX = -3 + sourceIndex * 2
        const sourcePos: [number, number, number] = [sourceX, 0.5, currentTurn === 'player' ? 2 : -2]

        let targetPos: [number, number, number] | undefined
        let targetPositions: [number, number, number][] | undefined

        if (ability.targetType === 'all' || ability.name === 'Lightning Zap') {
          const targets = currentTurn === 'player' ? opponentCards : playerCards
          targetPositions = targets.filter(c => c.hp > 0).map((_, i) => {
            const x = -3 + i * 2
            return [x, 0.5, currentTurn === 'player' ? -2 : 2] as [number, number, number]
          })
        } else if (targetCard) {
          const targetIndex = [...playerCards, ...opponentCards].findIndex(c => c.id === targetCard.id)
          const isPlayerTarget = playerCards.some(c => c.id === targetCard.id)
          const adjustedIndex = isPlayerTarget
            ? playerCards.findIndex(c => c.id === targetCard.id)
            : opponentCards.findIndex(c => c.id === targetCard.id)
          const targetX = -3 + adjustedIndex * 2
          targetPos = [targetX, 0.5, isPlayerTarget ? 2 : -2]
        }

        const effectType = ability.name === 'Pyroblast' ? 'fireball' :
                          ability.name === 'Lightning Zap' ? 'lightning' :
                          result.visualEffect || 'fire'

        console.log('[GAMEUI] Effect type:', effectType, 'Target positions:', targetPositions)

        // For Chaos Shuffle and Battery Drain, calculate positions
        let enemyPositions: [number, number, number][] | undefined
        let allyPositions: [number, number, number][] | undefined

        if (effectType === 'battery_drain' || effectType === 'chaos_shuffle') {
          // Enemy positions - reuse targetPositions from Lightning Zap logic (should already be set for 'all' targetType)
          enemyPositions = targetPositions

          // Ally positions - calculate for Battery Drain
          if (effectType === 'battery_drain') {
            const allies = currentTurn === 'player' ? playerCards : opponentCards
            allyPositions = allies.filter(c => c.hp > 0).map((_, i) => {
              const x = -3 + i * 2
              return [x, 0.5, currentTurn === 'player' ? 2 : -2] as [number, number, number]
            })
          }

          console.log('[VFX DEBUG] Enemy positions:', enemyPositions)
          console.log('[VFX DEBUG] Ally positions:', allyPositions)
        }

        const effectData: SpellEffectData = {
          id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: effectType,
          position: sourcePos,
          targetId: targetCard?.id || '',
          sourcePosition: sourcePos,
          targetPosition: targetPos,
          targetPositions: targetPositions,
          enemyPositions: enemyPositions,
          allyPositions: allyPositions
        }

        window.dispatchEvent(new CustomEvent('spellEffect', { detail: effectData }))
      }

      // Add combat log entry
      const targetCards = result.damages?.map(d => {
        const card = [...playerCards, ...opponentCards].find(c => c.id === d.cardId)
        return card ? { name: card.name, texture: card.texture } : null
      }).filter(Boolean) || []

      const healTargets = result.heals?.map(h => {
        const card = [...playerCards, ...opponentCards].find(c => c.id === h.cardId)
        return card ? { name: card.name, texture: card.texture } : null
      }).filter(Boolean) || []

      const allTargets = [...targetCards, ...healTargets] as Array<{name: string, texture: string}>

      const totalDamage = result.damages?.reduce((sum, d) => sum + d.amount, 0) || 0
      const totalHealing = result.heals?.reduce((sum, h) => sum + h.amount, 0) || 0

      const effects: string[] = []
      if (result.debuffs && result.debuffs.length > 0) {
        result.debuffs.forEach(d => {
          if (d.debuff.type) effects.push(d.debuff.type)
        })
      }

      addCombatLogEntry({
        attackerCard: {
          name: autoSelectedCard.name,
          texture: autoSelectedCard.texture
        },
        targetCards: allTargets,
        abilityName: ability.name,
        totalDamage,
        totalHealing,
        effects: effects.length > 0 ? effects : undefined
      })

      // Apply damage/effects after visual
      const damageDelay = ability.name === 'Pyroblast' ? 1000 : 500
      setTimeout(() => {
        applyAbilityEffects(result, useOptimizedGameStore.getState())
        store.checkWinCondition()
      }, damageDelay)

      // Don't automatically end turn - wait for manual button
      selectTarget(null)
      setGameMessage(`${result.message} - Click End Turn to continue.`)
    } else {
      setGameMessage(result.message)
    }
  }

  const handleReset = () => {
    resetGame()
    // No need to clear local state - it's all in Zustand now!
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Combat Log - Left side */}
      <CombatLog />


      {isWaitingForTarget && currentTurn === 'player' && (
        <div className="absolute top-4 right-4 pointer-events-auto">
          <div className="bg-black/80 p-4 rounded-lg text-white">
            <h3 className="text-lg font-bold mb-2">Select a Target</h3>
            <p className="text-sm opacity-75">
              Click on an enemy card to use {autoSelectedCard?.abilities[autoSelectedAbilityIndex || 0]?.name}
            </p>
            {autoSelectedCard?.abilities[autoSelectedAbilityIndex || 0]?.targetType === 'all' && (
              <p className="text-xs mt-2 text-yellow-400">This ability hits all enemies!</p>
            )}
          </div>
        </div>
      )}

      {winner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto">
          <div className="bg-white p-8 rounded-lg text-center">
            <h1 className="text-4xl font-bold mb-4">
              {winner === 'player' ? 'Victory!' : 'Defeat!'}
            </h1>
            <p className="text-xl mb-6">
              {winner === 'player' ? 'You won the battle!' : 'You lost the battle.'}
            </p>
            <button
              onClick={handleReset}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* End Turn Button - Bottom Center (Only show for current player in multiplayer) */}
      {(connectionStatus !== 'in_game' || currentTurn === 'player') && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => {
              // Play random turn sound
              playYourTurnSound()

              // Use multiplayer end turn if in game, otherwise local
              if (connectionStatus === 'in_game') {
                multiplayerEndTurn()
              } else {
                endTurn()
              }
            }}
            className={`px-8 py-3 text-white font-bold rounded-full shadow-2xl transition-all transform hover:scale-110 ${
              currentTurn === 'player'
                ? 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700'
            } ${phase === 'animating' || phase === 'game_over' ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={phase === 'animating' || phase === 'game_over'}
          >
            {currentTurn === 'player' ? 'End Turn' : 'End Opponent Turn'}
          </button>
        </div>
      )}

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 768px) {
          .absolute.top-4.left-4 {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}