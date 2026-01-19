// Game data constants extracted from index.html
// These can be imported by other modules using ES6 imports

// Sprite sheet configuration
// Sprite sheet: 500x500, 4x4 grid, ~4px borders
// Each cell is 125x125, sprite area starts at 4px offset, ~117x117 usable
export const SPRITE_CELL = 125;
export const SPRITE_BORDER = 4;
export const SPRITE_SIZE = 117;

// Magic types (like elements)
export const MAGIC_TYPES = {
    CHARMS: { name: 'Charms', icon: '\u2728', color: '#ffd700', beats: 'CREATURES', weakTo: 'DARK' },
    DARK: { name: 'Dark Arts', icon: '\uD83D\uDC80', color: '#4a0080', beats: 'CHARMS', weakTo: 'DEFENSE' },
    DEFENSE: { name: 'Defense', icon: '\uD83D\uDEE1\uFE0F', color: '#4169e1', beats: 'DARK', weakTo: 'CREATURES' },
    CREATURES: { name: 'Creatures', icon: '\uD83D\uDC09', color: '#228b22', beats: 'DEFENSE', weakTo: 'CHARMS' },
    TRANSFIG: { name: 'Transfig', icon: '\uD83D\uDD04', color: '#9932cc', beats: null, weakTo: null },
    NONE: { name: 'Basic', icon: '\u26AA', color: '#888', beats: null, weakTo: null }
};

// Creature abilities
export const ABILITIES = {
    REGEN: { name: 'Regeneration', icon: '\uD83D\uDC9A', desc: 'Heals each turn' },
    SHIELD: { name: 'Protego', icon: '\uD83D\uDEE1\uFE0F', desc: 'Blocks damage' },
    RAGE: { name: 'Enraged', icon: '\uD83D\uDE24', desc: 'Stronger when hurt' },
    POISON: { name: 'Venomous', icon: '\u2620\uFE0F', desc: 'Poisons you' },
    DODGE: { name: 'Evasive', icon: '\uD83D\uDCA8', desc: 'Dodges attacks' },
    REFLECT: { name: 'Reflect', icon: '\uD83E\uDE9E', desc: 'Returns damage' },
    DISARM: { name: 'Expelliarmus', icon: '\uD83E\uDE84', desc: 'Can disarm you' },
    FEAR: { name: 'Terrifying', icon: '\uD83D\uDE31', desc: 'Reduces your damage' }
};

// Magical creatures (balanced for smooth first-run progression)
// Sprite positions: row 0-2 for creatures, row 3 for bosses
export const CREATURES = [
    { name: 'Cornish Pixie', icon: '\uD83E\uDDDA', magic: 'CREATURES', hp: 25, atk: 2, gold: 5, abilities: [], spriteX: 0, spriteY: 0 },
    { name: 'Doxy', icon: '\uD83E\uDEB0', magic: 'CREATURES', hp: 30, atk: 3, gold: 8, abilities: ['POISON'], spriteX: 1, spriteY: 0 },
    { name: 'Grindylow', icon: '\uD83D\uDC19', magic: 'CREATURES', hp: 40, atk: 4, gold: 12, abilities: [], spriteX: 2, spriteY: 0 },
    { name: 'Red Cap', icon: '\uD83D\uDC79', magic: 'DARK', hp: 50, atk: 5, gold: 15, abilities: ['RAGE'], spriteX: 3, spriteY: 0 },
    { name: 'Boggart', icon: '\uD83D\uDC7B', magic: 'DARK', hp: 55, atk: 5, gold: 18, abilities: ['FEAR'], spriteX: 0, spriteY: 1 },
    { name: 'Hippogriff', icon: '\uD83E\uDD85', magic: 'CREATURES', hp: 70, atk: 7, gold: 30, abilities: ['DODGE'], spriteX: 1, spriteY: 1 },
    { name: 'Acromantula', icon: '\uD83D\uDD77\uFE0F', magic: 'CREATURES', hp: 85, atk: 9, gold: 40, abilities: ['POISON', 'RAGE'], spriteX: 2, spriteY: 1 },
    { name: 'Dementor', icon: '\uD83D\uDC64', magic: 'DARK', hp: 100, atk: 11, gold: 60, abilities: ['FEAR', 'REGEN'], spriteX: 3, spriteY: 1 },
    { name: 'Werewolf', icon: '\uD83D\uDC3A', magic: 'CREATURES', hp: 120, atk: 13, gold: 80, abilities: ['RAGE', 'REGEN'], spriteX: 0, spriteY: 2 },
    { name: 'Hungarian Horntail', icon: '\uD83D\uDC09', magic: 'CREATURES', hp: 150, atk: 16, gold: 120, abilities: ['SHIELD', 'RAGE'], spriteX: 1, spriteY: 2 },
    { name: 'Basilisk', icon: '\uD83D\uDC0D', magic: 'DARK', hp: 180, atk: 18, gold: 150, abilities: ['POISON', 'FEAR', 'REFLECT'], spriteX: 2, spriteY: 2 }
];

