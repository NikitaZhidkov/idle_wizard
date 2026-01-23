/**
 * Shield Minigame System
 */

import { CONFIG, SHIELD_COLORS } from '../entities/index.js';
import { emit } from './events.js';
import { getSession, getPlayer, getCreature, addLog, addFloatingText, getRenderData } from './state.js';
import { startBattleLoop } from './battle.js';
import { handleCreatureDeath } from './spawn.js';

let shieldTimerId = null;

export function stopShieldTimer() {
    if (shieldTimerId) {
        clearInterval(shieldTimerId);
        shieldTimerId = null;
    }
}

export function shouldTriggerShieldMinigame() {
    const session = getSession();
    const creature = getCreature();

    if (!creature || !creature.boss) return false;
    if (session.shieldActive) return false;

    if (!creature.shieldPhase1) {
        creature.shieldPhase1 = true;
        return true;
    }

    const hpPercent = creature.hp / creature.maxHp;
    if (hpPercent <= 0.5 && !creature.shieldPhase2) {
        creature.shieldPhase2 = true;
        return true;
    }

    return false;
}

function isFirstBossEver() {
    const player = getPlayer();
    return player.encounterIndex === 3 && player.bestFloor < 4;
}

function generateShieldSpells(count) {
    const spells = [];
    for (let i = 0; i < count; i++) {
        spells.push(SHIELD_COLORS[Math.floor(Math.random() * SHIELD_COLORS.length)]);
    }
    return spells;
}

export function startShieldMinigame() {
    const session = getSession();
    const player = getPlayer();
    const creature = getCreature();
    const renderData = getRenderData();

    const isFirstPhase = !creature.shieldPhase2 || (creature.shieldPhase1 && !creature.shieldPhase2);
    const showTutorial = isFirstBossEver() && isFirstPhase && !player.shieldTutorialDone;

    session.shieldActive = true;
    session.shieldSpellQueue = generateShieldSpells(showTutorial ? 3 : 5);
    session.shieldCurrentColor = null;
    session.shieldTimeLeft = 0;
    session.shieldIsTutorial = showTutorial;
    session.shieldSpellsBlocked = 0;
    session.shieldSpellsMissed = 0;

    if (showTutorial) {
        session.state = 'shieldTutorial';
        renderData.showShieldTutorial = true;
        emit('sound', { freq: 500, type: 'sine', duration: 0.2 });
    } else {
        beginShieldMinigame();
    }
}

export function startShieldFromTutorial() {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    player.shieldTutorialDone = true;
    session.state = 'shieldMinigame';
    renderData.showShieldTutorial = false;
    beginShieldMinigame();
}

function beginShieldMinigame() {
    const session = getSession();
    const renderData = getRenderData();

    session.state = 'shieldMinigame';
    renderData.showShieldMinigame = true;
    renderData.shieldTimer = 100;
    renderData.shieldResult = '';
    renderData.shieldHighlightColor = null;

    addLog('🛡️ Boss casting spells! Block them!', 'log-boss');
    emit('sound', { freq: 400, type: 'sine', duration: 0.2 });

    const delay = session.shieldIsTutorial ? 1000 : 500;
    setTimeout(() => {
        if (session.shieldActive) sendNextShieldSpell();
    }, delay);
}

function sendNextShieldSpell() {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    if (session.shieldSpellQueue.length === 0) {
        endShieldMinigame();
        return;
    }

    const color = session.shieldSpellQueue.shift();
    session.shieldCurrentColor = color;

    const baseTime = session.shieldIsTutorial ? CONFIG.SHIELD_TUTORIAL_TIME_MS : CONFIG.SHIELD_BASE_TIME_MS;
    const speedBonus = session.shieldIsTutorial ? 0 : Math.min((player.floor / 5 - 1) * 100, 600);
    session.shieldTimeLeft = baseTime - speedBonus;

    renderData.shieldSpells = [{ color, x: 200, y: 100, flying: true }];
    renderData.shieldHighlightColor = session.shieldIsTutorial ? color : null;
    renderData.shieldTimer = 100;
    renderData.shieldResult = '';

    const maxTime = session.shieldTimeLeft;
    shieldTimerId = setInterval(() => {
        session.shieldTimeLeft -= 100;
        renderData.shieldTimer = (session.shieldTimeLeft / maxTime) * 100;

        if (session.shieldTimeLeft <= 0) {
            clearInterval(shieldTimerId);
            shieldMiss();
        }
    }, 100);
    session.shieldTimerId = shieldTimerId;

    emit('sound', { freq: 600 + (SHIELD_COLORS.indexOf(color) * 100), type: 'sine', duration: 0.15 });
}

