// Main entry point - imports and initializes all modules
// This orchestrates the modular game components

import {
    SPRITE_SIZE, SPRITE_CELL, SPRITE_BORDER,
    MAGIC_TYPES, ABILITIES, SPELLS
} from './data.js';

import {
    game,
    shieldGame,
    setCurrentCreature,
    setCreatureHp,
    setCreatureBuffs,
    setTurnCount,
    setShieldGame,
    setBattleInterval,
    setSpellTutorialPage,
    getCurrentCreature,
    getCreatureHp,
    getBattleInterval,
    spellTutorialPage,
    playSound,
    formatNum,
    saveGame,
    getStats,
    calculateOffline
} from './game.js';

import { initVisualEffects, showFloat, createParticles } from './visual-effects.js';

import {
    initUIRenderers,
    updateSpriteSheetStatus,
    renderShop,
    renderSkillTree,
    renderBestiary,
    renderSpellbook,
    renderActiveBuffs,
    renderBuffChoices
} from './ui-renderers.js';

import {
    initBattleSystem,
    addLog,
    spawnCreature,
    checkCreatureDeath,
    battle,
    startBattle,
    generateRoom
} from './battle-system.js';

import { initSpellSystem, renderSpellBar, castSpell } from './spell-system.js';

import { initShieldMinigame } from './shield-minigame.js';

// Make functions available globally for onclick handlers in HTML
window.nextSpellTutorialPage = nextSpellTutorialPage;
window.finishSpellTutorial = finishSpellTutorial;

// ============ GLOBAL DOM REFERENCES ============
let battleArea, battleLog, heroCanvas, creatureCanvas, heroCtx, creatureCtx;
let heroImage, creatureSpriteSheet;
let spriteSheetLoaded = false;

// ============ UI FUNCTIONS ============

function initUI() {
    battleArea = document.getElementById('battleArea');
    battleLog = document.getElementById('battleLog');
    heroCanvas = document.getElementById('heroCanvas');
    creatureCanvas = document.getElementById('creatureCanvas');
    heroCtx = heroCanvas.getContext('2d');
    creatureCtx = creatureCanvas.getContext('2d');

    // Initialize visual effects with battleArea
    initVisualEffects(battleArea);

    // Load hero image
    heroImage = new Image();
    heroImage.src = 'hero.png';

    // Load creature sprite sheet
    creatureSpriteSheet = new Image();
    creatureSpriteSheet.crossOrigin = 'anonymous';
    creatureSpriteSheet.onload = () => {
        console.log('Sprite sheet loaded:', creatureSpriteSheet.width, 'x', creatureSpriteSheet.height);
        spriteSheetLoaded = true;
        initUIRenderers(creatureSpriteSheet, true);
        updateSpriteSheetStatus(true);
        const currentCreature = getCurrentCreature();
        if (currentCreature) drawCreature();
    };
    creatureSpriteSheet.onerror = (e) => console.error('Failed to load sprite sheet:', e);
    creatureSpriteSheet.src = 'creatures.png?v=3';

    // Initialize UI renderers
    initUIRenderers(creatureSpriteSheet, spriteSheetLoaded);

    // Initialize battle system with callbacks
    initBattleSystem({
        battleLog,
        heroCanvas,
        creatureCanvas,
        updateUI,
        gameOver,
        showRoomTransition,
        drawCreature,
        renderCreatureStatus,
        renderBattleCreatureCard
    });

    // Initialize spell system with callbacks
    initSpellSystem({
        addLog,
        checkCreatureDeath,
        updateUI
    });

    // Initialize shield minigame with callbacks
    initShieldMinigame({
        updateUI,
        addLog,
        gameOver,
        startBattle
    });
}

