# Module Game Architecture

## Overview

This project implements a **3-module architecture** for a game engine, separating concerns into distinct layers that communicate through well-defined interfaces.

```
┌─────────────────────────────────────────────────────────────┐
│                         MAIN.JS                              │
│                    (Entry Point / Glue)                      │
│         Connects modules, handles events, render loop        │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    ENTITIES     │  │     SYSTEMS     │  │     RENDER      │
│   (Model/Data)  │◄─│  (Game Logic)   │─►│  (Presentation) │
│                 │  │                 │  │                 │
│ - Entity store  │  │ - FSM states    │  │ - Canvas draw   │
│ - Config tables │  │ - Battle logic  │  │ - Hit testing   │
│ - State factory │  │ - Spell system  │  │ - Visual FX     │
│ - Computed vals │  │ - Event bus     │  │ - UI layout     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Why This Architecture?

### Problems with Monolithic Game Code

1. **Coupling**: Rendering mixed with game logic makes changes risky
2. **Testing**: Hard to test logic without mocking Canvas/DOM
3. **Maintenance**: Finding where to make changes becomes difficult
4. **Reusability**: Can't swap renderers (Canvas → WebGL → terminal)

### Benefits of Module Separation

1. **Clear boundaries**: Each module has one job
2. **Testable**: Systems can be unit-tested without rendering
3. **Swappable**: Replace Render module without touching logic
4. **Debuggable**: State is inspectable, logic is traceable
5. **Scalable**: Add new systems without touching existing ones

## The Three Modules

### 1. Entities (`entities.js`) - The World Database

**What it IS**: Pure data storage and configuration.

**What it CONTAINS**:
- Entity registry (id → data mapping)
- Entity state (HP, position, status flags, timers)
- Entity archetypes (player, creature, session)
- Config tables (balance values, templates, constants)
- Computed values (derived stats)

**What it MUST NOT contain**:
- Canvas/WebGL calls
- Rendering logic
- Gameplay rules ("when" or "why" something happens)

```javascript
// Example: Creating an entity
const player = createPlayerState();
// Returns: { id: 1, archetype: 'player', hp: 150, atk: 15, ... }

// Example: Computing derived stats
const stats = computePlayerStats(player);
// Returns: { atk: 23, def: 11, crit: 10, ... }
```

### 2. Systems (`systems.js`) - The Brain

**What it IS**: The decision-maker that runs game rules.

**What it DOES**:
- Reads Entities, applies rules, updates Entities
- Owns game modes via FSM (Finite State Machine)
- Runs logic in fixed phases (input → simulation → resolution)
- Produces RenderData for Render module

**How to keep it from becoming a monolith**:
- Many small systems (Battle, Spell, Shield, Buff, etc.)
- Execute in fixed order via scheduler
- Prefer events over scattered if-statements

```javascript
// FSM States
init → houseSelect → spellTutorial → playing → buffSelect → victory
                                   ↓
                            shieldMinigame
                                   ↓
                              gameOver

// Event-driven communication
emit('creatureKilled', { goldGain: 200 });
on('sound', ({ freq, type }) => playSound(freq, type));
```

### 3. Render (`render.js`) - The Hands

**What it IS**: Pure presentation layer.

**What it DOES**:
- Takes RenderData from Systems
- Draws to Canvas
- Handles technical concerns (layers, sorting, batching)
- Translates clicks to logical coordinates

**What it MUST NOT do**:
- Change Entities
- Contain gameplay rules
- Make game decisions

```javascript
// Render receives data, draws it
render(renderData);
// renderData = { heroHp: 150, creatureName: 'Troll', showBossLabel: true, ... }

// Click handling returns logical targets, not game actions
getClickTarget(x, y) → { type: 'spellCast', spellId: 'herbivicus' }
```

## Data Flow

```
User Input (click)
       │
       ▼
┌──────────────┐
│    RENDER    │ ─── getClickTarget(x, y) ───►  { type, data }
└──────────────┘
       │
       ▼
┌──────────────┐
│    MAIN      │ ─── routes to correct system function
└──────────────┘
       │
       ▼
