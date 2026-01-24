/**
 * Battle area rendering - hero, creature, abilities
 */

import { CONFIG } from '../entities/index.js';
import { LAYOUT, COLORS } from './constants.js';
import { getCtx, getCanvasWidth, getHeroImage, getCreatureSpriteSheet, isHeroImageLoaded, isSpriteSheetLoaded } from './canvas.js';

export function renderBattleArea(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();

    const startY = LAYOUT.HEADER_HEIGHT + LAYOUT.TABS_HEIGHT + LAYOUT.BATTLE_AREA_MARGIN;
    const areaWidth = canvasWidth - LAYOUT.BATTLE_AREA_MARGIN * 2;
    const areaHeight = LAYOUT.BATTLE_AREA_HEIGHT;
    const x = LAYOUT.BATTLE_AREA_MARGIN;

    // Ground Y position (used for placing hero/creature)
    const groundHeight = 30;
    const groundY = startY + areaHeight - groundHeight;

    // Boss indicator
    if (rd.isBoss) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '16px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ BOSS!', canvasWidth / 2, startY + 20);
    }

    // Combo
    if (rd.comboDisplay) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = '12px Georgia';
        ctx.textAlign = 'right';
        ctx.fillText(rd.comboDisplay, x + areaWidth - 10, startY + 20);
    }

    // Hero
    const heroX = x + 50;
    const heroY = groundY - 75;
    renderHero(rd, heroX, heroY);

    // Creature
    if (rd.creatureName) {
        const creatureX = x + areaWidth - 110;
        const creatureY = groundY - 80;
        renderCreature(rd, creatureX, creatureY);
    }

    // Creature abilities
    renderCreatureAbilities(rd, x + areaWidth - 10, startY + 40);

    // House icon
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(rd.houseIcon, canvasWidth / 2, startY + areaHeight + 15);
}

function renderHero(rd, x, y) {
    const ctx = getCtx();

    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(rd.heroName, x + 27, y - 5);

    // Health bar
    const barWidth = 50;
    const barHeight = 6;
    const barX = x + 2;
    const barY = y + 2;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = rd.heroHp / rd.heroMaxHp;
    const hpColor = hpPercent > 0.5 ? COLORS.healthPlayer : hpPercent > 0.25 ? COLORS.healthMid : COLORS.healthLow;
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    // Sprite
    const heroImage = getHeroImage();
    if (isHeroImageLoaded() && heroImage) {
        ctx.drawImage(heroImage, x, y + 10, 55, 75);
    } else {
        ctx.font = '40px Arial';
        ctx.fillText('🧙', x + 27, y + 50);
    }
}

function renderCreature(rd, x, y) {
    const ctx = getCtx();
    const renderSize = 70;

    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(rd.creatureName, x + renderSize / 2, y - 5);

    // Health bar
    const barWidth = 60;
    const barHeight = 6;
    const barX = x + (renderSize - barWidth) / 2;
    const barY = y + 2;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = rd.creatureHp / rd.creatureMaxHp;
    ctx.fillStyle = COLORS.healthEnemy;
    ctx.fillRect(barX, barY, barWidth * Math.max(0, hpPercent), barHeight);

    // Sprite
    const spriteSheet = getCreatureSpriteSheet();
    if (isSpriteSheetLoaded() && spriteSheet) {
        const spriteIndex = rd.creatureSpriteIndex;
        const col = spriteIndex % CONFIG.SPRITE_COLS;
        const row = Math.floor(spriteIndex / CONFIG.SPRITE_COLS);
        const sx = CONFIG.SPRITE_BORDER + col * CONFIG.SPRITE_STRIDE;
        const sy = CONFIG.SPRITE_BORDER + row * CONFIG.SPRITE_STRIDE;
        const srcWidth = CONFIG.SPRITE_SIZE - 3;
        const destWidth = renderSize * (srcWidth / CONFIG.SPRITE_SIZE);

        ctx.save();
        ctx.translate(x + renderSize, y + 10);
        ctx.scale(-1, 1);
        ctx.drawImage(spriteSheet, sx, sy, srcWidth, CONFIG.SPRITE_SIZE, 0, 0, destWidth, renderSize);
        ctx.restore();
    } else {
        ctx.font = '35px Arial';
        ctx.fillText('🐉', x + renderSize / 2, y + 45);
    }
}

function renderCreatureAbilities(rd, rightX, topY) {
    const ctx = getCtx();
    const abilities = [...(rd.creatureAbilities || [])];

    if (rd.creatureHasShield) {
        abilities.push({ icon: '🛡️' });
    }

    if (abilities.length === 0) return;

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';

    abilities.forEach((ab, i) => {
        const iconX = rightX - i * 24 - 12;

        ctx.fillStyle = COLORS.statusBg;
        ctx.beginPath();
        ctx.arc(iconX, topY, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COLORS.text;
        ctx.fillText(ab.icon, iconX, topY + 4);
    });
}
