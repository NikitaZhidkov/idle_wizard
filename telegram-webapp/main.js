// Main entry point - Single canvas game with unified renderer
// All UI is rendered on canvas, no DOM elements for game display

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
    calculateOffline,
    isShieldGameActive
} from './game.js';

import {
    initCanvasRenderer,
    updateGameState,
    addLogEntry,
    clearBattleLog,
    showFloatingText,
    createParticles,
    setCallbacks,
    getCanvas,
    getGameState
} from './canvas-renderer.js?v=7';

import {
    initBattleSystem,
    addLog,
    spawnCreature,
    checkCreatureDeath,
    battle,
    startBattle,
    generateRoom
} from './battle-system.js';

import { initSpellSystem, castSpell } from './spell-system.js';

import { initShieldMinigame } from './shield-minigame.js';

// Export game state for testing
window.game = game;
// Use getter to always get current shieldGame reference
Object.defineProperty(window.game, 'shieldGame', {
    get: function() { return shieldGame; }
});
window.getCurrentCreature = getCurrentCreature;
window.getCreatureHp = getCreatureHp;

// Creature sprite mapping
const CREATURE_SPRITES = {
    'Pixie': 0, 'Doxy': 1, 'Grindylow': 2, 'Red Cap': 3, 'Boggart': 4,
    'Hippogriff': 5, 'Acromantula': 6, 'Dementor': 7, 'Werewolf': 8, 'Hungarian Horntail': 9,
    'Basilisk': 10, 'Mountain Troll': 11, 'Death Eater': 12, 'Nagini': 13, 'Voldemort': 14
};

// House icons
const HOUSE_ICONS = {
    gryffindor: '🦁',
    slytherin: '🐍',
    ravenclaw: '🦅',
    hufflepuff: '🦡'
};

// ============ UI FUNCTIONS ============

function initUI() {
    const gameContainer = document.querySelector('.game-container');

    // Initialize canvas renderer - this creates the single game canvas
    initCanvasRenderer(gameContainer);

    // Set up all callbacks for user interactions
    setCallbacks({
        onTabClick: handleTabClick,
        onSpellClick: handleSpellClick,
        onHouseSelect: selectHouse,
        onBuffSelect: selectBuff,
        onRetryClick: restartGame,
        onVictoryClick: restartGame,
        onShieldButtonClick: handleShieldPress,
        onTutorialNext: handleTutorialNext,
        onTutorialFinish: finishSpellTutorial,
        onShieldTutorialStart: startShieldFromTutorial,
        onRoomContinue: continueToNextRoom
    });

    // Initialize battle system with callbacks
    initBattleSystem({
        battleLog: null, // No longer using DOM
        heroCanvas: null,
        creatureCanvas: null,
        updateUI,
        gameOver,
        showRoomTransition,
        showVictory,
        drawCreature: updateUI, // Just update UI, canvas handles drawing
        renderCreatureStatus: updateUI,
        renderBattleCreatureCard: updateUI
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
        beginMinigame: beginShieldMinigame,
        startBattle
    });
}

function handleTabClick(tabId) {
    // Canvas handles tab rendering, just update state
    updateGameState({ activeTab: tabId });
}

function handleSpellClick(spellData) {
    // Find the original spell and cast it
    const spell = SPELLS.find(s => s.id === spellData.id);
    if (spell) {
        castSpell(spell);
    }
}

function handleTutorialNext(page) {
    updateGameState({ spellTutorialPage: page });
    playSound(500, 'sine', 0.1);
}

