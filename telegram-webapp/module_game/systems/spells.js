/**
 * Spell System - spell casting and effects
 */

import { MAGIC_TYPES, SPELL_TEMPLATES, getMagicMultiplier, computePlayerStats } from '../entities/index.js';
import { emit } from './events.js';
import { getSession, getPlayer, getCreature, addLog, addFloatingText, addParticles } from './state.js';
import { handleCreatureDeath } from './spawn.js';

export function castSpell(spellId) {
    const session = getSession();
    const player = getPlayer();
    const creature = getCreature();

    if (session.shieldActive || !creature) return;

    const spell = SPELL_TEMPLATES.find(s => s.id === spellId);
    if (!spell) return;

    const cooldown = player.spellCooldowns[spellId] || 0;
    if (cooldown > 0) return;

    if (!player.unlockedSpells.includes(spellId)) return;

    // Set cooldown
    player.spellCooldowns[spellId] = spell.cooldown;

    emit('sound', { freq: 800, type: 'sine', duration: 0.15 });

    const stats = computePlayerStats(player);

    // Apply buff
    if (spell.buff) {
        player.combatBuffs.push({ ...spell.buff });
        addLog(`${spell.buff.type} buff for ${spell.buff.turns} turns!`, 'log-spell');
    }

    // Apply debuff to enemy
    if (spell.debuff) {
        const existing = player.combatDebuffs.find(d => d.type === spell.debuff.type);
        if (existing) {
            existing.turns = spell.debuff.turns;
            if (spell.debuff.value) existing.value = spell.debuff.value;
        } else {
            player.combatDebuffs.push({ ...spell.debuff });
        }
        addLog(`Enemy ${spell.debuff.type}!`, 'log-effective');
    }

    // Heal now
    if (spell.healNow) {
        player.currentHp = Math.min(stats.hp, player.currentHp + spell.healNow);
        addFloatingText(`+${spell.healNow}`, 60, 40, 'heal');
    }

    // Special: cleanse
    if (spell.special === 'cleanse') {
        player.combatDebuffs = player.combatDebuffs.filter(d => !['poison', 'burn', 'bleed'].includes(d.type));
        player.poisonStacks = 0;
        addLog('Cleansed negative effects!', 'log-spell');
    }

    // Shield spell
    if (spell.shield) {
        const shieldAmt = Math.floor(stats.hp * spell.shield);
        player.currentHp = Math.min(stats.hp, player.currentHp + shieldAmt);
        addFloatingText(`+${shieldAmt} Shield`, 60, 60, 'heal');
        addLog(`${spell.name}! Shield ${shieldAmt} HP`, 'log-spell');
    } else if (spell.heal) {
        const amt = Math.floor(stats.hp * spell.heal);
        player.currentHp = Math.min(stats.hp, player.currentHp + amt);
        addFloatingText(`+${amt}`, 60, 60, 'heal');
        addLog(`${spell.name}! Healed ${amt} HP`, 'log-spell');
    } else if (spell.damage > 0) {
        // Damage spell
        let damage = Math.floor(stats.atk * spell.damage);
        if (stats.spellPower > 0) {
            damage = Math.floor(damage * (1 + stats.spellPower));
        }

        const mult = getMagicMultiplier(spell.magic, creature.magic);
        damage = Math.floor(damage * mult);

        const isCrit = Math.random() * 100 < stats.crit;
        if (isCrit) {
            damage = Math.floor(damage * stats.critDmg);
            addFloatingText(`CRIT -${damage}`, 220, 50, 'crit');
        } else {
            const floatType = mult > 1 ? 'effective' : (mult < 1 ? 'resist' : 'spell');
            addFloatingText(`-${damage}`, 220, 60, floatType);
        }

        if (mult > 1) addLog(`${spell.name} is super effective!`, 'log-effective');
        else if (mult < 1) addLog(`${spell.name} is not very effective...`, 'log-resist');

        creature.hp -= damage;
        addParticles(220, 80, spell.color || MAGIC_TYPES[spell.magic].color, 8);

        // Lifesteal
        if (stats.lifesteal > 0) {
            const healAmt = Math.floor(damage * stats.lifesteal);
            if (healAmt > 0) {
                player.currentHp = Math.min(stats.hp, player.currentHp + healAmt);
            }
        }
    }

    // Check creature death
    if (creature && creature.hp <= 0) {
        handleCreatureDeath();
    }

    emit('spellCast', { spell });
}

// Cooldown tick (called every second)
let cooldownIntervalId = null;

export function startCooldownTick() {
    if (cooldownIntervalId) return;

    cooldownIntervalId = setInterval(() => {
        const session = getSession();
        const player = getPlayer();
        if (session && !session.selectingBuff) {
            for (const id in player.spellCooldowns) {
                if (player.spellCooldowns[id] > 0) {
                    player.spellCooldowns[id]--;
                }
            }
        }
    }, 1000);
}

export function stopCooldownTick() {
    if (cooldownIntervalId) {
        clearInterval(cooldownIntervalId);
        cooldownIntervalId = null;
    }
}
