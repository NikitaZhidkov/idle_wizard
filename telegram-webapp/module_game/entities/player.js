/**
 * Player entity and stats computation
 */

import { CONFIG, MAGIC_TYPES } from './config.js';
import { HOUSE_DATA } from './templates.js';
import { createEntity } from './registry.js';

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
