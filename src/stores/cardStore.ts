import { create } from 'zustand'

export interface Ability {
  name: string
  description: string
  damage?: number
  heal?: number
  effect?: 'freeze' | 'burn' | 'stun' | 'shield' | 'poison'
  targetType: 'single' | 'all' | 'self' | 'allies'
  cooldown?: number
  currentCooldown?: number
}

export interface Debuff {
  type: 'frozen' | 'burned' | 'stunned' | 'poisoned'
  duration: number
  damage?: number
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
    name: 'Wizard',
    maxHp: 80,
    texture: '/wizard.png',
    abilities: [
      { name: 'Ice Nova', description: 'Freeze all enemies', effect: 'freeze', targetType: 'all' },
      { name: 'Pyroblast', description: 'Heavy damage to one', damage: 35, targetType: 'single' },
      { name: 'Lightning Zap', description: 'Damage all enemies', damage: 15, targetType: 'all' }
    ]
  },
  {
    name: 'Robot',
    maxHp: 120,
    texture: '/robot.png',
    abilities: [
      { name: 'Laser Beam', description: 'High damage', damage: 30, targetType: 'single' },
      { name: 'Shield Mode', description: 'Shield self', effect: 'shield', targetType: 'self' },
      { name: 'EMP Blast', description: 'Stun all enemies', effect: 'stun', targetType: 'all' }
    ]
  },
  {
    name: 'Dragon',
    maxHp: 100,
    texture: '/dragon.png',
    abilities: [
      { name: 'Fire Breath', description: 'Burn single target', damage: 25, effect: 'burn', targetType: 'single' },
      { name: 'Wing Buffet', description: 'Damage all', damage: 20, targetType: 'all' },
      { name: 'Roar', description: 'Stun all enemies', effect: 'stun', targetType: 'all' }
    ]
  },
  {
    name: 'Knight',
    maxHp: 110,
    texture: '/knight.png',
    abilities: [
      { name: 'Sword Strike', description: 'Basic attack', damage: 25, targetType: 'single' },
      { name: 'Shield Bash', description: 'Damage and stun', damage: 15, effect: 'stun', targetType: 'single' },
      { name: 'Rally', description: 'Heal all allies', heal: 20, targetType: 'allies' }
    ]
  },
  {
    name: 'Ninja',
    maxHp: 70,
    texture: '/ninja.png',
    abilities: [
      { name: 'Shadow Strike', description: 'High damage', damage: 40, targetType: 'single' },
      { name: 'Smoke Bomb', description: 'Stun all enemies', effect: 'stun', targetType: 'all' },
      { name: 'Poison Blade', description: 'Poison target', damage: 15, effect: 'poison', targetType: 'single' }
    ]
  },
  {
    name: 'Healer',
    maxHp: 60,
    texture: '/healer.png',
    abilities: [
      { name: 'Heal Wave', description: 'Heal single ally', heal: 35, targetType: 'single' },
      { name: 'Group Heal', description: 'Heal all allies', heal: 20, targetType: 'allies' },
      { name: 'Holy Light', description: 'Damage undead', damage: 30, targetType: 'single' }
    ]
  },
  {
    name: 'Pirate',
    maxHp: 90,
    texture: '/pirate.png',
    abilities: [
      { name: 'Cannon Blast', description: 'Area damage', damage: 25, targetType: 'all' },
      { name: 'Cutlass Slash', description: 'Single target', damage: 30, targetType: 'single' },
      { name: 'Rum Heal', description: 'Heal self', heal: 30, targetType: 'self' }
    ]
  },
  {
    name: 'Alien',
    maxHp: 85,
    texture: '/alien.png',
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