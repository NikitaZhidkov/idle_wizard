/**
 * Battle System - combat logic and damage calculations
 */

import { CONFIG, MAGIC_TYPES, getMagicMultiplier, computePlayerStats } from '../entities/index.js';
import { emit } from './events.js';
import { getSession, getPlayer, getCreature, setCreature, addLog, addFloatingText, addParticles } from './state.js';
import { spawnCreature, handleCreatureDeath } from './spawn.js';
import { shouldTriggerShieldMinigame, startShieldMinigame } from './shield.js';

let battleLoopId = null;

export function startBattleLoop() {
    if (battleLoopId) {
        clearInterval(battleLoopId);
    }
    battleLoopId = setInterval(() => {
        const session = getSession();
        if (session.gameStarted && !session.shieldActive && session.state === 'playing') {
            battleTick();
        }
    }, CONFIG.BATTLE_TICK_MS);
    getSession().battleTimerId = battleLoopId;
}

export function stopBattleLoop() {
    if (battleLoopId) {
        clearInterval(battleLoopId);
        battleLoopId = null;
    }
}

function battleTick() {
    const session = getSession();
    const player = getPlayer();
    const creature = getCreature();

    if (!creature || creature.hp <= 0) {
        spawnCreature();
        return;
    }

    session.turnCount++;
    const stats = computePlayerStats(player);

    // Player attack
    const playerDamage = calculatePlayerDamage(stats, creature);
    applyDamageToCreature(playerDamage.damage, playerDamage.isCrit, playerDamage.multiplier);

    // Check creature death
    if (creature.hp <= 0) {
        handleCreatureDeath();
        return;
    }

    // Shield minigame check for bosses
    if (shouldTriggerShieldMinigame()) {
        startShieldMinigame();
        return;
    }

    // Process player debuffs on enemy (DoT)
    processDebuffs();

    if (creature.hp <= 0) {
        handleCreatureDeath();
        return;
    }

    // Process player buffs
    processBuffs(stats);

    // Process creature abilities
    processCreatureAbilities();

    // Creature attack
    if (!isEnemyStunned()) {
        const creatureDamage = calculateCreatureDamage(stats);
        applyDamageToPlayer(creatureDamage, stats);
    } else {
        addLog('Enemy is stunned!', 'log-spell');
        addFloatingText('STUNNED', 220, 150, 'spell');
    }

    // Regen
    if (stats.regenFlat > 0) {
        player.currentHp = Math.min(stats.hp, player.currentHp + stats.regenFlat);
    }

    // Check player death
    if (player.currentHp <= 0) {
        handlePlayerDeath(stats);
    }

    emit('battleTick');
}

export function calculatePlayerDamage(stats, creature) {
    const isCrit = Math.random() * 100 < stats.crit;
    let damage = Math.max(1, stats.atk - Math.floor(creature.atk * 0.08));

    const mult = getMagicMultiplier('CHARMS', creature.magic);
    damage = Math.floor(damage * mult);

    if (isCrit) {
        damage = Math.floor(damage * stats.critDmg);
    }

    if (stats.executeDmg > 0 && creature.hp < creature.maxHp * 0.3) {
        damage = Math.floor(damage * (1 + stats.executeDmg));
    }

    if (creature.hasShield) {
        damage = Math.floor(damage * 0.5);
        creature.hasShield = false;
    }

    if (stats.doubleAttack) {
        damage = Math.floor(damage * 2);
    }

    return { damage, isCrit, multiplier: mult };
}

export function applyDamageToCreature(damage, isCrit, mult) {
    const player = getPlayer();
    const creature = getCreature();
    const stats = computePlayerStats(player);

    // Check dodge
    if (creature.abilities.includes('DODGE') && Math.random() < 0.15) {
        addFloatingText('MISS', 220, 160, 'resist');
        return;
    }

    creature.hp -= damage;
    const floatType = isCrit ? 'crit' : (mult > 1 ? 'effective' : '');
    addFloatingText(`${isCrit ? 'CRIT ' : ''}-${damage}`, 220, 160, floatType);
    emit('sound', { freq: isCrit ? 600 : 400, type: isCrit ? 'sawtooth' : 'square', duration: 0.08 });

    // Lifesteal
    if (stats.lifesteal > 0) {
        const healAmt = Math.floor(damage * stats.lifesteal);
        if (healAmt > 0) {
            player.currentHp = Math.min(stats.hp, player.currentHp + healAmt);
            addFloatingText(`+${healAmt}`, 80, 150, 'heal');
        }
    }
}

function calculateCreatureDamage(stats) {
    const creature = getCreature();
    const player = getPlayer();
    let damage = Math.max(1, creature.atk - Math.floor(stats.def * 0.6));

    if (creature.enraged) {
        damage = Math.floor(damage * 1.5);
    }

    const atkMod = getEnemyAtkMod();
    damage = Math.floor(damage * atkMod);

    return damage;
}

