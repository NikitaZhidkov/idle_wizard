/**
 * Game session state
 */

import { createEntity } from './registry.js';

export function createGameSession() {
    return createEntity('session', {
        // Game state machine
        state: 'init', // init, playing, buffSelect, roomTransition, victory, gameOver

        // Flags
        gameStarted: false,
        inBattle: false,
        selectingBuff: false,

        // Current entities
        playerId: null,
        creatureId: null,

        // Buff selection
        buffChoices: [],
        lastGoldGain: 0,

        // Timers
        battleTimerId: null,

        // Turn counter
        turnCount: 0
    });
}
