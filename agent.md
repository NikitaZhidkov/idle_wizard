# Development Reference

## DevLink Setup
See `_dev_link.md` for instructions on setting up the development link.

## Architecture

The game uses a 3-module architecture:

```
module_game/
├── main.js              # Entry point, game loop
├── entities/            # Data/State (the "world database")
├── systems/             # Game Logic (the "brain")
└── render/              # Presentation (the "hands that draw")
```

### Entities (Model/World)
- Entry: `entities/index.js`
- Contains: entity registry, state, config tables
- Must NOT: contain rendering or gameplay rules

### Systems (Game Logic)
- Entry: `systems/index.js`
- Contains: game rules, state machines, produces RenderData
- Must NOT: draw anything or access Canvas

### Render (Presentation)
- Entry: `render/index.js`
- Contains: all Canvas drawing, UI, effects
- Must NOT: change entities or contain gameplay rules
