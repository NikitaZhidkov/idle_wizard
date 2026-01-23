/**
 * ENTITIES MODULE (Model / World)
 * ================================
 * What it IS: the "world database"
 * What it CONTAINS:
 *   - Entity registry (id -> data)
 *   - Entity state (position, velocity, HP, status flags, timers, targets/owners)
 *   - Entity type/archetype
 *   - Visual identifier (spriteId/animId) - reference only
 *   - Config tables
 * What it MUST NOT contain:
 *   - Any Canvas/WebGL calls
 *   - Any rendering logic
 *   - Any "when/why" gameplay rules
 */

// ============ CONFIG TABLES ============

export const CONFIG = {
    // Game balance (tuned for easy first playthrough)
    BASE_ATK: 15,
    BASE_DEF: 8,
    BASE_HP: 150,
    BASE_CRIT: 10,
    ATK_PER_LEVEL: 3,
    DEF_PER_LEVEL: 2,
    HP_PER_LEVEL: 20,
    EXP_BASE: 50,
    EXP_MULTIPLIER: 1.15,

    // Battle timing
    BATTLE_TICK_MS: 900,
    SHIELD_BASE_TIME_MS: 2000,
    SHIELD_TUTORIAL_TIME_MS: 4000,

    // Rewards
    HEAL_AFTER_KILL_PERCENT: 0.35,

    // Sprite sheet
    SPRITE_COLS: 4,
    SPRITE_SIZE: 120,
    SPRITE_BORDER: 3,
    SPRITE_STRIDE: 123
};

export const MAGIC_TYPES = {
    CHARMS: { name: 'Charms', icon: '✨', color: '#ffd700', beats: 'CREATURES', weakTo: 'DARK' },
    DARK: { name: 'Dark Arts', icon: '💀', color: '#4a0080', beats: 'CHARMS', weakTo: 'DEFENSE' },
    DEFENSE: { name: 'Defense', icon: '🛡️', color: '#4169e1', beats: 'DARK', weakTo: 'CREATURES' },
    CREATURES: { name: 'Creatures', icon: '🐉', color: '#228b22', beats: 'DEFENSE', weakTo: 'CHARMS' },
    TRANSFIG: { name: 'Transfig', icon: '🔄', color: '#9932cc', beats: null, weakTo: null },
    NONE: { name: 'Basic', icon: '⚪', color: '#888', beats: null, weakTo: null }
};

export const ABILITIES = {
    REGEN: { id: 'REGEN', name: 'Regeneration', icon: '💚', desc: 'Heals each turn' },
    SHIELD: { id: 'SHIELD', name: 'Protego', icon: '🛡️', desc: 'Blocks damage' },
    RAGE: { id: 'RAGE', name: 'Enraged', icon: '😤', desc: 'Stronger when hurt' },
    POISON: { id: 'POISON', name: 'Venomous', icon: '☠️', desc: 'Poisons you' },
    DODGE: { id: 'DODGE', name: 'Evasive', icon: '💨', desc: 'Dodges attacks' },
    REFLECT: { id: 'REFLECT', name: 'Reflect', icon: '🪞', desc: 'Returns damage' },
    DISARM: { id: 'DISARM', name: 'Expelliarmus', icon: '🪄', desc: 'Can disarm you' },
    FEAR: { id: 'FEAR', name: 'Terrifying', icon: '😱', desc: 'Reduces your damage' }
};