// Boss creatures (balanced for first-run winnable experience)
// Row 3: Troll, Death Eater, Nagini, Voldemort
export const BOSSES = [
    { name: 'Troll', icon: '\uD83E\uDDCC', magic: 'CREATURES', hp: 180, atk: 12, gold: 200, abilities: ['RAGE', 'SHIELD'], boss: true, spriteX: 3, spriteY: 2 },
    { name: 'Death Eater', icon: '\uD83D\uDC80', magic: 'DARK', hp: 220, atk: 15, gold: 300, abilities: ['DARK', 'DISARM', 'SHIELD'], boss: true, spriteX: 0, spriteY: 3 },
    { name: 'Nagini', icon: '\uD83D\uDC0D', magic: 'DARK', hp: 280, atk: 18, gold: 400, abilities: ['POISON', 'REGEN', 'DODGE'], boss: true, spriteX: 1, spriteY: 3 },
    { name: 'Voldemort', icon: '\uD83D\uDC0D\uD83D\uDC80', magic: 'DARK', hp: 400, atk: 24, gold: 600, abilities: ['FEAR', 'REFLECT', 'DISARM', 'RAGE'], boss: true, spriteX: 2, spriteY: 3 }
];

// Active spells - each house starts with their signature spell
// Each spell has unique effect: buff (player), debuff (enemy), or special
export const SPELLS = [
    // House starter spells - each with unique effect
    { id: 'expelliarmus', name: 'Expelliarmus', icon: '\u2728', cooldown: 6, magic: 'CHARMS', damage: 2, desc: 'Disarm: -20% enemy ATK for 3 turns', house: 'gryffindor', color: '#ff4444', visual: 'spark', debuff: { type: 'weaken', value: 0.2, turns: 3 } },
    { id: 'serpensortia', name: 'Serpensortia', icon: '\uD83D\uDC0D', cooldown: 6, magic: 'DARK', damage: 2, desc: 'Poison: 5 damage/turn for 4 turns', house: 'slytherin', color: '#44ff44', visual: 'snake', debuff: { type: 'poison', value: 5, turns: 4 } },
    { id: 'lumos', name: 'Lumos Maxima', icon: '\uD83D\uDCA1', cooldown: 6, magic: 'CHARMS', damage: 2, desc: 'Blind: +25% crit chance for 3 turns', house: 'ravenclaw', color: '#4488ff', visual: 'light', buff: { type: 'crit', value: 25, turns: 3 } },
    { id: 'herbivicus', name: 'Herbivicus', icon: '\uD83C\uDF3F', cooldown: 6, magic: 'CREATURES', damage: 2, desc: 'Nature: Heal 10 HP + regen 3/turn for 3 turns', house: 'hufflepuff', color: '#ffdd44', visual: 'plant', buff: { type: 'regen', value: 3, turns: 3 }, healNow: 10 },

    // Learnable attack spells - each with unique effect
    { id: 'stupefy', name: 'Stupefy', icon: '\u26A1', cooldown: 8, magic: 'CHARMS', damage: 3, desc: 'Stun: Enemy skips next turn', locked: true, color: '#ff0000', visual: 'bolt', debuff: { type: 'stun', turns: 1 } },
    { id: 'incendio', name: 'Incendio', icon: '\uD83D\uDD25', cooldown: 10, magic: 'CHARMS', damage: 4, desc: 'Burn: 8 damage/turn for 3 turns', locked: true, color: '#ff6600', visual: 'fire', debuff: { type: 'burn', value: 8, turns: 3 } },
    { id: 'flipendo', name: 'Flipendo', icon: '\uD83D\uDCA8', cooldown: 8, magic: 'DEFENSE', damage: 3, desc: 'Knockback: -30% enemy DEF for 2 turns', locked: true, color: '#88ccff', visual: 'wind', debuff: { type: 'armorBreak', value: 0.3, turns: 2 } },
    { id: 'glacius', name: 'Glacius', icon: '\u2744\uFE0F', cooldown: 10, magic: 'CHARMS', damage: 4, desc: 'Freeze: Slow enemy, +15% your ATK for 3 turns', locked: true, color: '#00ffff', visual: 'ice', buff: { type: 'atk', value: 0.15, turns: 3 }, debuff: { type: 'slow', value: 0.5, turns: 3 } },
    { id: 'depulso', name: 'Depulso', icon: '\uD83C\uDF00', cooldown: 9, magic: 'CHARMS', damage: 3, desc: 'Banish: Reduce all spell cooldowns by 2', locked: true, color: '#aa88ff', visual: 'push', special: 'reduceCooldowns' },
    { id: 'diffindo', name: 'Diffindo', icon: '\u2702\uFE0F', cooldown: 7, magic: 'CHARMS', damage: 3, desc: 'Sever: +50% crit damage this fight', locked: true, color: '#ff88ff', visual: 'cut', buff: { type: 'critDmg', value: 0.5, turns: 99 } },
    { id: 'confringo', name: 'Confringo', icon: '\uD83D\uDCA5', cooldown: 12, magic: 'DARK', damage: 5, desc: 'Blast: AoE burn 5/turn for 4 turns', locked: true, color: '#ff4400', visual: 'explode', debuff: { type: 'burn', value: 5, turns: 4 } },
    { id: 'bombarda', name: 'Bombarda', icon: '\uD83D\uDCA3', cooldown: 14, magic: 'DARK', damage: 6, desc: 'Explode: Destroys 25% enemy max HP', locked: true, color: '#ff8800', visual: 'bomb', special: 'percentDamage', percentDmg: 0.25 },

    // Dark spells - powerful debuffs
    { id: 'sectumsempra', name: 'Sectumsempra', icon: '\uD83D\uDDE1\uFE0F', cooldown: 12, magic: 'DARK', damage: 5, desc: 'Bleed: 10 damage/turn, can stack', locked: true, color: '#880000', visual: 'slash', debuff: { type: 'bleed', value: 10, turns: 5, stacks: true } },
    { id: 'crucio', name: 'Crucio', icon: '\u26D3\uFE0F', cooldown: 15, magic: 'DARK', damage: 6, desc: 'Torture: -40% ATK & DEF for 4 turns', locked: true, color: '#440044', visual: 'torture', debuff: { type: 'torture', atkReduce: 0.4, defReduce: 0.4, turns: 4 } },
    { id: 'fiendfyre', name: 'Fiendfyre', icon: '\uD83D\uDD25\uD83D\uDC79', cooldown: 20, magic: 'DARK', damage: 10, desc: 'Hellfire: Burn 15/turn + fear for 5 turns', locked: true, color: '#ff0044', visual: 'hellfire', debuff: { type: 'hellfire', burnValue: 15, turns: 5, fear: true } },

    // Utility spells
    { id: 'episkey', name: 'Episkey', icon: '\uD83D\uDC9A', cooldown: 15, magic: 'CHARMS', damage: 0, heal: 0.3, desc: 'Heal 30% HP + cure poison/burn', locked: true, color: '#00ff88', visual: 'heal', special: 'cleanse' },
    { id: 'vulnera', name: 'Vulnera Sanentur', icon: '\uD83D\uDC96', cooldown: 20, magic: 'CHARMS', damage: 0, heal: 0.5, desc: 'Heal 50% HP + regen 5/turn for 5 turns', locked: true, color: '#ff88aa', visual: 'healbig', buff: { type: 'regen', value: 5, turns: 5 } },
    { id: 'protego', name: 'Protego', icon: '\uD83D\uDEE1\uFE0F', cooldown: 12, magic: 'DEFENSE', damage: 0, shield: 0.3, desc: 'Shield 30% HP + reflect 20% damage', locked: true, color: '#88aaff', visual: 'shield', buff: { type: 'reflect', value: 0.2, turns: 3 } },

    // Ultimate spells
    { id: 'patronus', name: 'Expecto Patronum', icon: '\uD83E\uDD8C', cooldown: 25, magic: 'DEFENSE', damage: 8, desc: 'Guardian: +50% all stats for 5 turns, dispel fear', locked: true, color: '#ffffff', visual: 'patronus', buff: { type: 'empower', value: 0.5, turns: 5 }, special: 'dispelFear' },
    { id: 'avadakedavra', name: 'Avada Kedavra', icon: '\uD83D\uDC80', cooldown: 90, magic: 'DARK', damage: 0, desc: 'Killing curse: Instant kill, costs 50% of your HP (90s cooldown)', locked: true, color: '#00ff00', visual: 'death', special: 'avadaKedavra' }
];

