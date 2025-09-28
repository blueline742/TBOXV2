import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import { enableMapSet } from 'immer'
import { CardData, Debuff, Ability } from './cardStore'

// Enable Map support in Immer
enableMapSet()

// ============= TYPE DEFINITIONS =============
export type GamePhase = 'setup' | 'player_turn' | 'opponent_turn' | 'animating' | 'game_over'

interface GameMeta {
  phase: GamePhase
  currentTurn: 'player' | 'opponent'
  turnNumber: number
  winner: 'player' | 'opponent' | null
}

interface Selection {
  selectedCardId: string | null
  targetCardId: string | null
  selectedAbilityIndex: number | null
}

interface AutoBattle {
  autoSelectedCardId: string | null
  autoSelectedAbilityIndex: number | null
  isWaitingForTarget: boolean
  gameMessage: string
}

interface Cards {
  playerCards: Map<string, CardData>
  opponentCards: Map<string, CardData>
}

// ============= STORE SLICES =============
interface GameState extends GameMeta, Selection, AutoBattle, Cards {
  // Actions - Game Flow
  setPhase: (phase: GamePhase) => void
  endTurn: () => void
  setCurrentTurn: (turn: 'player' | 'opponent') => void
  checkWinCondition: () => void
  resetGame: () => void

  // Actions - Selection
  selectCard: (cardId: string | null) => void
  selectTarget: (cardId: string | null) => void
  selectAbility: (index: number | null) => void
  clearSelection: () => void

  // Actions - Auto Battle
  setAutoSelectedCard: (cardId: string | null) => void
  setAutoSelectedAbility: (index: number | null) => void
  setWaitingForTarget: (waiting: boolean) => void
  setGameMessage: (message: string) => void

  // Actions - Card Management
  setPlayerCards: (cards: CardData[]) => void
  setOpponentCards: (cards: CardData[]) => void
  updateCard: (side: 'player' | 'opponent', cardId: string, updates: Partial<CardData>) => void
  damageCard: (side: 'player' | 'opponent', cardId: string, damage: number) => void
  healCard: (side: 'player' | 'opponent', cardId: string, amount: number) => void

  // Actions - Debuffs
  addDebuff: (side: 'player' | 'opponent', cardId: string, debuff: Debuff) => void
  removeDebuff: (side: 'player' | 'opponent', cardId: string, debuffType: string) => void
  tickDebuffs: () => void

  // Actions - Abilities
  castSpell: (casterId: string, targetId: string | string[], abilityIndex: number) => void
  updateCooldown: (side: 'player' | 'opponent', cardId: string, abilityIndex: number, cooldown: number) => void
  tickCooldowns: () => void

  // Selectors
  getCard: (side: 'player' | 'opponent', cardId: string) => CardData | undefined
  getAliveCards: (side: 'player' | 'opponent') => CardData[]
  canCastAbility: (cardId: string, abilityIndex: number) => boolean
}

