import { create } from 'zustand'

export interface Ability {
  name: string
  description: string
  damage?: number
  heal?: number
  effect?: 'freeze' | 'burn' | 'stun' | 'shield' | 'poison' | 'revive' | 'spell_steal'
  targetType: 'single' | 'all' | 'self' | 'allies'
  cooldown?: number
  currentCooldown?: number
}

export interface Debuff {
  type: 'frozen' | 'burned' | 'stunned' | 'poisoned' | 'fire_aura'
  duration: number
  damage?: number
  stacks?: number  // For stackable debuffs like Fire Aura
  maxStacks?: number  // Maximum stacks allowed
}

export interface CardData {
  id: string
  name: string
  hp: number
  maxHp: number
  texture: string
  abilities: Ability[]
  debuffs: Debuff[]
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
      { name: 'Heal Wave', description: 'Heal single ally', heal: 35, targetType: 'single' },
      { name: 'Fire Aura', description: 'Burn all enemies (5 dmg/turn, stacks 3x)', effect: 'burn', targetType: 'all' },
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
      { name: 'Resurrection', description: 'Revive a fallen ally with 50% HP', effect: 'revive', targetType: 'single' },
      { name: 'Healing Totem', description: 'Heal all allies', heal: 25, targetType: 'allies' },
      { name: 'Spell Echo', description: 'Copy last enemy spell used', effect: 'spell_steal', targetType: 'single' }
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