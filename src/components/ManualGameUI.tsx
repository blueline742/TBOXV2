import { useEffect, useState } from 'react'
import useOptimizedGameStore, {
  useGamePhase,
  useCurrentTurn,
  useTurnNumber,
  useWinner,
  useSelection,
  useGameActions,
  useCard,
  useCombatLog,
  usePlayerMana,
  useMana
} from '@/stores/optimizedGameStore'
import useCardStore from '@/stores/cardStore'
import useMultiplayerStore from '@/stores/multiplayerStore'
import { executeAbility, applyAbilityEffects } from '@/utils/abilityLogic'
import { CombatLog } from './CombatLog'
import { preloadTurnSounds, playYourTurnSound } from '@/utils/soundPlayer'

export interface SpellEffectData {
  id: string
  type: 'freeze' | 'fire' | 'lightning' | 'heal' | 'poison' | 'fireball' | 'chain_lightning' | 'ice_nova' | 'battery_drain' | 'chaos_shuffle' | 'sword_strike' | 'whirlwind_slash' | 'shield' | 'fire_breath' | 'mecha_roar' | 'extinction_protocol' | 'water_squirt' | 'bath_bomb' | 'duck_swarm' | 'laser_beam' | 'shield_boost' | 'resurrection' | 'puppet_master' | 'curse_strings' | 'curse_puppets' | 'puppet_show' | 'medication' | 'surgery' | 'clear_revive'
  position: [number, number, number]
  targetId: string
  sourcePosition?: [number, number, number]
  targetPosition?: [number, number, number]
  targetPositions?: [number, number, number][]
  enemyPositions?: [number, number, number][]
  allyPositions?: [number, number, number][]
}