// ============= STORE CREATION =============
const useOptimizedGameStore = create<GameState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial State
        phase: 'setup',
        currentTurn: 'player',
        turnNumber: 1,
        winner: null,
        selectedCardId: null,
        targetCardId: null,
        selectedAbilityIndex: null,
        autoSelectedCardId: null,
        autoSelectedAbilityIndex: null,
        isWaitingForTarget: false,
        gameMessage: '',
        playerCards: new Map(),
        opponentCards: new Map(),

        // ============= GAME FLOW ACTIONS =============
        setPhase: (phase) => set((state) => {
          state.phase = phase
        }),

        endTurn: () => {
          // First, tick debuffs and cooldowns at the end of each turn
          get().tickDebuffs()
          get().tickCooldowns()

          set((state) => {
            // Clear selections
            state.selectedCardId = null
            state.targetCardId = null
            state.selectedAbilityIndex = null
            state.autoSelectedCardId = null
            state.autoSelectedAbilityIndex = null
            state.isWaitingForTarget = false

            // Switch turns
            state.currentTurn = state.currentTurn === 'player' ? 'opponent' : 'player'
            state.phase = state.currentTurn === 'player' ? 'player_turn' : 'opponent_turn'
            state.turnNumber += 1
          }, false, 'endTurn')
        },

        setCurrentTurn: (turn) => set((state) => {
          state.currentTurn = turn
          state.phase = turn === 'player' ? 'player_turn' : 'opponent_turn'
        }, false, 'setCurrentTurn'),

        checkWinCondition: () => {
          const state = get()
          const playerAlive = Array.from(state.playerCards.values()).some(c => c.hp > 0)
          const opponentAlive = Array.from(state.opponentCards.values()).some(c => c.hp > 0)

          if (!playerAlive && !opponentAlive) {
            set((state) => {
              state.winner = null
              state.phase = 'game_over'
            })
          } else if (!opponentAlive) {
            set((state) => {
              state.winner = 'player'
              state.phase = 'game_over'
            })
          } else if (!playerAlive) {
            set((state) => {
              state.winner = 'opponent'
              state.phase = 'game_over'
            })
          }
        },

        resetGame: () => set((state) => {
          state.phase = 'setup'
          state.currentTurn = 'player'
          state.turnNumber = 1
          state.winner = null
          state.selectedCardId = null
          state.targetCardId = null
          state.selectedAbilityIndex = null
          state.autoSelectedCardId = null
          state.autoSelectedAbilityIndex = null
          state.isWaitingForTarget = false
          state.gameMessage = ''
          state.playerCards.clear()
          state.opponentCards.clear()
        }),

        // ============= SELECTION ACTIONS =============
        selectCard: (cardId) => set((state) => {
          state.selectedCardId = cardId
        }),

        selectTarget: (cardId) => set((state) => {
          state.targetCardId = cardId
        }),

        selectAbility: (index) => set((state) => {
          state.selectedAbilityIndex = index
        }),

        clearSelection: () => set((state) => {
          state.selectedCardId = null
          state.targetCardId = null
          state.selectedAbilityIndex = null
        }),

        // ============= AUTO BATTLE ACTIONS =============
        setAutoSelectedCard: (cardId) => set((state) => {
          state.autoSelectedCardId = cardId
        }),

        setAutoSelectedAbility: (index) => set((state) => {
          state.autoSelectedAbilityIndex = index
        }),

        setWaitingForTarget: (waiting) => set((state) => {
          state.isWaitingForTarget = waiting
        }),

        setGameMessage: (message) => set((state) => {
          state.gameMessage = message
        }),

        // ============= CARD MANAGEMENT =============
        setPlayerCards: (cards) => set((state) => {
          state.playerCards = new Map(cards.map(c => [c.id, c]))
        }),

        setOpponentCards: (cards) => set((state) => {
          state.opponentCards = new Map(cards.map(c => [c.id, c]))
        }),

        updateCard: (side, cardId, updates) => set((state) => {
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          const card = cardsMap.get(cardId)
          if (card) {
            Object.assign(card, updates)
          }
        }),

        damageCard: (side, cardId, damage) => set((state) => {
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          const card = cardsMap.get(cardId)
          if (card) {
            card.hp = Math.max(0, card.hp - damage)
          }
        }, false, `damageCard:${cardId}:${damage}`),

        healCard: (side, cardId, amount) => set((state) => {
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          const card = cardsMap.get(cardId)
          if (card) {
            card.hp = Math.min(card.maxHp, card.hp + amount)
          }
        }, false, `healCard:${cardId}:${amount}`),

        // ============= DEBUFF MANAGEMENT =============
        addDebuff: (side, cardId, debuff) => set((state) => {
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          const card = cardsMap.get(cardId)
          if (card) {
            const existingDebuff = card.debuffs.find(d => d.type === debuff.type)

            // Handle stackable debuffs (like Fire Aura)
            if (debuff.type === 'fire_aura' && existingDebuff) {
              // Stack the debuff up to max stacks
              const maxStacks = debuff.maxStacks || 3
              const currentStacks = existingDebuff.stacks || 1
              const newStacks = Math.min(currentStacks + 1, maxStacks)

              existingDebuff.stacks = newStacks
              existingDebuff.damage = 5 * newStacks  // 5 damage per stack
              existingDebuff.duration = debuff.duration  // Refresh duration
            } else if (existingDebuff) {
              // Replace existing non-stackable debuff
              const index = card.debuffs.indexOf(existingDebuff)
              card.debuffs[index] = debuff
            } else {
              // Add new debuff
              if (debuff.type === 'fire_aura') {
                debuff.stacks = 1
                debuff.damage = 5
                debuff.maxStacks = 3
              }
              card.debuffs.push(debuff)
            }
          }
        }),

        removeDebuff: (side, cardId, debuffType) => set((state) => {
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          const card = cardsMap.get(cardId)
          if (card) {
            card.debuffs = card.debuffs.filter(d => d.type !== debuffType)
          }
        }),

        tickDebuffs: () => set((state) => {
          const processCards = (cardsMap: Map<string, CardData>) => {
            cardsMap.forEach(card => {
              card.debuffs = card.debuffs.filter(debuff => {
                // Apply debuff damage
                if (debuff.damage) {
                  card.hp = Math.max(0, card.hp - debuff.damage)
                }

                // Reduce duration
                debuff.duration -= 1

                // Keep if duration > 0
                return debuff.duration > 0
              })
            })
          }

          processCards(state.playerCards)
          processCards(state.opponentCards)
        }),

        // ============= ABILITY MANAGEMENT =============
        castSpell: (casterId, targetId, abilityIndex) => {
          const state = get()

          // Find caster
          const isPlayerCard = state.playerCards.has(casterId)
          const casterSide = isPlayerCard ? 'player' : 'opponent'
          const caster = state.getCard(casterSide, casterId)

          if (!caster || !caster.abilities[abilityIndex]) return

          const ability = caster.abilities[abilityIndex]

          // Check cooldown
          if (ability.currentCooldown && ability.currentCooldown > 0) return

          // Set cooldown
          if (ability.cooldown) {
            set((state) => {
              const card = (casterSide === 'player' ? state.playerCards : state.opponentCards).get(casterId)
              if (card && card.abilities[abilityIndex]) {
                card.abilities[abilityIndex].currentCooldown = ability.cooldown
              }
            })
          }

          // Apply effects based on target type
          const targets = Array.isArray(targetId) ? targetId : [targetId]

          targets.forEach(tid => {
            const targetSide = state.playerCards.has(tid) ? 'player' : 'opponent'

            // Apply damage
            if (ability.damage) {
              state.damageCard(targetSide, tid, ability.damage)
            }

            // Apply healing
            if (ability.heal) {
              state.healCard(targetSide, tid, ability.heal)
            }

            // Apply debuffs
            if (ability.effect) {
              const debuffMap: Record<string, Debuff> = {
                'freeze': { type: 'frozen', duration: 2 },
                'burn': { type: 'burned', duration: 3, damage: 5 },
                'stun': { type: 'stunned', duration: 1 },
                'poison': { type: 'poisoned', duration: 4, damage: 3 }
              }

              const debuff = debuffMap[ability.effect]
              if (debuff) {
                state.addDebuff(targetSide, tid, debuff)
              }
            }
          })

          // Check win condition after spell
          setTimeout(() => state.checkWinCondition(), 100)
        },

        updateCooldown: (side, cardId, abilityIndex, cooldown) => set((state) => {
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          const card = cardsMap.get(cardId)
          if (card && card.abilities[abilityIndex]) {
            card.abilities[abilityIndex].currentCooldown = cooldown
          }
        }),

        tickCooldowns: () => set((state) => {
          const processCards = (cardsMap: Map<string, CardData>) => {
            cardsMap.forEach(card => {
              card.abilities.forEach(ability => {
                if (ability.currentCooldown && ability.currentCooldown > 0) {
                  ability.currentCooldown -= 1
                }
              })
            })
          }

          processCards(state.playerCards)
          processCards(state.opponentCards)
        }),

        // ============= SELECTORS =============
        getCard: (side, cardId) => {
          const state = get()
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          return cardsMap.get(cardId)
        },

        getAliveCards: (side) => {
          const state = get()
          const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
          return Array.from(cardsMap.values()).filter(c => c.hp > 0)
        },

        canCastAbility: (cardId, abilityIndex) => {
          const state = get()
          const card = state.playerCards.get(cardId) || state.opponentCards.get(cardId)

          if (!card || card.hp <= 0) return false

          const ability = card.abilities[abilityIndex]
          if (!ability) return false

          // Check if stunned
          if (card.debuffs.some(d => d.type === 'stunned')) return false

          // Check cooldown
          if (ability.currentCooldown && ability.currentCooldown > 0) return false

          return true
        }
      }))
    ),
    {
      name: 'game-store',
    }
  )
)