function applyDamageToPlayer(damage, stats) {
    const player = getPlayer();
    const creature = getCreature();

    // Dodge check
    if (stats.dodge > 0 && Math.random() * 100 < stats.dodge) {
        addFloatingText('DODGE!', 60, 150, 'spell');
        return;
    }

    // Thorns
    if (stats.thorns > 0) {
        const thornsDmg = Math.floor(damage * stats.thorns);
        creature.hp -= thornsDmg;
        addFloatingText(`-${thornsDmg}🌹`, 220, 140);
    }

    // Reflect buff
    const reflectMod = getReflectMod();
    if (reflectMod > 0) {
        const reflectDmg = Math.floor(damage * reflectMod);
        creature.hp -= reflectDmg;
        addFloatingText(`-${reflectDmg}🛡️`, 220, 130, 'spell');
    }

    // Creature reflect ability
    if (creature.abilities.includes('REFLECT')) {
        const reflectDmg = Math.floor(damage * 0.2);
        player.currentHp -= reflectDmg;
        addFloatingText(`-${reflectDmg}`, 100, 150);
        addLog(`💫 Reflect: -${reflectDmg} HP`, 'log-damage');
    }

    player.currentHp -= damage;
    addFloatingText(`-${damage}`, 60, 160);
    addLog(`⚔️ ${creature.name} hits: -${damage} HP`, 'log-damage');
}

function handlePlayerDeath(stats) {
    const player = getPlayer();

    if (stats.deathSaves > 0) {
        player.buffStats.deathSaves--;
        player.currentHp = Math.floor(stats.hp * 0.3);
        addLog(`Death saved! (${stats.deathSaves - 1} left)`, 'log-spell');
    } else {
        // Import dynamically to avoid circular dependency
        import('./game-flow.js').then(({ triggerGameOver }) => {
            triggerGameOver();
        });
    }
}

// Debuff/Buff processing
function processDebuffs() {
    const player = getPlayer();
    const creature = getCreature();
    let totalDot = 0;

    player.combatDebuffs.forEach(debuff => {
        if (debuff.type === 'poison' || debuff.type === 'burn' || debuff.type === 'bleed') {
            totalDot += debuff.value;
        }
    });

    if (totalDot > 0) {
        creature.hp -= totalDot;
        addFloatingText(`-${totalDot}`, 220, 180, 'effective');
        addLog(`DoT deals ${totalDot} damage!`, 'log-effective');
    }

    player.combatDebuffs = player.combatDebuffs.filter(d => {
        d.turns--;
        return d.turns > 0;
    });
}

function processBuffs(stats) {
    const player = getPlayer();

    const regenBuff = player.combatBuffs.filter(b => b.type === 'regen').reduce((sum, b) => sum + b.value, 0);
    if (regenBuff > 0) {
        player.currentHp = Math.min(stats.hp, player.currentHp + regenBuff);
        addFloatingText(`+${regenBuff}`, 60, 160, 'heal');
    }

    player.combatBuffs = player.combatBuffs.filter(b => {
        b.turns--;
        return b.turns > 0;
    });
}

function isEnemyStunned() {
    const player = getPlayer();
    return player.combatDebuffs.some(d => d.type === 'stun' && d.turns > 0);
}

function getEnemyAtkMod() {
    const player = getPlayer();
    let mod = 1;
    player.combatDebuffs.forEach(d => {
        if (d.type === 'weaken') mod -= d.value;
    });
    return Math.max(0.1, mod);
}

function getReflectMod() {
    const player = getPlayer();
    const reflect = player.combatBuffs.find(b => b.type === 'reflect');
    return reflect ? reflect.value : 0;
}

function processCreatureAbilities() {
    const player = getPlayer();
    const creature = getCreature();
    const stats = computePlayerStats(player);

    if (!creature) return;

    creature.abilities.forEach(ab => {
        switch (ab) {
            case 'REGEN':
                if (creature.hp < creature.maxHp) {
                    const heal = Math.floor(creature.maxHp * 0.05);
                    creature.hp = Math.min(creature.maxHp, creature.hp + heal);
                    addFloatingText(`+${heal}`, 220, 150, 'heal');
                }
                break;
            case 'SHIELD':
                if (Math.random() < 0.25) {
                    creature.hasShield = true;
                }
                break;
            case 'RAGE':
                if (creature.hp < creature.maxHp * 0.3) {
                    creature.enraged = true;
                }
                break;
            case 'POISON':
                if (Math.random() < 0.3) {
                    player.poisonStacks = Math.min(5, player.poisonStacks + 1);
                    addLog('Poisoned!', 'log-damage');
                }
                break;
            case 'FEAR':
                if (Math.random() < 0.2) {
                    player.fearDebuff = true;
                    addLog('Terrified! Attack reduced!', 'log-damage');
                }
                break;
        }
    });

    // Apply poison damage to player
    if (player.poisonStacks > 0) {
        const dmg = Math.floor(stats.hp * 0.02 * player.poisonStacks);
        player.currentHp -= dmg;
        addFloatingText(`-${dmg} ☠️`, 60, 150);
        addLog(`☠️ Poison (${player.poisonStacks}x): -${dmg} HP`, 'log-damage');
    }
}
