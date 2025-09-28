# Complete Guide: Adding New Cards & Abilities to Toy Card Battle Game

## Table of Contents
1. [Quick Start - Adding a Basic Card](#quick-start)
2. [Understanding the Architecture](#architecture)
3. [Adding New Cards](#adding-new-cards)
4. [Creating Custom Abilities](#custom-abilities)
5. [Visual Effects System](#visual-effects)
6. [Testing Your Changes](#testing)

---

## Quick Start - Adding a Basic Card {#quick-start}

**The simplest way to add a new card takes just 1 step:**

Edit `src/stores/cardStore.ts` and add your card to the `toyCards` array:

```typescript
{
  name: 'Your Card Name',
  maxHp: 100,                          // Health points
  texture: '/yourcardimage.png',       // Image in public folder
  abilities: [
    { name: 'Attack', description: 'Basic attack', damage: 25, targetType: 'single' },
    { name: 'Heal Self', description: 'Restore HP', heal: 30, targetType: 'self' },
    { name: 'Stun', description: 'Stun enemy', effect: 'stun', targetType: 'single' }
  ]
}
```

That's it! The card will now randomly appear in games.

---

## Understanding the Architecture {#architecture}

### State Management with Zustand

This game uses **Zustand** for state management - a lightweight alternative to Redux. The main game state is managed in `optimizedGameStore.ts` using:
- **Zustand** with **Immer** middleware for immutable state updates
- **Map** data structures for optimized card storage
- **DevTools** integration for debugging

### Key Files and Their Purposes

| File | Purpose | When to Edit |
|------|---------|--------------|
| `src/stores/cardStore.ts` | Card definitions & abilities | Adding new cards |
| `src/utils/abilityLogic.ts` | Ability execution logic | Adding new effect types |
| `src/stores/optimizedGameStore.ts` | Zustand store - Game state management | Adding new game mechanics |
| `src/components/3d/Effects.tsx` | Visual spell effects | Customizing spell animations |
| `src/components/GameScene.tsx` | 3D scene rendering | Changing how cards appear |
| `src/components/GameUI.tsx` | User interface | Modifying game controls |

---

## Adding New Cards {#adding-new-cards}

### Step 1: Define the Card Data

In `src/stores/cardStore.ts`, add your card to the `toyCards` array:

```typescript
const toyCards: Omit<CardData, 'id' | 'hp' | 'debuffs' | 'position'>[] = [
  // ... existing cards ...
  {
    name: 'Fire Mage',           // Display name
    maxHp: 75,                   // Maximum health
    texture: '/firemage.png',    // Image path (put image in public folder)
    abilities: [
      // Ability 1: Direct damage
      {
        name: 'Fireball',
        description: 'Launch a fireball at target',
        damage: 30,              // Damage amount
        targetType: 'single'     // Who can be targeted
      },
      // Ability 2: Area damage with effect
      {
        name: 'Meteor Storm',
        description: 'Rain fire on all enemies',
        damage: 20,
        effect: 'burn',          // Apply burn debuff
        targetType: 'all'        // Hits all enemies
      },
      // Ability 3: Utility spell
      {
        name: 'Fire Shield',
        description: 'Shield an ally',
        effect: 'shield',
        targetType: 'single',
        cooldown: 2              // Can only use every 2 turns
      }
    ]
  }
]
```

### Step 2: Add Card Image

Place your card image (PNG format) in the `public` folder:
- File should be named to match the texture path (e.g., `firemage.png`)
- Recommended size: 512x512 pixels
- The image will be displayed on the 3D card model

### Available Ability Properties

```typescript
interface Ability {
  name: string              // Ability name
  description: string       // Tooltip text
  damage?: number          // Damage dealt (optional)
  heal?: number            // HP restored (optional)
  effect?: string          // Special effect (see below)
  targetType: string       // Who can be targeted
  cooldown?: number        // Turns before reuse (optional)
}
```

### Target Types
- `'single'` - Target one enemy/ally
- `'all'` - Target all enemies
- `'self'` - Target self only
- `'allies'` - Target all allies

### Built-in Effects
- `'freeze'` - Skip next turn (2 turns)
- `'burn'` - 5 damage per turn (3 turns)
- `'stun'` - Cannot act (1 turn)
- `'poison'` - 3 damage per turn (4 turns)
- `'shield'` - Reduces incoming damage
- `'revive'` - Bring back fallen ally (custom)
- `'spell_steal'` - Copy last enemy spell (custom)

---

## Creating Custom Abilities {#custom-abilities}

### Step 1: Add New Effect Type

If you need a new effect type, first update the type definitions in `src/stores/cardStore.ts`:

```typescript
export interface Ability {
  // ... existing properties ...
  effect?: 'freeze' | 'burn' | 'stun' | 'shield' | 'poison' | 'revive' | 'spell_steal' | 'YOUR_NEW_EFFECT'
}
```

### Step 2: Implement Effect Logic

In `src/utils/abilityLogic.ts`, add your effect handling in the `executeAbility` function:

```typescript
// Around line 156, after existing effect handlers
if (ability.effect === 'YOUR_NEW_EFFECT') {
  // Your custom logic here
  // Example: Double the target's attack for 2 turns

  effects.push({
    type: 'effect',
    targetId: target.id
  })

  // Optional: Add visual effect
  visualEffect = 'fire'  // or 'freeze', 'lightning', 'heal', 'poison'

  // Add message for UI
  message += ` ${target.name} is affected by your effect!`
}
```

### Example: Creating a "Life Steal" Ability

1. **Define in cardStore.ts:**
```typescript
{
  name: 'Vampire',
  maxHp: 90,
  texture: '/vampire.png',
  abilities: [
    {
      name: 'Life Drain',
      description: 'Deal damage and heal self',
      damage: 20,           // Deal 20 damage
      heal: 20,            // Also heal self for 20
      targetType: 'single'
    }
  ]
}
```

2. **The existing system already handles damage + heal combo!**

### Example: Creating a Complex New Effect

Let's add a "Mirror Shield" that reflects damage back:

1. **Update types in cardStore.ts:**
```typescript
effect?: 'freeze' | 'burn' | ... | 'mirror_shield'
```

2. **Add to Debuff type if it's ongoing:**
```typescript
export interface Debuff {
  type: 'frozen' | 'burned' | ... | 'mirror_shield'
  duration: number
  // ... other properties
}
```

3. **Implement in abilityLogic.ts:**
```typescript
if (ability.effect === 'mirror_shield') {
  const mirrorDebuff: Debuff = {
    type: 'mirror_shield',
    duration: 2  // Lasts 2 turns
  }

  effects.push({
    type: 'debuff',
    targetId: target.id,
    debuff: mirrorDebuff
  })

  const side = allPlayerCards.find(c => c.id === target.id) ? 'player' : 'opponent'
  debuffs.push({ cardId: target.id, debuff: mirrorDebuff, side })

  message += ` ${target.name} gains Mirror Shield!`
  visualEffect = 'shield'
}
```

---

## Visual Effects System {#visual-effects}

### Understanding Visual Effects

The game uses two systems for visual effects:

1. **Basic Effects** (`src/components/3d/Effects.tsx`)
   - Simple particle effects
   - Triggered by ability `visualEffect` property

2. **Advanced VFX** (`src/components/3d/VFXFireball.tsx`, `VFXLightning.tsx`, etc.)
   - Complex shader-based effects
   - More customizable and impressive

### How Visual Effects Work

When an ability is cast:

1. **abilityLogic.ts** sets a `visualEffect` type:
```typescript
visualEffect = 'fire'  // Options: 'fire', 'freeze', 'lightning', 'heal', 'poison'
```

2. **GameScene.tsx** creates an effect object:
```typescript
setActiveEffects(prev => [...prev, {
  id: `effect-${Date.now()}`,
  type: effectType,
  position: sourcePosition,
  targetPosition: targetPosition
}])
```

3. **Effects are rendered in the 3D scene** and auto-removed after duration

### Customizing Visual Effects

#### Option 1: Use Existing Effects

In `src/utils/abilityLogic.ts`, set the visual effect for your ability:

```typescript
if (ability.name === 'Lightning Bolt') {
  visualEffect = 'lightning'
} else if (ability.name === 'Heal Wave') {
  visualEffect = 'heal'
} else if (ability.name === 'Frost Nova') {
  visualEffect = 'freeze'
}
```

#### Option 2: Create New Visual Effect

1. **Create a new effect component** in `src/components/3d/`:

```typescript
// src/components/3d/CustomEffect.tsx
import { useRef, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function CustomEffect({ position, targetPosition }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    // Animate your effect here
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 2
      meshRef.current.scale.x = Math.sin(state.clock.elapsedTime * 3)
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial
        color="purple"
        emissive="purple"
        emissiveIntensity={2}
      />
    </mesh>
  )
}
```

2. **Import and use in GameScene.tsx:**

```typescript
// Add import at top
import { CustomEffect } from './3d/CustomEffect'

// In the render section, add condition for your effect
{activeEffects.map(effect => {
  if (effect.type === 'custom') {
    return <CustomEffect key={effect.id} {...effect} />
  }
  // ... existing effect conditions
})}
```

### Modifying Existing Effects

To change how fire/lightning/etc look, edit these files:

- `src/components/3d/VFXFireball.tsx` - Fireball effect
- `src/components/3d/VFXLightning.tsx` - Lightning effect
- `src/components/3d/Effects.tsx` - Basic particle effects
- `src/shaders/fireShader.ts` - Fire shader code
- `src/shaders/freezeShader.ts` - Freeze shader code

Example: Making fireballs bigger:

```typescript
// In VFXFireball.tsx, find the scale property
<mesh scale={[2, 2, 2]}>  // Change from [1, 1, 1] to [2, 2, 2]
```

---

## Testing Your Changes {#testing}

### 1. Test Locally

The development server auto-reloads when you save changes:
```bash
npm run dev
```

Visit http://localhost:3000 and refresh to see new cards in rotation.

### 2. Debug Your Abilities

Add console.logs to track ability execution:

```typescript
// In abilityLogic.ts
if (ability.effect === 'your_effect') {
  console.log('Executing your effect on:', target.name)
  console.log('Current HP:', target.hp)
  // Your effect logic
  console.log('New HP:', target.hp)
}
```

### 3. Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Card image not showing | Check image is in `public/` folder and path matches exactly |
| Ability not working | Verify effect name matches in both cardStore.ts and abilityLogic.ts |
| TypeScript errors | Run `npm run dev` to see specific type errors |
| Effect not visible | Check visualEffect is set in abilityLogic.ts |

### 4. Testing Specific Scenarios

To test revival ability:
1. Let one of your cards die
2. Use Spirit Shaman's Resurrection on it

To test spell steal:
1. Wait for opponent to cast a spell
2. Use Spirit Shaman's Spell Echo
3. It will copy the last spell used

---

## Advanced Topics

### Adding Cooldowns

Abilities can have cooldowns to prevent spam:

```typescript
{
  name: 'Ultimate Attack',
  description: 'Devastating blow',
  damage: 100,
  targetType: 'single',
  cooldown: 3  // Can only use every 3 turns
}
```

### Working with Zustand Store

When creating complex abilities that need to interact with game state:

```typescript
// Access store from ability logic
import { useOptimizedGameStore } from '@/stores/optimizedGameStore'

// In a component:
const { playerCards, opponentCards, damageCard } = useOptimizedGameStore()

// In abilityLogic.ts, the store is passed as parameter:
export function applyAbilityEffects(result: AbilityResult, store: any) {
  // store has methods like:
  store.damageCard(side, cardId, amount)
  store.healCard(side, cardId, amount)
  store.addDebuff(side, cardId, debuff)
}
```

### Creating Combo Abilities

You can check for conditions before executing:

```typescript
// In abilityLogic.ts
if (ability.name === 'Combo Strike') {
  // Check if target is already stunned
  const isStunned = target.debuffs.some(d => d.type === 'stunned')

  if (isStunned) {
    // Double damage on stunned enemies
    damages.push({
      cardId: target.id,
      amount: ability.damage * 2,
      side
    })
    message = 'Critical combo! Double damage!'
  }
}
```

### Adding Sound Effects

While not currently implemented, you could add sounds:

1. Place sound files in `public/sounds/`
2. Play them when abilities trigger:

```typescript
// In GameUI.tsx or abilityLogic.ts
const audio = new Audio('/sounds/fireball.mp3')
audio.play()
```

---

## File Structure Reference

```
src/
├── stores/
│   ├── cardStore.ts         # Card definitions ← ADD NEW CARDS HERE
│   └── optimizedGameStore.ts # Game state
├── utils/
│   └── abilityLogic.ts      # Ability logic ← ADD NEW EFFECTS HERE
├── components/
│   ├── GameScene.tsx        # 3D scene setup
│   ├── GameUI.tsx           # User interface
│   └── 3d/
│       ├── Card.tsx         # Card 3D model
│       ├── Table.tsx        # Game table
│       ├── Effects.tsx      # Visual effects ← CUSTOMIZE VISUALS HERE
│       ├── VFXFireball.tsx  # Fireball effect
│       └── VFXLightning.tsx # Lightning effect
└── shaders/
    ├── fireShader.ts        # Fire visual shader
    └── freezeShader.ts      # Freeze visual shader

public/
├── *.png                    # Card images ← PUT NEW IMAGES HERE
└── sounds/                  # (Future) Sound effects
```

---

## Quick Reference Cheat Sheet

### Add a Basic Attack Card
```typescript
{
  name: 'Warrior',
  maxHp: 100,
  texture: '/warrior.png',
  abilities: [
    { name: 'Slash', description: 'Basic attack', damage: 25, targetType: 'single' },
    { name: 'Whirlwind', description: 'Hit all', damage: 15, targetType: 'all' },
    { name: 'War Cry', description: 'Heal allies', heal: 20, targetType: 'allies' }
  ]
}
```

### Add a Mage Card with Effects
```typescript
{
  name: 'Ice Mage',
  maxHp: 70,
  texture: '/icemage.png',
  abilities: [
    { name: 'Frostbolt', description: 'Freeze target', damage: 20, effect: 'freeze', targetType: 'single' },
    { name: 'Blizzard', description: 'Freeze all', effect: 'freeze', targetType: 'all' },
    { name: 'Ice Barrier', description: 'Shield self', effect: 'shield', targetType: 'self' }
  ]
}
```

### Add a Support Card
```typescript
{
  name: 'Cleric',
  maxHp: 80,
  texture: '/cleric.png',
  abilities: [
    { name: 'Heal', description: 'Restore health', heal: 30, targetType: 'single' },
    { name: 'Group Heal', description: 'Heal all allies', heal: 15, targetType: 'allies' },
    { name: 'Purify', description: 'Remove debuffs', effect: 'cleanse', targetType: 'single' }
  ]
}
```

---

## Need Help?

1. **Check the console** (F12 in browser) for error messages
2. **Look at existing cards** as examples
3. **Start simple** - add basic damage/heal first, then add effects
4. **Test frequently** - save and refresh after each change

Remember: The simplest addition (just adding to toyCards array) requires NO other code changes!