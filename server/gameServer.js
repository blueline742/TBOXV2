const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3003", "http://localhost:3002"],
    methods: ["GET", "POST"],
    credentials: true
  }
})

// Game rooms storage
const rooms = new Map()
const playerSockets = new Map() // wallet -> socketId mapping

// Card pool (same as client)
const toyCards = [
  {
    name: 'Toy Wizard',
    maxHp: 80,
    texture: '/wizardnft.png',
    abilities: [
      { name: 'Ice Nova', description: 'Freeze all enemies', effect: 'freeze', targetType: 'all' },
      { name: 'Pyroblast', description: 'Heavy fire damage (35 HP)', damage: 35, targetType: 'single' },
      { name: 'Lightning Zap', description: 'Damage all enemies', damage: 15, targetType: 'all' }
    ]
  },
  {
    name: 'Robot',
    maxHp: 120,
    texture: '/robotnft.png',
    abilities: [
      { name: 'Laser Beam', description: 'High damage', damage: 30, targetType: 'single' },
      { name: 'Shield Mode', description: 'Shield self', effect: 'shield', targetType: 'self' },
      { name: 'EMP Blast', description: 'Stun all enemies', effect: 'stun', targetType: 'all' }
    ]
  },
  {
    name: 'Dino',
    maxHp: 100,
    texture: '/dinonft.png',
    abilities: [
      { name: 'Fire Breath', description: 'Burn single target', damage: 25, effect: 'burn', targetType: 'single' },
      { name: 'Wing Buffet', description: 'Damage all', damage: 20, targetType: 'all' },
      { name: 'Roar', description: 'Stun all enemies', effect: 'stun', targetType: 'all' }
    ]
  },
  {
    name: 'Brick Dude',
    maxHp: 110,
    texture: '/brickdudenft.png',
    abilities: [
      { name: 'Sword Strike', description: 'Basic attack', damage: 25, targetType: 'single' },
      { name: 'Shield Bash', description: 'Damage and stun', damage: 15, effect: 'stun', targetType: 'single' },
      { name: 'Rally', description: 'Heal all allies', heal: 20, targetType: 'allies' }
    ]
  },
  {
    name: 'Duckie',
    maxHp: 70,
    texture: '/duckienft.png',
    abilities: [
      { name: 'Shadow Strike', description: 'High damage', damage: 40, targetType: 'single' },
      { name: 'Smoke Bomb', description: 'Stun all enemies', effect: 'stun', targetType: 'all' },
      { name: 'Poison Blade', description: 'Poison target', damage: 15, effect: 'poison', targetType: 'single' }
    ]
  },
  {
    name: 'Arch Wizard',
    maxHp: 60,
    texture: '/archwizardnft.png',
    abilities: [
      { name: 'Battery Drain', description: 'Leech 20 HP from all enemies', targetType: 'all', effect: 'battery_drain' },
      { name: 'Fire Aura', description: 'Burn all enemies', effect: 'burn', targetType: 'all' },
      { name: 'Holy Light', description: 'Damage undead', damage: 30, targetType: 'single' }
    ]
  },
  {
    name: 'Voodoo',
    maxHp: 90,
    texture: '/voodoonft.png',
    abilities: [
      { name: 'Cannon Blast', description: 'Area damage', damage: 25, targetType: 'all' },
      { name: 'Cutlass Slash', description: 'Single target', damage: 30, targetType: 'single' },
      { name: 'Rum Heal', description: 'Heal self', heal: 30, targetType: 'self' }
    ]
  },
  {
    name: 'Wind-up Toy',
    maxHp: 85,
    texture: '/winduptoynft.png',
    abilities: [
      { name: 'Ray Gun', description: 'Laser damage', damage: 28, targetType: 'single' },
      { name: 'Mind Control', description: 'Stun target', effect: 'stun', targetType: 'single' },
      { name: 'Probe', description: 'Damage over time', damage: 10, effect: 'poison', targetType: 'single' }
    ]
  },
  {
    name: 'Spirit Shaman',
    maxHp: 75,
    texture: '/shamannft.png',
    abilities: [
      { name: 'Resurrection', description: 'Revive a fallen ally', effect: 'revive', targetType: 'single' },
      { name: 'Healing Totem', description: 'Heal all allies', heal: 25, targetType: 'allies' },
      { name: 'Spell Echo', description: 'Copy last enemy spell', effect: 'spell_steal', targetType: 'single' }
    ]
  }
]

