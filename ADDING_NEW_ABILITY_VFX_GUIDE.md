# Adding New Ability VFX - Quick Guide

This guide shows you how to add a new visual effect for a card ability, using the Robot Guardian's "Laser Beam" as an example.

## ✅ Checklist (5 Steps)

### 1. Create the VFX Component
**File:** `src/components/3d/VFXYourAbilityName.tsx`

- Create a new React component using custom shaders (for performance) or wawa-vfx (for graphics)
- Follow the pattern from existing VFX files like `VFXLaserBeam.tsx` or `VFXFireBreath.tsx`
- Props should include: `sourcePosition`, `targetPosition`, and `onComplete`
- Use `useFrame` for animations and `useEffect` for cleanup/timers

**Example:**
```tsx
export function VFXLaserBeam({ sourcePosition, targetPosition, onComplete }: Props) {
  // Custom shader material for the beam
  // Animation logic with useFrame
  // Auto-complete with useEffect timeout
}
```

---

### 2. Add Visual Effect Type to `abilityLogic.ts`
**File:** `src/utils/abilityLogic.ts`

**Line ~9:** Add your effect to the `visualEffect` union type:
```typescript
visualEffect?: 'fire' | 'freeze' | ... | 'laser_beam'  // ← Add yours here
```

**Line ~220-232:** Add the ability name mapping to trigger the effect:
```typescript
} else if (ability.name === 'Laser Beam') {
  visualEffect = 'laser_beam'
}
```

---

### 3. Wire Up in GameScene.tsx (Rendering)
**File:** `src/components/GameScene.tsx`

**Step 3a - Import (Line ~27):**
```typescript
import { VFXLaserBeam } from './3d/VFXLaserBeam'
```

**Step 3b - Add to Type (Line ~125):**
```typescript
type: 'freeze' | 'fire' | ... | 'laser_beam'  // ← Add yours here
```

**Step 3c - Add Rendering Logic (Line ~396+):**
```typescript
} else if (effect.type === 'laser_beam') {
  return (
    <VFXLaserBeam
      key={effect.id}
      sourcePosition={effect.sourcePosition || effect.position}
      targetPosition={effect.targetPosition || [0, 0, -2]}
      onComplete={() => removeEffect(effect.id)}
    />
  )
}
```

---

### 4. Add to GameUI.tsx (Single-Player Trigger)
**File:** `src/components/GameUI.tsx`

**Step 4a - Add to Type (Line ~21):**
```typescript
type: 'freeze' | 'fire' | ... | 'laser_beam'  // ← Add yours here
```

**Step 4b - Add to Trigger Check (Line ~238):**
```typescript
if (result.visualEffect || ... || ability.name === 'Laser Beam') {
```

**Step 4c - Add to Effect Mapping (Line ~318):**
```typescript
ability.name === 'Laser Beam' ? 'laser_beam' :
```

---

### 5. Add to Server (Multiplayer Support)
**File:** `server/gameServer.js`

**Line ~710:** Add the server-side mapping:
```javascript
else if (ability.name === 'Laser Beam') effectType = 'laser_beam'
```

**Then restart the server:**
```bash
# Kill old server process, then:
cd server && node gameServer.js
```

---

## 🎯 Common Patterns

### Single-Target Ability (e.g., Laser Beam)
- Uses `sourcePosition` and `targetPosition`
- VFX travels from caster to target

### Multi-Target Ability (e.g., Whirlwind Slash, Ice Nova)
- Uses `sourcePosition` and `targetPositions` (array)
- May need to map multiple VFX components in GameScene.tsx

### Self-Buff/Shield Ability (e.g., Shield Bubble)
- Uses `targetPosition` (the caster's position)
- May need to handle `targetPositions` array for ally shields

### Complex Ability (e.g., Battery Drain, Chaos Shuffle)
- Uses `enemyPositions` and/or `allyPositions` arrays
- Requires custom position calculation in GameUI.tsx

---

## 📝 Quick Reference: Files to Edit

1. **`src/components/3d/VFXYourAbilityName.tsx`** - Create VFX component
2. **`src/utils/abilityLogic.ts`** - Add type + trigger mapping (~2 places)
3. **`src/components/GameScene.tsx`** - Import + add type + render logic (~3 places)
4. **`src/components/GameUI.tsx`** - Add type + trigger + mapping (~3 places)
5. **`server/gameServer.js`** - Add server mapping (~1 place)

---

## 🔧 Testing Checklist

- [ ] Test in **single-player** mode (should see VFX)
- [ ] Test in **multiplayer** mode (should see VFX)
- [ ] Test as **player 1** using the ability
- [ ] Test as **player 2** using the ability
- [ ] Check dev console for errors
- [ ] Verify FPS stays at 60 during VFX

---

## 💡 Pro Tips

- **Performance:** Use custom shaders for frequently-used abilities (basic attacks)
- **Graphics:** Use wawa-vfx for ultimate abilities or showcase effects
- **Reuse:** Copy an existing VFX file as a starting template
- **Testing:** Start with single-player first, then test multiplayer
- **Debugging:** Check browser console for "visualEffect" logs if VFX doesn't appear

---

## 🐛 Troubleshooting

**VFX shows in single-player but not multiplayer?**
→ Check `server/gameServer.js` line ~710 for the ability name mapping

**VFX doesn't show at all?**
→ Check `GameUI.tsx` line ~238 for the ability name in the trigger condition

**Wrong VFX plays?**
→ Check the effect type mapping in both `GameUI.tsx` (~318) and `gameServer.js` (~710)

**TypeScript errors?**
→ Make sure you added the type to all 3 files: `abilityLogic.ts`, `GameScene.tsx`, `GameUI.tsx`

---

## Example: Full Laser Beam Implementation

See the commit that added Laser Beam for Robot Guardian as a complete reference example.

**Files Changed:**
- `src/components/3d/VFXLaserBeam.tsx` (new file, 200+ lines)
- `src/utils/abilityLogic.ts` (2 edits)
- `src/components/GameScene.tsx` (3 edits)
- `src/components/GameUI.tsx` (3 edits)
- `server/gameServer.js` (1 edit)
- `src/stores/cardStore.ts` (renamed card to "Robot Guardian")
