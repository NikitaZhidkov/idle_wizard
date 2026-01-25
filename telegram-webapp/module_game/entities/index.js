/**
 * Entities module - re-exports all entity components
 */

// Config and constants
export {
    CONFIG,
    MAGIC_TYPES,
    getMagicMultiplier
} from './config.js';

// Templates
export {
    CREATURE_TEMPLATES,
    BOSS_TEMPLATES,
    ENCOUNTER_ORDER,
    BUFF_TEMPLATES
} from './templates.js';

// Entity registry
export {
    createEntity,
    getEntity,
    removeEntity,
    getEntitiesByArchetype,
    clearEntities,
    getAllEntities
} from './registry.js';

// Player
export { createPlayerState, computePlayerStats } from './player.js';

// Creature
export { createCreatureState } from './creature.js';

// Session
export { createGameSession } from './session.js';

// Render data
export { createRenderData } from './render-data.js';
