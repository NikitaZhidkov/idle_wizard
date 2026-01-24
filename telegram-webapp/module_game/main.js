/**
 * MAIN ENTRY POINT
 * ================
 * Connects all modules together:
 * - Entities = what exists (data)
 * - Systems = what happens and why (rules + order)
 * - Render = how it looks (draw commands)
 */

import {
    initGame,
    getSession,
    getPlayer,
    getCreature,
    getRenderData,
    updateRenderData,
    selectHouse,
    advanceSpellTutorial,
    finishSpellTutorial,
    startShieldFromTutorial,
    handleShieldPress,
    selectBuff,
    castSpell,
    restartGame,
    startCooldownTick,
    stopCooldownTick,
    on,
    emit
} from './systems/index.js';

import {
    initRenderer,
    render,
    getClickTarget,
    getCanvas,
    scrollBackground
} from './render/index.js';

import { HOUSE_DATA, SPELL_TEMPLATES } from './entities/index.js';

// ============ AUDIO ============

let audioCtx = null;

function playSound(freq, type = 'sine', duration = 0.1) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

// ============ RENDER LOOP ============

let animationFrameId = null;
const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;
let lastFrameTime = 0;

function renderLoop(timestamp) {
    if (timestamp - lastFrameTime >= FRAME_DURATION) {
        lastFrameTime = timestamp;

        // Update render data from systems
        const renderData = updateRenderData();

        // Render
        render(renderData);
    }

    animationFrameId = requestAnimationFrame(renderLoop);
}

function startRenderLoop() {
    if (animationFrameId) return;
    animationFrameId = requestAnimationFrame(renderLoop);
}

function stopRenderLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

// ============ CLICK HANDLING ============

function handleClick(x, y, canvasWidth, canvasHeight, layout) {
    const renderData = getRenderData();
    const target = getClickTarget(x, y, canvasWidth, canvasHeight, layout, renderData);

    console.log('[CLICK] x:', x, 'y:', y, 'target:', target, 'spells:', renderData.spells);

    if (!target) return;

    switch (target.type) {
        case 'houseSelect':
            selectHouse(target.house);
            break;
        case 'tutorialNext':
            advanceSpellTutorial();
            break;
        case 'shieldTutorialStart':
            startShieldFromTutorial();
            break;
        case 'shieldPress':
            handleShieldPress(target.color);
            break;
        case 'buffSelect':
            selectBuff(target.buffId);
            break;
        case 'spellCast':
            castSpell(target.spellId);
            break;
        case 'restart':
            restartGame();
            break;
        case 'roomContinue':
            // Room continue is handled automatically after buff selection
            break;
    }
}

// ============ EVENT HANDLERS ============

function setupEventHandlers() {
    on('sound', (data) => {
        playSound(data.freq, data.type, data.duration);
    });

    on('log', (data) => {
        console.log(`[GAME LOG] ${data.text}`);
    });

    on('gameStarted', () => {
        console.log('[GAME] Game started');
    });

    on('victory', () => {
        console.log('[GAME] Victory!');
    });

    on('gameOver', () => {
        console.log('[GAME] Game Over');
    });

    on('creatureSpawned', (data) => {
        console.log(`[GAME] Spawned: ${data.creature.name}`);
    });

    on('creatureKilled', (data) => {
        console.log(`[GAME] Killed creature, +${data.goldGain} gold`);
        scrollBackground();
    });
}

// ============ INITIALIZATION ============

function init() {
    console.log('[MODULE_GAME] Initializing...');

    const container = document.querySelector('.game-container');
    if (!container) {
        console.error('[MODULE_GAME] No .game-container found');
        return;
    }

    // Setup event handlers
    setupEventHandlers();

    // Initialize game state
    const { session, player, renderData } = initGame();

    // Initialize renderer
    initRenderer(container, handleClick);

    // Start render loop
    startRenderLoop();

    // Start cooldown tick
    startCooldownTick();

    // Expose game state for testing
    window.game = {
        get session() { return getSession(); },
        get player() { return getPlayer(); },
        get creature() { return getCreature(); },
        get renderData() { return getRenderData(); },
        selectHouse,
        advanceSpellTutorial,
        finishSpellTutorial,
        startShieldFromTutorial,
        handleShieldPress,
        selectBuff,
        castSpell,
        restartGame,
        HOUSE_DATA,
        SPELL_TEMPLATES
    };

    console.log('[MODULE_GAME] Initialized successfully');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for testing
export {
    init,
    getSession,
    getPlayer,
    getCreature,
    getRenderData
};