// Hogwarts subjects (skill trees)
export const SKILL_TREES = {
    charms: {
        name: 'Charms', icon: '\u2728', color: '#ffd700',
        skills: [
            { id: 'lumos', name: 'Lumos Mastery', icon: '\uD83D\uDCA1', desc: '+50% spell damage', cost: 1, effect: { spellDamage: 0.5 } },
            { id: 'accio', name: 'Accio Expert', icon: '\uD83E\uDDF2', desc: '+20% gold drops', cost: 2, requires: 'lumos', effect: { goldBonus: 0.2 } },
            { id: 'stupefy', name: 'Stupefy Master', icon: '\u26A1', desc: '+15% crit chance', cost: 3, requires: 'accio', effect: { crit: 15 } },
            { id: 'patronus', name: 'Patronus', icon: '\uD83E\uDD8C', desc: 'Unlock Expecto Patronum', cost: 4, requires: 'stupefy', effect: { unlockPatronus: true } }
        ]
    },
    darkarts: {
        name: 'Dark Arts', icon: '\uD83D\uDC80', color: '#4a0080',
        skills: [
            { id: 'curse', name: 'Curse Knowledge', icon: '\uD83D\uDDA4', desc: '+25% vs Dark creatures', cost: 1, effect: { darkBonus: 0.25 } },
            { id: 'crucio', name: 'Pain Resist', icon: '\uD83D\uDCAA', desc: '-20% damage taken', cost: 2, requires: 'curse', effect: { damageReduce: 0.2 } },
            { id: 'imperio', name: 'Mind Shield', icon: '\uD83E\uDDE0', desc: 'Immune to Fear', cost: 3, requires: 'crucio', effect: { fearImmune: true } },
            { id: 'avada', name: 'Killing Curse', icon: '\uD83D\uDC9A', desc: 'Execute below 15% HP', cost: 4, requires: 'imperio', effect: { execute: true } }
        ]
    },
    defense: {
        name: 'Defense', icon: '\uD83D\uDEE1\uFE0F', color: '#4169e1',
        skills: [
            { id: 'protego', name: 'Protego', icon: '\uD83D\uDEE1\uFE0F', desc: '+25% max HP', cost: 1, effect: { hpBonus: 0.25 } },
            { id: 'impedimenta', name: 'Impedimenta', icon: '\uD83D\uDC0C', desc: '+30% Shield', cost: 2, requires: 'protego', effect: { defBonus: 0.3 } },
            { id: 'episkey', name: 'Episkey', icon: '\uD83D\uDC9A', desc: 'Heal 3% HP per turn', cost: 3, requires: 'impedimenta', effect: { regen: 0.03 } },
            { id: 'felix', name: 'Felix Felicis', icon: '\uD83C\uDF40', desc: 'Survive fatal hit once', cost: 4, requires: 'episkey', effect: { felix: true } }
        ]
    }
};

