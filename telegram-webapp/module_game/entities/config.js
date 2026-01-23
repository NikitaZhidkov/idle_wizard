/**
 * Game configuration constants
 */

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

export const SHIELD_COLORS = ['red', 'blue', 'yellow', 'green'];

export const SHIELD_ICONS = {
    red: { icon: '🔥', name: 'Fire' },
    blue: { icon: '💧', name: 'Water' },
    yellow: { icon: '⚡', name: 'Lightning' },
    green: { icon: '🌿', name: 'Nature' }
};

export function getMagicMultiplier(attackMagic, defenderMagic) {
    const att = MAGIC_TYPES[attackMagic];
    const def = MAGIC_TYPES[defenderMagic];
    if (!att || !def) return 1;
    if (att.beats === defenderMagic) return 1.5;
    if (att.weakTo === defenderMagic) return 0.6;
    return 1;
}
