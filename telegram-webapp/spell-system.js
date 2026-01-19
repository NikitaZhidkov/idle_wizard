// Spell System module - Spell casting and effects
// Extracted from main.js

import { MAGIC_TYPES, SPELLS } from './data.js';
import {
    game,
    getCurrentCreature,
    getCreatureHp,
    setCreatureHp,
    playSound,
    getSkillEffect,
    getStats,
    getMagicMultiplier,
    saveGame,
    isShieldGameActive
} from './game.js';

import {
    showFloat,
    createParticles,
    spellEffect,
    castSpellVisual,
    shakeScreen
} from './visual-effects.js';

// Callbacks to be set by main.js
let addLogCallback = null;
let checkCreatureDeathCallback = null;
let updateUICallback = null;

export function initSpellSystem(callbacks) {
    addLogCallback = callbacks.addLog;
    checkCreatureDeathCallback = callbacks.checkCreatureDeath;
    updateUICallback = callbacks.updateUI;
}

export function renderSpellBar(onSpellClick) {
    const container = document.getElementById('spellsContainer');
    if (!container) return;
    container.innerHTML = '';

    const shieldActive = isShieldGameActive();

    SPELLS.forEach(spell => {
        if (!game.unlockedSpells.includes(spell.id)) return;

        const cd = game.spellCooldowns[spell.id] || 0;
        const div = document.createElement('div');
        // Block spells during shield minigame
        const isBlocked = shieldActive;
        div.className = `spell ${cd <= 0 && !isBlocked ? 'ready' : 'on-cooldown'}${isBlocked ? ' blocked' : ''}`;
        div.innerHTML = `
            ${spell.icon}
            <span class="spell-cooldown">${cd > 0 ? cd + 's' : ''}</span>
            <span class="spell-type">${MAGIC_TYPES[spell.magic].icon}</span>
        `;
        div.title = `${spell.name}: ${spell.desc}`;
        div.onclick = () => onSpellClick(spell);
        container.appendChild(div);
    });
}

