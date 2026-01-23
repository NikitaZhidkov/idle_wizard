/**
 * Game Flow System
 * Handles FSM transitions, initialization, house selection, tutorials
 */

import { HOUSE_DATA, clearEntities, createPlayerState, createGameSession, createRenderData, computePlayerStats } from '../entities/index.js';
import { emit } from './events.js';
import { setSession, setPlayer, setCreature, setRenderData, getSession, getPlayer, getRenderData, clearState, addLog } from './state.js';
import { spawnCreature } from './spawn.js';
import { startBattleLoop, stopBattleLoop } from './battle.js';
import { stopShieldTimer } from './shield.js';

export function initGame() {
    clearEntities();
    clearState();

    const session = createGameSession();
    const player = createPlayerState();
    session.playerId = player.id;

    const renderData = createRenderData();

    setSession(session);
    setPlayer(player);
    setRenderData(renderData);

    // Start at house selection
    session.state = 'houseSelect';
    renderData.showHouseSelect = true;

    emit('init');
    return { session, player, renderData };
}

export function selectHouse(houseName) {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    if (session.state !== 'houseSelect') return;

    const house = HOUSE_DATA[houseName];
    if (!house) return;

    player.house = houseName;
    player.houseChosen = true;
    player.unlockedSpells = [house.spell];

    // Apply house stats
    const stats = computePlayerStats(player);
    player.currentHp = stats.hp;
    player.maxHp = stats.hp;

    addLog(`Welcome to ${house.name}!`, 'log-levelup');
    emit('houseSelected', { house: houseName });
    emit('sound', { freq: 800, type: 'sine', duration: 0.2 });

    renderData.showHouseSelect = false;

    // Check spell tutorial
    if (!player.spellTutorialDone) {
        session.state = 'spellTutorial';
        renderData.showSpellTutorial = true;
        renderData.spellTutorialPage = 1;
    } else {
        startGame();
    }
}

export function nextTutorialPage() {
    const session = getSession();
    const renderData = getRenderData();

    if (session.state !== 'spellTutorial') return;

    renderData.spellTutorialPage++;
    emit('sound', { freq: 600, type: 'sine', duration: 0.1 });
}

export function advanceSpellTutorial() {
    const session = getSession();
    const renderData = getRenderData();

    if (session.state !== 'spellTutorial') return;

    if (renderData.spellTutorialPage < 3) {
        renderData.spellTutorialPage++;
        emit('sound', { freq: 500, type: 'sine', duration: 0.1 });
    } else {
        finishSpellTutorial();
    }
}

export function finishSpellTutorial() {
    const player = getPlayer();
    const renderData = getRenderData();

    player.spellTutorialDone = true;
    renderData.showSpellTutorial = false;
    emit('sound', { freq: 800, type: 'sine', duration: 0.2 });
    startGame();
}

export function endSpellTutorial() {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    if (session.state !== 'spellTutorial') return;

    player.spellTutorialDone = true;
    renderData.showSpellTutorial = false;
    emit('sound', { freq: 800, type: 'sine', duration: 0.2 });
    startGame();
}

export function startGame() {
    const session = getSession();

    session.state = 'playing';
    session.gameStarted = true;
    session.inBattle = true;

    spawnCreature();
    startBattleLoop();

    addLog('Your adventure begins!', 'log-levelup');
    emit('gameStarted');
}

export function triggerGameOver() {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    stopBattleLoop();
    session.state = 'gameOver';
    session.gameStarted = false;

    if (player.floor > player.bestFloor) {
        player.bestFloor = player.floor;
    }

    renderData.showGameOver = true;
    renderData.gameOverData = {
        floor: player.floor,
        kills: player.runKills,
        gold: player.runGold,
        combo: player.maxCombo
    };

    emit('sound', { freq: 150, type: 'sawtooth', duration: 0.3 });
    emit('gameOver');
}

export function triggerVictory() {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    stopBattleLoop();
    session.state = 'victory';
    session.gameStarted = false;

    if (player.floor > player.bestFloor) {
        player.bestFloor = player.floor;
    }

    renderData.showVictory = true;
    renderData.victoryData = {
        kills: player.runKills,
        gold: player.runGold,
        combo: player.maxCombo
    };

    // Victory sound
    emit('sound', { freq: 800, type: 'sine', duration: 0.3 });
    setTimeout(() => emit('sound', { freq: 1000, type: 'sine', duration: 0.3 }), 150);
    setTimeout(() => emit('sound', { freq: 1200, type: 'sine', duration: 0.3 }), 300);

    emit('victory');
}

export function restartGame() {
    stopBattleLoop();
    stopShieldTimer();
    initGame();
}
