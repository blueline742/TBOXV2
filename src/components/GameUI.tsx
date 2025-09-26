import { useEffect } from 'react'
import useOptimizedGameStore, {
  useGamePhase,
  useCurrentTurn,
  useTurnNumber,
  useWinner,
  useSelection,
  useGameActions,
  useAutoBattle,
  useCard
} from '@/stores/optimizedGameStore'
import useCardStore from '@/stores/cardStore'
import { executeAbility, applyAbilityEffects } from '@/utils/abilityLogic'

export interface SpellEffectData {
  id: string
  type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison' | 'fireball' | 'chain_lightning'
  position: [number, number, number]
  targetId: string
  sourcePosition?: [number, number, number]
  targetPosition?: [number, number, number]
  targetPositions?: [number, number, number][]
}

export function GameUI() {
  const store = useOptimizedGameStore()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()
  const turnNumber = useTurnNumber()
  const winner = useWinner()
  const { targetCardId, selectTarget } = useSelection()
  const { endTurn, resetGame, setCurrentTurn } = useGameActions()

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

  useEffect(() => {
    initializeCards()
  }, [])

  // Initialize game and randomly select starting player
  useEffect(() => {
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
  }, [availableCards, phase, setCurrentTurn, setGameMessage, store])

  // Auto-select card and ability at the start of each turn
  useEffect(() => {
    if ((phase === 'player_turn' || phase === 'opponent_turn') && !autoSelectedCardId) {
      // Add a small delay to prevent rapid cycling when turns switch
      const selectionTimer = setTimeout(() => {
        const activeTeam = currentTurn === 'player' ? playerCards : opponentCards
        const aliveCards = activeTeam.filter(card => card.hp > 0 && !card.debuffs.some(d => d.type === 'stunned' || d.type === 'frozen'))

        if (aliveCards.length === 0) {
          setGameMessage(`${currentTurn === 'player' ? 'All your cards' : 'All opponent cards'} are unable to act!`)
          setTimeout(() => endTurn(), 2000)
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
        setGameMessage(`${randomCard.name} prepares ${ability.name}! ${currentTurn === 'player' ? 'Select a target!' : ''}`)

        // For player turn, wait for target selection
        // For opponent turn, auto-select target after a delay
        if (currentTurn === 'player') {
          setWaitingForTarget(true)
        } else {
          setTimeout(() => autoSelectTarget(), 1500)
        }
      }, 100) // Small delay to prevent rapid cycling

      return () => clearTimeout(selectionTimer)
    }
  }, [phase, currentTurn, autoSelectedCardId, playerCards, opponentCards,
      setAutoSelectedCard, setAutoSelectedAbility, setWaitingForTarget, setGameMessage, endTurn])

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
      executeAutoSelectedAbility(targetCardId)
      setWaitingForTarget(false)
    }
  }, [targetCardId, isWaitingForTarget, currentTurn, setWaitingForTarget])

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
      if (result.visualEffect || ability.name === 'Pyroblast' || ability.name === 'Lightning Zap') {
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

        const effectData: SpellEffectData = {
          id: `effect-${Date.now()}`,
          type: effectType,
          position: sourcePos,
          targetId: targetCard?.id || '',
          sourcePosition: sourcePos,
          targetPosition: targetPos,
          targetPositions: targetPositions
        }

        window.dispatchEvent(new CustomEvent('spellEffect', { detail: effectData }))
      }

      // Apply damage/effects after visual
      const damageDelay = ability.name === 'Pyroblast' ? 1000 : 500
      setTimeout(() => {
        applyAbilityEffects(result, useOptimizedGameStore.getState())
        store.checkWinCondition()
      }, damageDelay)

      // End turn and reset for next turn - state will be cleared by store
      setTimeout(() => {
        selectTarget(null)
        endTurn()
      }, 2500)
    } else {
      setGameMessage(result.message)
      setTimeout(() => endTurn(), 2000)
    }
  }

  const handleReset = () => {
    resetGame()
    // No need to clear local state - it's all in Zustand now!
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-4 left-4 text-white pointer-events-auto">
        <div className="bg-black/70 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Turn {turnNumber}</h2>
          <p className="text-sm">
            {currentTurn === 'player' ? 'Your Turn' : "Opponent's Turn"}
          </p>
          {autoSelectedCard && (
            <div className="mt-2 text-sm">
              <p className="font-semibold">{autoSelectedCard.name} selected</p>
              <p className="opacity-75">
                Ability: {autoSelectedCard.abilities[autoSelectedAbilityIndex || 0]?.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {gameMessage && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white pointer-events-auto">
          <div className="bg-black/80 px-6 py-3 rounded-lg">
            <p className="text-lg font-semibold">{gameMessage}</p>
          </div>
        </div>
      )}

      {isWaitingForTarget && currentTurn === 'player' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
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

      <div className="absolute top-4 right-4 text-white pointer-events-auto">
        <div className="bg-black/70 p-4 rounded-lg">
          <h3 className="font-bold mb-2">Auto Battle Mode</h3>
          <ul className="text-sm space-y-1">
            <li>Card & spell auto-selected</li>
            <li>Click enemy to target</li>
            <li>Watch the battle unfold!</li>
          </ul>
        </div>
      </div>
    </div>
  )
}