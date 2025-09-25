# Toy Card Battle Game

A 4v4 turn-based card battle game built with React Three Fiber and Next.js.

## Features

- 3D table and card rendering using React Three Fiber
- 8 unique toy characters with distinct abilities
- Turn-based combat system with damage, healing, and debuff mechanics
- Visual spell effects using GLSL shaders
- State management with Zustand
- Fully optimized with instanced meshes and efficient rendering

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# or npm install
# or yarn install
```

### Development

```bash
pnpm dev
# or npm run dev
# or yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to play the game.

## How to Play

1. **Select a Card**: Click on one of your cards (bottom row) during your turn
2. **Choose an Ability**: Select one of the three abilities for that card
3. **Target Enemy**: Click on an enemy card (top row) if the ability requires a target
4. **Use Ability**: Click "Use Ability" to execute the action
5. **End Turn**: Click "End Turn" or wait for the ability animation to complete

## Game Mechanics

### Card Types

- **Wizard**: Ice spells and area damage
- **Robot**: High damage and shields
- **Dragon**: Fire breath and area effects
- **Knight**: Balanced attacks and team healing
- **Ninja**: High single-target damage and debuffs
- **Healer**: Focused on healing allies
- **Pirate**: Area damage and self-sustain
- **Alien**: Sci-fi themed attacks and control

### Debuffs

- **Frozen** (Blue): Skip next turn
- **Burned** (Red): Damage over time
- **Stunned** (Orange): Cannot act
- **Poisoned** (Green): Damage over time

### Victory Conditions

The game ends when all cards on one side are defeated.

## Technical Stack

- **Next.js 14**: App router and server components
- **React Three Fiber**: 3D rendering
- **Three.js**: WebGL graphics
- **Zustand**: State management
- **@react-three/drei**: R3F helpers
- **Tailwind CSS**: UI styling
- **TypeScript**: Type safety

## Adding Custom Cards

To add new toy cards, edit `src/stores/cardStore.ts` and add new entries to the `toyCards` array. Each card needs:

- `name`: Display name
- `maxHp`: Maximum health
- `texture`: Path to PNG image (place in public folder)
- `abilities`: Array of 3 abilities with name, description, and effects

## Multiplayer Support

The project includes a multiplayer store setup for Socket.io integration. To enable:

1. Set up a Socket.io server
2. Update `NEXT_PUBLIC_SOCKET_URL` in `.env`
3. Connect using the multiplayer store hooks

## Performance Optimizations

- Instanced meshes for particle effects
- GLSL shaders for efficient visual effects
- Optimized re-renders with Zustand
- Dynamic imports for code splitting

## License

MIT