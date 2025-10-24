import { create } from 'zustand'

export interface Ability {
  name: string
  description: string
  damage?: number
  heal?: number
  effect?: 'freeze' | 'burn' | 'stun' | 'shield' | 'poison' | 'revive' | 'spell_steal' | 'battery_drain' | 'puppet_master' | 'chaos_shuffle' | 'weaken' | 'water_squirt' | 'bath_bomb' | 'curse_of_strings' | 'curse_of_puppets' | 'puppet_show' | 'medication' | 'surgery' | 'clear_revive'
  targetType: 'single' | 'all' | 'self' | 'allies' | 'dead_allies' | 'random'
  cooldown?: number
  currentCooldown?: number
  manaCost: number  // NEW: Mana cost for this ability
}

export interface Debuff {
  type: 'frozen' | 'burned' | 'stunned' | 'poisoned' | 'fire_aura' | 'shielded' | 'weakened' | 'wet' | 'protected' | 'heal_reduction' | 'untargetable' | 'heal_over_time'
  duration: number
  damage?: number
  stacks?: number  // For stackable debuffs like Fire Aura and Wet
  maxStacks?: number  // Maximum stacks allowed
  shieldAmount?: number  // For shield debuff
  damageReduction?: number  // For weakened debuff (percentage) or protected buff (percentage)
  critChanceIncrease?: number  // For wet debuff (percentage increase in crit chance)
  healingReduction?: number  // For heal_reduction debuff (percentage reduction in healing received)
  healAmount?: number  // For heal_over_time (amount healed per turn)
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
      { name: 'Ice Nova', description: 'Freeze all enemies', effect: 'freeze', targetType: 'all', manaCost: 2 },
      { name: 'Pyroblast', description: 'Heavy fire damage (35 HP)', damage: 35, targetType: 'single', manaCost: 2 },
      { name: 'Lightning Zap', description: 'Damage all enemies', damage: 15, targetType: 'all', manaCost: 3 }
    ]
  },
  {
    name: 'Robot Guardian',
    maxHp: 120,
    texture: '/robotnft.webp',
    abilities: [
      { name: 'Laser Beam', description: 'High damage', damage: 30, targetType: 'single', manaCost: 2 },
      { name: 'Shield Boost', description: 'Shield all allies absorbing 15 damage', effect: 'shield', targetType: 'allies', manaCost: 2 },
      { name: 'Recharge Batteries', description: 'Revive all defeated allies with 20% HP', effect: 'revive', targetType: 'dead_allies', manaCost: 3 }
    ]
  },
  {
    name: 'Dino',
    maxHp: 100,
    texture: '/dinonft.webp',
    abilities: [
      { name: 'Fire Breath', description: 'Burn single target', damage: 23, effect: 'burn', targetType: 'single', manaCost: 2 },
      { name: 'Mecha Roar', description: 'Weaken all enemies (30% less damage for 6 turns)', effect: 'weaken', targetType: 'all', manaCost: 2 },
      { name: 'Extinction Protocol', description: 'Fire 2 rockets at 2 random enemies dealing massive damage', damage: 45, targetType: 'all', manaCost: 3 }
    ]
  },
  {
    name: 'Brick Dude',
    maxHp: 110,
    texture: '/brickdudenft.webp',
    abilities: [
      { name: 'Sword Strike', description: 'Basic attack', damage: 25, targetType: 'single', manaCost: 1 },
      { name: 'Block Defence', description: 'Shield all allies absorbing 10 damage', effect: 'shield', targetType: 'allies', manaCost: 2 },
      { name: 'Whirlwind Slash', description: 'Spin attack damaging all enemies', damage: 20, targetType: 'all', manaCost: 2 }
    ]
  },
  {
    name: 'Duckie',
    maxHp: 70,
    texture: '/duckienft.webp',
    abilities: [
      { name: 'Water Squirt', description: 'Squirt water at enemy (20 dmg + wet debuff, +20% crit chance, stacks 3x)', damage: 20, effect: 'water_squirt', targetType: 'single', manaCost: 1 },
      { name: 'Bath Bomb', description: 'Throw a colorful bath bomb, reduce team damage taken by 15%', effect: 'bath_bomb', targetType: 'allies', manaCost: 2 },
      { name: 'Duck Swarm', description: 'Summon a swarm of ducks to attack all enemies', damage: 20, targetType: 'all', manaCost: 3 }
    ]
  },
  {
    name: 'Arch Wizard',
    maxHp: 60,
    texture: '/archwizardnft.webp',
    abilities: [
      { name: 'Chaos Shuffle', description: 'Transform all enemy cards into random ones', targetType: 'all', effect: 'chaos_shuffle', cooldown: 5, manaCost: 3 },
      { name: 'Fire Aura', description: 'Burn all enemies (5 dmg/turn, stacks 3x)', effect: 'burn', targetType: 'all', manaCost: 3 },
      { name: 'Battery Drain', description: 'Leech 20 HP from all enemies and redistribute to allies', targetType: 'all', effect: 'battery_drain', manaCost: 3 }
    ]
  },
  {
    name: 'Voodoo',
    maxHp: 90,
    texture: '/voodoonft.webp',
    abilities: [
      { name: 'Puppet Master', description: 'Steal 15 HP from a random enemy and give it to a random ally', targetType: 'random', effect: 'puppet_master', manaCost: 3 },
      { name: 'Cutlass Slash', description: 'Single target', damage: 30, targetType: 'single', manaCost: 1 },
      { name: 'Rum Heal', description: 'Heal self', heal: 30, targetType: 'self', manaCost: 1 }
    ]
  },
  {
    name: 'Wind-up Toy',
    maxHp: 85,
    texture: '/winduptoynft.webp',
    abilities: [
      { name: 'Ray Gun', description: 'Laser damage', damage: 28, targetType: 'single', manaCost: 1 },
      { name: 'Mind Control', description: 'Stun target', effect: 'stun', targetType: 'single', manaCost: 1 },
      { name: 'Probe', description: 'Damage over time', damage: 10, effect: 'poison', targetType: 'single', manaCost: 2 }
    ]
  },
  {
    name: 'Cursed Marionette',
    maxHp: 75,
    texture: '/cursedmarionettenft.png',
    abilities: [
      { name: 'Curse of Strings', description: 'Wrap enemy in strings, reducing healing by 70%', effect: 'curse_of_strings', targetType: 'single', manaCost: 3 },
      { name: 'Curse of Puppets', description: 'Copy a random spell from an enemy', effect: 'curse_of_puppets', targetType: 'single', manaCost: 3 },
      { name: 'Puppet Show', description: 'Make ally untargetable for 2 turns', effect: 'puppet_show', targetType: 'single', manaCost: 3 }
    ]
  },
  {
    name: 'The Doctor',
    maxHp: 65,
    texture: '/doctornft.png',
    abilities: [
      { name: 'Medication', description: 'Heal ally 3 HP/turn (stacks 3x)', effect: 'medication', targetType: 'single', manaCost: 2 },
      { name: 'Surgery', description: 'Remove all DOT debuffs from team', effect: 'surgery', targetType: 'allies', manaCost: 2 },
      { name: 'Clear!', description: 'Revive fallen toy with 50% HP', effect: 'clear_revive', targetType: 'dead_allies', manaCost: 3 }
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