// Helper function to create a room ID
function createRoomId() {
  return Math.random().toString(36).substring(2, 9)
}

// Helper function to initialize cards for a player
function initializePlayerCards(isPlayer1) {
  const shuffled = [...toyCards].sort(() => Math.random() - 0.5)
  const zPos = isPlayer1 ? 2 : -2
  return shuffled.slice(0, 4).map((card, i) => ({
    ...card,
    id: `${isPlayer1 ? 'player1' : 'player2'}-card-${i}`,
    hp: card.maxHp,
    debuffs: [],
    abilities: card.abilities.map(ability => ({
      ...ability,
      currentCooldown: 0
    })),
    position: [(-3 + i * 2), 0, zPos]
  }))
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Handle authentication
  socket.on('authenticate', ({ wallet }) => {
    console.log('User authenticated:', wallet)
    playerSockets.set(wallet, socket.id)
    socket.wallet = wallet

    // Send list of available rooms
    const availableRooms = Array.from(rooms.values())
      .filter(room => room.status === 'waiting')
      .map(room => ({
        id: room.id,
        player1: room.player1,
        player2: room.player2,
        status: room.status
      }))
    socket.emit('room:list', availableRooms)
  })

  // Create a new room
  socket.on('room:create', ({ wallet }) => {
    const roomId = createRoomId()
    const room = {
      id: roomId,
      player1: wallet,
      player2: null,
      status: 'waiting',
      gameState: null,
      currentTurn: null,
      player1Cards: null,
      player2Cards: null,
      player1SelectedCard: null,
      player1SelectedAbility: null,
      player2SelectedCard: null,
      player2SelectedAbility: null
    }

    rooms.set(roomId, room)
    socket.join(roomId)
    socket.roomId = roomId

    socket.emit('room:update', room)
    console.log('Room created:', roomId)
  })

  // Join a room
  socket.on('room:join', ({ roomId, wallet }) => {
    const room = rooms.get(roomId)
    if (!room) {
      socket.emit('error', 'Room not found')
      return
    }

    if (room.player2 && room.player2 !== wallet) {
      socket.emit('error', 'Room is full')
      return
    }

    room.player2 = wallet
    room.status = 'ready'
    socket.join(roomId)
    socket.roomId = roomId

    io.to(roomId).emit('room:update', room)

    // Start the game
    setTimeout(() => startGame(roomId), 1000)
  })

  // Quick matchmaking
  socket.on('matchmaking:find', ({ wallet }) => {
    // Find an available room or create one
    const availableRoom = Array.from(rooms.values()).find(
      room => room.status === 'waiting' && room.player1 !== wallet
    )

    if (availableRoom) {
      // Join existing room directly
      availableRoom.player2 = wallet
      availableRoom.status = 'ready'
      socket.join(availableRoom.id)
      socket.roomId = availableRoom.id

      io.to(availableRoom.id).emit('room:update', availableRoom)

      // Start the game
      setTimeout(() => startGame(availableRoom.id), 1000)
    } else {
      // Create new room directly
      const roomId = createRoomId()
      const room = {
        id: roomId,
        player1: wallet,
        player2: null,
        status: 'waiting',
        gameState: null,
        currentTurn: null,
        player1Cards: null,
        player2Cards: null,
        player1SelectedCard: null,
        player1SelectedAbility: null,
        player2SelectedCard: null,
        player2SelectedAbility: null
      }

      rooms.set(roomId, room)
      socket.join(roomId)
      socket.roomId = roomId

      socket.emit('room:update', room)
      console.log('Room created via matchmaking:', roomId)
    }
  })

  // Leave room
  socket.on('room:leave', ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room) return

    socket.leave(roomId)

    // If game hasn't started, remove the room
    if (room.status === 'waiting') {
      rooms.delete(roomId)
    } else {
      // Mark the game as abandoned
      room.status = 'abandoned'
      io.to(roomId).emit('room:update', room)
    }
  })

  // Game actions
  socket.on('game:action', ({ type, roomId, targetId, selectedCardId, abilityIndex }) => {
    const room = rooms.get(roomId)
    if (!room || room.status !== 'in_progress') return

    const isPlayer1 = room.player1 === socket.wallet
    const isPlayer2 = room.player2 === socket.wallet

    if (!isPlayer1 && !isPlayer2) return

    const currentPlayer = room.currentTurn
    const playerRole = isPlayer1 ? 'player1' : 'player2'

    // Check if it's this player's turn
    if (currentPlayer !== playerRole) {
      socket.emit('error', 'Not your turn')
      return
    }

    switch (type) {
      case 'selectTarget':
        // Update the stored selection if provided
        if (selectedCardId && abilityIndex !== undefined) {
          if (playerRole === 'player1') {
            room.player1SelectedCard = selectedCardId
            room.player1SelectedAbility = abilityIndex
          } else {
            room.player2SelectedCard = selectedCardId
            room.player2SelectedAbility = abilityIndex
          }
        }
        // Execute the ability with the selected target
        executeAbility(room, playerRole, targetId)
        break

      case 'endTurn':
        // Process cooldowns and debuffs for BOTH teams at end of turn
        // This ensures debuffs tick down properly for everyone

        // Process player 1 cards
        room.player1Cards.forEach(card => {
          // Tick down ability cooldowns
          card.abilities.forEach(ability => {
            if (ability.currentCooldown > 0) {
              ability.currentCooldown--
            }
          })

          // Tick down and process debuffs
          card.debuffs = card.debuffs.filter(debuff => {
            // Apply debuff damage (burn, poison, etc.)
            if (debuff.damage && card.hp > 0) {
              card.hp = Math.max(0, card.hp - debuff.damage)
              console.log(`${card.name} takes ${debuff.damage} ${debuff.type} damage`)
            }

            // Reduce duration
            debuff.duration--

            // Remove if duration expired
            if (debuff.duration <= 0) {
              console.log(`${card.name}'s ${debuff.type} has expired`)
              return false
            }
            return true
          })
        })

        // Process player 2 cards
        room.player2Cards.forEach(card => {
          // Tick down ability cooldowns
          card.abilities.forEach(ability => {
            if (ability.currentCooldown > 0) {
              ability.currentCooldown--
            }
          })

          // Tick down and process debuffs
          card.debuffs = card.debuffs.filter(debuff => {
            // Apply debuff damage (burn, poison, etc.)
            if (debuff.damage && card.hp > 0) {
              card.hp = Math.max(0, card.hp - debuff.damage)
              console.log(`${card.name} takes ${debuff.damage} ${debuff.type} damage`)
            }

            // Reduce duration
            debuff.duration--

            // Remove if duration expired
            if (debuff.duration <= 0) {
              console.log(`${card.name}'s ${debuff.type} has expired`)
              return false
            }
            return true
          })
        })

        // Switch turns
        room.currentTurn = room.currentTurn === 'player1' ? 'player2' : 'player1'

        // Clear previous selections
        if (playerRole === 'player1') {
          room.player1SelectedCard = null
          room.player1SelectedAbility = null
        } else {
          room.player2SelectedCard = null
          room.player2SelectedAbility = null
        }

        // Select random card and ability for next player
        selectRandomCardAndAbility(room, room.currentTurn)

        // Broadcast state update
        broadcastGameState(roomId)
        break
    }
  })

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)

    if (socket.wallet) {
      playerSockets.delete(socket.wallet)
    }

    if (socket.roomId) {
      const room = rooms.get(socket.roomId)
      if (room && room.status === 'in_progress') {
        // Notify other player
        io.to(socket.roomId).emit('opponent:disconnected')
      }
    }
  })
})