export function handleShieldPress(color) {
    const session = getSession();

    if (!session.shieldActive || !session.shieldCurrentColor) return;

    if (shieldTimerId) {
        clearInterval(shieldTimerId);
        shieldTimerId = null;
    }

    if (color === session.shieldCurrentColor) {
        shieldSuccess();
    } else {
        shieldMiss();
    }
}

function shieldSuccess() {
    const session = getSession();
    const renderData = getRenderData();

    session.shieldSpellsBlocked++;
    renderData.shieldResult = '✓ Blocked!';
    renderData.shieldSpells = [];

    emit('sound', { freq: 800, type: 'sine', duration: 0.15 });
    addLog('🛡️ Spell blocked!', 'log-effective');

    const pauseTime = session.shieldIsTutorial ? 1200 : 600;
    setTimeout(() => {
        if (session.shieldActive) sendNextShieldSpell();
    }, pauseTime);
}

function shieldMiss() {
    const session = getSession();
    const player = getPlayer();
    const creature = getCreature();
    const renderData = getRenderData();

    session.shieldSpellsMissed++;
    renderData.shieldResult = '✗ Hit!';

    const damageMultiplier = session.shieldIsTutorial ? 0.3 : 0.5;
    const damage = Math.floor(creature.atk * damageMultiplier);
    player.currentHp -= damage;

    addFloatingText(`-${damage}`, 60, 200, 'damage');
    addLog(`💥 Hit by spell! -${damage} HP`, 'log-damage');
    emit('sound', { freq: 200, type: 'sawtooth', duration: 0.2 });

    if (player.currentHp <= 0) {
        endShieldMinigame();
        import('./game-flow.js').then(({ triggerGameOver }) => {
            triggerGameOver();
        });
        return;
    }

    setTimeout(() => {
        if (session.shieldActive) sendNextShieldSpell();
    }, 600);
}

function endShieldMinigame() {
    const session = getSession();
    const player = getPlayer();
    const creature = getCreature();
    const renderData = getRenderData();

    session.shieldActive = false;
    session.shieldCurrentColor = null;

    if (shieldTimerId) {
        clearInterval(shieldTimerId);
        shieldTimerId = null;
    }

    renderData.showShieldMinigame = false;
    renderData.shieldHighlightColor = null;

    const blocked = session.shieldSpellsBlocked;
    const total = blocked + session.shieldSpellsMissed;

    if (blocked === total && total > 0) {
        addLog(`🎉 Perfect defense! All ${total} spells blocked!`, 'log-effective');
        const bonusDmg = Math.floor(creature.maxHp * 0.1);
        creature.hp -= bonusDmg;
        addFloatingText(`PERFECT! -${bonusDmg}`, 220, 150, 'effective');
        emit('sound', { freq: 1000, type: 'sine', duration: 0.2 });
    } else if (blocked > 0) {
        addLog(`🛡️ Blocked ${blocked}/${total} spells`, 'log-spell');
    } else {
        addLog(`💥 Failed to block any spells!`, 'log-damage');
    }

    // Check if boss died from perfect defense bonus damage
    if (creature && creature.hp <= 0) {
        handleCreatureDeath();
        return;
    }

    if (player.currentHp > 0 && creature && creature.hp > 0) {
        session.state = 'playing';
        session.gameStarted = true;
        session.inBattle = true;
        addLog('⚔️ Resume battle!', 'log-boss');
        startBattleLoop();
    }
}