export function castSpell(spell) {
    // Block spell casting during shield minigame
    if (isShieldGameActive()) return;

    const currentCreature = getCurrentCreature();
    if (!currentCreature || (game.spellCooldowns[spell.id] || 0) > 0) return;

    const stats = getStats();
    game.spellCooldowns[spell.id] = spell.cooldown;

    playSound(800, 'sine', 0.15);

    if (spell.heal || spell.shield) {
        castSpellVisual(spell, 60, 60);
    } else {
        castSpellVisual(spell, 200, 60);
    }
    spellEffect(220, 70, spell.color || MAGIC_TYPES[spell.magic].color);

    if (spell.buff) {
        game.combatBuffs.push({ ...spell.buff });
        if (addLogCallback) addLogCallback(`${spell.buff.type} buff for ${spell.buff.turns} turns!`, 'log-spell');
    }

    if (spell.debuff) {
        if (spell.debuff.stacks) {
            const existing = game.combatDebuffs.find(d => d.type === spell.debuff.type);
            if (existing) {
                existing.value += spell.debuff.value;
                existing.turns = Math.max(existing.turns, spell.debuff.turns);
            } else {
                game.combatDebuffs.push({ ...spell.debuff });
            }
        } else {
            const existing = game.combatDebuffs.find(d => d.type === spell.debuff.type);
            if (existing) {
                existing.turns = spell.debuff.turns;
                if (spell.debuff.value) existing.value = spell.debuff.value;
            } else {
                game.combatDebuffs.push({ ...spell.debuff });
            }
        }
        if (addLogCallback) addLogCallback(`Enemy ${spell.debuff.type}!`, 'log-effective');
    }

    if (spell.healNow) {
        game.currentHp = Math.min(stats.hp, game.currentHp + spell.healNow);
        showFloat(`+${spell.healNow}`, 60, 40, 'heal');
    }

    if (spell.special === 'reduceCooldowns') {
        for (let key in game.spellCooldowns) {
            if (game.spellCooldowns[key] > 0) {
                game.spellCooldowns[key] = Math.max(0, game.spellCooldowns[key] - 2);
            }
        }
        if (addLogCallback) addLogCallback('Cooldowns reduced by 2!', 'log-spell');
    }
    if (spell.special === 'cleanse') {
        game.combatDebuffs = game.combatDebuffs.filter(d => !['poison', 'burn', 'bleed'].includes(d.type));
        game.poisonStacks = 0;
        if (addLogCallback) addLogCallback('Cleansed negative effects!', 'log-spell');
    }
    if (spell.special === 'dispelFear') {
        game.fearDebuff = false;
        if (addLogCallback) addLogCallback('Fear dispelled!', 'log-spell');
    }

    if (spell.shield) {
        const shieldAmt = Math.floor(stats.hp * spell.shield);
        game.currentHp = Math.min(stats.hp, game.currentHp + shieldAmt);
        showFloat(`+${shieldAmt} Shield`, 60, 60, 'heal');
        createParticles(60, 80, '#88aaff', 8);
        if (addLogCallback) addLogCallback(`${spell.name}! Shield ${shieldAmt} HP`, 'log-spell');
    } else if (spell.heal) {
        const amt = Math.floor(stats.hp * spell.heal);
        game.currentHp = Math.min(stats.hp, game.currentHp + amt);
        showFloat(`+${amt}`, 60, 60, 'heal');
        createParticles(60, 80, spell.color || '#00ff00', 6);
        if (addLogCallback) addLogCallback(`${spell.name}! Healed ${amt} HP`, 'log-spell');
    } else {
        let damage = Math.floor(stats.atk * spell.damage);
        const spellBonus = getSkillEffect('spellDamage');
        if (spellBonus) damage = Math.floor(damage * (1 + spellBonus));
        if (stats.spellPower > 0) damage = Math.floor(damage * (1 + stats.spellPower));

        const atkBuff = game.combatBuffs.filter(b => b.type === 'atk').reduce((sum, b) => sum + b.value, 0);
        if (atkBuff > 0) damage = Math.floor(damage * (1 + atkBuff));

        const critDmgBuff = game.combatBuffs.filter(b => b.type === 'critDmg').reduce((sum, b) => sum + b.value, 0);
        const critBuff = game.combatBuffs.filter(b => b.type === 'crit').reduce((sum, b) => sum + b.value, 0);
        const empowerBuff = game.combatBuffs.find(b => b.type === 'empower');
        if (empowerBuff) damage = Math.floor(damage * (1 + empowerBuff.value));

        const mult = getMagicMultiplier(spell.magic, currentCreature.magic);
        damage = Math.floor(damage * mult);

        if (spell.special === 'percentDamage' && spell.percentDmg) {
            const percentDmg = Math.floor(currentCreature.maxHp * spell.percentDmg);
            damage += percentDmg;
            if (addLogCallback) addLogCallback(`${spell.name} deals ${percentDmg} bonus damage!`, 'log-effective');
        }

        if (spell.special === 'avadaKedavra') {
            const hpCost = Math.floor(game.currentHp * 0.5);
            game.currentHp -= hpCost;
            showFloat(`-${hpCost}`, 60, 60, 'crit');
            if (addLogCallback) addLogCallback(`Avada Kedavra costs ${hpCost} HP!`, 'log-boss');

            damage = getCreatureHp();
            if (addLogCallback) addLogCallback('AVADA KEDAVRA!', 'log-boss');
            showFloat('DEATH!', 220, 40, 'crit');

            if (game.currentHp <= 0) {
                if (stats.deathSaves > 0) {
                    game.buffStats.deathSaves--;
                    game.currentHp = Math.floor(stats.hp * 0.1);
                    if (addLogCallback) addLogCallback('Death saved! (' + (stats.deathSaves - 1) + ' left)', 'log-spell');
                } else {
                    game.currentHp = 1;
                    if (addLogCallback) addLogCallback('Nearly killed yourself!', 'log-resist');
                }
            }
        }

        const totalCrit = stats.crit + critBuff;
        if (Math.random() * 100 < totalCrit) {
            const totalCritDmg = stats.critDmg + critDmgBuff;
            damage = Math.floor(damage * (1 + totalCritDmg));
            showFloat(`CRIT -${damage}`, 220, 50, 'crit');
        } else {
            const floatType = mult > 1 ? 'effective' : (mult < 1 ? 'resist' : 'spell');
            showFloat(`-${damage}`, 220, 60, floatType);
        }

        if (mult > 1 && addLogCallback) addLogCallback(`${spell.name} is super effective!`, 'log-effective');
        else if (mult < 1 && addLogCallback) addLogCallback(`${spell.name} is not very effective...`, 'log-resist');

        setCreatureHp(getCreatureHp() - damage);

        if (stats.lifesteal > 0) {
            const healAmt = Math.floor(damage * stats.lifesteal);
            if (healAmt > 0) game.currentHp = Math.min(stats.hp, game.currentHp + healAmt);
        }

        createParticles(220, 80, spell.color || MAGIC_TYPES[spell.magic].color, 8);
        shakeScreen();
    }

    if (checkCreatureDeathCallback) checkCreatureDeathCallback();
    if (updateUICallback) updateUICallback();
    saveGame();
}