export const CREATURE_TEMPLATES = [
    { id: 'pixie', name: 'Cornish Pixie', icon: '🧚', magic: 'CREATURES', hp: 25, atk: 2, gold: 5, abilities: [], spriteIndex: 0 },
    { id: 'doxy', name: 'Doxy', icon: '🪰', magic: 'CREATURES', hp: 30, atk: 3, gold: 8, abilities: ['POISON'], spriteIndex: 1 },
    { id: 'grindylow', name: 'Grindylow', icon: '🐙', magic: 'CREATURES', hp: 40, atk: 4, gold: 12, abilities: [], spriteIndex: 2 },
    { id: 'redcap', name: 'Red Cap', icon: '👹', magic: 'DARK', hp: 50, atk: 5, gold: 15, abilities: ['RAGE'], spriteIndex: 3 },
    { id: 'boggart', name: 'Boggart', icon: '👻', magic: 'DARK', hp: 55, atk: 5, gold: 18, abilities: ['FEAR'], spriteIndex: 4 },
    { id: 'hippogriff', name: 'Hippogriff', icon: '🦅', magic: 'CREATURES', hp: 70, atk: 7, gold: 30, abilities: ['DODGE'], spriteIndex: 5 },
    { id: 'acromantula', name: 'Acromantula', icon: '🕷️', magic: 'CREATURES', hp: 85, atk: 9, gold: 40, abilities: ['POISON', 'RAGE'], spriteIndex: 6 },
    { id: 'dementor', name: 'Dementor', icon: '👤', magic: 'DARK', hp: 100, atk: 11, gold: 60, abilities: ['FEAR', 'REGEN'], spriteIndex: 7 },
    { id: 'werewolf', name: 'Werewolf', icon: '🐺', magic: 'CREATURES', hp: 120, atk: 13, gold: 80, abilities: ['RAGE', 'REGEN'], spriteIndex: 8 },
    { id: 'horntail', name: 'Hungarian Horntail', icon: '🐉', magic: 'CREATURES', hp: 150, atk: 16, gold: 120, abilities: ['SHIELD', 'RAGE'], spriteIndex: 9 },
    { id: 'basilisk', name: 'Basilisk', icon: '🐍', magic: 'DARK', hp: 180, atk: 18, gold: 150, abilities: ['POISON', 'FEAR', 'REFLECT'], spriteIndex: 10 }
];

export const BOSS_TEMPLATES = [
    { id: 'troll', name: 'Troll', icon: '🧌', magic: 'CREATURES', hp: 100, atk: 8, gold: 200, abilities: ['RAGE'], boss: true, spriteIndex: 11 },
    { id: 'deatheater', name: 'Death Eater', icon: '💀', magic: 'DARK', hp: 140, atk: 10, gold: 300, abilities: ['SHIELD'], boss: true, spriteIndex: 12 },
    { id: 'nagini', name: 'Nagini', icon: '🐍', magic: 'DARK', hp: 180, atk: 12, gold: 400, abilities: ['POISON', 'REGEN'], boss: true, spriteIndex: 13 },
    { id: 'voldemort', name: 'Voldemort', icon: '🐍💀', magic: 'DARK', hp: 250, atk: 15, gold: 600, abilities: ['FEAR', 'RAGE'], boss: true, spriteIndex: 14 }
];

// Fixed encounter order: 3 creatures -> boss, repeat
export const ENCOUNTER_ORDER = [
    { type: 'creature', index: 0 },  // Pixie
    { type: 'creature', index: 1 },  // Doxy
    { type: 'creature', index: 2 },  // Grindylow
    { type: 'boss', index: 0 },      // Troll
    { type: 'creature', index: 3 },  // Red Cap
    { type: 'creature', index: 4 },  // Boggart
    { type: 'creature', index: 5 },  // Hippogriff
    { type: 'boss', index: 1 },      // Death Eater
    { type: 'creature', index: 6 },  // Acromantula
    { type: 'creature', index: 7 },  // Dementor
    { type: 'creature', index: 8 },  // Werewolf
    { type: 'boss', index: 2 },      // Nagini
    { type: 'creature', index: 9 },  // Horntail
    { type: 'creature', index: 10 }, // Basilisk
    { type: 'boss', index: 3 }       // Voldemort (final)
];

