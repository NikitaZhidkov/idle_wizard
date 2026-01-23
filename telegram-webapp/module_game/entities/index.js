/**
 * Entities module - re-exports all entity components
 */

// Config and constants
export {
    CONFIG,
    MAGIC_TYPES,
    ABILITIES,
    SHIELD_COLORS,
    SHIELD_ICONS,
    getMagicMultiplier
} from './config.js';

// Templates
export {
    CREATURE_TEMPLATES,
    BOSS_TEMPLATES,
    ENCOUNTER_ORDER,
    SPELL_TEMPLATES,
    BUFF_TEMPLATES,
    HOUSE_DATA
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