// Shop items (some are house-exclusive)
export const SHOP_ITEMS = [
    { id: 'wand1', name: 'Oak Wand', type: 'wand', icon: '\uD83E\uDE84', price: 50, atk: 5 },
    { id: 'wand2', name: 'Phoenix Wand', type: 'wand', icon: '\uD83D\uDD25', price: 200, atk: 12, magic: 'CHARMS' },
    { id: 'wand3', name: 'Elder Wand', type: 'wand', icon: '\u26A1', price: 800, atk: 30, magic: 'CHARMS', crit: 10 },
    { id: 'wand4', name: 'Yew Wand', type: 'wand', icon: '\uD83D\uDC80', price: 500, atk: 20, magic: 'DARK', crit: 5 },
    { id: 'robe1', name: 'School Robes', type: 'robe', icon: '\uD83D\uDC54', price: 75, def: 5, hp: 20 },
    { id: 'robe2', name: 'Dragon Hide', type: 'robe', icon: '\uD83D\uDC09', price: 400, def: 20, hp: 60 },
    { id: 'robe3', name: 'Invisibility Cloak', type: 'robe', icon: '\uD83D\uDC7B', price: 1000, def: 15, hp: 40, crit: 10 },
    { id: 'amulet1', name: 'Lucky Charm', type: 'amulet', icon: '\uD83C\uDF40', price: 100, crit: 5 },
    { id: 'amulet2', name: 'Horcrux Locket', type: 'amulet', icon: '\uD83D\uDCFF', price: 600, atk: 15, hp: 50, magic: 'DARK' },
    { id: 'amulet3', name: 'Time-Turner', type: 'amulet', icon: '\u23F3', price: 800, def: 10, atk: 10, hp: 30 },
    { id: 'book1', name: 'Spellbook', type: 'book', icon: '\uD83D\uDCD5', price: 60, atk: 3 },
    { id: 'book2', name: 'Monster Book', type: 'book', icon: '\uD83D\uDCD7', price: 300, atk: 8, def: 8 },
    { id: 'book3', name: 'Half-Blood Prince', type: 'book', icon: '\uD83D\uDCD8', price: 700, atk: 18, crit: 8 },
    // House-exclusive items (given free at start, can't be bought)
    { id: 'gryffindor_sword', name: 'Sword of Gryffindor', type: 'relic', icon: '\uD83D\uDDE1\uFE0F', price: 0, atk: 25, crit: 5, house: 'gryffindor' },
    { id: 'slytherin_locket', name: 'Slytherin Locket', type: 'relic', icon: '\uD83D\uDCFF', price: 0, atk: 15, crit: 10, magic: 'DARK', house: 'slytherin' },
    { id: 'ravenclaw_diadem', name: 'Ravenclaw Diadem', type: 'relic', icon: '\uD83D\uDC51', price: 0, atk: 10, crit: 8, xpBonus: 0.2, house: 'ravenclaw' },
    { id: 'hufflepuff_cup', name: 'Hufflepuff Cup', type: 'relic', icon: '\uD83C\uDFC6', price: 0, def: 20, hp: 80, house: 'hufflepuff' }
];

