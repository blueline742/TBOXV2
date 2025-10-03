'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import useMultiplayerStore from '@/stores/multiplayerStore'
import { useEffect, useState } from 'react'

// Use Render backend in production, localhost for development
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3002'
    : 'https://tbox-game-server.onrender.com')

export function MultiplayerLobby() {
  const { publicKey, connected } = useWallet()
  const {
    connectionStatus,
    currentRoom,
    availableRooms,
    playerRole,
    opponentWallet,
    connectToServer,
    createRoom,
    joinRoom,
    leaveRoom,
    findMatch,
    setPlayerWallet
  } = useMultiplayerStore()

  const [showLobby, setShowLobby] = useState(false)

  useEffect(() => {
    if (connected && publicKey) {
      setPlayerWallet(publicKey.toString())
      // Connect to game server (you'll need to set up the server URL)
      // For development, we'll use localhost
      // connectToServer('http://localhost:3002')
    }
  }, [connected, publicKey, setPlayerWallet])

  // Don't show lobby if in game
  if (currentRoom?.status === 'in_progress') {
    return null
  }

  if (!connected) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
        <div className="bg-purple-900/90 rounded-lg p-8 max-w-md">
          <h2 className="text-white text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-300 mb-6">
            Connect your Solana wallet to start playing multiplayer battles!
          </p>
          <p className="text-gray-400 text-sm">
            Use the wallet button in the top-right corner to connect.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Lobby Toggle Button */}
      <button
        onClick={() => setShowLobby(!showLobby)}
        className="fixed top-20 right-4 z-30 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
      >
        {showLobby ? 'Hide' : 'Show'} Multiplayer
      </button>

      {/* Lobby Modal */}
      {showLobby && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
          <div className="bg-gradient-to-b from-purple-900 to-blue-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-white text-2xl font-bold mb-4">Multiplayer Lobby</h2>

            {/* Connection Status */}
            <div className="mb-4">
              <span className="text-gray-300">Status: </span>
              <span className={`font-bold ${
                connectionStatus === 'connected' ? 'text-green-400' :
                connectionStatus === 'connecting' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {connectionStatus.toUpperCase()}
              </span>
            </div>

            {/* Current Room Info */}
            {currentRoom && (
              <div className="bg-black/30 rounded-lg p-4 mb-4">
                <h3 className="text-white font-bold mb-2">Current Room</h3>
                <p className="text-gray-300">Room ID: {currentRoom.id}</p>
                <p className="text-gray-300">Status: {currentRoom.status}</p>
                <p className="text-gray-300">Your Role: {playerRole}</p>
                {opponentWallet && (
                  <p className="text-gray-300">
                    Opponent: {opponentWallet.slice(0, 4)}...{opponentWallet.slice(-4)}
                  </p>
                )}
                <button
                  onClick={leaveRoom}
                  className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Leave Room
                </button>
              </div>
            )}

            {/* Matchmaking Actions */}
            {!currentRoom && connectionStatus === 'connected' && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    onClick={findMatch}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg transition-colors font-bold"
                  >
                    Quick Match
                  </button>
                  <button
                    onClick={createRoom}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-bold"
                  >
                    Create Room
                  </button>
                </div>

                {/* Available Rooms */}
                {availableRooms.length > 0 && (
                  <div>
                    <h3 className="text-white font-bold mb-2">Available Rooms</h3>
                    <div className="space-y-2">
                      {availableRooms.map((room) => (
                        <div
                          key={room.id}
                          className="bg-black/30 rounded p-3 flex justify-between items-center"
                        >
                          <div>
                            <p className="text-white">Room {room.id.slice(0, 8)}</p>
                            <p className="text-gray-400 text-sm">
                              Players: {room.player1 ? 1 : 0}/2
                            </p>
                          </div>
                          <button
                            onClick={() => joinRoom(room.id)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Connect to Server Button (for development) */}
            {connectionStatus === 'disconnected' && (
              <div className="text-center">
                <p className="text-gray-300 mb-4">Not connected to game server</p>
                <button
                  onClick={() => connectToServer(SOCKET_URL)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg transition-colors font-bold"
                >
                  Connect to Game Server
                </button>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowLobby(false)}
              className="mt-4 text-gray-400 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}