export const SPELL_TEMPLATES = [
    // House starter spells
    { id: 'expelliarmus', name: 'Expelliarmus', icon: '✨', cooldown: 6, magic: 'CHARMS', damage: 2, house: 'gryffindor', color: '#ff4444', debuff: { type: 'weaken', value: 0.2, turns: 3 } },
    { id: 'serpensortia', name: 'Serpensortia', icon: '🐍', cooldown: 6, magic: 'DARK', damage: 2, house: 'slytherin', color: '#44ff44', debuff: { type: 'poison', value: 5, turns: 4 } },
    { id: 'lumos', name: 'Lumos Maxima', icon: '💡', cooldown: 6, magic: 'CHARMS', damage: 2, house: 'ravenclaw', color: '#4488ff', buff: { type: 'crit', value: 25, turns: 3 } },
    { id: 'herbivicus', name: 'Herbivicus', icon: '🌿', cooldown: 6, magic: 'CREATURES', damage: 2, house: 'hufflepuff', color: '#ffdd44', buff: { type: 'regen', value: 3, turns: 3 }, healNow: 10 },
    // Learnable spells
    { id: 'stupefy', name: 'Stupefy', icon: '⚡', cooldown: 8, magic: 'CHARMS', damage: 3, color: '#ff0000', debuff: { type: 'stun', turns: 1 } },
    { id: 'incendio', name: 'Incendio', icon: '🔥', cooldown: 10, magic: 'CHARMS', damage: 4, color: '#ff6600', debuff: { type: 'burn', value: 8, turns: 3 } },
    { id: 'episkey', name: 'Episkey', icon: '💚', cooldown: 15, magic: 'CHARMS', damage: 0, heal: 0.3, color: '#00ff88', special: 'cleanse' },
    { id: 'protego', name: 'Protego', icon: '🛡️', cooldown: 12, magic: 'DEFENSE', damage: 0, shield: 0.3, color: '#88aaff', buff: { type: 'reflect', value: 0.2, turns: 3 } }
];

export const BUFF_TEMPLATES = [
    { id: 'atk5', name: '+5 Attack', icon: '⚔️', desc: 'Increases attack', rarity: 'common', effect: { atk: 5 } },
    { id: 'def3', name: '+3 Defense', icon: '🛡️', desc: 'Reduces damage', rarity: 'common', effect: { def: 3 } },
    { id: 'hp20', name: '+20 HP', icon: '❤️', desc: 'Increases max HP', rarity: 'common', effect: { hp: 20 } },
    { id: 'crit3', name: '+3% Crit', icon: '⚡', desc: 'Crit chance', rarity: 'common', effect: { crit: 3 } },
    { id: 'heal30', name: 'Heal 30%', icon: '💚', desc: 'Restore health', rarity: 'rare', effect: { healPercent: 0.3 } },
    { id: 'gold50', name: '+50 Gold', icon: '💰', desc: 'Instant gold', rarity: 'common', effect: { goldNow: 50 } },
    { id: 'lifesteal', name: 'Lifesteal', icon: '🧛', desc: 'Heal on hit', rarity: 'rare', effect: { lifesteal: 0.05 } },
    { id: 'dodge5', name: '+5% Dodge', icon: '💨', desc: 'Dodge chance', rarity: 'rare', effect: { dodge: 5 } },
    { id: 'atk10', name: '+10 Attack', icon: '🔥', desc: 'Big attack boost', rarity: 'rare', effect: { atk: 10 } },
    { id: 'hp50', name: '+50 HP', icon: '💪', desc: 'Large HP boost', rarity: 'rare', effect: { hp: 50 } }
];

