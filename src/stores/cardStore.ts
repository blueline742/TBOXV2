import { create } from 'zustand'

export interface Ability {
  name: string
  description: string
  damage?: number
  heal?: number
  effect?: 'freeze' | 'burn' | 'stun' | 'shield' | 'poison' | 'revive' | 'spell_steal' | 'battery_drain' | 'chaos_shuffle' | 'weaken' | 'water_squirt' | 'bath_bomb'
  targetType: 'single' | 'all' | 'self' | 'allies'
  cooldown?: number
  currentCooldown?: number
}

export interface Debuff {
  type: 'frozen' | 'burned' | 'stunned' | 'poisoned' | 'fire_aura' | 'shielded' | 'weakened' | 'wet' | 'protected'
  duration: number
  damage?: number
  stacks?: number  // For stackable debuffs like Fire Aura and Wet
  maxStacks?: number  // Maximum stacks allowed
  shieldAmount?: number  // For shield debuff
  damageReduction?: number  // For weakened debuff (percentage) or protected buff (percentage)
  critChanceIncrease?: number  // For wet debuff (percentage increase in crit chance)
}

export interface CardData {
  id: string
  name: string
  hp: number
  maxHp: number
  texture: string
  abilities: Ability[]
  debuffs: Debuff[]
  shield?: number  // Shield amount (damage absorption)
  position?: [number, number, number]
}

interface CardStore {
  availableCards: CardData[]
  initializeCards: () => void
}

const toyCards: Omit<CardData, 'id' | 'hp' | 'debuffs' | 'position'>[] = [
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
      { name: 'Fire Aura', description: 'Burn all enemies (5 dmg/turn, stacks 3x)', effect: 'burn', targetType: 'all' },
      { name: 'Battery Drain', description: 'Leech 20 HP from all enemies and redistribute to allies', targetType: 'all', effect: 'battery_drain' }
    ]
  },
  {
    name: 'Voodoo',
    maxHp: 90,
    texture: '/voodoonft.webp',
    abilities: [
      { name: 'Cannon Blast', description: 'Area damage', damage: 25, targetType: 'all' },
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

const useCardStore = create<CardStore>((set) => ({
  availableCards: [],

  initializeCards: () => {
    const cards = toyCards.map((card, index) => ({
      ...card,
      id: `card-${index}`,
      hp: card.maxHp,
      debuffs: [],
      abilities: card.abilities.map(ability => ({
        ...ability,
        currentCooldown: 0
      }))
    }))
    set({ availableCards: cards })
  }
}))

export default useCardStore
export { toyCards }