function updateUI() {
    const stats = getStats();
    game.maxHp = stats.hp;
    if (game.currentHp > stats.hp) game.currentHp = stats.hp;

    const currentCreature = getCurrentCreature();
    const creatureHp = getCreatureHp();

    // Build spells array for rendering
    const shieldActive = isShieldGameActive();
    const spells = SPELLS
        .filter(spell => game.unlockedSpells.includes(spell.id))
        .map(spell => {
            const cd = game.spellCooldowns[spell.id] || 0;
            return {
                id: spell.id,
                icon: spell.icon,
                magicIcon: MAGIC_TYPES[spell.magic].icon,
                cooldown: cd,
                isReady: cd <= 0 && !shieldActive,
                isBlocked: shieldActive
            };
        });

    // Build active buffs array
    const buffCounts = {};
    game.activeBuffs.forEach(b => {
        if (!buffCounts[b.id]) buffCounts[b.id] = { ...b, count: 0 };
        buffCounts[b.id].count++;
    });
    const activeBuffs = Object.values(buffCounts).map(buff => ({
        icon: buff.icon,
        name: buff.name,
        count: buff.count
    }));

    // Build creature abilities
    let creatureAbilities = [];
    let creatureHasShield = false;
    if (currentCreature) {
        creatureAbilities = currentCreature.abilities
            .map(ab => ABILITIES[ab])
            .filter(ability => ability)
            .map(ability => ({ icon: ability.icon, name: ability.name }));

        const creatureBuffs = game.creatureBuffs || {};
        creatureHasShield = !!creatureBuffs.shield;
    }

    // Get creature sprite index
    let creatureType = 0;
    if (currentCreature) {
        creatureType = CREATURE_SPRITES[currentCreature.name] || 0;
    }

    // Update all game state at once
    updateGameState({
        // Header
        gold: game.gold,
        gems: game.gems,
        skillPoints: game.skillPoints,
        level: game.level,
        floor: game.floor,

        // Battle area
        floorDisplay: game.floor % 5 === 0 && currentCreature?.boss ? '⚠️ BOSS!' : '',
        comboDisplay: game.combo > 1 ? `${game.combo}x Combo!` : '',
        isBoss: currentCreature?.boss || false,

        // Hero
        heroHp: game.currentHp,
        heroMaxHp: stats.hp,
        heroName: 'Wizard',
        houseIcon: game.house ? HOUSE_ICONS[game.house] : '🧙',

        // Creature
        creatureName: currentCreature?.name || '',
        creatureHp: creatureHp,
        creatureMaxHp: currentCreature?.maxHp || 100,
        creatureType: creatureType,
        creatureAbilities: creatureAbilities,
        creatureHasShield: creatureHasShield,

        // Buffs
        activeBuffs: activeBuffs,

        // Spells
        spells: spells,
        shieldMinigameActive: shieldActive,

        // Stats
        atk: stats.atk,
        def: stats.def,
        crit: stats.crit,
        hp: stats.hp
    });
}

function showRoomTransition(goldGain) {
    game.inBattle = false;
    game.lastGoldGain = goldGain;
    game.selectingBuff = true;

    // Generate buff choices
    const buffChoices = generateBuffChoices();

    updateGameState({
        showRoomTransition: false, // Don't show room transition, go straight to buff select
        showBuffSelect: true,
        buffChoices: buffChoices,
        roomTransitionData: {
            loot: goldGain,
            nextRoom: game.floor
        }
    });

    playSound(600, 'sine', 0.15);
}

function generateBuffChoices() {
    // Simplified buff choices - in real game this would be more complex
    const allBuffs = [
        { id: 'atk', name: '+5 Attack', icon: '⚔️', desc: 'Increases attack damage', effect: { atk: 5 } },
        { id: 'def', name: '+3 Defense', icon: '🛡️', desc: 'Reduces damage taken', effect: { def: 3 } },
        { id: 'hp', name: '+20 HP', icon: '❤️', desc: 'Increases max health', effect: { hp: 20 } },
        { id: 'crit', name: '+3% Crit', icon: '⚡', desc: 'Critical hit chance', effect: { crit: 3 } },
        { id: 'heal', name: 'Heal 30%', icon: '💚', desc: 'Restore health', effect: { healNow: Math.floor(game.maxHp * 0.3) } },
        { id: 'gold', name: '+50 Gold', icon: '💰', desc: 'Instant gold', effect: { goldNow: 50 } },
        { id: 'lifesteal', name: 'Lifesteal', icon: '🧛', desc: 'Heal on hit', effect: { lifesteal: 0.05 } },
        { id: 'dodge', name: '+5% Dodge', icon: '💨', desc: 'Chance to avoid damage', effect: { dodge: 5 } }
    ];

    // Pick 3 random buffs
    const shuffled = allBuffs.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

function selectBuff(buff, index) {
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
        }
    }

    if (effect.hp) {
        const stats = getStats();
        game.maxHp = stats.hp;
        game.currentHp = Math.min(game.currentHp + effect.hp, stats.hp);
    }

    playSound(800, 'sine', 0.2);
    addLog(`Gained: ${buff.name}!`, 'log-levelup');

    updateUI();
    saveGame();

    // Hide buff selection and continue
    updateGameState({ showBuffSelect: false });
    continueToNextRoom();
}