function updateUI() {
    const stats = getStats();
    game.maxHp = stats.hp;
    if (game.currentHp > stats.hp) game.currentHp = stats.hp;

    document.getElementById('gold').textContent = `${formatNum(game.gold)} Galleons`;
    document.getElementById('gems').textContent = `${game.gems} Sickles | ${game.skillPoints} XP`;
    document.getElementById('level').textContent = `Year ${game.level}`;
    document.getElementById('floor').textContent = `Floor: ${game.floor}`;
    document.getElementById('availableSP').textContent = game.skillPoints;

    document.getElementById('atkStat').textContent = stats.atk;
    document.getElementById('defStat').textContent = stats.def;
    document.getElementById('critStat').textContent = stats.crit + '%';
    document.getElementById('hpStat').textContent = stats.hp;

    document.getElementById('playerHealth').style.width = `${(game.currentHp / stats.hp) * 100}%`;

    const comboEl = document.getElementById('comboDisplay');
    comboEl.textContent = game.combo > 1 ? `${game.combo}x Combo!` : '';

    document.getElementById('floorDisplay').textContent = game.floor % 5 === 0 ? '⚠️ BOSS!' : '';

    renderSpellBar(castSpell);
    renderCreatureStatus();
}

function renderCreatureStatus() {
    const container = document.getElementById('creatureStatus');
    if (!container) return;
    container.innerHTML = '';

    const currentCreature = getCurrentCreature();
    if (!currentCreature) return;

    currentCreature.abilities.forEach(ab => {
        const ability = ABILITIES[ab];
        if (ability) {
            const div = document.createElement('div');
            div.className = 'status-icon';
            div.textContent = ability.icon;
            div.title = ability.name;
            container.appendChild(div);
        }
    });

    const creatureBuffs = game.creatureBuffs || {};
    if (creatureBuffs.shield) {
        const div = document.createElement('div');
        div.className = 'status-icon';
        div.textContent = '🛡️';
        container.appendChild(div);
    }
}

function renderBattleCreatureCard() {
    const currentCreature = getCurrentCreature();
    if (!currentCreature) {
        document.getElementById('battleCreatureCard').style.display = 'none';
        return;
    }

    const card = document.getElementById('battleCreatureCard');
    card.style.display = 'flex';

    drawCreature();

    const isBoss = currentCreature.boss;
    const nameEl = document.getElementById('battleCreatureName');
    const shortName = currentCreature.name.split(' ').pop();
    nameEl.textContent = isBoss ? `👑 ${shortName}` : shortName;

    const hpPercent = (getCreatureHp() / currentCreature.maxHp) * 100;
    document.getElementById('creatureHealth').style.width = `${Math.max(0, hpPercent)}%`;
}

function showRoomTransition(goldGain) {
    game.inBattle = false;
    game.lastGoldGain = goldGain;
    game.selectingBuff = true;

    const transition = document.getElementById('roomTransition');
    document.getElementById('roomLoot').textContent = `+${formatNum(goldGain)} Galleons`;
    document.getElementById('roomNext').textContent = `Room ${game.floor} awaits...`;

    transition.classList.add('active');

    document.getElementById('buffSelectionPanel').style.display = 'block';
    renderBuffChoices(selectBuff);

    playSound(600, 'sine', 0.15);
}

function selectBuff(buff) {
    game.activeBuffs.push({ id: buff.id, name: buff.name, icon: buff.icon });

    const effect = buff.effect;
    const bs = game.buffStats;

    if (effect.atk) bs.atk += effect.atk;
    if (effect.def) bs.def += effect.def;
    if (effect.hp) bs.hp += effect.hp;
    if (effect.crit) bs.crit += effect.crit;
    if (effect.critDmg) bs.critDmg += effect.critDmg;
    if (effect.goldBonus) bs.goldBonus += effect.goldBonus;
    if (effect.xpBonus) bs.xpBonus += effect.xpBonus;
    if (effect.lifesteal) bs.lifesteal += effect.lifesteal;
    if (effect.regenFlat) bs.regenFlat += effect.regenFlat;
    if (effect.dodge) bs.dodge += effect.dodge;
    if (effect.thorns) bs.thorns += effect.thorns;
    if (effect.executeDmg) bs.executeDmg += effect.executeDmg;
    if (effect.spellPower) bs.spellPower += effect.spellPower;
    if (effect.deathSaves) bs.deathSaves += effect.deathSaves;
    if (effect.doubleAttack) bs.doubleAttack = true;

    if (effect.healNow) {
        const stats = getStats();
        game.currentHp = Math.min(stats.hp, game.currentHp + effect.healNow);
        addLog(`Healed ${effect.healNow} HP!`, 'log-spell');
    }
    if (effect.fullHeal) {
        const stats = getStats();
        game.currentHp = stats.hp;
        addLog('Fully healed!', 'log-spell');
    }
    if (effect.goldNow) {
        game.gold += effect.goldNow;
        addLog(`+${effect.goldNow} Gold!`, 'log-gold');
    }
    if (effect.unlockSpell) {
        if (!game.unlockedSpells.includes(effect.unlockSpell)) {
            game.unlockedSpells.push(effect.unlockSpell);
            const spell = SPELLS.find(s => s.id === effect.unlockSpell);
            addLog(`Learned ${spell ? spell.name : effect.unlockSpell}!`, 'log-spell');
            renderSpellBar(castSpell);
        }
    }

    if (effect.hp) {
        const stats = getStats();
        game.maxHp = stats.hp;
        game.currentHp = Math.min(game.currentHp + effect.hp, stats.hp);
    }

    playSound(800, 'sine', 0.2);
    addLog(`Gained: ${buff.name}!`, 'log-levelup');

    renderActiveBuffs();
    updateUI();
    saveGame();

    continueToNextRoom();
}