┌──────────────┐
│   SYSTEMS    │ ─── reads/writes ENTITIES
└──────────────┘     produces RenderData
       │
       ▼
┌──────────────┐
│   ENTITIES   │ ─── pure data, no side effects
└──────────────┘
       │
       ▼
┌──────────────┐
│   SYSTEMS    │ ─── updateRenderData()
└──────────────┘
       │
       ▼
┌──────────────┐
│    RENDER    │ ─── render(renderData)
└──────────────┘
       │
       ▼
    Canvas
```

## File Structure

```
module_game/
├── architecture.md    # This file
├── index.html         # HTML entry point
├── main.js            # Glue code, event handlers, render loop
├── entities.js        # Data layer (CONFIG, templates, entity registry)
├── systems.js         # Logic layer (FSM, battle, spells, buffs)
└── render.js          # Presentation layer (Canvas drawing, hit testing)
```

## Key Design Decisions

### 1. RenderData as Interface

Systems don't call render functions directly. Instead, they update a `RenderData` object that Render consumes. This decouples the modules completely.

```javascript
// In systems.js
renderData.heroHp = player.currentHp;
renderData.showVictory = true;

// In main.js (render loop)
const renderData = updateRenderData();
render(renderData);
```

### 2. Event Bus for Cross-Module Communication

Modules communicate through events, not direct function calls. This prevents tight coupling.

```javascript
// systems.js emits events
emit('sound', { freq: 800, type: 'sine', duration: 0.2 });
emit('creatureKilled', { goldGain: 200 });

// main.js handles them
on('sound', (data) => playSound(data.freq, data.type));
```

### 3. Entity Registry Pattern

All game objects are stored in a central registry with unique IDs. This makes serialization (save/load) straightforward.

```javascript
const player = createEntity('player', { hp: 150, ... });
// player.id = 1

const creature = createEntity('creature', { name: 'Troll', ... });
// creature.id = 2

getEntity(1); // Returns player
getEntitiesByArchetype('creature'); // Returns all creatures
```

### 4. FSM for Game State

The game state machine prevents invalid state transitions and makes the current mode explicit.

```javascript
session.state = 'playing';     // Normal battle
session.state = 'buffSelect';  // Choosing reward
session.state = 'shieldMinigame'; // Boss minigame
session.state = 'victory';     // Won the game
```

## Future Extensions

### Adding New Systems

To add a new system (e.g., Inventory):

1. Add data to `entities.js`:
   ```javascript
   export const ITEM_TEMPLATES = [...];
   // Add inventory to player state
   ```

2. Add logic to `systems.js`:
   ```javascript
   export function useItem(itemId) { ... }
   export function equipItem(itemId) { ... }
   ```

3. Add UI to `render.js`:
   ```javascript
   function renderInventoryTab(rd) { ... }
   ```

### Swapping Renderer

To replace Canvas with WebGL or terminal:

1. Create new `render-webgl.js` with same exports
2. Change import in `main.js`
3. Everything else stays the same

### Adding Multiplayer

The architecture supports multiplayer by:
1. Serializing entity state
2. Sending state updates over network
3. Applying remote updates to local entities
4. Render module just renders whatever state it receives

## Testing Strategy

```javascript
// Unit test for systems (no rendering needed)
test('player takes damage', () => {
    const { player } = initGame();
    selectHouse('gryffindor');
    const initialHp = player.currentHp;

    // Simulate damage
    player.currentHp -= 50;

    expect(player.currentHp).toBe(initialHp - 50);
});

// Integration test with Playwright
test('full playthrough', async ({ page }) => {
    await page.goto('/module_game/');
    await page.evaluate(() => window.game.selectHouse('hufflepuff'));
    // ... play through entire game
    expect(await page.evaluate(() => window.game.renderData.showVictory)).toBe(true);
});
```

## Summary

| Module | Contains | Forbidden |
|--------|----------|-----------|
| **Entities** | Data, config, state | Rendering, logic |
| **Systems** | Rules, FSM, events | Canvas calls |
| **Render** | Drawing, hit-test | State mutation |

**One-line summary:**
> Entities = what exists (data). Systems = what happens and why (rules + order). Render = how it looks (draw commands).
