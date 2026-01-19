// Shield Minigame module - Boss spell blocking minigame
// Extracted from main.js

import { SHIELD_COLORS } from './data.js';
import {
    game,
    shieldGame,
    setShieldGame,
    getCurrentCreature,
    getCreatureHp,
    setCreatureHp,
    playSound,
    getStats
} from './game.js';

import { showFloat } from './visual-effects.js';

// Callbacks to be set by main.js
let updateUICallback = null;
let addLogCallback = null;
let gameOverCallback = null;
let startBattleCallback = null;

export function initShieldMinigame(callbacks) {
    updateUICallback = callbacks.updateUI;
    addLogCallback = callbacks.addLog;
    gameOverCallback = callbacks.gameOver;
    startBattleCallback = callbacks.startBattle;
}

export function isFirstBossEver() {
    return game.floor === 5 && game.bestFloor < 5;
}

export function shouldTriggerShieldMinigame(creatureBuffs) {
    const currentCreature = getCurrentCreature();
    if (!currentCreature || !currentCreature.boss) return false;
    if (shieldGame.active) return false;

    if (!creatureBuffs.shieldPhase1) {
        creatureBuffs.shieldPhase1 = true;
        return true;
    }

    const hpPercent = getCreatureHp() / currentCreature.maxHp;
    if (hpPercent <= 0.5 && !creatureBuffs.shieldPhase2) {
        creatureBuffs.shieldPhase2 = true;
        return true;
    }

    return false;
}

export function startShieldMinigame(creatureBuffs) {
    const currentCreature = getCurrentCreature();
    const isFirstPhase = !creatureBuffs.shieldPhase2;
    const shouldShowTutorial = isFirstBossEver() && isFirstPhase && !game.shieldTutorialDone;

    setShieldGame({
        active: true,
        currentColor: null,
        timeLeft: 0,
        timerInterval: null,
        isTutorial: shouldShowTutorial,
        bossSpellQueue: generateBossSpells(shouldShowTutorial ? 3 : 5),
        spellsBlocked: 0,
        spellsMissed: 0,
        tutorialShown: false
    });

    if (currentCreature) {
        const enemyIcon = document.getElementById('shieldEnemyIcon');
        if (enemyIcon) enemyIcon.textContent = currentCreature.icon;
    }

    if (shouldShowTutorial && !shieldGame.tutorialShown) {
        showTutorialOverlay();
        return;
    }

    beginShieldMinigame();
}

function showTutorialOverlay() {
    const overlay = document.getElementById('shieldTutorialOverlay');
    if (overlay) overlay.style.display = 'flex';
    playSound(500, 'sine', 0.2);

    const startBtn = document.getElementById('shieldTutorialStartBtn');
    if (startBtn) {
        startBtn.onclick = () => {
            if (overlay) overlay.style.display = 'none';
            shieldGame.tutorialShown = true;
            game.shieldTutorialDone = true;
            beginShieldMinigame();
        };
    }
}

export function beginShieldMinigame() {
    const currentCreature = getCurrentCreature();
    const minigame = document.getElementById('shieldMinigame');
    if (minigame) minigame.classList.add('active');

    const result = document.getElementById('shieldResult');
    if (result) {
        result.textContent = '';
        result.className = 'shield-result';
    }

    const incoming = document.getElementById('shieldIncoming');
    if (incoming) {
        incoming.innerHTML = `
            <span class="shield-player-icon">🧙</span>
            <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
        `;
    }

    const title = document.getElementById('shieldTitle');
    const hint = document.getElementById('shieldHint');
    const timerBar = document.getElementById('shieldTimerBar');

    if (shieldGame.isTutorial) {
        if (title) title.textContent = '🛡️ TUTORIAL: Tap the glowing button!';
        if (hint) hint.textContent = 'Watch the spell color and tap the matching shield!';
        if (timerBar) timerBar.classList.add('tutorial');
    } else {
        if (title) title.textContent = '🛡️ Block the incoming spells!';
        if (hint) hint.textContent = '';
        if (timerBar) timerBar.classList.remove('tutorial');
    }

    if (addLogCallback) addLogCallback('🛡️ Boss casting spells! Block them!', 'log-boss');
    playSound(400, 'sine', 0.2);

    document.querySelectorAll('.shield-btn').forEach(btn => {
        btn.onclick = () => handleShieldPress(btn.dataset.color);
    });

    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, shieldGame.isTutorial ? 1000 : 500);
}

function generateBossSpells(count) {
    const colors = ['red', 'blue', 'yellow', 'green'];
    const spells = [];
    for (let i = 0; i < count; i++) {
        spells.push(colors[Math.floor(Math.random() * colors.length)]);
    }
    return spells;
}

function sendNextBossSpell() {
    if (shieldGame.bossSpellQueue.length === 0) {
        endShieldMinigame();
        return;
    }

    const currentCreature = getCurrentCreature();
    const color = shieldGame.bossSpellQueue.shift();
    shieldGame.currentColor = color;

    const baseTime = shieldGame.isTutorial ? 4000 : 1500;
    const speedBonus = shieldGame.isTutorial ? 0 : Math.min((game.floor / 5 - 1) * 100, 600);
    shieldGame.timeLeft = baseTime - speedBonus;

    const incomingDiv = document.getElementById('shieldIncoming');
    const spellData = SHIELD_COLORS[color];
    if (incomingDiv) {
        incomingDiv.innerHTML = `
            <span class="shield-player-icon">🧙</span>
            <span class="shield-spell flying ${shieldGame.isTutorial ? 'tutorial' : ''}" style="color: ${getShieldColor(color)}">${spellData.spellIcon}</span>
            <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
        `;
    }

    if (shieldGame.isTutorial) {
        const hint = document.getElementById('shieldHint');
        const colorName = SHIELD_COLORS[color].name;
        if (hint) {
            hint.innerHTML = `<b style="color: ${getShieldColor(color)}">${colorName}</b> spell incoming! Tap the <b style="color: ${getShieldColor(color)}">${spellData.icon}</b> button!`;
        }
    }

    document.querySelectorAll('.shield-btn').forEach(btn => btn.classList.remove('highlight'));

    if (shieldGame.isTutorial) {
        const btn = document.querySelector(`.shield-btn.${color}`);
        if (btn) btn.classList.add('highlight');
    }

    updateShieldTimer();
    shieldGame.timerInterval = setInterval(() => {
        shieldGame.timeLeft -= 100;
        updateShieldTimer();

        if (shieldGame.timeLeft <= 0) {
            clearInterval(shieldGame.timerInterval);
            shieldMiss();
        }
    }, 100);

    playSound(600 + (color === 'red' ? 0 : color === 'blue' ? 100 : color === 'yellow' ? 200 : 300), 'sine', 0.15);
}