// Start a game
function startGame(roomId) {
  const room = rooms.get(roomId)
  if (!room || room.status !== 'ready') return

  // Initialize cards for both players
  room.player1Cards = initializePlayerCards(true)  // Player 1 cards at z=2
  room.player2Cards = initializePlayerCards(false) // Player 2 cards at z=-2

  // Randomly select starting player
  room.currentTurn = Math.random() < 0.5 ? 'player1' : 'player2'
  room.status = 'in_progress'

  // Select random card and ability for starting player
  selectRandomCardAndAbility(room, room.currentTurn)

  // Send game start event to both players
  io.to(roomId).emit('game:start', {
    playerCards: room.player1Cards,
    opponentCards: room.player2Cards,
    startingPlayer: room.currentTurn
  })

  io.to(roomId).emit('room:update', room)
  console.log('Game started:', roomId)
}

// Select random card and ability
function selectRandomCardAndAbility(room, playerRole) {
  const cards = playerRole === 'player1' ? room.player1Cards : room.player2Cards
  const aliveCards = cards.filter(c => c.hp > 0)

  if (aliveCards.length === 0) return

  // Random card selection
  const randomCard = aliveCards[Math.floor(Math.random() * aliveCards.length)]

  // Random ability selection
  const availableAbilities = randomCard.abilities.filter(a => !a.currentCooldown || a.currentCooldown === 0)
  const randomAbility = availableAbilities.length > 0
    ? availableAbilities[Math.floor(Math.random() * availableAbilities.length)]
    : randomCard.abilities[0]

  const abilityIndex = randomCard.abilities.indexOf(randomAbility)

  if (playerRole === 'player1') {
    room.player1SelectedCard = randomCard.id
    room.player1SelectedAbility = abilityIndex
  } else {
    room.player2SelectedCard = randomCard.id
    room.player2SelectedAbility = abilityIndex
  }

  // Notify players about the selection
  io.to(room.id).emit('game:cardSelected', {
    playerRole,
    cardId: randomCard.id,
    abilityIndex,
    cardName: randomCard.name,
    abilityName: randomAbility.name
  })
}

