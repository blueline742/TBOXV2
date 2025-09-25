import { create } from 'zustand'
import { CardData, Debuff } from './cardStore'

export type GamePhase = 'setup' | 'player_turn' | 'opponent_turn' | 'animating' | 'game_over'

interface GameState {
  phase: GamePhase
  currentTurn: 'player' | 'opponent'
  turnNumber: number
  winner: 'player' | 'opponent' | null
  selectedCardId: string | null
  targetCardId: string | null
  selectedAbilityIndex: number | null

  playerCards: CardData[]
  opponentCards: CardData[]

  setPhase: (phase: GamePhase) => void
  setCurrentTurn: (turn: 'player' | 'opponent') => void
  incrementTurn: () => void
  setWinner: (winner: 'player' | 'opponent' | null) => void

  selectCard: (cardId: string | null) => void
  selectTarget: (cardId: string | null) => void
  selectAbility: (index: number | null) => void

  setPlayerCards: (cards: CardData[]) => void
  setOpponentCards: (cards: CardData[]) => void
  updateCardHealth: (side: 'player' | 'opponent', cardId: string, health: number) => void
  addDebuffToCard: (side: 'player' | 'opponent', cardId: string, debuff: Debuff) => void
  removeDebuffFromCard: (side: 'player' | 'opponent', cardId: string, debuffType: string) => void
  processDebuffs: () => void

  endTurn: () => void
  checkWinCondition: () => void
  resetGame: () => void
}

const useGameStore = create<GameState>((set, get) => ({
  phase: 'setup',
  currentTurn: 'player',
  turnNumber: 1,
  winner: null,
  selectedCardId: null,
  targetCardId: null,
  selectedAbilityIndex: null,

  playerCards: [],
  opponentCards: [],

  setPhase: (phase) => set({ phase }),
  setCurrentTurn: (turn) => set({ currentTurn: turn }),
  incrementTurn: () => set((state) => ({ turnNumber: state.turnNumber + 1 })),
  setWinner: (winner) => set({ winner, phase: 'game_over' }),

  selectCard: (cardId) => set({ selectedCardId: cardId }),
  selectTarget: (cardId) => set({ targetCardId: cardId }),
  selectAbility: (index) => set({ selectedAbilityIndex: index }),

  setPlayerCards: (cards) => set({ playerCards: cards }),
  setOpponentCards: (cards) => set({ opponentCards: cards }),

  updateCardHealth: (side, cardId, health) => set((state) => ({
    [side === 'player' ? 'playerCards' : 'opponentCards']:
      state[side === 'player' ? 'playerCards' : 'opponentCards'].map(card =>
        card.id === cardId ? { ...card, hp: Math.max(0, health) } : card
      )
  })),

  addDebuffToCard: (side, cardId, debuff) => set((state) => ({
    [side === 'player' ? 'playerCards' : 'opponentCards']:
      state[side === 'player' ? 'playerCards' : 'opponentCards'].map(card =>
        card.id === cardId
          ? { ...card, debuffs: [...card.debuffs.filter(d => d.type !== debuff.type), debuff] }
          : card
      )
  })),

  removeDebuffFromCard: (side, cardId, debuffType) => set((state) => ({
    [side === 'player' ? 'playerCards' : 'opponentCards']:
      state[side === 'player' ? 'playerCards' : 'opponentCards'].map(card =>
        card.id === cardId
          ? { ...card, debuffs: card.debuffs.filter(d => d.type !== debuffType) }
          : card
      )
  })),

  processDebuffs: () => {
    const state = get()
    const allCards = [...state.playerCards, ...state.opponentCards]

    allCards.forEach(card => {
      card.debuffs.forEach(debuff => {
        if (debuff.duration > 0) {
          const side = state.playerCards.find(c => c.id === card.id) ? 'player' : 'opponent'
          const updatedDebuff = { ...debuff, duration: debuff.duration - 1 }

          if (updatedDebuff.duration === 0) {
            get().removeDebuffFromCard(side, card.id, debuff.type)
          } else {
            get().addDebuffToCard(side, card.id, updatedDebuff)
          }
        }
      })
    })
  },

  endTurn: () => {
    const state = get()
    set({
      selectedCardId: null,
      targetCardId: null,
      selectedAbilityIndex: null,
      currentTurn: state.currentTurn === 'player' ? 'opponent' : 'player',
      phase: state.currentTurn === 'player' ? 'opponent_turn' : 'player_turn'
    })
    get().incrementTurn()
    get().processDebuffs()
    get().checkWinCondition()
  },

  checkWinCondition: () => {
    const state = get()
    const playerAlive = state.playerCards.some(card => card.hp > 0)
    const opponentAlive = state.opponentCards.some(card => card.hp > 0)

    if (!playerAlive && !opponentAlive) {
      get().setWinner(null)
    } else if (!opponentAlive) {
      get().setWinner('player')
    } else if (!playerAlive) {
      get().setWinner('opponent')
    }
  },

  resetGame: () => set({
    phase: 'setup',
    currentTurn: 'player',
    turnNumber: 1,
    winner: null,
    selectedCardId: null,
    targetCardId: null,
    selectedAbilityIndex: null,
    playerCards: [],
    opponentCards: []
  })
}))

export default useGameStore