/**
 * Creature entity factory
 */

import { createEntity } from './registry.js';

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
