import { CardData, Ability, Debuff } from '@/stores/cardStore'
import useGameStore from '@/stores/gameStore'

export interface AbilityResult {
  success: boolean
  message: string
  effects: Array<{
    type: 'damage' | 'heal' | 'debuff' | 'effect'
    targetId: string
    value?: number
    debuff?: Debuff
  }>
}

export function executeAbility(
  ability: Ability,
  sourceCard: CardData,
  targetCard: CardData | null,
  allPlayerCards: CardData[],
  allOpponentCards: CardData[]
): AbilityResult {
  const effects: AbilityResult['effects'] = []

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
      targets = allOpponentCards.filter(card => card.hp > 0)
      break

    case 'self':
      targets = [sourceCard]
      break

    case 'allies':
      targets = allPlayerCards.filter(card => card.hp > 0)
      break
  }

  targets.forEach(target => {
    if (ability.damage) {
      const damage = ability.damage
      effects.push({
        type: 'damage',
        targetId: target.id,
        value: damage
      })
    }

    if (ability.heal) {
      const healAmount = Math.min(ability.heal, target.maxHp - target.hp)
      effects.push({
        type: 'heal',
        targetId: target.id,
        value: healAmount
      })
    }

    if (ability.effect) {
      let debuff: Debuff | null = null

      switch (ability.effect) {
        case 'freeze':
          debuff = { type: 'frozen', duration: 2 }
          break
        case 'burn':
          debuff = { type: 'burned', duration: 3, damage: 5 }
          break
        case 'stun':
          debuff = { type: 'stunned', duration: 1 }
          break
        case 'poison':
          debuff = { type: 'poisoned', duration: 4, damage: 3 }
          break
      }

      if (debuff) {
        effects.push({
          type: 'debuff',
          targetId: target.id,
          debuff
        })
      }

      if (ability.effect === 'shield') {
        effects.push({
          type: 'effect',
          targetId: target.id
        })
      }
    }
  })

  return {
    success: true,
    message: `${sourceCard.name} uses ${ability.name}!`,
    effects
  }
}

export function applyAbilityEffects(result: AbilityResult, gameStore: any) {
  result.effects.forEach(effect => {
    const side = gameStore.playerCards.find((c: CardData) => c.id === effect.targetId) ? 'player' : 'opponent'

    switch (effect.type) {
      case 'damage':
        if (effect.value) {
          const currentCard = side === 'player'
            ? gameStore.playerCards.find((c: CardData) => c.id === effect.targetId)
            : gameStore.opponentCards.find((c: CardData) => c.id === effect.targetId)

          if (currentCard) {
            gameStore.updateCardHealth(side, effect.targetId, currentCard.hp - effect.value)
          }
        }
        break

      case 'heal':
        if (effect.value) {
          const currentCard = side === 'player'
            ? gameStore.playerCards.find((c: CardData) => c.id === effect.targetId)
            : gameStore.opponentCards.find((c: CardData) => c.id === effect.targetId)

          if (currentCard) {
            gameStore.updateCardHealth(side, effect.targetId, currentCard.hp + effect.value)
          }
        }
        break

      case 'debuff':
        if (effect.debuff) {
          gameStore.addDebuffToCard(side, effect.targetId, effect.debuff)
        }
        break
    }
  })
}

export function processDebuffDamage(gameStore: any) {
  const allCards = [...gameStore.playerCards, ...gameStore.opponentCards]

  allCards.forEach((card: CardData) => {
    card.debuffs.forEach(debuff => {
      if (debuff.damage && card.hp > 0) {
        const side = gameStore.playerCards.find((c: CardData) => c.id === card.id) ? 'player' : 'opponent'
        gameStore.updateCardHealth(side, card.id, card.hp - debuff.damage)
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