function continueToNextRoom() {
    updateGameState({
        showRoomTransition: false,
        showBuffSelect: false
    });

    game.selectingBuff = false;

    generateRoom();
    game.inBattle = true;

    spawnCreature();

    // Ensure battle continues
    const currentInterval = getBattleInterval();
    if (!currentInterval) {
        startBattle();
    }

    updateUI();
}

function gameOver() {
    game.gameStarted = false;
    if (game.floor > game.bestFloor) game.bestFloor = game.floor;

    updateGameState({
        showGameOver: true,
        gameOverData: {
            floor: game.floor,
            kills: game.runKills,
            gold: game.runGold,
            combo: game.maxCombo
        }
    });

    playSound(150, 'sawtooth', 0.3);
    saveGame();
}

function showVictory() {
    game.gameStarted = false;
    if (game.floor > game.bestFloor) game.bestFloor = game.floor;

    updateGameState({
        showVictory: true,
        victoryData: {
            kills: game.runKills,
            gold: game.runGold,
            combo: game.maxCombo
        }
    });

    // Victory sound - triumphant tone
    playSound(800, 'sine', 0.3);
    setTimeout(() => playSound(1000, 'sine', 0.3), 150);
    setTimeout(() => playSound(1200, 'sine', 0.3), 300);
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

    // Reset all game state
    game.gold = 0;
    game.gems = 0;
    game.level = 1;
    game.floor = 1;
    game.encounterIndex = 0;
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
    game.spellTutorialDone = false;
    game.shieldTutorialDone = false;

    // Reset all battle state
    setCurrentCreature(null);
    setCreatureHp(0);
    setCreatureBuffs({});
    setTurnCount(0);

    // Reset shield minigame state
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

    // Hide all popups
    updateGameState({
        showGameOver: false,
        showVictory: false,
        showBuffSelect: false,
        showShieldMinigame: false,
        showShieldTutorial: false,
        showSpellTutorial: false,
        showRoomTransition: false
    });

    // Clear battle log
    clearBattleLog();

    updateUI();

    // Clear saved game
    localStorage.removeItem('wizardDuels');

    showHouseSelection();
}

function showHouseSelection() {
    updateGameState({ showHouseSelect: true });
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

    // Hide house selection
    updateGameState({ showHouseSelect: false });

    const stats = getStats();
    game.currentHp = stats.hp;
    game.maxHp = stats.hp;

    generateRoom();
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

// ============ SPELL TUTORIAL ============

function showSpellTutorial() {
    if (game.spellTutorialDone) return;

    setSpellTutorialPage(1);
    updateGameState({
        showSpellTutorial: true,
        spellTutorialPage: 1
    });
    playSound(600, 'sine', 0.2);
}

function finishSpellTutorial() {
    game.spellTutorialDone = true;
    updateGameState({ showSpellTutorial: false });
    playSound(800, 'sine', 0.2);
    saveGame();

    game.gameStarted = true;
    game.inBattle = true;
    startBattle();
    addLog('Your adventure begins!', 'log-levelup');
}

// ============ SHIELD MINIGAME ============

function handleShieldPress(color) {
    // This is called from canvas click - forward to the minigame module
    if (!shieldGame.active || !shieldGame.currentColor) return;

    clearInterval(shieldGame.timerInterval);

    if (color === shieldGame.currentColor) {
        shieldSuccess();
    } else {
        shieldMiss();
    }
}

function shieldSuccess() {
    shieldGame.spellsBlocked++;

    updateGameState({
        shieldResult: '✓ Blocked!',
        shieldSpells: []
    });

    playSound(800, 'sine', 0.15);
    addLog('🛡️ Spell blocked!', 'log-effective');

    const pauseTime = shieldGame.isTutorial ? 1200 : 600;
    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, pauseTime);
}

function shieldMiss() {
    shieldGame.spellsMissed++;

    updateGameState({
        shieldResult: '✗ Hit!'
    });

    const currentCreature = getCurrentCreature();
    const stats = getStats();
    const damageMultiplier = shieldGame.isTutorial ? 0.3 : 0.5;
    const damage = Math.floor(currentCreature.atk * damageMultiplier);
    game.currentHp -= damage;

    showFloatingText(`-${damage}`, 60, 200, 'damage');
    addLog(`💥 Hit by spell! -${damage} HP`, 'log-damage');
    playSound(200, 'sawtooth', 0.2);

    updateUI();

    if (game.currentHp <= 0) {
        endShieldMinigame();
        gameOver();
        return;
    }

    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, 600);
}

