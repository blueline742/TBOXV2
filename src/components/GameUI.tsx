import { useEffect, useState } from 'react'
import useGameStore from '@/stores/gameStore'
import useCardStore from '@/stores/cardStore'
import { executeAbility, applyAbilityEffects } from '@/utils/abilityLogic'

export function GameUI() {
  const {
    phase,
    currentTurn,
    turnNumber,
    winner,
    selectedCardId,
    targetCardId,
    selectedAbilityIndex,
    playerCards,
    opponentCards,
    selectAbility,
    endTurn,
    resetGame,
    setPhase,
    setPlayerCards,
    setOpponentCards
  } = useGameStore()

  const { availableCards, initializeCards } = useCardStore()
  const [message, setMessage] = useState<string>('')
  const [activeEffect, setActiveEffect] = useState<string | null>(null)

  useEffect(() => {
    initializeCards()
  }, [])

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

      setPlayerCards(playerDeck)
      setOpponentCards(opponentDeck)
      setPhase('player_turn')
    }
  }, [availableCards, phase])

  const selectedCard = playerCards.find(c => c.id === selectedCardId)
  const targetCard = [...playerCards, ...opponentCards].find(c => c.id === targetCardId)

  const handleUseAbility = () => {
    if (!selectedCard || selectedAbilityIndex === null) return

    const ability = selectedCard.abilities[selectedAbilityIndex]
    const result = executeAbility(ability, selectedCard, targetCard || null, playerCards, opponentCards)

    if (result.success) {
      setMessage(result.message)
      setActiveEffect(ability.effect || 'damage')
      applyAbilityEffects(result, useGameStore.getState())

      setTimeout(() => {
        setActiveEffect(null)
        endTurn()
      }, 2000)
    } else {
      setMessage(result.message)
    }
  }

  const handleEndTurn = () => {
    endTurn()
  }

  const handleReset = () => {
    resetGame()
    setMessage('')
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-4 left-4 text-white pointer-events-auto">
        <div className="bg-black/70 p-4 rounded-lg">
          <h2 className="text-xl font-bold mb-2">Turn {turnNumber}</h2>
          <p className="text-sm">
            {currentTurn === 'player' ? 'Your Turn' : "Opponent's Turn"}
          </p>
        </div>
      </div>

      {message && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white pointer-events-auto">
          <div className="bg-black/80 px-6 py-3 rounded-lg">
            <p className="text-lg font-semibold">{message}</p>
          </div>
        </div>
      )}

      {selectedCard && phase === 'player_turn' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/80 p-4 rounded-lg text-white">
            <h3 className="text-lg font-bold mb-3">{selectedCard.name}'s Abilities</h3>
            <div className="flex gap-2">
              {selectedCard.abilities.map((ability, index) => (
                <button
                  key={index}
                  onClick={() => selectAbility(index)}
                  className={`px-4 py-2 rounded transition-all ${
                    selectedAbilityIndex === index
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-sm font-semibold">{ability.name}</div>
                  <div className="text-xs opacity-75">{ability.description}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleUseAbility}
                disabled={selectedAbilityIndex === null || (selectedCard.abilities[selectedAbilityIndex].targetType === 'single' && !targetCardId)}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 rounded transition-all"
              >
                Use Ability
              </button>
              <button
                onClick={handleEndTurn}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded transition-all"
              >
                End Turn
              </button>
            </div>
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
          <h3 className="font-bold mb-2">Controls</h3>
          <ul className="text-sm space-y-1">
            <li>Click your card to select</li>
            <li>Choose an ability</li>
            <li>Click enemy card to target</li>
            <li>Use ability or end turn</li>
          </ul>
        </div>
      </div>
    </div>
  )
}