// Room themes for procedural generation
export const ROOM_THEMES = [
    { name: 'Dungeon', bg: ['#1a1a2e', '#0d0d1a'], ground: '#2a2a3a', decor: ['\uD83D\uDD6F\uFE0F', '\u26D3\uFE0F', '\uD83E\uDDB4', '\uD83D\uDD78\uFE0F'], particles: 'rgba(100,100,150,0.1)' },
    { name: 'Forest', bg: ['#0d2818', '#061a0d'], ground: '#1a3a1a', decor: ['\uD83C\uDF32', '\uD83C\uDF44', '\uD83C\uDF3F', '\uD83E\uDD8E'], particles: 'rgba(50,150,50,0.1)' },
    { name: 'Library', bg: ['#2d1b0e', '#1a0f08'], ground: '#3a2a1a', decor: ['\uD83D\uDCDA', '\uD83D\uDD6F\uFE0F', '\uD83D\uDCDC', '\uD83E\uDEB6'], particles: 'rgba(200,150,100,0.1)' },
    { name: 'Castle', bg: ['#2a2a3a', '#1a1a2a'], ground: '#3a3a4a', decor: ['\uD83C\uDFF0', '\u2694\uFE0F', '\uD83D\uDEE1\uFE0F', '\uD83D\uDEA9'], particles: 'rgba(150,150,200,0.1)' },
    { name: 'Graveyard', bg: ['#1a1a1a', '#0a0a0a'], ground: '#2a2a2a', decor: ['\uD83D\uDC80', '\uD83E\uDEA6', '\uD83E\uDD87', '\uD83C\uDF19'], particles: 'rgba(100,100,100,0.15)' },
    { name: 'Lake', bg: ['#0a1a2a', '#051018'], ground: '#1a3a4a', decor: ['\uD83C\uDF0A', '\uD83D\uDC1A', '\uD83E\uDD91', '\uD83D\uDC8E'], particles: 'rgba(100,150,200,0.1)' },
    { name: 'Tower', bg: ['#2a1a3a', '#1a0a2a'], ground: '#3a2a4a', decor: ['\uD83C\uDF1F', '\uD83D\uDD2E', '\u2B50', '\uD83C\uDF19'], particles: 'rgba(150,100,200,0.15)' },
    { name: 'Chamber', bg: ['#3a1a1a', '#2a0a0a'], ground: '#4a2a2a', decor: ['\uD83D\uDD25', '\uD83D\uDC80', '\uD83D\uDC0D', '\uD83D\uDC41\uFE0F'], particles: 'rgba(200,50,50,0.1)' }
];