// Execute ability
function executeAbility(room, playerRole, targetId) {
  const cards = playerRole === 'player1' ? room.player1Cards : room.player2Cards
  const opponentCards = playerRole === 'player1' ? room.player2Cards : room.player1Cards
  const selectedCardId = playerRole === 'player1' ? room.player1SelectedCard : room.player2SelectedCard
  const abilityIndex = playerRole === 'player1' ? room.player1SelectedAbility : room.player2SelectedAbility

  const caster = cards.find(c => c.id === selectedCardId)
  if (!caster || caster.hp <= 0) {
    console.log('Caster not found or dead:', selectedCardId)
    return
  }

  const ability = caster.abilities[abilityIndex]
  if (!ability) {
    console.log('Ability not found:', abilityIndex)
    return
  }

  console.log(`${playerRole} executing ${ability.name} with ${caster.name} on target ${targetId}`)

  // Check if caster is stunned or frozen
  if (caster.debuffs.some(d => d.type === 'stunned' || d.type === 'frozen')) {
    console.log('Caster is stunned or frozen, cannot act')
    return
  }

  // Apply cooldown
  if (ability.cooldown) {
    ability.currentCooldown = ability.cooldown
  }

  // Track damages and heals for feedback
  const damages = []
  const heals = []
  const debuffsApplied = []

  // Execute based on target type
  let targets = []
  switch (ability.targetType) {
    case 'single':
      const target = [...cards, ...opponentCards].find(c => c.id === targetId)
      if (target && target.hp > 0) targets = [target]
      break
    case 'all':
      targets = opponentCards.filter(c => c.hp > 0)
      break
    case 'self':
      targets = [caster]
      break
    case 'allies':
      targets = cards.filter(c => c.hp > 0)
      break
  }

  // Special abilities
  if (ability.effect === 'battery_drain') {
    // Drain 20 HP from all enemies and distribute to allies
    let totalDrained = 0
    opponentCards.filter(c => c.hp > 0).forEach(enemy => {
      const drainAmount = Math.min(20, enemy.hp)
      enemy.hp -= drainAmount
      totalDrained += drainAmount
      damages.push({ cardId: enemy.id, amount: drainAmount })
    })

    // Distribute healing to allies
    const aliveAllies = cards.filter(c => c.hp > 0)
    if (aliveAllies.length > 0) {
      const healPerAlly = Math.floor(totalDrained / aliveAllies.length)
      aliveAllies.forEach(ally => {
        const healAmount = Math.min(healPerAlly, ally.maxHp - ally.hp)
        ally.hp += healAmount
        heals.push({ cardId: ally.id, amount: healAmount })
      })
    }
  } else if (ability.effect === 'revive') {
    // Revive a fallen ally with 50% HP
    const deadAlly = cards.find(c => c.id === targetId && c.hp <= 0)
    if (deadAlly) {
      deadAlly.hp = Math.floor(deadAlly.maxHp * 0.5)
      heals.push({ cardId: deadAlly.id, amount: deadAlly.hp })
    }
  } else {
    // Apply standard effects
    targets.forEach(target => {
      if (ability.damage) {
        const damageAmount = ability.damage
        const actualDamage = Math.min(damageAmount, target.hp)
        target.hp = Math.max(0, target.hp - damageAmount)
        damages.push({ cardId: target.id, amount: actualDamage })
      }
      if (ability.heal) {
        const healAmount = Math.min(ability.heal, target.maxHp - target.hp)
        target.hp = Math.min(target.maxHp, target.hp + ability.heal)
        heals.push({ cardId: target.id, amount: healAmount })
      }
      if (ability.effect && ability.effect !== 'battery_drain') {
        // Add debuff
        const debuffMap = {
          'freeze': { type: 'frozen', duration: 2 },
          'burn': { type: 'burned', duration: 3, damage: 5 },
          'stun': { type: 'stunned', duration: 1 },
          'poison': { type: 'poisoned', duration: 4, damage: 3 },
          'shield': { type: 'shielded', duration: 2 }
        }
        const debuff = debuffMap[ability.effect]
        if (debuff && target.hp > 0) {
          target.debuffs.push(debuff)
          debuffsApplied.push({ cardId: target.id, debuff: debuff })
        }
      }
    })
  }

  // Create visual effect data
  const casterIndex = cards.findIndex(c => c.id === caster.id)
  const sourcePos = [(-3 + casterIndex * 2), 0.5, playerRole === 'player1' ? 2 : -2]

  let visualEffect = null
  if (ability.effect || ability.damage || ability.heal) {
    // Determine correct effect type based on ability name
    let effectType = ability.effect || (ability.heal ? 'heal' : 'fire')
    if (ability.name === 'Pyroblast') effectType = 'fireball'
    else if (ability.name === 'Lightning Zap') effectType = 'lightning'
    else if (ability.name === 'Ice Nova') effectType = 'ice_nova'
    else if (ability.name === 'Battery Drain') effectType = 'battery_drain'

    visualEffect = {
      type: effectType,
      sourcePosition: sourcePos,
      targetPositions: targets.map(t => {
        const isOpponent = opponentCards.some(c => c.id === t.id)
        const targetCards = isOpponent ? opponentCards : cards
        const index = targetCards.findIndex(c => c.id === t.id)
        return [(-3 + index * 2), 0.5, isOpponent ? (playerRole === 'player1' ? -2 : 2) : (playerRole === 'player1' ? 2 : -2)]
      })
    }
  }

  // Create combat log entry
  const combatLogEntry = {
    attackerCard: {
      name: caster.name,
      texture: caster.texture
    },
    targetCards: targets.map(t => ({ name: t.name, texture: t.texture })),
    abilityName: ability.name,
    totalDamage: damages.reduce((sum, d) => sum + d.amount, 0),
    totalHealing: heals.reduce((sum, h) => sum + h.amount, 0),
    effects: debuffsApplied.length > 0 ? debuffsApplied.map(d => d.debuff.type) : undefined
  }

  // Broadcast the action with full details
  io.to(room.id).emit('game:abilityExecuted', {
    playerRole,
    casterId: caster.id,
    targetId,
    abilityIndex,
    ability,
    damages,
    heals,
    debuffsApplied,
    visualEffect,
    combatLogEntry
  })

  // Check win condition
  const player1Alive = room.player1Cards.some(c => c.hp > 0)
  const player2Alive = room.player2Cards.some(c => c.hp > 0)

  if (!player1Alive || !player2Alive) {
    room.status = 'finished'
    const winner = player1Alive ? 'player1' : 'player2'
    io.to(room.id).emit('game:over', { winner })
  }

  // Broadcast updated state immediately
  broadcastGameState(room.id)
}

// Broadcast game state
function broadcastGameState(roomId) {
  const room = rooms.get(roomId)
  if (!room) return

  io.to(roomId).emit('game:stateSync', {
    player1Cards: room.player1Cards,
    player2Cards: room.player2Cards,
    currentTurn: room.currentTurn,
    player1SelectedCard: room.player1SelectedCard,
    player1SelectedAbility: room.player1SelectedAbility,
    player2SelectedCard: room.player2SelectedCard,
    player2SelectedAbility: room.player2SelectedAbility
  })
}

const PORT = process.env.PORT || 3002
httpServer.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`)
})