function continueToNextRoom() {
    const transition = document.getElementById('roomTransition');
    transition.classList.remove('active');

    document.getElementById('buffSelectionPanel').style.display = 'none';

    game.selectingBuff = false;

    generateRoom();
    game.inBattle = true;

    spawnCreature();

    // Ensure battle continues
    const currentInterval = getBattleInterval();
    if (!currentInterval) {
        startBattle();
    }
}

function drawWizard() {
    heroCtx.clearRect(0, 0, 55, 75);
    if (heroImage && heroImage.complete) {
        heroCtx.drawImage(heroImage, 0, 0, 55, 75);
    }
}

function drawCreature() {
    const currentCreature = getCurrentCreature();
    if (!currentCreature) return;
    creatureCtx.clearRect(0, 0, 50, 60);

    const magic = MAGIC_TYPES[currentCreature.magic];

    if (spriteSheetLoaded && currentCreature.spriteX !== undefined) {
        const srcX = currentCreature.spriteX * SPRITE_CELL + SPRITE_BORDER;
        const srcY = currentCreature.spriteY * SPRITE_CELL + SPRITE_BORDER;
        creatureCtx.save();
        creatureCtx.scale(-1, 1);
        creatureCtx.drawImage(
            creatureSpriteSheet,
            srcX, srcY, SPRITE_SIZE, SPRITE_SIZE,
            -50, 0, 50, 60
        );
        creatureCtx.restore();
    } else {
        creatureCtx.fillStyle = magic.color;
        creatureCtx.fillRect(12, 22, 26, 26);
        creatureCtx.beginPath();
        creatureCtx.arc(25, 15, 12, 0, Math.PI * 2);
        creatureCtx.fill();
        creatureCtx.fillStyle = currentCreature.magic === 'DARK' ? '#ff0000' : '#fff';
        creatureCtx.fillRect(18, 12, 5, 5);
        creatureCtx.fillRect(28, 12, 5, 5);
    }

    document.getElementById('creatureMagic').textContent = magic.icon;
}

function gameOver() {
    game.gameStarted = false;
    if (game.floor > game.bestFloor) game.bestFloor = game.floor;

    document.getElementById('gameoverFloor').textContent = `Reached Floor ${game.floor}`;
    document.getElementById('gameoverKills').textContent = game.runKills;
    document.getElementById('gameoverGold').textContent = formatNum(game.runGold);
    document.getElementById('gameoverCombo').textContent = game.maxCombo;
    document.getElementById('gameoverPopup').style.display = 'flex';

    playSound(150, 'sawtooth', 0.3);
    saveGame();
}

