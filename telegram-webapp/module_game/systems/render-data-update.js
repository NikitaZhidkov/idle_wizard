/**
 * Render data update system
 * Synchronizes game state with render data for display
 */

import { computePlayerStats } from '../entities/index.js';
import { getSession, getPlayer, getCreature, getRenderData, getFloatingTexts, getParticles, getBattleLog, updateEffects } from './state.js';

export function updateRenderData() {
    const session = getSession();
    const player = getPlayer();
    const creature = getCreature();
    const renderData = getRenderData();

    if (!renderData || !session || !player) return renderData;

    const stats = computePlayerStats(player);
    player.maxHp = stats.hp;
    if (player.currentHp > stats.hp) player.currentHp = stats.hp;

    // Update visual effects
    updateEffects();

    // Header
    renderData.gold = player.gold;
    renderData.gems = player.gems;
    renderData.level = player.level;
    renderData.floor = player.floor;
    renderData.skillPoints = 0;

    // Hero
    renderData.heroHp = player.currentHp;
    renderData.heroMaxHp = stats.hp;
    renderData.heroName = 'Hero';
    renderData.houseIcon = '⚔️';

    // Stats
    renderData.atk = stats.atk;
    renderData.def = stats.def;
    renderData.crit = stats.crit;
    renderData.hp = stats.hp;

    // Creature
    if (creature) {
        renderData.creatureName = creature.name;
        renderData.creatureHp = creature.hp;
        renderData.creatureMaxHp = creature.maxHp;
        renderData.creatureSpriteIndex = creature.spriteIndex;
        renderData.isBoss = creature.boss;
    } else {
        renderData.creatureName = '';
        renderData.creatureHp = 0;
        renderData.creatureMaxHp = 100;
        renderData.isBoss = false;
    }

    // Combo
    renderData.comboDisplay = player.combo > 1 ? `${player.combo}x Combo!` : '';

    // Active buffs
    const buffCounts = {};
    player.activeBuffs.forEach(b => {
        if (!buffCounts[b.id]) buffCounts[b.id] = { ...b, count: 0 };
        buffCounts[b.id].count++;
    });
    renderData.activeBuffs = Object.values(buffCounts).map(b => ({
        icon: b.icon,
        name: b.name,
        count: b.count
    }));

    // Battle log
    renderData.battleLog = getBattleLog();

    // Floating texts
    const floatingTexts = getFloatingTexts();
    const now = Date.now();
    renderData.floatingTexts = floatingTexts.map(ft => ({
        text: ft.text,
        x: ft.x,
        y: ft.y,
        type: ft.type,
        progress: (now - ft.startTime) / ft.duration
    }));

    // Particles
    const particles = getParticles();
    renderData.particles = particles.map(p => ({
        x: p.x,
        y: p.y,
        color: p.color,
        size: p.size,
        alpha: 1 - (now - p.startTime) / p.duration
    }));

    // Screen
    renderData.screen = 'battle';

    return renderData;
}
