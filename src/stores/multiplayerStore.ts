import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface MultiplayerState {
  socket: Socket | null
  roomId: string | null
  playerId: string | null
  isHost: boolean
  connected: boolean
  opponentReady: boolean

  connect: (serverUrl?: string) => void
  disconnect: () => void
  createRoom: () => void
  joinRoom: (roomId: string) => void
  sendGameState: (state: any) => void
  sendAction: (action: any) => void
  setOpponentReady: (ready: boolean) => void
}

const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  socket: null,
  roomId: null,
  playerId: null,
  isHost: false,
  connected: false,
  opponentReady: false,

  connect: (serverUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001') => {
    const socket = io(serverUrl, {
      transports: ['websocket']
    })

    socket.on('connect', () => {
      set({ connected: true, socket, playerId: socket.id })
    })

    socket.on('disconnect', () => {
      set({ connected: false, opponentReady: false })
    })

    socket.on('roomCreated', (roomId: string) => {
      set({ roomId, isHost: true })
    })

    socket.on('roomJoined', (roomId: string) => {
      set({ roomId, isHost: false })
    })

    socket.on('opponentReady', () => {
      set({ opponentReady: true })
    })

    socket.on('gameStateUpdate', (state: any) => {
      console.log('Received game state:', state)
    })

    socket.on('actionReceived', (action: any) => {
      console.log('Received action:', action)
    })

    set({ socket })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.disconnect()
      set({ socket: null, connected: false, roomId: null, playerId: null })
    }
  },

  createRoom: () => {
    const { socket } = get()
    if (socket) {
      socket.emit('createRoom')
    }
  },

  joinRoom: (roomId: string) => {
    const { socket } = get()
    if (socket) {
      socket.emit('joinRoom', roomId)
    }
  },

  sendGameState: (state: any) => {
    const { socket, roomId } = get()
    if (socket && roomId) {
      socket.emit('gameState', { roomId, state })
    }
  },

  sendAction: (action: any) => {
    const { socket, roomId } = get()
    if (socket && roomId) {
      socket.emit('action', { roomId, action })
    }
  },

  setOpponentReady: (ready: boolean) => set({ opponentReady: ready })
}))

export default useMultiplayerStore