// Roguelike buffs pool
export const BUFFS = [
    // Common buffs (60% chance)
    { id: 'atk1', name: 'Magic Boost', icon: '\u26A1', rarity: 'common', desc: 'Your spells hit slightly harder.', stats: '+3 Attack', effect: { atk: 3 } },
    { id: 'atk2', name: 'Wand Polish', icon: '\u2728', rarity: 'common', desc: 'A well-maintained wand casts better.', stats: '+5 Attack', effect: { atk: 5 } },
    { id: 'def1', name: 'Shield Charm', icon: '\uD83D\uDEE1\uFE0F', rarity: 'common', desc: 'A basic protective enchantment.', stats: '+3 Defense', effect: { def: 3 } },
    { id: 'def2', name: 'Thick Robes', icon: '\uD83E\uDDE5', rarity: 'common', desc: 'Extra padding against attacks.', stats: '+5 Defense', effect: { def: 5 } },
    { id: 'hp1', name: 'Vitality', icon: '\u2764\uFE0F', rarity: 'common', desc: 'You feel more energetic.', stats: '+15 Max HP', effect: { hp: 15 } },
    { id: 'hp2', name: 'Endurance', icon: '\uD83D\uDCAA', rarity: 'common', desc: 'Your stamina increases.', stats: '+25 Max HP', effect: { hp: 25 } },
    { id: 'crit1', name: 'Lucky Penny', icon: '\uD83E\uDE99', rarity: 'common', desc: 'Fortune favors the bold.', stats: '+2% Crit', effect: { crit: 2 } },
    { id: 'gold1', name: 'Midas Touch', icon: '\uD83D\uDCB0', rarity: 'common', desc: 'Enemies drop more gold.', stats: '+10% Gold', effect: { goldBonus: 0.1 } },
    { id: 'heal1', name: 'Minor Healing', icon: '\uD83D\uDC9A', rarity: 'common', desc: 'Restore some health.', stats: 'Heal 20 HP', effect: { healNow: 20 } },

    // Rare buffs (30% chance)
    { id: 'atk3', name: 'Power Surge', icon: '\uD83D\uDD25', rarity: 'rare', desc: 'Raw magical power flows through you.', stats: '+10 Attack', effect: { atk: 10 } },
    { id: 'def3', name: 'Iron Skin', icon: '\uD83E\uDEA8', rarity: 'rare', desc: 'Your skin hardens like stone.', stats: '+10 Defense', effect: { def: 10 } },
    { id: 'hp3', name: 'Giant\'s Blood', icon: '\uD83E\uDDEA', rarity: 'rare', desc: 'You grow stronger and tougher.', stats: '+50 Max HP', effect: { hp: 50 } },
    { id: 'crit2', name: 'Eagle Eye', icon: '\uD83E\uDD85', rarity: 'rare', desc: 'You spot weaknesses easily.', stats: '+5% Crit', effect: { crit: 5 } },
    { id: 'critdmg1', name: 'Cruel Strikes', icon: '\uD83D\uDCA5', rarity: 'rare', desc: 'Critical hits deal more damage.', stats: '+25% Crit Damage', effect: { critDmg: 0.25 } },
    { id: 'lifesteal1', name: 'Vampiric Wand', icon: '\uD83E\uDDDB', rarity: 'rare', desc: 'Drain life from your enemies.', stats: 'Heal 5% of damage dealt', effect: { lifesteal: 0.05 } },
    { id: 'regen1', name: 'Regeneration', icon: '\uD83C\uDF3F', rarity: 'rare', desc: 'Slowly recover health in battle.', stats: 'Heal 2 HP per turn', effect: { regenFlat: 2 } },
    { id: 'dodge1', name: 'Quick Reflexes', icon: '\uD83D\uDCA8', rarity: 'rare', desc: 'Sometimes evade enemy attacks.', stats: '+8% Dodge chance', effect: { dodge: 8 } },
    { id: 'thorns1', name: 'Thorns', icon: '\uD83C\uDF39', rarity: 'rare', desc: 'Enemies hurt themselves attacking you.', stats: 'Return 15% damage', effect: { thorns: 0.15 } },
    { id: 'xp1', name: 'Quick Learner', icon: '\uD83D\uDCDA', rarity: 'rare', desc: 'Gain experience faster.', stats: '+25% XP gain', effect: { xpBonus: 0.25 } },
    { id: 'heal2', name: 'Greater Healing', icon: '\uD83D\uDC96', rarity: 'rare', desc: 'Restore a good amount of health.', stats: 'Heal 50 HP', effect: { healNow: 50 } },

    // Epic buffs (8% chance)
    { id: 'atk4', name: 'Arcane Might', icon: '\uD83C\uDF1F', rarity: 'epic', desc: 'Overwhelming magical power surges within.', stats: '+20 Attack', effect: { atk: 20 } },
    { id: 'def4', name: 'Diamond Shield', icon: '\uD83D\uDC8E', rarity: 'epic', desc: 'An impenetrable magical barrier.', stats: '+20 Defense', effect: { def: 20 } },
    { id: 'hp4', name: 'Dragon Heart', icon: '\uD83D\uDC09', rarity: 'epic', desc: 'The vitality of a dragon flows in you.', stats: '+100 Max HP', effect: { hp: 100 } },
    { id: 'crit3', name: 'Assassin\'s Mark', icon: '\uD83C\uDFAF', rarity: 'epic', desc: 'Strike with deadly precision.', stats: '+10% Crit', effect: { crit: 10 } },
    { id: 'allstats1', name: 'Blessing', icon: '\uD83D\uDC7C', rarity: 'epic', desc: 'A divine blessing enhances all abilities.', stats: '+8 ATK, +8 DEF, +40 HP', effect: { atk: 8, def: 8, hp: 40 } },
    { id: 'lifesteal2', name: 'Soul Drain', icon: '\uD83D\uDC7B', rarity: 'epic', desc: 'Absorb the essence of defeated foes.', stats: 'Heal 10% of damage dealt', effect: { lifesteal: 0.1 } },
    { id: 'execute1', name: 'Executioner', icon: '\u26B0\uFE0F', rarity: 'epic', desc: 'Deal massive damage to wounded enemies.', stats: '+50% damage below 30% HP', effect: { executeDmg: 0.5 } },
    { id: 'spellpower1', name: 'Spell Mastery', icon: '\uD83D\uDCD6', rarity: 'epic', desc: 'Your active spells are empowered.', stats: '+40% Spell damage', effect: { spellPower: 0.4 } },
    { id: 'fullheal', name: 'Phoenix Tears', icon: '\uD83D\uDD25', rarity: 'epic', desc: 'Completely restore your health.', stats: 'Full HP restore', effect: { fullHeal: true } },

    // Spell unlocks - Common (basic attack spells)
    { id: 'spell_stupefy', name: 'Learn Stupefy', icon: '\u26A1', rarity: 'common', desc: 'Learn the stunning spell.', stats: 'Unlock Stupefy', effect: { unlockSpell: 'stupefy' } },
    { id: 'spell_flipendo', name: 'Learn Flipendo', icon: '\uD83D\uDCA8', rarity: 'common', desc: 'Learn the knockback jinx.', stats: 'Unlock Flipendo', effect: { unlockSpell: 'flipendo' } },
    { id: 'spell_diffindo', name: 'Learn Diffindo', icon: '\u2702\uFE0F', rarity: 'common', desc: 'Learn the severing charm.', stats: 'Unlock Diffindo', effect: { unlockSpell: 'diffindo' } },

    // Spell unlocks - Rare (stronger spells)
    { id: 'spell_incendio', name: 'Learn Incendio', icon: '\uD83D\uDD25', rarity: 'rare', desc: 'Learn the fire-making spell.', stats: 'Unlock Incendio', effect: { unlockSpell: 'incendio' } },
    { id: 'spell_glacius', name: 'Learn Glacius', icon: '\u2744\uFE0F', rarity: 'rare', desc: 'Learn the freezing spell.', stats: 'Unlock Glacius', effect: { unlockSpell: 'glacius' } },
    { id: 'spell_depulso', name: 'Learn Depulso', icon: '\uD83C\uDF00', rarity: 'rare', desc: 'Learn the banishing charm.', stats: 'Unlock Depulso', effect: { unlockSpell: 'depulso' } },
    { id: 'spell_episkey', name: 'Learn Episkey', icon: '\uD83D\uDC9A', rarity: 'rare', desc: 'Learn the healing spell.', stats: 'Unlock Episkey', effect: { unlockSpell: 'episkey' } },
    { id: 'spell_protego', name: 'Learn Protego', icon: '\uD83D\uDEE1\uFE0F', rarity: 'rare', desc: 'Learn the shield charm.', stats: 'Unlock Protego', effect: { unlockSpell: 'protego' } },

    // Spell unlocks - Epic (powerful spells)
    { id: 'spell_confringo', name: 'Learn Confringo', icon: '\uD83D\uDCA5', rarity: 'epic', desc: 'Learn the blasting curse.', stats: 'Unlock Confringo', effect: { unlockSpell: 'confringo' } },
    { id: 'spell_bombarda', name: 'Learn Bombarda', icon: '\uD83D\uDCA3', rarity: 'epic', desc: 'Learn the explosive spell.', stats: 'Unlock Bombarda', effect: { unlockSpell: 'bombarda' } },
    { id: 'spell_sectumsempra', name: 'Learn Sectumsempra', icon: '\uD83D\uDDE1\uFE0F', rarity: 'epic', desc: 'Learn the dark cutting curse.', stats: 'Unlock Sectumsempra', effect: { unlockSpell: 'sectumsempra' } },
    { id: 'spell_vulnera', name: 'Learn Vulnera Sanentur', icon: '\uD83D\uDC96', rarity: 'epic', desc: 'Learn powerful healing magic.', stats: 'Unlock Vulnera Sanentur', effect: { unlockSpell: 'vulnera' } },

    // Spell unlocks - Legendary (ultimate spells)
    { id: 'spell_crucio', name: 'Learn Crucio', icon: '\u26D3\uFE0F', rarity: 'legendary', desc: 'Learn the torture curse.', stats: 'Unlock Crucio', effect: { unlockSpell: 'crucio' } },
    { id: 'spell_patronus', name: 'Learn Patronus', icon: '\uD83E\uDD8C', rarity: 'legendary', desc: 'Learn to conjure a Patronus.', stats: 'Unlock Expecto Patronum', effect: { unlockSpell: 'patronus' } },
    { id: 'spell_fiendfyre', name: 'Learn Fiendfyre', icon: '\uD83D\uDD25\uD83D\uDC79', rarity: 'legendary', desc: 'Learn cursed fire magic.', stats: 'Unlock Fiendfyre', effect: { unlockSpell: 'fiendfyre' } },
    { id: 'spell_avadakedavra', name: 'Learn Avada Kedavra', icon: '\uD83D\uDC80', rarity: 'legendary', desc: 'Learn the killing curse.', stats: 'Unlock Avada Kedavra', effect: { unlockSpell: 'avadakedavra' } },

    // Legendary buffs (2% chance)
    { id: 'godmode', name: 'Invincibility', icon: '\u2B50', rarity: 'legendary', desc: 'Become temporarily invulnerable. Blocks 3 lethal hits.', stats: '3 Death saves', effect: { deathSaves: 3 } },
    { id: 'doubledmg', name: 'Dual Cast', icon: '\uD83D\uDD2E', rarity: 'legendary', desc: 'Every attack hits twice.', stats: 'Double attack', effect: { doubleAttack: true } },
    { id: 'megastats', name: 'Elder Power', icon: '\uD83E\uDDD9', rarity: 'legendary', desc: 'Channel the power of ancient wizards.', stats: '+25 ATK, +25 DEF, +150 HP', effect: { atk: 25, def: 25, hp: 150 } },
    { id: 'goldrain', name: 'Leprechaun\'s Luck', icon: '\uD83C\uDF40', rarity: 'legendary', desc: 'Gold rains down upon you.', stats: '+100% Gold, +500 Gold now', effect: { goldBonus: 1.0, goldNow: 500 } },
    { id: 'critgod', name: 'Death\'s Scythe', icon: '\uD83D\uDC80', rarity: 'legendary', desc: 'Critical hits are devastating.', stats: '+20% Crit, +100% Crit Damage', effect: { crit: 20, critDmg: 1.0 } }
];

