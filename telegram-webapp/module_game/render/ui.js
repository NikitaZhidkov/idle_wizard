/**
 * UI rendering - header, tabs, spell bar, stats bar, battle log, buffs
 */

import { LAYOUT, COLORS } from './constants.js';
import { getCtx, getCanvasWidth, getCanvasHeight } from './canvas.js';
import { formatNum } from './utils.js';

export function renderHeader(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();


    // Left - Currency
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${formatNum(rd.gold)} Gold`, 12, 16);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Arial';
    ctx.fillText(`${rd.gems} Gems | ${rd.skillPoints} XP`, 12, 34);

    // Right - Level/Floor
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Level ${rd.level}`, canvasWidth - 12, 16);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Arial';
    ctx.fillText(`Floor: ${rd.floor}`, canvasWidth - 12, 34);
}

export function renderTabs(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();

    const tabs = [
        { id: 'battle', label: '⚔️ Battle' },
        { id: 'inventory', label: '🎒 Items' },
        { id: 'skills', label: '📊 Stats' },
        { id: 'shop', label: '🏪 Shop' },
        { id: 'bestiary', label: '📖 Bestiary' }
    ];

    const startY = LAYOUT.HEADER_HEIGHT + LAYOUT.TABS_PADDING;
    const tabWidth = (canvasWidth - LAYOUT.TABS_PADDING * 6) / 5;
    const tabHeight = LAYOUT.TABS_HEIGHT - LAYOUT.TABS_PADDING * 2;

    tabs.forEach((tab, i) => {
        const x = LAYOUT.TABS_PADDING + i * (tabWidth + LAYOUT.TABS_PADDING);
        const isActive = rd.screen === tab.id;

        ctx.fillStyle = isActive ? COLORS.tabActiveBg : COLORS.tabBg;
        ctx.beginPath();
        ctx.roundRect(x, startY, tabWidth, tabHeight, 6);
        ctx.fill();

        ctx.strokeStyle = isActive ? COLORS.tabActiveBorder : COLORS.tabBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = COLORS.tabText;
        ctx.font = '10px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tab.label, x + tabWidth / 2, startY + tabHeight / 2);
    });
}

export function renderActiveBuffs(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();

    const startY = LAYOUT.HEADER_HEIGHT + LAYOUT.TABS_HEIGHT + LAYOUT.TABS_PADDING + LAYOUT.BATTLE_AREA_HEIGHT + LAYOUT.BATTLE_AREA_MARGIN;
    const buffs = rd.activeBuffs || [];

    if (buffs.length === 0) return;

    const buffSize = 24;
    const totalWidth = buffs.length * (buffSize + 4) - 4;
    const startX = (canvasWidth - totalWidth) / 2;

    ctx.font = '16px Arial';
    ctx.textAlign = 'center';

    buffs.forEach((buff, i) => {
        const bx = startX + i * (buffSize + 4) + buffSize / 2;
        const by = startY + LAYOUT.BUFFS_HEIGHT / 2;

        ctx.fillStyle = COLORS.buffBg;
        ctx.beginPath();
        ctx.roundRect(bx - buffSize / 2, by - buffSize / 2, buffSize, buffSize, 4);
        ctx.fill();

        ctx.fillStyle = COLORS.text;
        ctx.fillText(buff.icon, bx, by + 4);

        if (buff.count > 1) {
            ctx.font = '10px Arial';
            ctx.fillStyle = COLORS.gold;
            ctx.fillText(`x${buff.count}`, bx + buffSize / 2 - 4, by + buffSize / 2);
            ctx.font = '16px Arial';
        }
    });
}

export function renderSpellBar(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();

    const startY = LAYOUT.HEADER_HEIGHT + LAYOUT.TABS_HEIGHT + LAYOUT.TABS_PADDING + LAYOUT.BATTLE_AREA_HEIGHT + LAYOUT.BATTLE_AREA_MARGIN + LAYOUT.BUFFS_HEIGHT;
    const spells = rd.spells || [];

    if (spells.length === 0) return;

    const spellSize = 44;
    const spellPadding = 6;
    const totalWidth = spells.length * (spellSize + spellPadding) - spellPadding;
    const startX = (canvasWidth - totalWidth) / 2;

    spells.forEach((spell, i) => {
        const sx = startX + i * (spellSize + spellPadding);
        const sy = startY + 3;

        let bgColor = spell.isBlocked ? COLORS.spellBlocked : spell.isReady ? COLORS.spellReady : COLORS.spellCooldown;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(sx, sy, spellSize, spellSize, 8);
        ctx.fill();

        ctx.strokeStyle = spell.isReady && !spell.isBlocked ? COLORS.spellReadyBorder : COLORS.spellBorder;
        ctx.lineWidth = spell.isReady && !spell.isBlocked ? 2 : 1;
        ctx.stroke();

        ctx.font = '20px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText(spell.icon, sx + spellSize / 2, sy + spellSize / 2);

        if (spell.cooldown > 0) {
            ctx.font = '10px Arial';
            ctx.fillStyle = COLORS.textMuted;
            ctx.fillText(`${spell.cooldown}s`, sx + spellSize / 2, sy + spellSize - 6);
        }
    });
}

