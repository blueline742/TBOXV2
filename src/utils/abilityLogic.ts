import { CardData, Ability, Debuff, toyCards } from '@/stores/cardStore'

// Track last used enemy ability for spell steal
let lastEnemyAbility: Ability | null = null

export interface AbilityResult {
  success: boolean
  message: string
  visualEffect?: 'fire' | 'freeze' | 'lightning' | 'heal' | 'poison' | 'ice_nova' | 'battery_drain' | 'chaos_shuffle' | 'whirlwind_slash' | 'shield' | 'fire_breath' | 'mecha_roar' | 'water_squirt' | 'bath_bomb' | 'laser_beam' | 'shield_boost' // Added for spell visuals
  effects: Array<{
    type: 'damage' | 'heal' | 'debuff' | 'effect'
    targetId: string
    value?: number
    debuff?: Debuff
  }>
  damages?: Array<{ cardId: string; amount: number; side: 'player' | 'opponent' }>
  heals?: Array<{ cardId: string; amount: number; side: 'player' | 'opponent' }>
  debuffs?: Array<{ cardId: string; debuff: Debuff; side: 'player' | 'opponent' }>
}

export function executeAbility(
  ability: Ability,
  sourceCard: CardData,
  targetCard: CardData | null,
  allPlayerCards: CardData[],
  allOpponentCards: CardData[]
): AbilityResult {
  const effects: AbilityResult['effects'] = []
  const damages: AbilityResult['damages'] = []
  const heals: AbilityResult['heals'] = []
  const debuffs: AbilityResult['debuffs'] = []

  // Track enemy abilities for spell steal (only track opponent abilities)
  const isOpponentCard = allOpponentCards.some(c => c.id === sourceCard.id)
  if (isOpponentCard && ability.effect !== 'spell_steal') {
    lastEnemyAbility = ability
  }

  if (sourceCard.debuffs.some(d => d.type === 'stunned')) {
    return { success: false, message: `${sourceCard.name} is stunned!`, effects: [] }
  }

  if (sourceCard.debuffs.some(d => d.type === 'frozen')) {
    return { success: false, message: `${sourceCard.name} is frozen!`, effects: [] }
  }

  let targets: CardData[] = []

  switch (ability.targetType) {
    case 'single':
      if (!targetCard) {
        return { success: false, message: 'No target selected!', effects: [] }
      }
      targets = [targetCard]
      break

    case 'all':
      // Special handling for Extinction Protocol - select 2 random targets
      if (ability.name === 'Extinction Protocol') {
        const aliveOpponents = allOpponentCards.filter(card => card.hp > 0)
        const numTargets = Math.min(2, aliveOpponents.length)
        const shuffled = [...aliveOpponents].sort(() => Math.random() - 0.5)
        targets = shuffled.slice(0, numTargets)
        console.log('[EXTINCTION LOGIC] Selected targets:', targets.map(t => ({ id: t.id, name: t.name })))
      } else {
        targets = allOpponentCards.filter(card => card.hp > 0)
      }
      break

    case 'self':
      targets = [sourceCard]
      break

    case 'allies':
      targets = allPlayerCards.filter(card => card.hp > 0)
      break
  }

  if (targets.length === 0) {
    return { success: false, message: 'No valid targets!', effects: [] }
  }

  let message = `${sourceCard.name} uses ${ability.name}!`
  let visualEffect: AbilityResult['visualEffect']

  // Special handling for Battery Drain ability
  if (ability.name === 'Battery Drain') {
    visualEffect = 'battery_drain'
    // console.log('[BATTERY DRAIN DEBUG] Ability detected:', ability.name, 'Visual effect set to:', visualEffect)

    // Calculate total HP to drain (20 per enemy)
    const enemyTargets = allOpponentCards.filter(card => card.hp > 0)
    let totalDrained = 0

    // Damage all enemies
    enemyTargets.forEach(enemy => {
      const drainAmount = Math.min(20, enemy.hp) // Don't drain more than they have
      totalDrained += drainAmount

      effects.push({ type: 'damage', targetId: enemy.id, value: drainAmount })
      const side = allPlayerCards.find(c => c.id === enemy.id) ? 'player' : 'opponent'
      damages.push({ cardId: enemy.id, amount: drainAmount, side })
    })

    // Redistribute health to all allies
    const allyTargets = allPlayerCards.filter(card => card.hp > 0)
    if (allyTargets.length > 0 && totalDrained > 0) {
      const healPerAlly = Math.floor(totalDrained / allyTargets.length)

      allyTargets.forEach(ally => {
        const healAmount = Math.min(healPerAlly, ally.maxHp - ally.hp)
        if (healAmount > 0) {
          effects.push({ type: 'heal', targetId: ally.id, value: healAmount })
          const side = allPlayerCards.find(c => c.id === ally.id) ? 'player' : 'opponent'
          heals.push({ cardId: ally.id, amount: healAmount, side })
        }
      })

      message = `${sourceCard.name} drains ${totalDrained} HP and redistributes it to allies!`
    } else {
      message = `${sourceCard.name} drains ${totalDrained} HP from enemies!`
    }

    // Return early for Battery Drain
    return {
      success: true,
      message,
      effects,
      damages,
      heals,
      debuffs,
      visualEffect
    }
  }

  // Special handling for Chaos Shuffle ability
  if (ability.effect === 'chaos_shuffle') {
    visualEffect = 'chaos_shuffle'

    // Get random cards from toyCards
    const shuffledCards = [...toyCards].sort(() => Math.random() - 0.5)

    // Transform each enemy card
    allOpponentCards.forEach((card, index) => {
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
        card.hp = Math.max(1, Math.floor(newTemplate.maxHp * hpPercentage)) // Maintain HP percentage, minimum 1
        card.debuffs = [] // Clear all debuffs

        effects.push({ type: 'effect', targetId: card.id })
      }
    })

    message = `${sourceCard.name} casts Chaos Shuffle! All enemy cards have been transformed!`

    return {
      success: true,
      message,
      effects,
      damages,
      heals,
      debuffs,
      visualEffect
    }
  }

  targets.forEach(target => {
    if (ability.damage) {
      let damage = ability.damage

      // Apply weakened debuff if caster has it
      const weakenedDebuff = sourceCard.debuffs.find(d => d.type === 'weakened')
      if (weakenedDebuff && weakenedDebuff.damageReduction) {
        damage = Math.floor(damage * (1 - weakenedDebuff.damageReduction))
      }

      // Apply critical hit chance if target is wet
      const wetDebuff = target.debuffs.find(d => d.type === 'wet')
      if (wetDebuff && wetDebuff.critChanceIncrease) {
        const critRoll = Math.random()
        const critChance = (wetDebuff.stacks || 1) * (wetDebuff.critChanceIncrease || 0.2)
        if (critRoll < critChance) {
          damage = Math.floor(damage * 2) // Critical hit doubles damage
          message += ` CRITICAL HIT!`
        }
      }

      // Apply protection buff if target has it
      const protectedDebuff = target.debuffs.find(d => d.type === 'protected')
      if (protectedDebuff && protectedDebuff.damageReduction) {
        damage = Math.floor(damage * (1 - protectedDebuff.damageReduction))
      }

      effects.push({ type: 'damage', targetId: target.id, value: damage })

      const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
      damages.push({ cardId: target.id, amount: damage, side })
      console.log('[EXTINCTION DAMAGE] Added damage:', { cardId: target.id, amount: damage, side, name: target.name })

      // Check if target has shield (will be absorbed by damageCard function)
      if (target.shield && target.shield > 0) {
        message += ` ${target.name}'s shield absorbs ${Math.min(target.shield, damage)} damage!`
      } else {
        message += ` ${target.name} takes ${damage} damage!`
      }

      if (ability.name === 'Pyroblast') {
        visualEffect = 'fire'
      } else if (ability.name === 'Fire Breath') {
        visualEffect = 'fire_breath'
      } else if (ability.name === 'Lightning Zap') {
        visualEffect = 'lightning'
      } else if (ability.name === 'Whirlwind Slash') {
        visualEffect = 'whirlwind_slash'
      } else if (ability.name === 'Extinction Protocol') {
        visualEffect = 'extinction_protocol'
      } else if (ability.name === 'Water Squirt') {
        visualEffect = 'water_squirt'
      } else if (ability.name === 'Laser Beam') {
        visualEffect = 'laser_beam'
      }
    }

    if (ability.heal) {
      const healAmount = Math.min(ability.heal, target.maxHp - target.hp)
      effects.push({ type: 'heal', targetId: target.id, value: healAmount })

      const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
      heals.push({ cardId: target.id, amount: healAmount, side })

      message += ` ${target.name} heals for ${healAmount}!`
      visualEffect = 'heal'
    }

    if (ability.effect) {
      // Special handling for Bath Bomb
      if (ability.effect === 'bath_bomb') {
        const protectedDebuff: Debuff = {
          type: 'protected',
          duration: 999, // Permanent for rest of game
          damageReduction: 0.15 // 15% damage reduction
        }

        // Only apply if target doesn't already have protection (doesn't stack)
        const existingProtection = target.debuffs.find(d => d.type === 'protected')
        if (!existingProtection) {
          effects.push({ type: 'debuff', targetId: target.id, debuff: protectedDebuff })
          const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
          debuffs.push({ cardId: target.id, debuff: protectedDebuff, side })
        }

        visualEffect = 'bath_bomb'
      }
      // Special handling for Water Squirt
      else if (ability.effect === 'water_squirt') {
        // Check if target already has wet debuff
        const existingWet = target.debuffs.find(d => d.type === 'wet')
        const currentStacks = existingWet?.stacks || 0
        const newStacks = Math.min(currentStacks + 1, 3) // Max 3 stacks

        const wetDebuff: Debuff = {
          type: 'wet',
          duration: 999, // Permanent for rest of game
          stacks: newStacks,
          maxStacks: 3,
          critChanceIncrease: 0.2 // 20% per stack
        }

        effects.push({ type: 'debuff', targetId: target.id, debuff: wetDebuff })
        const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
        debuffs.push({ cardId: target.id, debuff: wetDebuff, side })

        message += ` ${target.name} is soaked! (Wet x${newStacks}, +${newStacks * 20}% crit chance against them)`
      }
      // Special handling for Fire Aura
      else if (ability.name === 'Fire Aura') {
        const fireAuraDebuff: Debuff = {
          type: 'fire_aura',
          duration: 999,  // Persistent until cleansed or game ends
          damage: 5,      // Base damage, will be multiplied by stacks
          stacks: 1,
          maxStacks: 3
        }

        effects.push({ type: 'debuff', targetId: target.id, debuff: fireAuraDebuff })
        const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
        debuffs.push({ cardId: target.id, debuff: fireAuraDebuff, side })

        // Check if target already has fire aura to customize message
        const existingFireAura = target.debuffs.find(d => d.type === 'fire_aura')
        if (existingFireAura && existingFireAura.stacks) {
          const newStacks = Math.min((existingFireAura.stacks || 1) + 1, 3)
          message += ` ${target.name}'s Fire Aura intensifies (${newStacks} stacks)!`
        } else {
          message += ` ${target.name} is engulfed in Fire Aura!`
        }

        visualEffect = 'fire'
      } else {
        // Normal debuff handling
        const debuffMap: Record<string, Debuff> = {
          'freeze': { type: 'frozen', duration: 2 },
          'burn': { type: 'burned', duration: 3, damage: 5 },
          'stun': { type: 'stunned', duration: 1 },
          'poison': { type: 'poisoned', duration: 4, damage: 3 },
          'weaken': { type: 'weakened', duration: 6, damageReduction: 0.3 }
        }

        const debuff = debuffMap[ability.effect]
        if (debuff) {
          effects.push({ type: 'debuff', targetId: target.id, debuff })

          const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
          debuffs.push({ cardId: target.id, debuff, side })

          message += ` ${target.name} is ${ability.effect}ed!`

          // Debug logging for Ice Nova
          if (ability.name === 'Ice Nova') {
            // console.log('[ICE NOVA DEBUG] Applying freeze to:', target.name, 'Debuff:', debuff)
            visualEffect = 'ice_nova'
          } else if (ability.name === 'Mecha Roar') {
            visualEffect = 'mecha_roar'
          } else if (ability.effect === 'freeze') {
            visualEffect = 'freeze'
          } else if (ability.effect === 'poison') {
            visualEffect = 'poison'
          }
        }
      }

      if (ability.effect === 'shield') {
        // Apply shield as a debuff - amount depends on ability
        const shieldAmount = ability.name === 'Shield Boost' ? 15 : 10
        const shieldDebuff: Debuff = {
          type: 'shielded',
          duration: 999,  // Persistent until broken
          shieldAmount: shieldAmount
        }

        effects.push({ type: 'debuff', targetId: target.id, debuff: shieldDebuff })
        const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
        debuffs.push({ cardId: target.id, debuff: shieldDebuff, side })

        message += ` ${target.name} gains a shield (${shieldAmount})!`
        visualEffect = ability.name === 'Shield Boost' ? 'shield_boost' : 'shield' // Use dark blue shield for Robot Guardian
      }

      // Handle revival
      if (ability.effect === 'revive') {
        // Find a dead ally
        const deadAllies = allPlayerCards.filter(c => c.hp <= 0)
        if (deadAllies.length > 0 && target) {
          // Revive the target with 50% HP
          const reviveHP = Math.floor(target.maxHp * 0.5)
          effects.push({ type: 'heal', targetId: target.id, value: reviveHP })
          const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
          heals.push({ cardId: target.id, amount: reviveHP, side })
          message = `${sourceCard.name} resurrects ${target.name} with ${reviveHP} HP!`
          visualEffect = 'heal'
        } else {
          message = `${sourceCard.name} tries to resurrect but no fallen allies to revive!`
        }
      }

      // Handle spell steal
      if (ability.effect === 'spell_steal') {
        if (lastEnemyAbility) {
          // Execute the stolen ability
          const stolenResult = executeAbility(
            lastEnemyAbility,
            sourceCard,
            targetCard,
            allPlayerCards,
            allOpponentCards
          )

          if (stolenResult.success) {
            message = `${sourceCard.name} echoes ${lastEnemyAbility.name}! ${stolenResult.message}`
            return stolenResult // Return the stolen ability's result
          } else {
            message = `${sourceCard.name} tries to echo but the spell fails!`
          }
        } else {
          message = `${sourceCard.name} tries to echo but no enemy spell to copy!`
        }
      }
    }
  })

  const result = {
    success: true,
    message,
    effects,
    damages,
    heals,
    debuffs,
    visualEffect
  }

  if (ability.name === 'Extinction Protocol') {
    console.log('[EXTINCTION RESULT] Final result:', {
      damages: result.damages,
      visualEffect: result.visualEffect
    })
  }

  return result
}

