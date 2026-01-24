/**
 * Game templates - creatures, bosses, buffs
 */

export const CREATURE_TEMPLATES = [
    { id: 'sprite', name: 'Forest Sprite', icon: '🧚', magic: 'CREATURES', hp: 125, atk: 2, gold: 5, abilities: [], spriteIndex: 0 },
    { id: 'beetle', name: 'Venom Beetle', icon: '🪲', magic: 'CREATURES', hp: 150, atk: 3, gold: 8, abilities: ['POISON'], spriteIndex: 1 },
    { id: 'squid', name: 'Cave Lurker', icon: '🐙', magic: 'DEFENSE', hp: 200, atk: 4, gold: 12, abilities: [], spriteIndex: 2 },
    { id: 'goblin', name: 'Goblin Raider', icon: '👹', magic: 'DARK', hp: 250, atk: 5, gold: 15, abilities: ['RAGE'], spriteIndex: 3 },
    { id: 'ghost', name: 'Restless Spirit', icon: '👻', magic: 'DARK', hp: 275, atk: 5, gold: 18, abilities: ['FEAR'], spriteIndex: 4 },
    { id: 'griffin', name: 'Wild Griffin', icon: '🦅', magic: 'CREATURES', hp: 350, atk: 7, gold: 30, abilities: ['DODGE'], spriteIndex: 5 },
    { id: 'spider', name: 'Giant Spider', icon: '🕷️', magic: 'CREATURES', hp: 425, atk: 9, gold: 40, abilities: ['POISON', 'RAGE'], spriteIndex: 6 },
    { id: 'wraith', name: 'Shadow Wraith', icon: '👤', magic: 'DARK', hp: 500, atk: 11, gold: 60, abilities: ['FEAR', 'REGEN'], spriteIndex: 7 },
    { id: 'wolf', name: 'Dire Wolf', icon: '🐺', magic: 'CREATURES', hp: 600, atk: 13, gold: 80, abilities: ['RAGE', 'REGEN'], spriteIndex: 8 },
    { id: 'drake', name: 'Fire Drake', icon: '🐉', magic: 'CHARMS', hp: 750, atk: 16, gold: 120, abilities: ['SHIELD', 'RAGE'], spriteIndex: 9 },
    { id: 'serpent', name: 'Ancient Serpent', icon: '🐍', magic: 'DARK', hp: 900, atk: 18, gold: 150, abilities: ['POISON', 'FEAR', 'REFLECT'], spriteIndex: 10 }
];

export const BOSS_TEMPLATES = [
    { id: 'troll', name: 'Cave Troll', icon: '🧌', magic: 'CREATURES', hp: 500, atk: 8, gold: 200, abilities: ['RAGE'], boss: true, spriteIndex: 11 },
    { id: 'necromancer', name: 'Necromancer', icon: '💀', magic: 'DARK', hp: 700, atk: 10, gold: 300, abilities: ['SHIELD'], boss: true, spriteIndex: 12 },
    { id: 'hydra', name: 'Swamp Hydra', icon: '🐍', magic: 'DEFENSE', hp: 900, atk: 12, gold: 400, abilities: ['POISON', 'REGEN'], boss: true, spriteIndex: 13 },
    { id: 'lich', name: 'The Lich King', icon: '💀👑', magic: 'DARK', hp: 1250, atk: 15, gold: 600, abilities: ['FEAR', 'RAGE'], boss: true, spriteIndex: 14 }
];

// Fixed encounter order: 3 creatures -> boss, repeat
export const ENCOUNTER_ORDER = [
    { type: 'creature', index: 0 },  // Sprite
    { type: 'creature', index: 1 },  // Beetle
    { type: 'creature', index: 2 },  // Lurker
    { type: 'boss', index: 0 },      // Troll
    { type: 'creature', index: 3 },  // Goblin
    { type: 'creature', index: 4 },  // Ghost
    { type: 'creature', index: 5 },  // Griffin
    { type: 'boss', index: 1 },      // Necromancer
    { type: 'creature', index: 6 },  // Spider
    { type: 'creature', index: 7 },  // Wraith
    { type: 'creature', index: 8 },  // Wolf
    { type: 'boss', index: 2 },      // Hydra
    { type: 'creature', index: 9 },  // Drake
    { type: 'creature', index: 10 }, // Serpent
    { type: 'boss', index: 3 }       // Lich King (final)
];

// Spells removed from active gameplay
export const SPELL_TEMPLATES = [];

export const BUFF_TEMPLATES = [
    // Stat buffs only - no spells
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

// House data removed - no longer used
export const HOUSE_DATA = {};
