/**
 * Buff Selection System
 */

import { BUFF_TEMPLATES, SPELL_TEMPLATES, computePlayerStats } from '../entities/index.js';
import { emit } from './events.js';
import { getSession, getPlayer, getRenderData, addLog } from './state.js';
import { spawnCreature } from './spawn.js';
import { startBattleLoop } from './battle.js';

export function showBuffSelection() {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    session.state = 'buffSelect';
    renderData.showBuffSelect = true;

    // Filter out already-learned spells
    const availableBuffs = BUFF_TEMPLATES.filter(buff => {
        if (buff.effect.unlockSpell) {
            return !player.unlockedSpells.includes(buff.effect.unlockSpell);
        }
        return true;
    });

    // Generate 3 random buff choices
    const shuffled = [...availableBuffs].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);
    session.buffChoices = choices;
    renderData.buffChoices = choices;

    emit('sound', { freq: 600, type: 'sine', duration: 0.15 });
}

export function selectBuff(buffId) {
    const session = getSession();
    const player = getPlayer();
    const renderData = getRenderData();

    if (session.state !== 'buffSelect') return;

    const buff = session.buffChoices.find(b => b.id === buffId);
    if (!buff) return;

    const stats = computePlayerStats(player);

    // Apply buff
    player.activeBuffs.push({ id: buff.id, name: buff.name, icon: buff.icon });
    const effect = buff.effect;
    const bs = player.buffStats;

    if (effect.atk) bs.atk += effect.atk;
    if (effect.def) bs.def += effect.def;
    if (effect.hp) bs.hp += effect.hp;
    if (effect.crit) bs.crit += effect.crit;
    if (effect.critDmg) bs.critDmg += effect.critDmg;
    if (effect.goldBonus) bs.goldBonus += effect.goldBonus;
    if (effect.xpBonus) bs.xpBonus += effect.xpBonus;
    if (effect.lifesteal) bs.lifesteal += effect.lifesteal;
    if (effect.regenFlat) bs.regenFlat += effect.regenFlat;
    if (effect.dodge) bs.dodge += effect.dodge;
    if (effect.thorns) bs.thorns += effect.thorns;
    if (effect.executeDmg) bs.executeDmg += effect.executeDmg;
    if (effect.spellPower) bs.spellPower += effect.spellPower;
    if (effect.deathSaves) bs.deathSaves += effect.deathSaves;
    if (effect.doubleAttack) bs.doubleAttack = true;

    if (effect.healPercent) {
        const newStats = computePlayerStats(player);
        const healAmt = Math.floor(newStats.hp * effect.healPercent);
        player.currentHp = Math.min(newStats.hp, player.currentHp + healAmt);
        addLog(`Healed ${healAmt} HP!`, 'log-spell');
    }
    if (effect.goldNow) {
        player.gold += effect.goldNow;
        addLog(`+${effect.goldNow} Gold!`, 'log-gold');
    }
    if (effect.unlockSpell) {
        if (!player.unlockedSpells.includes(effect.unlockSpell)) {
            player.unlockedSpells.push(effect.unlockSpell);
            const spell = SPELL_TEMPLATES.find(s => s.id === effect.unlockSpell);
            addLog(`Learned ${spell ? spell.name : effect.unlockSpell}!`, 'log-spell');
        }
    }

    // Apply HP increase
    if (effect.hp) {
        const newStats = computePlayerStats(player);
        player.maxHp = newStats.hp;
        player.currentHp = Math.min(player.currentHp + effect.hp, newStats.hp);
    }

    emit('sound', { freq: 800, type: 'sine', duration: 0.2 });
    addLog(`Gained: ${buff.name}!`, 'log-levelup');

    emit('buffSelected', { buff });

    // Continue to next room
    continueToNextRoom();
}

export function continueToNextRoom() {
    const session = getSession();
    const renderData = getRenderData();

    renderData.showBuffSelect = false;
    session.selectingBuff = false;

    session.state = 'playing';
    session.inBattle = true;

    spawnCreature();
    startBattleLoop();

    emit('roomContinue');
}