// ============= OPTIMIZED SELECTORS =============
// Use these in components to prevent unnecessary re-renders

export const useGamePhase = () => useOptimizedGameStore((state) => state.phase)
export const useCurrentTurn = () => useOptimizedGameStore((state) => state.currentTurn)
export const useTurnNumber = () => useOptimizedGameStore((state) => state.turnNumber)
export const useWinner = () => useOptimizedGameStore((state) => state.winner)

export const useSelection = () => useOptimizedGameStore(
  useShallow((state) => ({
    selectedCardId: state.selectedCardId,
    targetCardId: state.targetCardId,
    selectedAbilityIndex: state.selectedAbilityIndex,
    selectCard: state.selectCard,
    selectTarget: state.selectTarget,
    selectAbility: state.selectAbility,
  }))
)

export const useCard = (side: 'player' | 'opponent', cardId: string) =>
  useOptimizedGameStore((state) => {
    const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
    return cardsMap.get(cardId)
  })

export const useCardHealth = (side: 'player' | 'opponent', cardId: string) =>
  useOptimizedGameStore((state) => {
    const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
    return cardsMap.get(cardId)?.hp ?? 0
  })

export const useCardDebuffs = (side: 'player' | 'opponent', cardId: string) =>
  useOptimizedGameStore((state) => {
    const cardsMap = side === 'player' ? state.playerCards : state.opponentCards
    return cardsMap.get(cardId)?.debuffs ?? []
  })

export const useAliveCards = (side: 'player' | 'opponent') =>
  useOptimizedGameStore((state) => state.getAliveCards(side))

export const useGameActions = () => useOptimizedGameStore(
  useShallow((state) => ({
    endTurn: state.endTurn,
    castSpell: state.castSpell,
    resetGame: state.resetGame,
    setCurrentTurn: state.setCurrentTurn,
  }))
)

// Auto-Battle Selectors
export const useAutoBattle = () => useOptimizedGameStore(
  useShallow((state) => ({
    autoSelectedCardId: state.autoSelectedCardId,
    autoSelectedAbilityIndex: state.autoSelectedAbilityIndex,
    isWaitingForTarget: state.isWaitingForTarget,
    gameMessage: state.gameMessage,
    setAutoSelectedCard: state.setAutoSelectedCard,
    setAutoSelectedAbility: state.setAutoSelectedAbility,
    setWaitingForTarget: state.setWaitingForTarget,
    setGameMessage: state.setGameMessage,
  }))
)

export default useOptimizedGameStore