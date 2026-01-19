// Game state and utility functions
// Extracted from index.html

import { MAGIC_TYPES, SKILL_TREES, SHOP_ITEMS } from './data.js';

// Audio context for sound effects
let audioCtx = null;

// Game state
export let game = {
    gold: 0, gems: 0, level: 1, floor: 1, exp: 0, expToLevel: 100,
    baseAtk: 10, baseDef: 5, baseHp: 100, baseCrit: 5,
    currentHp: 100, maxHp: 100,
    equipment: { wand: null, robe: null, amulet: null, book: null, relic: null },
    owned: [], soulGems: 0, prestigeCount: 0,
    skillPoints: 0, unlockedSkills: [],
    house: null, houseChosen: false, gameStarted: false,
    combo: 0, maxCombo: 0,
    spellCooldowns: {}, poisonStacks: 0, fearDebuff: false,
    unlockedSpells: ['stupefy'],
    // Combat buffs/debuffs (reset each fight)
    combatBuffs: [], // player buffs: { type, value, turns }
    combatDebuffs: [], // enemy debuffs: { type, value, turns }
    selectingBuff: false, // freeze cooldowns while selecting
    discoveredCreatures: [], totalKills: 0, totalGoldEarned: 0,
    lastOnline: Date.now(), felixUsed: false,
    runKills: 0, runGold: 0, bestFloor: 0,
    inBattle: false, roomSeed: 0, lastGoldGain: 0,
    // Roguelike buffs for current run
    activeBuffs: [],
    buffStats: { atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0, goldBonus: 0, xpBonus: 0, lifesteal: 0, regenFlat: 0, dodge: 0, thorns: 0, executeDmg: 0, spellPower: 0, deathSaves: 0, doubleAttack: false },
    // Tutorials completed
    spellTutorialDone: false,
    shieldTutorialDone: false
};

// Global variables for battle state
export let currentCreature = null;
export let creatureHp = 0;
export let creatureBuffs = {};
export let turnCount = 0;

// Boss shield minigame state
export let shieldGame = {
    active: false,
    currentColor: null,
    timeLeft: 0,
    timerInterval: null,
    isTutorial: false,
    bossSpellQueue: [],
    spellsBlocked: 0,
    spellsMissed: 0
};

export let battleInterval = null;

// Spell tutorial page tracker
export let spellTutorialPage = 1;

// Setters for mutable exports
export function setCurrentCreature(value) { currentCreature = value; }
export function setCreatureHp(value) { creatureHp = value; }
export function setCreatureBuffs(value) { creatureBuffs = value; }
export function setTurnCount(value) { turnCount = value; }
export function setShieldGame(value) { shieldGame = value; }
export function setBattleInterval(value) { battleInterval = value; }
export function setSpellTutorialPage(value) { spellTutorialPage = value; }

// ============ UTILITY FUNCTIONS ============

export function playSound(freq, type = 'sine', duration = 0.1) {
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

export function formatNum(n) {
    if (n >= 1000000) return (n/1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n/1000).toFixed(1) + 'K';
    return Math.floor(n);
}

export function saveGame() {
    game.lastOnline = Date.now();
    localStorage.setItem('wizardDuels', JSON.stringify(game));
}

export function getSkillEffect(name) {
    for (const tree of Object.values(SKILL_TREES)) {
        for (const skill of tree.skills) {
            if (game.unlockedSkills.includes(skill.id) && skill.effect[name]) {
                return skill.effect[name];
            }
        }
    }
    return null;
}

export function hasSkill(name) {
    return getSkillEffect(name) !== null;
}

export function getStats() {
    const bs = game.buffStats;
    let atk = game.baseAtk + (game.level - 1) * 2;
    let def = game.baseDef + (game.level - 1);
    let hp = game.baseHp + (game.level - 1) * 10;
    let crit = game.baseCrit;
    let wandMagic = 'NONE';
    let xpBonus = 0;

    for (const type in game.equipment) {
        const id = game.equipment[type];
        if (id) {
            const item = SHOP_ITEMS.find(i => i.id === id);
            if (item) {
                atk += item.atk || 0;
                def += item.def || 0;
                hp += item.hp || 0;
                crit += item.crit || 0;
                if (item.magic && (type === 'wand' || type === 'relic')) wandMagic = item.magic;
                if (item.xpBonus) xpBonus += item.xpBonus;
            }
        }
    }

    // Buff stats from roguelike rewards
    atk += bs.atk;
    def += bs.def;
    hp += bs.hp;
    crit += bs.crit;
    xpBonus += bs.xpBonus;

    // Skill bonuses
    const hpBonus = getSkillEffect('hpBonus');
    if (hpBonus) hp *= (1 + hpBonus);
    const defBonus = getSkillEffect('defBonus');
    if (defBonus) def *= (1 + defBonus);
    const critBonus = getSkillEffect('crit');
    if (critBonus) crit += critBonus;
    const dmgReduce = getSkillEffect('damageReduce');

    // House bonuses
    if (game.house === 'gryffindor') { atk *= 1.2; def *= 0.9; }
    else if (game.house === 'slytherin') { atk *= 1.1; crit += 5; }
    else if (game.house === 'ravenclaw') { crit += 8; xpBonus += 0.2; }
    else if (game.house === 'hufflepuff') { hp *= 1.15; def *= 1.1; }

    // Fear debuff
    if (game.fearDebuff && !hasSkill('fearImmune')) atk *= 0.7;

    return {
        atk: Math.floor(atk), def: Math.floor(def), hp: Math.floor(hp), crit, wandMagic,
        dmgReduce: dmgReduce || 0, xpBonus,
        // Buff special stats
        critDmg: 1 + bs.critDmg,
        goldBonus: bs.goldBonus,
        lifesteal: bs.lifesteal,
        regenFlat: bs.regenFlat,
        dodge: bs.dodge,
        thorns: bs.thorns,
        executeDmg: bs.executeDmg,
        spellPower: bs.spellPower,
        deathSaves: bs.deathSaves,
        doubleAttack: bs.doubleAttack
    };
}

export function getMagicMultiplier(attackMagic, defenderMagic) {
    const att = MAGIC_TYPES[attackMagic];
    const def = MAGIC_TYPES[defenderMagic];
    if (!att || !def) return 1;
    if (att.beats === defenderMagic) return 1.5;
    if (att.weakTo === defenderMagic) return 0.6;
    return 1;
}

export function calculateOffline() {
    const elapsed = Math.floor((Date.now() - game.lastOnline) / 1000);
    const seconds = Math.min(elapsed, 8 * 60 * 60);
    if (seconds < 60) return null;
    return { gold: Math.floor(seconds * 0.3 * (5 + game.floor * 2)) };
}
