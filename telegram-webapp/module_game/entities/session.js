/**
 * Game session state
 */

import { createEntity } from './registry.js';

export function createGameSession() {
    return createEntity('session', {
        // Game state machine
        state: 'init', // init, houseSelect, spellTutorial, playing, shieldMinigame, shieldTutorial, buffSelect, roomTransition, victory, gameOver

        // Flags
        gameStarted: false,
        inBattle: false,
        selectingBuff: false,

        // Current entities
        playerId: null,
        creatureId: null,

        // Shield minigame
        shieldActive: false,
        shieldSpellQueue: [],
        shieldCurrentColor: null,
        shieldTimeLeft: 0,
        shieldIsTutorial: false,
        shieldSpellsBlocked: 0,
        shieldSpellsMissed: 0,

        // Buff selection
        buffChoices: [],
        lastGoldGain: 0,

        // Timers
        battleTimerId: null,
        shieldTimerId: null,

        // Turn counter
        turnCount: 0
    });
}
