/**
 * Game templates - creatures, bosses, spells, buffs, houses
 */

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
