import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import { CardData } from './cardStore'
import useOptimizedGameStore from './optimizedGameStore'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'in_game'
export type PlayerRole = 'player1' | 'player2' | 'spectator'

interface GameRoom {
  id: string
  player1: string | null // wallet address
  player2: string | null // wallet address
  status: 'waiting' | 'ready' | 'in_progress' | 'finished'
}

interface MultiplayerState {
  // Connection
  socket: Socket | null
  connectionStatus: ConnectionStatus

  // Player Info
  playerWallet: string | null
  opponentWallet: string | null
  playerRole: PlayerRole | null

  // Room/Game
  currentRoom: GameRoom | null
  availableRooms: GameRoom[]

  // Actions
  connectToServer: (serverUrl: string) => void
  disconnect: () => void
  setPlayerWallet: (wallet: string) => void

  // Matchmaking
  createRoom: () => void
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  findMatch: () => void

  // Game Actions (will emit to server)
  selectTarget: (targetId: string) => void
  endTurn: () => void
  executeAbility: (selectedCardId: string, abilityIndex: number, targetId: string) => void

  // Socket Event Handlers
  handleRoomUpdate: (room: GameRoom) => void
  handleGameStart: (data: { playerCards: CardData[], opponentCards: CardData[], startingPlayer: 'player1' | 'player2' }) => void
  handleStateSync: (gameState: any) => void
  handleOpponentAction: (action: any) => void
}