function restartGame() {
    // Stop any running battle interval first
    const currentInterval = getBattleInterval();
    if (currentInterval) {
        clearInterval(currentInterval);
        setBattleInterval(null);
    }

    // Stop shield minigame timer if running
    if (shieldGame.timerInterval) {
        clearInterval(shieldGame.timerInterval);
    }

    // Reset all game state - equivalent to a fresh page load
    game.gold = 0;
    game.gems = 0;
    game.level = 1;
    game.floor = 1;
    game.exp = 0;
    game.expToLevel = 100;
    game.currentHp = 100;
    game.maxHp = 100;
    game.bestFloor = 0;
    game.totalKills = 0;
    game.totalGoldEarned = 0;
    game.discoveredCreatures = [];
    game.equipment = { wand: null, robe: null, amulet: null, book: null, relic: null };
    game.owned = [];
    game.skillPoints = 0;
    game.unlockedSkills = [];
    game.combo = 0;
    game.maxCombo = 0;
    game.spellCooldowns = {};
    game.poisonStacks = 0;
    game.fearDebuff = false;
    game.felixUsed = false;
    game.runKills = 0;
    game.runGold = 0;
    game.houseChosen = false;
    game.house = null;
    game.gameStarted = false;
    game.inBattle = false;
    game.selectingBuff = false;
    game.roomSeed = 0;
    game.lastGoldGain = 0;
    game.combatBuffs = [];
    game.combatDebuffs = [];
    game.unlockedSpells = [];
    game.activeBuffs = [];
    game.buffStats = { atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0, goldBonus: 0, xpBonus: 0, lifesteal: 0, regenFlat: 0, dodge: 0, thorns: 0, executeDmg: 0, spellPower: 0, deathSaves: 0, doubleAttack: false };
    // Reset tutorial flags so tutorials show again on new game
    game.spellTutorialDone = false;
    game.shieldTutorialDone = false;

    // Reset all battle state
    setCurrentCreature(null);
    setCreatureHp(0);
    setCreatureBuffs({});
    setTurnCount(0);

    // Reset shield minigame state completely
    setShieldGame({
        active: false,
        currentColor: null,
        timeLeft: 0,
        timerInterval: null,
        isTutorial: false,
        bossSpellQueue: [],
        spellsBlocked: 0,
        spellsMissed: 0,
        tutorialShown: false
    });

    // Hide all popups and overlays
    document.getElementById('gameoverPopup').style.display = 'none';
    document.getElementById('buffSelectionPanel').style.display = 'none';
    document.getElementById('shieldMinigame').classList.remove('active');
    document.getElementById('shieldTutorialOverlay').style.display = 'none';
    document.getElementById('spellTutorialOverlay').style.display = 'none';
    document.getElementById('roomTransition').classList.remove('active');

    // Clear battle log
    if (battleLog) {
        battleLog.innerHTML = '';
    }

    renderActiveBuffs();
    updateUI();

    // Clear saved game so it starts fresh
    localStorage.removeItem('wizardDuels');

    showHouseSelection();
}

function showHouseSelection() {
    document.getElementById('houseSelectPopup').style.display = 'flex';
}

function updateHouseDisplay() {
    const houseIcons = {
        gryffindor: '🦁',
        slytherin: '🐍',
        ravenclaw: '🦅',
        hufflepuff: '🦡'
    };
    const houseNames = {
        gryffindor: 'Gryffindor',
        slytherin: 'Slytherin',
        ravenclaw: 'Ravenclaw',
        hufflepuff: 'Hufflepuff'
    };
    if (game.house) {
        document.getElementById('currentHouseIcon').textContent = houseIcons[game.house];
        document.getElementById('currentHouseName').textContent = houseNames[game.house];
    }
}