// Shield spell colors and their icons
export const SHIELD_COLORS = {
    red: { icon: '\uD83D\uDD25', name: 'Fire', spellIcon: '\uD83D\uDD25\uD83D\uDCA5' },
    blue: { icon: '\uD83D\uDCA7', name: 'Water', spellIcon: '\uD83D\uDCA7\uD83C\uDF0A' },
    yellow: { icon: '\u26A1', name: 'Lightning', spellIcon: '\u26A1\u2728' },
    green: { icon: '\uD83C\uDF3F', name: 'Nature', spellIcon: '\uD83C\uDF3F\uD83C\uDF43' }
};

// Visual spell effects with icons
export const SPELL_VISUALS = {
    spark: '\u2728', bolt: '\u26A1', fire: '\uD83D\uDD25', ice: '\u2744\uFE0F', wind: '\uD83D\uDCA8', push: '\uD83C\uDF00',
    cut: '\u2702\uFE0F', explode: '\uD83D\uDCA5', bomb: '\uD83D\uDCA3', slash: '\uD83D\uDDE1\uFE0F', torture: '\u26D3\uFE0F',
    hellfire: '\uD83D\uDD25\uD83D\uDC79', heal: '\uD83D\uDC9A', healbig: '\uD83D\uDC96', shield: '\uD83D\uDEE1\uFE0F',
    patronus: '\uD83E\uDD8C', death: '\uD83D\uDC80', snake: '\uD83D\uDC0D', plant: '\uD83C\uDF3F', light: '\uD83D\uDCA1'
};
