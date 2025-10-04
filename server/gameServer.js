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
    origin: [
      "http://localhost:3000",
      "http://localhost:3003",
      "http://localhost:3002",
      /\.netlify\.app$/, // Allow all Netlify URLs
      /\.render\.com$/ // Allow Render URLs
    ],
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
    texture: '/wizardnft.webp',
    abilities: [
      { name: 'Ice Nova', description: 'Freeze all enemies', effect: 'freeze', targetType: 'all' },
      { name: 'Pyroblast', description: 'Heavy fire damage (35 HP)', damage: 35, targetType: 'single' },
      { name: 'Lightning Zap', description: 'Damage all enemies', damage: 15, targetType: 'all' }
    ]
  },
  {
    name: 'Robot Guardian',
    maxHp: 120,
    texture: '/robotnft.webp',
    abilities: [
      { name: 'Laser Beam', description: 'High damage', damage: 30, targetType: 'single' },
      { name: 'Shield Boost', description: 'Shield all allies absorbing 15 damage', effect: 'shield', targetType: 'allies' },
      { name: 'Recharge Batteries', description: 'Revive all defeated allies with 20% HP', effect: 'revive', targetType: 'dead_allies' }
    ]
  },
  {
    name: 'Dino',
    maxHp: 100,
    texture: '/dinonft.webp',
    abilities: [
      { name: 'Fire Breath', description: 'Burn single target', damage: 23, effect: 'burn', targetType: 'single' },
      { name: 'Mecha Roar', description: 'Weaken all enemies (30% less damage for 6 turns)', effect: 'weaken', targetType: 'all' },
      { name: 'Extinction Protocol', description: 'Fire 2 rockets at 2 random enemies dealing massive damage', damage: 45, targetType: 'all' }
    ]
  },
  {
    name: 'Brick Dude',
    maxHp: 110,
    texture: '/brickdudenft.webp',
    abilities: [
      { name: 'Sword Strike', description: 'Basic attack', damage: 25, targetType: 'single' },
      { name: 'Block Defence', description: 'Shield all allies absorbing 10 damage', effect: 'shield', targetType: 'allies' },
      { name: 'Whirlwind Slash', description: 'Spin attack damaging all enemies', damage: 20, targetType: 'all' }
    ]
  },
  {
    name: 'Duckie',
    maxHp: 70,
    texture: '/duckienft.webp',
    abilities: [
      { name: 'Water Squirt', description: 'Squirt water at enemy (20 dmg + wet debuff, +20% crit chance, stacks 3x)', damage: 20, effect: 'water_squirt', targetType: 'single' },
      { name: 'Bath Bomb', description: 'Throw a colorful bath bomb, reduce team damage taken by 15%', effect: 'bath_bomb', targetType: 'allies' },
      { name: 'Duck Swarm', description: 'Summon a swarm of ducks to attack all enemies', damage: 20, targetType: 'all' }
    ]
  },
  {
    name: 'Arch Wizard',
    maxHp: 60,
    texture: '/archwizardnft.webp',
    abilities: [
      { name: 'Chaos Shuffle', description: 'Transform all enemy cards into random ones', targetType: 'all', effect: 'chaos_shuffle', cooldown: 5 },
      { name: 'Fire Aura', description: 'Burn all enemies', effect: 'burn', targetType: 'all' },
      { name: 'Battery Drain', description: 'Leech 20 HP from all enemies', targetType: 'all', effect: 'battery_drain' }
    ]
  },
  {
    name: 'Voodoo',
    maxHp: 90,
    texture: '/voodoonft.webp',
    abilities: [
      { name: 'Puppet Master', description: 'Steal 15 HP from a random enemy and give it to a random ally', targetType: 'random', effect: 'puppet_master' },
      { name: 'Cutlass Slash', description: 'Single target', damage: 30, targetType: 'single' },
      { name: 'Rum Heal', description: 'Heal self', heal: 30, targetType: 'self' }
    ]
  },
  {
    name: 'Wind-up Toy',
    maxHp: 85,
    texture: '/winduptoynft.webp',
    abilities: [
      { name: 'Ray Gun', description: 'Laser damage', damage: 28, targetType: 'single' },
      { name: 'Mind Control', description: 'Stun target', effect: 'stun', targetType: 'single' },
      { name: 'Probe', description: 'Damage over time', damage: 10, effect: 'poison', targetType: 'single' }
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
  // console.log('User connected:', socket.id)

  // Handle authentication
  socket.on('authenticate', ({ wallet }) => {
    // console.log('User authenticated:', wallet)
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
    // console.log('Room created:', roomId)
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
      // console.log('Room created via matchmaking:', roomId)
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
              // console.log(`${card.name} takes ${debuff.damage} ${debuff.type} damage`)
            }

            // Reduce duration
            debuff.duration--

            // Remove if duration expired
            if (debuff.duration <= 0) {
              // console.log(`${card.name}'s ${debuff.type} has expired`)
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
              // console.log(`${card.name} takes ${debuff.damage} ${debuff.type} damage`)
            }

            // Reduce duration
            debuff.duration--

            // Remove if duration expired
            if (debuff.duration <= 0) {
              // console.log(`${card.name}'s ${debuff.type} has expired`)
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
    // console.log('User disconnected:', socket.id)

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
  // console.log('Game started:', roomId)
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
    // console.log('Caster not found or dead:', selectedCardId)
    return
  }

  const ability = caster.abilities[abilityIndex]
  if (!ability) {
    // console.log('Ability not found:', abilityIndex)
    return
  }

  // console.log(`${playerRole} executing ${ability.name} with ${caster.name} on target ${targetId}`)

  // Check if caster is stunned or frozen
  if (caster.debuffs.some(d => d.type === 'stunned' || d.type === 'frozen')) {
    // console.log('Caster is stunned or frozen, cannot act')
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
      // Special handling for Extinction Protocol - select 2 random targets
      if (ability.name === 'Extinction Protocol') {
        const aliveOpponents = opponentCards.filter(c => c.hp > 0)
        const numTargets = Math.min(2, aliveOpponents.length)
        const shuffled = [...aliveOpponents].sort(() => Math.random() - 0.5)
        targets = shuffled.slice(0, numTargets)
      } else {
        targets = opponentCards.filter(c => c.hp > 0)
      }
      break
    case 'self':
      targets = [caster]
      break
    case 'allies':
      targets = cards.filter(c => c.hp > 0)
      break
    case 'dead_allies':
      targets = cards.filter(c => c.hp <= 0)
      break
    case 'random':
      // For Puppet Master - will be handled specially in effect logic
      targets = []
      break
  }

  // Special abilities
  if (ability.effect === 'chaos_shuffle') {
    // Transform all enemy cards into random ones
    const shuffledCards = [...toyCards].sort(() => Math.random() - 0.5)

    opponentCards.forEach((card, index) => {
      if (card.hp > 0) { // Only transform alive cards
        const newTemplate = shuffledCards[index % shuffledCards.length]

        // Calculate HP percentage to maintain
        const hpPercentage = card.hp / card.maxHp

        // Transform the card
        card.name = newTemplate.name
        card.texture = newTemplate.texture
        card.abilities = newTemplate.abilities.map(ability => ({
          ...ability,
          currentCooldown: 0
        }))
        card.maxHp = newTemplate.maxHp
        card.hp = Math.max(1, Math.floor(newTemplate.maxHp * hpPercentage)) // Maintain HP percentage
        card.debuffs = [] // Clear all debuffs
      }
    })

    message = `${caster.name} casts Chaos Shuffle! All enemy cards have been transformed!`
  } else if (ability.effect === 'battery_drain') {
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
  } else if (ability.effect === 'puppet_master') {
    // Puppet Master: Steal 15 HP from random enemy and give to random ally
    const enemyTargets = opponentCards.filter(c => c.hp > 0)
    if (enemyTargets.length === 0) {
      message = `${caster.name} finds no enemies to control!`
    } else {
      // Pick random enemy
      const randomEnemy = enemyTargets[Math.floor(Math.random() * enemyTargets.length)]
      const drainAmount = Math.min(15, randomEnemy.hp)

      // Damage the random enemy
      randomEnemy.hp -= drainAmount
      damages.push({ cardId: randomEnemy.id, amount: drainAmount })
      targets.push(randomEnemy)

      // Pick random living ally to heal
      const allyTargets = cards.filter(c => c.hp > 0 && c.hp < c.maxHp)
      if (allyTargets.length > 0) {
        const randomAlly = allyTargets[Math.floor(Math.random() * allyTargets.length)]
        const healAmount = Math.min(drainAmount, randomAlly.maxHp - randomAlly.hp)

        if (healAmount > 0) {
          randomAlly.hp += healAmount
          heals.push({ cardId: randomAlly.id, amount: healAmount })
          message = `${caster.name} steals ${drainAmount} HP from ${randomEnemy.name} and gives it to ${randomAlly.name}!`
        }
      } else {
        message = `${caster.name} steals ${drainAmount} HP from ${randomEnemy.name}!`
      }
    }
  } else if (ability.effect === 'revive') {
    // Revive fallen allies with 20% HP (targets already filtered by dead_allies)
    targets.forEach(deadAlly => {
      const reviveAmount = Math.floor(deadAlly.maxHp * 0.2)
      deadAlly.hp = reviveAmount
      heals.push({ cardId: deadAlly.id, amount: reviveAmount })
    })
  } else {
    // Apply standard effects
    targets.forEach(target => {
      if (ability.damage) {
        let damageAmount = ability.damage

        // Apply weakened debuff if caster has it
        const weakenedDebuff = caster.debuffs.find(d => d.type === 'weakened')
        if (weakenedDebuff && weakenedDebuff.damageReduction) {
          damageAmount = Math.floor(damageAmount * (1 - weakenedDebuff.damageReduction))
        }

        // Apply critical hit chance if target is wet
        const wetDebuff = target.debuffs.find(d => d.type === 'wet')
        if (wetDebuff && wetDebuff.critChanceIncrease) {
          const critRoll = Math.random()
          const critChance = (wetDebuff.stacks || 1) * (wetDebuff.critChanceIncrease || 0.2)
          if (critRoll < critChance) {
            damageAmount = Math.floor(damageAmount * 2) // Critical hit doubles damage
            console.log(`CRITICAL HIT! ${caster.name} hits ${target.name} for ${damageAmount} damage!`)
          }
        }

        // Apply protection buff if target has it (reduces incoming damage)
        const protectedDebuff = target.debuffs.find(d => d.type === 'protected')
        if (protectedDebuff && protectedDebuff.damageReduction) {
          damageAmount = Math.floor(damageAmount * (1 - protectedDebuff.damageReduction))
        }

        let actualDamage = damageAmount

        // Check for shield debuff and absorb damage first
        const shieldDebuff = target.debuffs.find(d => d.type === 'shielded')
        if (shieldDebuff && shieldDebuff.shieldAmount && shieldDebuff.shieldAmount > 0) {
          if (shieldDebuff.shieldAmount >= damageAmount) {
            // Shield absorbs all damage
            shieldDebuff.shieldAmount -= damageAmount
            actualDamage = 0
            damageAmount = 0
            // Remove shield if depleted
            if (shieldDebuff.shieldAmount <= 0) {
              target.debuffs = target.debuffs.filter(d => d.type !== 'shielded')
            }
          } else {
            // Shield absorbs partial damage
            damageAmount -= shieldDebuff.shieldAmount
            actualDamage = damageAmount
            shieldDebuff.shieldAmount = 0
            target.debuffs = target.debuffs.filter(d => d.type !== 'shielded')
          }
        }

        // Apply remaining damage to HP
        if (damageAmount > 0) {
          actualDamage = Math.min(damageAmount, target.hp)
          target.hp = Math.max(0, target.hp - damageAmount)
        }

        damages.push({ cardId: target.id, amount: actualDamage })
      }
      if (ability.heal) {
        const healAmount = Math.min(ability.heal, target.maxHp - target.hp)
        target.hp = Math.min(target.maxHp, target.hp + ability.heal)
        heals.push({ cardId: target.id, amount: healAmount })
      }
      if (ability.effect && ability.effect !== 'battery_drain') {
        // Add debuff - shield amount depends on ability name
        const shieldAmount = ability.name === 'Shield Boost' ? 15 : 10

        // Special handling for Fire Aura - use fire_aura debuff type
        let debuff
        if (ability.name === 'Fire Aura') {
          debuff = { type: 'fire_aura', duration: 999, damage: 5, stacks: 1, maxStacks: 3 }
        } else {
          const debuffMap = {
            'freeze': { type: 'frozen', duration: 2 },
            'burn': { type: 'burned', duration: 3, damage: 5 },
            'stun': { type: 'stunned', duration: 1 },
            'poison': { type: 'poisoned', duration: 4, damage: 3 },
            'shield': { type: 'shielded', duration: 999, shieldAmount: shieldAmount },
            'weaken': { type: 'weakened', duration: 6, damageReduction: 0.3 },
            'water_squirt': { type: 'wet', duration: 999, stacks: 1, maxStacks: 3, critChanceIncrease: 0.2 },
            'bath_bomb': { type: 'protected', duration: 999, damageReduction: 0.15 }
          }
          debuff = debuffMap[ability.effect]
        }

        if (debuff && target.hp > 0) {
          // Check if wet already exists and stack it
          if (debuff.type === 'wet') {
            const existingWet = target.debuffs.find(d => d.type === 'wet')
            if (existingWet) {
              existingWet.stacks = Math.min((existingWet.stacks || 1) + 1, 3)
            } else {
              target.debuffs.push(debuff)
            }
          }
          // Check if fire_aura already exists and stack it
          else if (debuff.type === 'fire_aura') {
            const existingFireAura = target.debuffs.find(d => d.type === 'fire_aura')
            if (existingFireAura) {
              existingFireAura.stacks = Math.min((existingFireAura.stacks || 1) + 1, 3)
            } else {
              target.debuffs.push(debuff)
            }
          }
          // Check if shield already exists and stack it
          else if (debuff.type === 'shielded') {
            const existingShield = target.debuffs.find(d => d.type === 'shielded')
            if (existingShield) {
              existingShield.shieldAmount = (existingShield.shieldAmount || 0) + (debuff.shieldAmount || 0)
            } else {
              target.debuffs.push(debuff)
            }
          }
          // Check if protected already exists - don't stack
          else if (debuff.type === 'protected') {
            const existingProtected = target.debuffs.find(d => d.type === 'protected')
            if (!existingProtected) {
              target.debuffs.push(debuff)
            }
          } else {
            target.debuffs.push(debuff)
          }
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
    else if (ability.name === 'Fire Breath') effectType = 'fire_breath'
    else if (ability.name === 'Mecha Roar') effectType = 'mecha_roar'
    else if (ability.name === 'Lightning Zap') effectType = 'lightning'
    else if (ability.name === 'Ice Nova') effectType = 'ice_nova'
    else if (ability.name === 'Battery Drain') effectType = 'battery_drain'
    else if (ability.name === 'Chaos Shuffle') effectType = 'chaos_shuffle'
    else if (ability.name === 'Sword Strike') effectType = 'sword_strike'
    else if (ability.name === 'Whirlwind Slash') effectType = 'whirlwind_slash'
    else if (ability.name === 'Extinction Protocol') effectType = 'extinction_protocol'
    else if (ability.name === 'Water Squirt') effectType = 'water_squirt'
    else if (ability.name === 'Bath Bomb') effectType = 'bath_bomb'
    else if (ability.name === 'Duck Swarm') effectType = 'duck_swarm'
    else if (ability.name === 'Laser Beam') effectType = 'laser_beam'
    else if (ability.name === 'Shield Boost') effectType = 'shield_boost'
    else if (ability.name === 'Recharge Batteries') effectType = 'resurrection'
    else if (ability.name === 'Fire Aura') effectType = 'fire_breath'
    else if (ability.name === 'Puppet Master') effectType = 'puppet_master'

    const targetPositionsList = targets.map(t => {
      const isOpponent = opponentCards.some(c => c.id === t.id)
      const targetCards = isOpponent ? opponentCards : cards
      const index = targetCards.findIndex(c => c.id === t.id)
      return [(-3 + index * 2), 0.5, isOpponent ? (playerRole === 'player1' ? -2 : 2) : (playerRole === 'player1' ? 2 : -2)]
    })

    visualEffect = {
      type: effectType,
      sourcePosition: sourcePos,
      targetPosition: targetPositionsList[0], // Single target position
      targetPositions: targetPositionsList // All target positions for multi-target
    }

    // For Battery Drain, Puppet Master, Chaos Shuffle, and Fire Aura (fire_breath), add enemy and ally positions
    if (effectType === 'battery_drain' || effectType === 'puppet_master' || effectType === 'chaos_shuffle' || effectType === 'fire_breath') {
      visualEffect.enemyPositions = opponentCards.filter(c => c.hp > 0).map((card, i) => {
        return [(-3 + i * 2), 0.5, playerRole === 'player1' ? -2 : 2]
      })

      if (effectType === 'battery_drain' || effectType === 'puppet_master') {
        visualEffect.allyPositions = cards.filter(c => c.hp > 0).map((card, i) => {
          return [(-3 + i * 2), 0.5, playerRole === 'player1' ? 2 : -2]
        })
      }
    }

    // For Bath Bomb, add ally positions (already calculated in targetPositionsList)
    if (effectType === 'bath_bomb') {
      visualEffect.allyPositions = targetPositionsList
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