export const HOUSE_DATA = {
    gryffindor: { icon: '🦁', name: 'Gryffindor', atkMult: 1.2, defMult: 0.9, hpMult: 1.0, critBonus: 0, spell: 'expelliarmus', relic: 'sword', color: '#ae0001' },
    slytherin: { icon: '🐍', name: 'Slytherin', atkMult: 1.1, defMult: 1.0, hpMult: 1.0, critBonus: 5, spell: 'serpensortia', relic: 'locket', color: '#1a472a' },
    ravenclaw: { icon: '🦅', name: 'Ravenclaw', atkMult: 1.0, defMult: 1.0, hpMult: 1.0, critBonus: 8, spell: 'lumos', relic: 'diadem', color: '#0e1a40' },
    hufflepuff: { icon: '🦡', name: 'Hufflepuff', atkMult: 1.0, defMult: 1.1, hpMult: 1.15, critBonus: 0, spell: 'herbivicus', relic: 'cup', color: '#ecb939' }
};

export const SHIELD_COLORS = ['red', 'blue', 'yellow', 'green'];

export const SHIELD_ICONS = {
    red: { icon: '🔥', name: 'Fire' },
    blue: { icon: '💧', name: 'Water' },
    yellow: { icon: '⚡', name: 'Lightning' },
    green: { icon: '🌿', name: 'Nature' }
};

// ============ ENTITY REGISTRY ============

let entityIdCounter = 0;

function generateId() {
    return ++entityIdCounter;
}

// Main entity store
const entities = new Map();

// ============ ENTITY CREATION ============

export function createEntity(archetype, data = {}) {
    const id = generateId();
    const entity = {
        id,
        archetype,
        ...data,
        createdAt: Date.now()
    };
    entities.set(id, entity);
    return entity;
}

export function getEntity(id) {
    return entities.get(id);
}

export function removeEntity(id) {
    entities.delete(id);
}

export function getEntitiesByArchetype(archetype) {
    return Array.from(entities.values()).filter(e => e.archetype === archetype);
}

export function clearEntities() {
    entities.clear();
    entityIdCounter = 0;
}

// ============ PLAYER STATE ============

export function createPlayerState() {
    return createEntity('player', {
        // Resources
        gold: 0,
        gems: 0,

        // Progression
        level: 1,
        floor: 1,
        exp: 0,
        expToLevel: CONFIG.EXP_BASE,
        encounterIndex: 0,

        // Stats (base)
        baseAtk: CONFIG.BASE_ATK,
        baseDef: CONFIG.BASE_DEF,
        baseHp: CONFIG.BASE_HP,
        baseCrit: CONFIG.BASE_CRIT,

        // Current state
        currentHp: CONFIG.BASE_HP,
        maxHp: CONFIG.BASE_HP,

        // House
        house: null,
        houseChosen: false,

        // Combat state
        combo: 0,
        maxCombo: 0,
        poisonStacks: 0,
        fearDebuff: false,

        // Spell cooldowns
        spellCooldowns: {},
        unlockedSpells: [],

        // Combat buffs/debuffs (active in current fight)
        combatBuffs: [],
        combatDebuffs: [],

        // Permanent buffs (from roguelike rewards)
        activeBuffs: [],
        buffStats: {
            atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0,
            goldBonus: 0, xpBonus: 0, lifesteal: 0,
            regenFlat: 0, dodge: 0, thorns: 0,
            executeDmg: 0, spellPower: 0, deathSaves: 0,
            doubleAttack: false
        },

        // Stats tracking
        runKills: 0,
        runGold: 0,
        totalKills: 0,
        totalGoldEarned: 0,
        bestFloor: 0,

        // Tutorials
        spellTutorialDone: false,
        shieldTutorialDone: false
    });
}

// ============ CREATURE STATE ============