export function ManualGameUI() {
  const store = useOptimizedGameStore()
  const phase = useGamePhase()
  const currentTurn = useCurrentTurn()
  const turnNumber = useTurnNumber()
  const winner = useWinner()
  const { selectedCardId, targetCardId, selectedAbilityIndex, selectCard, selectTarget, selectAbility } = useSelection()
  const { endTurn, resetGame, setCurrentTurn } = useGameActions()
  const { addCombatLogEntry } = useCombatLog()
  const { playerMana, opponentMana, spendMana } = useMana()

  // Convert Maps to arrays
  const playerCards = Array.from(store.playerCards.values())
  const opponentCards = Array.from(store.opponentCards.values())

  // Get the selected card
  const selectedCard = selectedCardId ? playerCards.find(c => c.id === selectedCardId) : null

  const { availableCards, initializeCards } = useCardStore()
  const { connectionStatus, endTurn: multiplayerEndTurn, selectTarget: multiplayerSelectTarget, executeAbility: multiplayerExecuteAbility } = useMultiplayerStore()

  // Track if we're waiting for a target
  const [isWaitingForTarget, setWaitingForTarget] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    initializeCards()
    preloadTurnSounds()
  }, [initializeCards])

  // Initialize game with first player gets first mana
  useEffect(() => {
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

      // Starting player gets 1 mana
      if (startingPlayer === 'player') {
        store.addMana('player', 1)
      } else {
        store.addMana('opponent', 1)
      }
    }
  }, [availableCards, phase, setCurrentTurn, store, connectionStatus])

  // Handle ability selection
  const handleAbilityClick = (abilityIndex: number) => {
    if (!selectedCard) return

    const ability = selectedCard.abilities[abilityIndex]

    // Check mana cost
    if (ability.manaCost > playerMana) {
      setMessage(`Not enough mana! Need ${ability.manaCost}⚡ but only have ${playerMana}⚡`)
      return
    }

    // Check cooldown
    if (ability.currentCooldown && ability.currentCooldown > 0) {
      setMessage(`${ability.name} is on cooldown for ${ability.currentCooldown} more turns`)
      return
    }

    selectAbility(abilityIndex)

    // Check if ability needs a target
    if (ability.targetType === 'self') {
      // Cast immediately on self
      executeSelectedAbility(selectedCard.id)
    } else if (ability.targetType === 'all' || ability.targetType === 'allies' || ability.targetType === 'dead_allies') {
      // Cast immediately without specific target
      executeSelectedAbility('all')
    } else {
      // Need to select a target
      setWaitingForTarget(true)
      setMessage(`Select a target for ${ability.name}`)
    }
  }

  // Execute ability when target is selected
  useEffect(() => {
    if (targetCardId && isWaitingForTarget && selectedCard && selectedAbilityIndex !== null) {
      executeSelectedAbility(targetCardId)
      setWaitingForTarget(false)
      selectTarget(null)
    }
  }, [targetCardId, isWaitingForTarget, selectedCard, selectedAbilityIndex])

  const executeSelectedAbility = (targetId: string) => {
    if (!selectedCard || selectedAbilityIndex === null) return

    // In multiplayer mode, send the action to the server
    if (connectionStatus === 'in_game') {
      multiplayerExecuteAbility(selectedCard.id, selectedAbilityIndex, targetId)

      // Clear selection immediately
      selectCard(null)
      selectAbility(null)
      selectTarget(null)

      setMessage('Waiting for server response...')
      return
    }

    // Local execution for testing/single player
    const ability = selectedCard.abilities[selectedAbilityIndex]
    const targetCard = targetId === 'all' ? null : [...playerCards, ...opponentCards].find(c => c.id === targetId) || null

    const result = executeAbility(
      ability,
      selectedCard,
      targetCard,
      playerCards,
      opponentCards
    )

    if (result.success) {
      // Spend mana
      spendMana('player', ability.manaCost)

      setMessage(`${selectedCard.name} used ${ability.name}! ${result.message}`)

      // Create spell effect for visualization
      createSpellEffect(selectedCard, targetCard, ability, result)

      // Add combat log entry
      addCombatLogEntry({
        attackerCard: {
          name: selectedCard.name,
          texture: selectedCard.texture
        },
        targetCards: targetCard ? [{
          name: targetCard.name,
          texture: targetCard.texture
        }] : [],
        abilityName: ability.name,
        totalDamage: result.damages?.reduce((sum, d) => sum + d.amount, 0),
        totalHealing: result.heals?.reduce((sum, h) => sum + h.amount, 0),
        effects: result.debuffs?.map(d => d.debuff.type)
      })

      // Apply effects after visual
      setTimeout(() => {
        applyAbilityEffects(result, useOptimizedGameStore.getState())
        store.checkWinCondition()

        // Clear selection after ability use
        selectCard(null)
        selectAbility(null)
        selectTarget(null)

        // Auto-end turn after ability use
        setTimeout(() => {
          endTurn()
          playYourTurnSound()
        }, 500)
      }, 500)
    } else {
      setMessage(result.message)
    }
  }

  const createSpellEffect = (caster: any, target: any, ability: any, result: any) => {
    // Determine spell effect type based on ability
    let effectType: SpellEffectData['type'] = 'fire'

    // Map ability effects to VFX types
    if (ability.effect === 'freeze') effectType = 'freeze'
    else if (ability.effect === 'burn') effectType = 'fire'
    else if (ability.effect === 'stun') effectType = 'lightning'
    else if (ability.effect === 'poison') effectType = 'poison'
    else if (ability.effect === 'shield') effectType = 'shield'
    else if (ability.effect === 'revive') effectType = 'resurrection'
    else if (ability.effect === 'spell_steal' || ability.effect === 'curse_of_puppets') effectType = 'curse_puppets'
    else if (ability.effect === 'battery_drain') effectType = 'battery_drain'
    else if (ability.effect === 'puppet_master') effectType = 'puppet_master'
    else if (ability.effect === 'chaos_shuffle') effectType = 'chaos_shuffle'
    else if (ability.effect === 'weaken') effectType = 'mecha_roar'
    else if (ability.effect === 'water_squirt') effectType = 'water_squirt'
    else if (ability.effect === 'bath_bomb') effectType = 'bath_bomb'
    else if (ability.effect === 'curse_of_strings') effectType = 'curse_strings'
    else if (ability.effect === 'puppet_show') effectType = 'puppet_show'
    else if (ability.effect === 'medication') effectType = 'medication'
    else if (ability.effect === 'surgery') effectType = 'surgery'
    else if (ability.effect === 'clear_revive') effectType = 'clear_revive'
    // Map ability names for those without specific effects
    else if (ability.name === 'Pyroblast' || ability.name === 'Fire Breath') effectType = 'fireball'
    else if (ability.name === 'Lightning Zap') effectType = 'chain_lightning'
    else if (ability.name === 'Ice Nova') effectType = 'ice_nova'
    else if (ability.name === 'Sword Strike' || ability.name === 'Cutlass Slash') effectType = 'sword_strike'
    else if (ability.name === 'Whirlwind Slash') effectType = 'whirlwind_slash'
    else if (ability.name === 'Laser Beam' || ability.name === 'Ray Gun') effectType = 'laser_beam'
    else if (ability.name === 'Duck Swarm') effectType = 'duck_swarm'
    else if (ability.name === 'Extinction Protocol') effectType = 'fireball'
    else if (ability.name === 'Fire Aura') effectType = 'fire'
    else if (ability.name === 'Rum Heal') effectType = 'heal'

    // Create spell effect with source and target positions
    const effect: SpellEffectData = {
      id: `spell-${Date.now()}-${Math.random()}`,
      type: effectType,
      position: target ? target.position : [0, 0, 0],
      targetId: target ? target.id : 'all',
      sourcePosition: caster.position,
      targetPosition: target ? target.position : undefined,
    }

    // For multi-target abilities, add all target positions
    if (ability.targetType === 'all' && !target) {
      const enemyCards = caster.id.startsWith('player') ? opponentCards : playerCards
      effect.targetPositions = enemyCards.filter(c => c.hp > 0).map(c => c.position)
    } else if (ability.targetType === 'allies') {
      const allyCards = caster.id.startsWith('player') ? playerCards : opponentCards
      effect.allyPositions = allyCards.filter(c => c.hp > 0).map(c => c.position)
    }

    // Emit spell effect event for GameScene to render
    window.dispatchEvent(new CustomEvent('spellEffect', { detail: effect }))
  }

  const handleReset = () => {
    resetGame()
    store.resetMana()
    setMessage('')
  }

  // Mana display component
  const ManaDisplay = () => {
    const crystals = []
    for (let i = 0; i < 5; i++) {
      const hasMana = i < playerMana
      crystals.push(
        <span
          key={i}
          className={`text-2xl ${hasMana ? 'text-blue-400' : 'text-gray-600'}`}
        >
          ⚡
        </span>
      )
    }
    return (
      <div className="flex items-center gap-1">
        <span className="text-white font-bold">Mana:</span>
        {crystals}
        <span className="text-white ml-2">({playerMana}/5)</span>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Combat Log - Left side */}
      <CombatLog />

      {/* Top UI Bar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-black/80 p-4 rounded-lg text-white">
          <div className="flex items-center gap-8">
            <div className="text-lg font-bold">
              Turn {turnNumber} - {phase === 'player_turn' ? 'Your Turn' : "Opponent's Turn"}
            </div>
            <ManaDisplay />
            {phase === 'player_turn' && (
              <button
                onClick={() => {
                  if (connectionStatus === 'in_game') {
                    multiplayerEndTurn()
                  } else {
                    endTurn()
                  }
                  playYourTurnSound()
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm transition-colors"
                disabled={phase === 'animating' || phase === 'game_over'}
              >
                Skip Turn
              </button>
            )}
          </div>
          {message && (
            <div className="mt-2 text-sm text-yellow-400">{message}</div>
          )}
        </div>
      </div>

      {/* Card & Ability Selection */}
      {phase === 'player_turn' && !winner && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 pointer-events-auto">
          {/* Selected Card Abilities */}
          {selectedCard && (
            <div className="bg-black/90 p-4 rounded-lg text-white mb-4">
              <h3 className="text-lg font-bold mb-3">{selectedCard.name}'s Abilities:</h3>
              <div className="flex gap-2">
                {selectedCard.abilities.map((ability, idx) => {
                  const canCast = ability.manaCost <= playerMana &&
                                  (!ability.currentCooldown || ability.currentCooldown === 0)
                  return (
                    <button
                      key={idx}
                      onClick={() => handleAbilityClick(idx)}
                      disabled={!canCast}
                      className={`p-3 rounded-lg transition-all ${
                        canCast
                          ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
                          : 'bg-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="font-bold">{ability.name}</div>
                      <div className="text-xs opacity-75 mt-1">{ability.description}</div>
                      <div className="flex items-center justify-center mt-2">
                        {Array.from({ length: ability.manaCost }).map((_, i) => (
                          <span key={i} className="text-yellow-400">⚡</span>
                        ))}
                      </div>
                      {ability.currentCooldown && ability.currentCooldown > 0 && (
                        <div className="text-xs text-red-400 mt-1">
                          Cooldown: {ability.currentCooldown}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => selectCard(null)}
                className="mt-3 px-4 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
              >
                Cancel Selection
              </button>
            </div>
          )}

          {/* Instruction Text */}
          {!selectedCard && (
            <div className="bg-black/80 p-3 rounded-lg text-white text-center">
              <div className="text-sm">Click on one of your cards to select it</div>
              <div className="text-xs opacity-75 mt-1">Green glow = Available to select</div>
            </div>
          )}
        </div>
      )}

      {/* Waiting for target */}
      {isWaitingForTarget && (
        <div className="absolute top-20 right-4 pointer-events-auto">
          <div className="bg-black/80 p-4 rounded-lg text-white">
            <h3 className="text-lg font-bold mb-2">Select a Target</h3>
            <p className="text-sm opacity-75">
              Click on a card to target it
            </p>
            <button
              onClick={() => {
                setWaitingForTarget(false)
                selectAbility(null)
                setMessage('')
              }}
              className="mt-3 px-4 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Winner Screen */}
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

    </div>
  )
}