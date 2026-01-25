/**
 * Player entity and stats computation
 */

import { CONFIG } from './config.js';
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

        // Combat state
        combo: 0,
        maxCombo: 0,

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
        bestFloor: 0
    });
}

export function computePlayerStats(player) {
    if (!player) return null;

    const bs = player.buffStats;

    let atk = player.baseAtk + (player.level - 1) * CONFIG.ATK_PER_LEVEL + bs.atk;
    let def = player.baseDef + (player.level - 1) * CONFIG.DEF_PER_LEVEL + bs.def;
    let hp = player.baseHp + (player.level - 1) * CONFIG.HP_PER_LEVEL + bs.hp;
    let crit = player.baseCrit + bs.crit;

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
