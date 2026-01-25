/**
 * Game Flow System
 * Handles FSM transitions, initialization
 */

import { clearEntities, createPlayerState, createGameSession, createRenderData, computePlayerStats } from '../entities/index.js';
import { emit } from './events.js';
import { setSession, setPlayer, setCreature, setRenderData, getSession, getPlayer, getRenderData, clearState, addLog } from './state.js';
import { spawnCreature } from './spawn.js';
import { startBattleLoop, stopBattleLoop } from './battle.js';

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

    // Initialize player stats
    const stats = computePlayerStats(player);
    player.currentHp = stats.hp;
    player.maxHp = stats.hp;

    emit('init');

    // Start the game immediately
    startGame();

    return { session, player, renderData };
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
    initGame();
}