const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  // Initial State
  socket: null,
  connectionStatus: 'disconnected',
  playerWallet: null,
  opponentWallet: null,
  playerRole: null,
  currentRoom: null,
  availableRooms: [],

  // Connection Management
  connectToServer: (serverUrl: string) => {
    const state = get()

    // Disconnect existing socket if any
    if (state.socket) {
      state.socket.disconnect()
    }

    // Reset game state when connecting to multiplayer
    const gameStore = useOptimizedGameStore.getState()
    gameStore.resetGame()

    set({ connectionStatus: 'connecting' })

    const socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    // Socket event listeners
    socket.on('connect', () => {
      // console.log('Connected to game server')
      set({ connectionStatus: 'connected' })

      // Authenticate with wallet
      const wallet = get().playerWallet
      if (wallet) {
        socket.emit('authenticate', { wallet })
      }
    })

    socket.on('disconnect', () => {
      // console.log('Disconnected from game server')
      set({ connectionStatus: 'disconnected' })
    })

    socket.on('room:update', (room: GameRoom) => {
      get().handleRoomUpdate(room)
    })

    socket.on('room:list', (rooms: GameRoom[]) => {
      set({ availableRooms: rooms })
    })

    socket.on('game:start', (data) => {
      get().handleGameStart(data)
    })

    socket.on('game:stateSync', (gameState) => {
      get().handleStateSync(gameState)
    })

    socket.on('game:opponentAction', (action) => {
      get().handleOpponentAction(action)
    })

    socket.on('game:cardSelected', (data) => {
      // console.log('Card selected:', data)
      // Handle card selection animation/UI update
    })

    socket.on('game:abilityExecuted', (data) => {
      // console.log('Ability executed:', data)
      // Let the state sync handle the actual state update
      // This is just for triggering animations/effects
      const gameStore = useOptimizedGameStore.getState()
      const { playerRole } = get()

      // Trigger visual effects
      if (data.visualEffect) {
        // Transform positions based on player perspective
        // Player 1 sees cards at z=2 (player) and z=-2 (opponent)
        // Player 2 sees it flipped
        const transformPosition = (pos: number[]) => {
          if (!pos || pos.length !== 3) return pos

          // If this is player 2, we need to flip the z coordinate
          if (playerRole === 'player2') {
            return [pos[0], pos[1], -pos[2]] as [number, number, number]
          }
          return pos as [number, number, number]
        }

        // Create proper spell effect data with transformed positions
        const effectData = {
          id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: data.visualEffect.type,
          position: transformPosition(data.visualEffect.sourcePosition) || [0, 0, 0],
          sourcePosition: transformPosition(data.visualEffect.sourcePosition),
          targetPosition: transformPosition(data.visualEffect.targetPositions?.[0]) || transformPosition(data.visualEffect.targetPosition),
          targetPositions: data.visualEffect.targetPositions?.map(transformPosition),
          enemyPositions: data.visualEffect.enemyPositions?.map(transformPosition),
          allyPositions: data.visualEffect.allyPositions?.map(transformPosition),
          targetId: data.targetId || ''
        }
        window.dispatchEvent(new CustomEvent('spellEffect', { detail: effectData }))
      }

      // Add combat log entry
      if (data.combatLogEntry) {
        gameStore.addCombatLogEntry(data.combatLogEntry)
      }
    })

    socket.on('game:over', (data) => {
      // console.log('Game over:', data.winner)
      const gameStore = useOptimizedGameStore.getState()
      gameStore.setWinner(data.winner === get().playerRole ? 'player' : 'opponent')
    })

    socket.on('error', (error: string) => {
      console.error('Socket error:', error)
    })

    set({ socket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({
        socket: null,
        connectionStatus: 'disconnected',
        currentRoom: null,
        playerRole: null
      })
    }
  },

  setPlayerWallet: (wallet: string) => {
    set({ playerWallet: wallet })

    const { socket } = get()
    if (socket && socket.connected) {
      socket.emit('authenticate', { wallet })
    }
  },

  // Matchmaking Actions
  createRoom: () => {
    const { socket, playerWallet } = get()
    if (socket && playerWallet) {
      socket.emit('room:create', { wallet: playerWallet })
    }
  },

  joinRoom: (roomId: string) => {
    const { socket, playerWallet } = get()
    if (socket && playerWallet) {
      socket.emit('room:join', { roomId, wallet: playerWallet })
    }
  },

  leaveRoom: () => {
    const { socket, currentRoom } = get()
    if (socket && currentRoom) {
      socket.emit('room:leave', { roomId: currentRoom.id })
      set({ currentRoom: null, playerRole: null })
    }
  },

  findMatch: () => {
    const { socket, playerWallet } = get()
    if (socket && playerWallet) {
      socket.emit('matchmaking:find', { wallet: playerWallet })
    }
  },

  // Game Actions
  selectTarget: (targetId: string) => {
    const { socket, currentRoom } = get()
    const gameStore = useOptimizedGameStore.getState()

    if (socket && currentRoom) {
      // Get the selected card and ability from game store
      const { autoSelectedCardId, autoSelectedAbilityIndex } = gameStore

      socket.emit('game:action', {
        type: 'selectTarget',
        roomId: currentRoom.id,
        targetId,
        selectedCardId: autoSelectedCardId,
        abilityIndex: autoSelectedAbilityIndex
      })
    }
  },

  executeAbility: (selectedCardId: string, abilityIndex: number, targetId: string) => {
    const { socket, currentRoom } = get()
    if (socket && currentRoom) {
      socket.emit('game:action', {
        type: 'executeAbility',
        roomId: currentRoom.id,
        selectedCardId,
        abilityIndex,
        targetId
      })
    }
  },

  endTurn: () => {
    const { socket, currentRoom } = get()
    if (socket && currentRoom) {
      socket.emit('game:action', {
        type: 'endTurn',
        roomId: currentRoom.id
      })
    }
  },

  // Event Handlers
  handleRoomUpdate: (room: GameRoom) => {
    const { playerWallet } = get()
    set({ currentRoom: room })

    // Determine player role
    if (room.player1 === playerWallet) {
      set({ playerRole: 'player1', opponentWallet: room.player2 })
    } else if (room.player2 === playerWallet) {
      set({ playerRole: 'player2', opponentWallet: room.player1 })
    } else {
      set({ playerRole: 'spectator' })
    }

    // Update connection status
    if (room.status === 'in_progress') {
      set({ connectionStatus: 'in_game' })
    }
  },

  handleGameStart: (data) => {
    const { playerRole } = get()
    const gameStore = useOptimizedGameStore.getState()

    // console.log('Game starting with role:', playerRole, 'Data:', data)

    // Clear any existing cards first
    gameStore.resetGame()

    // Fix card positions based on player perspective
    const fixCardPositions = (cards: any[], isPlayer: boolean) => {
      return cards.map((card, i) => ({
        ...card,
        position: [(-3 + i * 2), 0, isPlayer ? 2 : -2] as [number, number, number]
      }))
    }

    // Set up cards based on player role
    if (playerRole === 'player1') {
      const playerCards = fixCardPositions(data.playerCards, true)
      const opponentCards = fixCardPositions(data.opponentCards, false)
      gameStore.setPlayerCards(playerCards)
      gameStore.setOpponentCards(opponentCards)
    } else if (playerRole === 'player2') {
      // Swap cards for player 2 perspective
      const playerCards = fixCardPositions(data.opponentCards, true)
      const opponentCards = fixCardPositions(data.playerCards, false)
      gameStore.setPlayerCards(playerCards)
      gameStore.setOpponentCards(opponentCards)
    }

    // Set starting turn
    const isMyTurn = data.startingPlayer === playerRole
    gameStore.setCurrentTurn(isMyTurn ? 'player' : 'opponent')
    gameStore.setPhase(isMyTurn ? 'player_turn' : 'opponent_turn')

    // Update connection status
    set({ connectionStatus: 'in_game' })
  },

  handleStateSync: (gameState) => {
    // Sync the game state from server
    const gameStore = useOptimizedGameStore.getState()
    const { playerRole } = get()

    // console.log('State sync received:', gameState)

    // Check if turn changed and play sound for the player whose turn it is now
    const currentPhase = gameStore.phase
    const turnChangedToMe = gameState.currentTurn === playerRole && currentPhase !== 'player_turn'

    // If turn changed to my turn, play sound
    if (turnChangedToMe) {
      // Dynamic import to avoid SSR issues
      import('@/utils/soundPlayer').then(({ playYourTurnSound }) => {
        playYourTurnSound()
      })
    }

    // Fix card positions based on player perspective
    const fixCardPositions = (cards: any[], isPlayer: boolean) => {
      return cards.map((card, i) => ({
        ...card,
        position: [(-3 + i * 2), 0, isPlayer ? 2 : -2] as [number, number, number]
      }))
    }

    // Update game state based on server state
    // This will be called after each action to ensure consistency
    if (playerRole === 'player1') {
      const playerCards = fixCardPositions(gameState.player1Cards, true)
      const opponentCards = fixCardPositions(gameState.player2Cards, false)
      gameStore.setPlayerCards(playerCards)
      gameStore.setOpponentCards(opponentCards)
    } else if (playerRole === 'player2') {
      const playerCards = fixCardPositions(gameState.player2Cards, true)
      const opponentCards = fixCardPositions(gameState.player1Cards, false)
      gameStore.setPlayerCards(playerCards)
      gameStore.setOpponentCards(opponentCards)
    }

    // Update selected card and ability if provided
    const currentPlayerSelectedCard = playerRole === 'player1'
      ? gameState.player1SelectedCard
      : gameState.player2SelectedCard
    const currentPlayerSelectedAbility = playerRole === 'player1'
      ? gameState.player1SelectedAbility
      : gameState.player2SelectedAbility
    const opponentSelectedCard = playerRole === 'player1'
      ? gameState.player2SelectedCard
      : gameState.player1SelectedCard
    const opponentSelectedAbility = playerRole === 'player1'
      ? gameState.player2SelectedAbility
      : gameState.player1SelectedAbility

    // Only update selection if it's current player's turn
    const isMyTurn = gameState.currentTurn === playerRole
    if (isMyTurn && currentPlayerSelectedCard && currentPlayerSelectedAbility !== null) {
      gameStore.setAutoSelectedCard(currentPlayerSelectedCard)
      gameStore.setAutoSelectedAbility(currentPlayerSelectedAbility)
      gameStore.setWaitingForTarget(true)

      // Show message about ability selection
      const card = gameState[`${playerRole}Cards`].find((c: any) => c.id === currentPlayerSelectedCard)
      if (card) {
        const ability = card.abilities[currentPlayerSelectedAbility]
        gameStore.setGameMessage(`${card.name} prepares ${ability.name}! Select a target!`)
      }
    } else if (!isMyTurn && opponentSelectedCard && opponentSelectedAbility !== null) {
      // Show opponent's selection
      const opponentCards = playerRole === 'player1' ? gameState.player2Cards : gameState.player1Cards
      const card = opponentCards.find((c: any) => c.id === opponentSelectedCard)
      if (card) {
        const ability = card.abilities[opponentSelectedAbility]
        gameStore.setGameMessage(`Opponent's ${card.name} is preparing ${ability.name}...`)
      }
    }

    // Update turn
    gameStore.setCurrentTurn(isMyTurn ? 'player' : 'opponent')
    gameStore.setPhase(isMyTurn ? 'player_turn' : 'opponent_turn')

    // Check win condition
    gameStore.checkWinCondition()
  },

  handleOpponentAction: (action) => {
    // console.log('Opponent action received:', action)
    // Handle opponent's actions (target selection, ability use, etc.)
    // This will trigger visual effects and state updates
  }
}))

export default useMultiplayerStore