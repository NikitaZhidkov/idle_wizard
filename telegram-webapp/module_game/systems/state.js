/**
 * Global game state management
 */

import { clearEntities, createPlayerState, createGameSession, createRenderData } from '../entities/index.js';
import { emit } from './events.js';

// Global state
let session = null;
let player = null;
let creature = null;
let renderData = null;

// Battle log buffer
let battleLog = [];
const MAX_LOG_ENTRIES = 6;

// Floating texts and particles
let floatingTexts = [];
let particles = [];

// Initialize all state
export function initState() {
    clearEntities();
    battleLog = [];
    floatingTexts = [];
    particles = [];

    session = createGameSession();
    player = createPlayerState();
    session.playerId = player.id;

    renderData = createRenderData();

    // Start at house selection
    session.state = 'houseSelect';
    renderData.showHouseSelect = true;

    emit('init');
    return { session, player, renderData };
}

// Getters
export function getSession() { return session; }
export function getPlayer() { return player; }
export function getCreature() { return creature; }
export function getRenderData() { return renderData; }
export function getBattleLog() { return battleLog; }
export function getFloatingTexts() { return floatingTexts; }
export function getParticles() { return particles; }

// Setters
export function setCreature(c) { creature = c; }
export function setSession(s) { session = s; }
export function setPlayer(p) { player = p; }
export function setRenderData(rd) { renderData = rd; }

// Clear all state (for restart)
export function clearState() {
    battleLog = [];
    floatingTexts = [];
    particles = [];
}

// Battle log
export function addLog(text, type = '') {
    battleLog.push({ text, type, time: Date.now() });
    while (battleLog.length > MAX_LOG_ENTRIES) {
        battleLog.shift();
    }
    emit('log', { text, type });
}

export function clearLog() {
    battleLog = [];
}

// Visual effects
export function addFloatingText(text, x, y, type = '') {
    floatingTexts.push({ text, x, y, type, startTime: Date.now(), duration: 800 });
}

export function addParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3 - 1,
            color,
            size: 3 + Math.random() * 4,
            startTime: Date.now(),
            duration: 600
        });
    }
}

// Update visual effects (called from render data update)
export function updateEffects() {
    const now = Date.now();
    floatingTexts = floatingTexts.filter(ft => now - ft.startTime < ft.duration);
    particles = particles.filter(p => {
        if (now - p.startTime >= p.duration) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        return true;
    });
}

// Get state snapshot for external access
export function getState() {
    return { session, player, creature, renderData };
}