function selectHouse(house) {
    game.house = house;
    game.houseChosen = true;
    game.runKills = 0;
    game.runGold = 0;
    game.roomSeed = Math.floor(Math.random() * 10000);
    game.activeBuffs = [];
    game.buffStats = { atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0, goldBonus: 0, xpBonus: 0, lifesteal: 0, regenFlat: 0, dodge: 0, thorns: 0, executeDmg: 0, spellPower: 0, deathSaves: 0, doubleAttack: false };

    const relicMap = {
        gryffindor: 'gryffindor_sword',
        slytherin: 'slytherin_locket',
        ravenclaw: 'ravenclaw_diadem',
        hufflepuff: 'hufflepuff_cup'
    };
    const relicId = relicMap[house];
    game.owned.push(relicId);
    game.equipment.relic = relicId;

    const spellMap = {
        gryffindor: 'expelliarmus',
        slytherin: 'serpensortia',
        ravenclaw: 'lumos',
        hufflepuff: 'herbivicus'
    };
    game.unlockedSpells = [spellMap[house]];

    updateHouseDisplay();

    document.getElementById('houseSelectPopup').style.display = 'none';

    const stats = getStats();
    game.currentHp = stats.hp;
    game.maxHp = stats.hp;

    generateRoom();
    drawWizard();
    renderShop();
    renderSkillTree(addLog);
    renderBestiary();
    renderActiveBuffs();
    renderSpellBar(castSpell);
    updateUI();
    spawnCreature();
    saveGame();

    addLog(`Welcome to ${house.charAt(0).toUpperCase() + house.slice(1)}!`, 'log-levelup');

    if (!game.spellTutorialDone) {
        showSpellTutorial();
    } else {
        game.gameStarted = true;
        game.inBattle = true;
        startBattle();
    }
}

function showOffline(rewards) {
    document.getElementById('offlineGold').textContent = `+${formatNum(rewards.gold)} Galleons`;
    document.getElementById('offlinePopup').style.display = 'flex';
    document.getElementById('offlineClaimBtn').onclick = () => {
        game.gold += rewards.gold;
        game.totalGoldEarned += rewards.gold;
        document.getElementById('offlinePopup').style.display = 'none';
        updateUI();
        saveGame();
    };
}

// ============ SPELL TUTORIAL ============

function showSpellTutorial() {
    if (game.spellTutorialDone) return;

    setSpellTutorialPage(1);
    updateSpellTutorialPages();
    document.getElementById('spellTutorialOverlay').style.display = 'flex';
    playSound(600, 'sine', 0.2);
}

function nextSpellTutorialPage() {
    setSpellTutorialPage(spellTutorialPage + 1);
    updateSpellTutorialPages();
    playSound(500, 'sine', 0.1);
}

function updateSpellTutorialPages() {
    for (let i = 1; i <= 3; i++) {
        const page = document.getElementById(`spellTutorialPage${i}`);
        if (page) {
            page.classList.toggle('active', i === spellTutorialPage);
        }
    }
}

function finishSpellTutorial() {
    game.spellTutorialDone = true;
    document.getElementById('spellTutorialOverlay').style.display = 'none';
    playSound(800, 'sine', 0.2);
    saveGame();

    game.gameStarted = true;
    game.inBattle = true;
    startBattle();
    addLog('Your adventure begins!', 'log-levelup');
}

// ============ INITIALIZATION ============

function init() {
    // Clear saved game on page load - always start fresh
    localStorage.removeItem('wizardDuels');

    initUI();

    // Setup tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'spellbook') renderSpellbook();
            if (tab.dataset.tab === 'skills') renderSkillTree(addLog);
            if (tab.dataset.tab === 'shop') renderShop();
            if (tab.dataset.tab === 'bestiary') renderBestiary();
        });
    });

    // House selection
    document.querySelectorAll('.house-option').forEach(opt => {
        opt.addEventListener('click', () => selectHouse(opt.dataset.house));
    });

    // Game over retry button
    document.getElementById('gameoverRetryBtn').addEventListener('click', restartGame);

    // Start game
    if (!game.houseChosen || !game.gameStarted) {
        showHouseSelection();
    } else {
        const offline = calculateOffline();
        if (offline) showOffline(offline);

        game.inBattle = true;
        updateHouseDisplay();
        generateRoom();
        updateUI();
        renderShop();
        renderSkillTree(addLog);
        renderBestiary();
        renderActiveBuffs();
        drawWizard();
        spawnCreature();
        startBattle();
    }

    // Cooldown timer
    setInterval(() => {
        if (game.selectingBuff) return;
        for (const id in game.spellCooldowns) {
            if (game.spellCooldowns[id] > 0) game.spellCooldowns[id]--;
        }
        renderSpellBar(castSpell);
    }, 1000);

    setInterval(saveGame, 10000);
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