function startShieldFromTutorial() {
    shieldGame.tutorialShown = true;
    game.shieldTutorialDone = true;
    updateGameState({ showShieldTutorial: false });
    beginShieldMinigame();
}

function beginShieldMinigame() {
    updateGameState({
        showShieldMinigame: true,
        shieldTimer: 100,
        shieldResult: '',
        shieldHighlightColor: null
    });

    addLog('🛡️ Boss casting spells! Block them!', 'log-boss');
    playSound(400, 'sine', 0.2);
    updateUI();

    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, shieldGame.isTutorial ? 1000 : 500);
}

function sendNextBossSpell() {
    if (shieldGame.bossSpellQueue.length === 0) {
        endShieldMinigame();
        return;
    }

    const color = shieldGame.bossSpellQueue.shift();
    shieldGame.currentColor = color;

    const baseTime = shieldGame.isTutorial ? 4000 : 1500;
    const speedBonus = shieldGame.isTutorial ? 0 : Math.min((game.floor / 5 - 1) * 100, 600);
    shieldGame.timeLeft = baseTime - speedBonus;

    // Update canvas state with flying spell
    updateGameState({
        shieldSpells: [{ color, x: 200, y: 100, flying: true }],
        shieldHighlightColor: shieldGame.isTutorial ? color : null,
        shieldTimer: 100,
        shieldResult: ''
    });

    // Start timer
    const maxTime = shieldGame.timeLeft;
    shieldGame.timerInterval = setInterval(() => {
        shieldGame.timeLeft -= 100;
        const percent = (shieldGame.timeLeft / maxTime) * 100;
        updateGameState({ shieldTimer: percent });

        if (shieldGame.timeLeft <= 0) {
            clearInterval(shieldGame.timerInterval);
            shieldMiss();
        }
    }, 100);

    playSound(600 + (color === 'red' ? 0 : color === 'blue' ? 100 : color === 'yellow' ? 200 : 300), 'sine', 0.15);
}

function endShieldMinigame() {
    const currentCreature = getCurrentCreature();
    shieldGame.active = false;
    shieldGame.currentColor = null;
    clearInterval(shieldGame.timerInterval);

    updateGameState({
        showShieldMinigame: false,
        shieldHighlightColor: null
    });

    const blocked = shieldGame.spellsBlocked;
    const total = blocked + shieldGame.spellsMissed;

    if (blocked === total && total > 0) {
        addLog(`🎉 Perfect defense! All ${total} spells blocked!`, 'log-effective');
        const bonusDmg = Math.floor(currentCreature.maxHp * 0.1);
        setCreatureHp(getCreatureHp() - bonusDmg);
        showFloatingText(`PERFECT! -${bonusDmg}`, 220, 150, 'effective');
        playSound(1000, 'sine', 0.2);
    } else if (blocked > 0) {
        addLog(`🛡️ Blocked ${blocked}/${total} spells`, 'log-spell');
    } else {
        addLog(`💥 Failed to block any spells!`, 'log-damage');
    }

    updateUI();

    if (game.currentHp > 0 && getCreatureHp() > 0) {
        addLog('⚔️ Resume battle!', 'log-boss');
        game.gameStarted = true;
        game.inBattle = true;
        startBattle();
    }
}

// ============ INITIALIZATION ============

function init() {
    // Clear saved game on page load - always start fresh
    localStorage.removeItem('wizardDuels');

    initUI();

    // Start game
    if (!game.houseChosen || !game.gameStarted) {
        showHouseSelection();
    } else {
        const offline = calculateOffline();
        if (offline) {
            // For canvas-only, we'd show offline popup on canvas
            // For now, just add the gold
            game.gold += offline.gold;
            game.totalGoldEarned += offline.gold;
        }

        game.inBattle = true;
        generateRoom();
        updateUI();
        spawnCreature();
        startBattle();
    }

    // Cooldown timer
    setInterval(() => {
        if (game.selectingBuff) return;
        for (const id in game.spellCooldowns) {
            if (game.spellCooldowns[id] > 0) game.spellCooldowns[id]--;
        }
        updateUI();
    }, 1000);

    setInterval(saveGame, 10000);
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