export function renderBattleLog(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();

    const startY = LAYOUT.HEADER_HEIGHT + LAYOUT.TABS_HEIGHT + LAYOUT.TABS_PADDING + LAYOUT.BATTLE_AREA_HEIGHT + LAYOUT.BATTLE_AREA_MARGIN + LAYOUT.BUFFS_HEIGHT + LAYOUT.SPELL_BAR_HEIGHT + LAYOUT.SPELL_PADDING;
    const logWidth = canvasWidth - LAYOUT.BATTLE_AREA_MARGIN * 2;
    const x = LAYOUT.BATTLE_AREA_MARGIN;

    ctx.fillStyle = COLORS.logBg;
    ctx.beginPath();
    ctx.roundRect(x, startY, logWidth, LAYOUT.BATTLE_LOG_HEIGHT, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    const entries = rd.battleLog || [];
    if (entries.length === 0) return;

    ctx.font = '11px Georgia';
    ctx.textAlign = 'left';

    const lineHeight = 12;
    const padding = 6;
    const maxLines = Math.floor((LAYOUT.BATTLE_LOG_HEIGHT - padding * 2) / lineHeight);
    const visible = entries.slice(-maxLines);

    visible.forEach((entry, i) => {
        const entryY = startY + padding + i * lineHeight + 8;

        let color = COLORS.logText;
        if (entry.type === 'log-gold') color = COLORS.logGold;
        else if (entry.type === 'log-spell') color = COLORS.logSpell;
        else if (entry.type === 'log-effective') color = COLORS.logEffective;
        else if (entry.type === 'log-resist') color = COLORS.logResist;
        else if (entry.type === 'log-boss') color = COLORS.logBoss;
        else if (entry.type === 'log-levelup') color = COLORS.logLevelup;

        ctx.fillStyle = color;
        ctx.fillText(entry.text, x + padding, entryY, logWidth - padding * 2);
    });
}

export function renderStatsBar(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();

    const startY = LAYOUT.HEADER_HEIGHT + LAYOUT.TABS_HEIGHT + LAYOUT.TABS_PADDING + LAYOUT.BATTLE_AREA_HEIGHT + LAYOUT.BATTLE_AREA_MARGIN + LAYOUT.BUFFS_HEIGHT + LAYOUT.SPELL_BAR_HEIGHT + LAYOUT.SPELL_PADDING + LAYOUT.BATTLE_LOG_HEIGHT + LAYOUT.STATS_BAR_MARGIN;
    const barWidth = canvasWidth - LAYOUT.BATTLE_AREA_MARGIN * 2;
    const x = LAYOUT.BATTLE_AREA_MARGIN;

    ctx.fillStyle = COLORS.panelBg;
    ctx.beginPath();
    ctx.roundRect(x, startY, barWidth, LAYOUT.STATS_BAR_HEIGHT, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    const stats = [
        { value: rd.atk, label: 'MAGIC', color: '#ff6b6b' },
        { value: rd.def, label: 'SHIELD', color: '#4ecdc4' },
        { value: rd.crit + '%', label: 'CRIT', color: '#ffe66d' },
        { value: rd.hp, label: 'HP', color: '#95e1d3' }
    ];

    const statWidth = barWidth / 4;

    stats.forEach((stat, i) => {
        const sx = x + i * statWidth + statWidth / 2;

        ctx.fillStyle = stat.color;
        ctx.font = 'bold 16px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(stat.value.toString(), sx, startY + 18);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '10px Georgia';
        ctx.fillText(stat.label, sx, startY + 34);
    });

    // Health bar
    const hpBarY = startY + LAYOUT.STATS_BAR_HEIGHT - 8;
    const hpBarWidth = barWidth - 16;
    const hpBarX = x + 8;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(hpBarX, hpBarY, hpBarWidth, 4, 2);
    ctx.fill();

    const hpPercent = rd.heroHp / rd.heroMaxHp;
    const hpColor = hpPercent > 0.5 ? '#4ecdc4' : hpPercent > 0.25 ? '#ffe66d' : '#ff6b6b';
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(hpBarX, hpBarY, hpBarWidth * hpPercent, 4, 2);
    ctx.fill();
}