function getShieldColor(color) {
    switch(color) {
        case 'red': return '#ff4444';
        case 'blue': return '#4488ff';
        case 'yellow': return '#ffdd44';
        case 'green': return '#44dd44';
        default: return '#ffffff';
    }
}

function updateShieldTimer() {
    const maxTime = shieldGame.isTutorial ? 4000 : 1500;
    const percent = (shieldGame.timeLeft / maxTime) * 100;
    const timerBar = document.getElementById('shieldTimerBar');
    if (timerBar) timerBar.style.width = percent + '%';
}

function handleShieldPress(color) {
    if (!shieldGame.active || !shieldGame.currentColor) return;

    clearInterval(shieldGame.timerInterval);

    if (color === shieldGame.currentColor) {
        shieldSuccess();
    } else {
        shieldMiss();
    }
}

function shieldSuccess() {
    const currentCreature = getCurrentCreature();
    shieldGame.spellsBlocked++;

    const result = document.getElementById('shieldResult');
    if (result) {
        result.textContent = '✓ Blocked!';
        result.className = 'shield-result success';
    }

    const incoming = document.getElementById('shieldIncoming');
    if (incoming) {
        incoming.innerHTML = `
            <span class="shield-player-icon">🧙</span>
            <span style="color: #70c070; font-size: 28px;">🛡️ PROTEGO!</span>
            <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
        `;
    }

    if (shieldGame.isTutorial) {
        const hint = document.getElementById('shieldHint');
        if (hint) hint.textContent = '✓ Great job! Get ready for the next spell...';
    }

    playSound(800, 'sine', 0.15);
    if (addLogCallback) addLogCallback('🛡️ Spell blocked!', 'log-effective');

    const pauseTime = shieldGame.isTutorial ? 1200 : 600;
    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, pauseTime);
}

function shieldMiss() {
    const currentCreature = getCurrentCreature();
    shieldGame.spellsMissed++;

    const result = document.getElementById('shieldResult');
    if (result) {
        result.textContent = '✗ Hit!';
        result.className = 'shield-result fail';
    }

    const incoming = document.getElementById('shieldIncoming');
    if (incoming) {
        incoming.innerHTML = `
            <span class="shield-player-icon">🧙</span>
            <span style="color: #c07070; font-size: 28px;">💥 OUCH!</span>
            <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
        `;
    }

    if (shieldGame.isTutorial) {
        const hint = document.getElementById('shieldHint');
        if (hint) hint.textContent = '✗ Missed! Try to tap the matching color faster!';
    }

    const stats = getStats();
    const damageMultiplier = shieldGame.isTutorial ? 0.3 : 0.5;
    const damage = Math.floor(currentCreature.atk * damageMultiplier);
    game.currentHp -= damage;
    showFloat(`-${damage}`, 60, 50, 'damage');
    if (addLogCallback) addLogCallback(`💥 Hit by spell! -${damage} HP`, 'log-damage');
    playSound(200, 'sawtooth', 0.2);

    if (updateUICallback) updateUICallback();

    if (game.currentHp <= 0) {
        endShieldMinigame();
        if (gameOverCallback) gameOverCallback();
        return;
    }

    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, 600);
}

function endShieldMinigame() {
    const currentCreature = getCurrentCreature();
    shieldGame.active = false;
    shieldGame.currentColor = null;
    clearInterval(shieldGame.timerInterval);

    const minigame = document.getElementById('shieldMinigame');
    if (minigame) minigame.classList.remove('active');
    document.querySelectorAll('.shield-btn').forEach(btn => btn.classList.remove('highlight'));

    const blocked = shieldGame.spellsBlocked;
    const total = blocked + shieldGame.spellsMissed;

    if (blocked === total && total > 0) {
        if (addLogCallback) addLogCallback(`🎉 Perfect defense! All ${total} spells blocked!`, 'log-effective');
        const bonusDmg = Math.floor(currentCreature.maxHp * 0.1);
        setCreatureHp(getCreatureHp() - bonusDmg);
        showFloat(`PERFECT! -${bonusDmg}`, 220, 40, 'effective');
        playSound(1000, 'sine', 0.2);
    } else if (blocked > 0) {
        if (addLogCallback) addLogCallback(`🛡️ Blocked ${blocked}/${total} spells`, 'log-spell');
    } else {
        if (addLogCallback) addLogCallback(`💥 Failed to block any spells!`, 'log-damage');
    }

    if (updateUICallback) updateUICallback();

    if (game.currentHp > 0 && getCreatureHp() > 0) {
        if (addLogCallback) addLogCallback('⚔️ Resume battle!', 'log-boss');
        game.gameStarted = true;
        game.inBattle = true;
        if (startBattleCallback) startBattleCallback();
    }
}