export function applyAbilityEffects(result: AbilityResult, store: any) {
  // Update health for damaged cards
  result.damages?.forEach(({ cardId, amount, side }) => {
    store.damageCard(side, cardId, amount)
  })

  // Update health for healed cards
  result.heals?.forEach(({ cardId, amount, side }) => {
    store.healCard(side, cardId, amount)
  })

  // Apply debuffs (includes shields now)
  result.debuffs?.forEach(({ cardId, debuff, side }) => {
    // console.log('[DEBUG] Applying debuff:', debuff, 'to card:', cardId, 'side:', side)
    store.addDebuff(side, cardId, debuff)
  })
}

export function processDebuffDamage(store: any) {
  const allCards: CardData[] = [
    ...(Array.from(store.playerCards.values()) as CardData[]),
    ...(Array.from(store.opponentCards.values()) as CardData[])
  ]

  allCards.forEach((card: CardData) => {
    card.debuffs.forEach((debuff: Debuff) => {
      if (debuff.damage && card.hp > 0) {
        const side = store.playerCards.has(card.id) ? 'player' : 'opponent'
        store.damageCard(side, card.id, debuff.damage)
      }
    })
  })
}

export function aiSelectAction(
  aiCards: CardData[],
  playerCards: CardData[]
): { cardId: string; abilityIndex: number; targetId: string | null } | null {
  const aliveAiCards = aiCards.filter(card => card.hp > 0 && !card.debuffs.some(d => d.type === 'stunned' || d.type === 'frozen'))
  const alivePlayerCards = playerCards.filter(card => card.hp > 0)

  if (aliveAiCards.length === 0) return null

  const selectedCard = aliveAiCards[Math.floor(Math.random() * aliveAiCards.length)]

  const availableAbilities = selectedCard.abilities.filter((_, index) => {
    const cooldown = selectedCard.abilities[index].currentCooldown || 0
    return cooldown === 0
  })

  if (availableAbilities.length === 0) {
    const basicAbility = 0
    const targetCard = alivePlayerCards[Math.floor(Math.random() * alivePlayerCards.length)]
    return {
      cardId: selectedCard.id,
      abilityIndex: basicAbility,
      targetId: targetCard ? targetCard.id : null
    }
  }

  const ability = availableAbilities[Math.floor(Math.random() * availableAbilities.length)]
  const abilityIndex = selectedCard.abilities.indexOf(ability)

  let targetId: string | null = null

  switch (ability.targetType) {
    case 'single':
      const target = alivePlayerCards[Math.floor(Math.random() * alivePlayerCards.length)]
      targetId = target ? target.id : null
      break
    case 'self':
      targetId = selectedCard.id
      break
    case 'allies':
      const ally = aiCards.find(c => c.hp > 0 && c.hp < c.maxHp)
      targetId = ally ? ally.id : selectedCard.id
      break
  }

  return {
    cardId: selectedCard.id,
    abilityIndex,
    targetId
  }
}