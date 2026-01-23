/**
 * Spawn System - creature spawning and death handling
 */

import {
    CONFIG,
    MAGIC_TYPES,
    CREATURE_TEMPLATES,
    BOSS_TEMPLATES,
    ENCOUNTER_ORDER,
    createCreatureState,
    computePlayerStats
} from '../entities/index.js';
import { emit } from './events.js';
import { getSession, getPlayer, getCreature, setCreature, addLog, addFloatingText, addParticles, getRenderData } from './state.js';

export function spawnCreature() {
    const session = getSession();
    const player = getPlayer();

    const encounter = ENCOUNTER_ORDER[player.encounterIndex];
    if (!encounter) {
        // Victory!
        import('./game-flow.js').then(({ triggerVictory }) => {
            triggerVictory();
        });
        return;
    }

    let template;
    let isBoss = false;

    if (encounter.type === 'boss') {
        template = BOSS_TEMPLATES[encounter.index];
        isBoss = true;
        addLog(`⚠️ BOSS: ${template.name}!`, 'log-boss');
        emit('sound', { freq: 200, type: 'sawtooth', duration: 0.3 });
    } else {
        template = CREATURE_TEMPLATES[encounter.index];
    }

    const creature = createCreatureState(template, player.floor, isBoss);
    setCreature(creature);
    session.creatureId = creature.id;
    session.turnCount = 0;

    // Reset player combat state
    player.combatBuffs = [];
    player.combatDebuffs = [];
    player.fearDebuff = false;
    player.poisonStacks = 0;

    emit('creatureSpawned', { creature });
}

export function handleCreatureDeath() {
    const session = getSession();
    const player = getPlayer();
    const creature = getCreature();
    const renderData = getRenderData();
    const stats = computePlayerStats(player);

    // Gold reward
    let goldGain = creature.gold;
    if (stats.goldBonus > 0) {
        goldGain = Math.floor(goldGain * (1 + stats.goldBonus));
    }
    player.gold += goldGain;
    player.totalGoldEarned += goldGain;
    player.runGold += goldGain;

    // Kill tracking
    player.totalKills++;
    player.runKills++;
    player.combo++;
    if (player.combo > player.maxCombo) {
        player.maxCombo = player.combo;
    }

    // Clear debuffs
    player.poisonStacks = Math.max(0, player.poisonStacks - 1);
    player.fearDebuff = false;
    player.combatBuffs = [];
    player.combatDebuffs = [];

    // Heal after kill
    const hpRestore = Math.floor(stats.hp * CONFIG.HEAL_AFTER_KILL_PERCENT);
    player.currentHp = Math.min(stats.hp, player.currentHp + hpRestore);
    if (hpRestore > 0) {
        addFloatingText(`+${hpRestore} HP`, 60, 140, 'heal');
    }

    // XP
    let expGain = 10 + player.floor * 5;
    if (stats.xpBonus) {
        expGain = Math.floor(expGain * (1 + stats.xpBonus));
    }
    player.exp += expGain;

    // Level up
    if (player.exp >= player.expToLevel) {
        player.level++;
        player.exp -= player.expToLevel;
        player.expToLevel = Math.floor(player.expToLevel * CONFIG.EXP_MULTIPLIER);
        player.currentHp = computePlayerStats(player).hp;
        addLog(`Year ${player.level}! +1 Study Point!`, 'log-levelup');
        emit('sound', { freq: 1000, type: 'sine', duration: 0.2 });
    }

    addFloatingText(`+${goldGain}`, 220, 140, 'gold');
    addParticles(220, 180, MAGIC_TYPES[creature.magic].color, 6);

    player.floor++;
    player.encounterIndex++;

    // Check victory
    if (player.encounterIndex >= ENCOUNTER_ORDER.length) {
        setCreature(null);
        session.creatureId = null;
        session.inBattle = false;
        setTimeout(() => {
            import('./game-flow.js').then(({ triggerVictory }) => {
                triggerVictory();
            });
        }, 400);
        return;
    }

    // Show buff selection
    setCreature(null);
    session.creatureId = null;
    session.inBattle = false;
    session.selectingBuff = true;
    session.lastGoldGain = goldGain;

    emit('creatureKilled', { goldGain });

    setTimeout(() => {
        import('./buffs.js').then(({ showBuffSelection }) => {
            showBuffSelection();
        });
    }, 400);
}
