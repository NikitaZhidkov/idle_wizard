/**
 * Systems module - re-exports all system components
 */

// Event bus
export { emit, on, off, clearEvents } from './events.js';

// State management
export {
    getSession,
    getPlayer,
    getCreature,
    getRenderData,
    setCreature,
    setSession,
    setPlayer,
    setRenderData,
    getBattleLog,
    getFloatingTexts,
    getParticles,
    addLog,
    clearLog,
    addFloatingText,
    addParticles,
    updateEffects,
    getState,
    clearState
} from './state.js';

// Game flow (FSM)
export {
    initGame,
    startGame,
    triggerGameOver,
    triggerVictory,
    restartGame
} from './game-flow.js';

// Battle system
export {
    startBattleLoop,
    stopBattleLoop,
    calculatePlayerDamage,
    applyDamageToCreature
} from './battle.js';

// Spawn system
export {
    spawnCreature,
    handleCreatureDeath
} from './spawn.js';

// Buff system
export {
    showBuffSelection,
    selectBuff,
    continueToNextRoom
} from './buffs.js';

// Render data update
export { updateRenderData } from './render-data-update.js';