export function createCreatureState(template, floor = 1, isBoss = false) {
    // Bosses already have higher base stats, so use lower multipliers
    const hpMult = isBoss ? 1.2 : 1;
    const atkMult = isBoss ? 1.1 : 1;
    // Gentler floor scaling
    const scaledHp = Math.floor(template.hp * (1 + floor * 0.02) * hpMult);
    const scaledAtk = Math.floor(template.atk * (1 + floor * 0.01) * atkMult);
    const scaledGold = Math.floor(template.gold * hpMult);

    return createEntity('creature', {
        templateId: template.id,
        name: template.name,
        icon: template.icon,
        magic: template.magic,
        abilities: [...template.abilities],
        boss: isBoss,
        spriteIndex: template.spriteIndex,

        // Combat state
        hp: scaledHp,
        maxHp: scaledHp,
        atk: scaledAtk,
        gold: scaledGold,

        // Status flags
        hasShield: false,
        enraged: false,
        shieldPhase1: false,
        shieldPhase2: false
    });
}

// ============ GAME SESSION STATE ============

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

// ============ RENDER DATA (output for Render module) ============

export function createRenderData() {
    return {
        // Screen to render
        screen: 'battle', // battle, spellbook, skills, shop, bestiary

        // Popups
        showHouseSelect: false,
        showSpellTutorial: false,
        showShieldTutorial: false,
        showShieldMinigame: false,
        showBuffSelect: false,
        showRoomTransition: false,
        showGameOver: false,
        showVictory: false,

        // Header
        gold: 0,
        gems: 0,
        level: 1,
        floor: 1,
        skillPoints: 0,

        // Hero
        heroHp: 100,
        heroMaxHp: 100,
        heroName: 'Wizard',
        houseIcon: '🧙',

        // Creature
        creatureName: '',
        creatureHp: 0,
        creatureMaxHp: 100,
        creatureSpriteIndex: 0,
        creatureAbilities: [],
        creatureHasShield: false,

        // Combat
        isBoss: false,
        comboDisplay: '',

        // Buffs bar
        activeBuffs: [],

        // Spell bar
        spells: [],

        // Battle log
        battleLog: [],

        // Stats bar
        atk: 10,
        def: 5,
        crit: 5,
        hp: 100,

        // Floating texts & particles (visual effects)
        floatingTexts: [],
        particles: [],

        // Popup data
        spellTutorialPage: 1,
        buffChoices: [],
        gameOverData: { floor: 1, kills: 0, gold: 0, combo: 0 },
        victoryData: { kills: 0, gold: 0, combo: 0 },
        roomTransitionData: { loot: 0, nextRoom: 2 },

        // Shield minigame
        shieldSpells: [],
        shieldHighlightColor: null,
        shieldTimer: 100,
        shieldResult: ''
    };
}

// ============ COMPUTED STATS ============

export function computePlayerStats(player) {
    if (!player) return null;

    const house = HOUSE_DATA[player.house] || { atkMult: 1, defMult: 1, hpMult: 1, critBonus: 0 };
    const bs = player.buffStats;

    let atk = player.baseAtk + (player.level - 1) * CONFIG.ATK_PER_LEVEL + bs.atk;
    let def = player.baseDef + (player.level - 1) * CONFIG.DEF_PER_LEVEL + bs.def;
    let hp = player.baseHp + (player.level - 1) * CONFIG.HP_PER_LEVEL + bs.hp;
    let crit = player.baseCrit + house.critBonus + bs.crit;

    // Apply house multipliers
    atk = Math.floor(atk * house.atkMult);
    def = Math.floor(def * house.defMult);
    hp = Math.floor(hp * house.hpMult);

    // Fear debuff
    if (player.fearDebuff) {
        atk = Math.floor(atk * 0.7);
    }

    return {
        atk,
        def,
        hp,
        crit,
        critDmg: 1 + bs.critDmg,
        lifesteal: bs.lifesteal,
        dodge: bs.dodge,
        thorns: bs.thorns,
        regenFlat: bs.regenFlat,
        executeDmg: bs.executeDmg,
        spellPower: bs.spellPower,
        deathSaves: bs.deathSaves,
        doubleAttack: bs.doubleAttack,
        goldBonus: bs.goldBonus,
        xpBonus: bs.xpBonus
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
