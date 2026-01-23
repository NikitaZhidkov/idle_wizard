/**
 * RENDER MODULE (Presentation)
 * ============================
 * What it IS: the "hands" that draw
 * What it DOES:
 *   - Takes RenderData from Systems and draws to Canvas
 *   - Handles technical concerns only (layers, sorting, camera, batching)
 * What it MUST NOT do:
 *   - Change Entities
 *   - Contain gameplay rules
 */

import { CONFIG, HOUSE_DATA, ABILITIES, SHIELD_ICONS } from './entities.js';

// ============ CANVAS STATE ============

let canvas = null;
let ctx = null;
let canvasWidth = 360;
let canvasHeight = 700;

// Images
let heroImage = null;
let creatureSpriteSheet = null;
let heroImageLoaded = false;
let spriteSheetLoaded = false;

// Animation
let animationFrame = null;
let lastFrameTime = 0;
const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;

// ============ LAYOUT CONSTANTS ============

const LAYOUT = {
    HEADER_HEIGHT: 50,
    TABS_HEIGHT: 36,
    TABS_PADDING: 4,
    BATTLE_AREA_HEIGHT: 200,
    BATTLE_AREA_MARGIN: 8,
    BUFFS_HEIGHT: 30,
    SPELL_BAR_HEIGHT: 50,
    SPELL_PADDING: 6,
    BATTLE_LOG_HEIGHT: 80,
    STATS_BAR_HEIGHT: 50,
    STATS_BAR_MARGIN: 8
};

// ============ COLORS ============

const COLORS = {
    background: '#1a1a2e',
    headerBg: '#16213e',
    gold: '#ffd700',
    silver: '#c0c0c0',
    text: '#ffffff',
    textMuted: '#a0a0a8',
    border: '#3a3a5e',
    tabBg: 'rgba(90, 80, 70, 0.25)',
    tabActiveBg: 'rgba(90, 80, 70, 0.5)',
    tabBorder: '#5a5048',
    tabActiveBorder: '#c9a857',
    tabText: '#c8c4bc',
    battleAreaBorder: '#3d3a35',
    battleAreaBg: 'rgba(30, 28, 35, 0.8)',
    groundColor: '#3a3530',
    spellReady: 'rgba(90, 80, 70, 0.6)',
    spellCooldown: 'rgba(50, 45, 40, 0.6)',
    spellBlocked: 'rgba(80, 40, 40, 0.6)',
    spellBorder: '#5a5048',
    spellReadyBorder: '#c9a857',
    buffBg: 'rgba(70, 65, 90, 0.6)',
    statusBg: 'rgba(60, 55, 80, 0.7)',
    logBg: 'rgba(20, 20, 30, 0.8)',
    logText: '#c8c4bc',
    logGold: '#c9a857',
    logSpell: '#a987c9',
    logEffective: '#7bc96a',
    logResist: '#c96a6a',
    logBoss: '#ff6b6b',
    logLevelup: '#ffd700',
    panelBg: 'rgba(30, 28, 40, 0.9)',
    popupBg: 'rgba(15, 15, 20, 0.95)',
    healthPlayer: '#4ecdc4',
    healthEnemy: '#ff6b6b',
    healthLow: '#ff6b6b',
    healthMid: '#ffe66d'
};

// ============ INITIALIZATION ============

let onClickCallback = null;

export function initRenderer(containerElement, onClick) {
    onClickCallback = onClick;

    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.style.display = 'block';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';

    ctx = canvas.getContext('2d');

    containerElement.innerHTML = '';
    containerElement.appendChild(canvas);

    loadImages();
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    return { canvas, ctx };
}

function loadImages() {
    heroImage = new Image();
    heroImage.onload = () => { heroImageLoaded = true; };
    heroImage.src = '../hero.png';

    creatureSpriteSheet = new Image();
    creatureSpriteSheet.onload = () => { spriteSheetLoaded = true; };
    creatureSpriteSheet.src = '../creatures.png?v=5';
}

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
}

// ============ INPUT HANDLING ============

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    processClick(x, y);
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    processClick(x, y);
}

function processClick(x, y) {
    const scaleX = canvasWidth / canvas.clientWidth;
    const scaleY = canvasHeight / canvas.clientHeight;
    x *= scaleX;
    y *= scaleY;

    if (onClickCallback) {
        onClickCallback(x, y, canvasWidth, canvasHeight, LAYOUT);
    }
}

// ============ MAIN RENDER ============

export function render(renderData) {
    if (!ctx || !renderData) return;

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Base UI
    renderHeader(renderData);
    renderTabs(renderData);

    if (renderData.screen === 'battle') {
        renderBattleTab(renderData);
    }

    // Effects
    renderFloatingTexts(renderData);
    renderParticles(renderData);

    // Popups (in order of priority)
    if (renderData.showRoomTransition) renderRoomTransition(renderData);
    if (renderData.showBuffSelect) renderBuffSelect(renderData);
    if (renderData.showShieldMinigame) renderShieldMinigame(renderData);
    if (renderData.showShieldTutorial) renderShieldTutorial(renderData);
    if (renderData.showSpellTutorial) renderSpellTutorial(renderData);
    if (renderData.showGameOver) renderGameOver(renderData);
    if (renderData.showVictory) renderVictory(renderData);
    if (renderData.showHouseSelect) renderHouseSelect(renderData);
}

// ============ HEADER ============

function renderHeader(rd) {
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, 0, canvasWidth, LAYOUT.HEADER_HEIGHT);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, LAYOUT.HEADER_HEIGHT - 1);
    ctx.lineTo(canvasWidth, LAYOUT.HEADER_HEIGHT - 1);
    ctx.stroke();

    // Left - Currency
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${formatNum(rd.gold)} Galleons`, 12, 16);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Arial';
    ctx.fillText(`${rd.gems} Sickles | ${rd.skillPoints} XP`, 12, 34);

    // Right - Level/Floor
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Year ${rd.level}`, canvasWidth - 12, 16);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Arial';
    ctx.fillText(`Floor: ${rd.floor}`, canvasWidth - 12, 34);
}

// ============ TABS ============

function renderTabs(rd) {
    const tabs = [
        { id: 'battle', label: '⚔️ Duel' },
        { id: 'spellbook', label: '📜 Spells' },
        { id: 'skills', label: '📚 Studies' },
        { id: 'shop', label: '🏪 Diagon' },
        { id: 'bestiary', label: '📖 Creatures' }
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

// ============ BATTLE TAB ============

function renderBattleTab(rd) {
    renderBattleArea(rd);
    renderActiveBuffs(rd);
    renderSpellBar(rd);
    renderBattleLog(rd);
    renderStatsBar(rd);
}

function renderBattleArea(rd) {
    const startY = LAYOUT.HEADER_HEIGHT + LAYOUT.TABS_HEIGHT + LAYOUT.BATTLE_AREA_MARGIN;
    const areaWidth = canvasWidth - LAYOUT.BATTLE_AREA_MARGIN * 2;
    const areaHeight = LAYOUT.BATTLE_AREA_HEIGHT;
    const x = LAYOUT.BATTLE_AREA_MARGIN;

    // Background
    const gradient = ctx.createLinearGradient(x, startY, x, startY + areaHeight);
    gradient.addColorStop(0, '#2a2535');
    gradient.addColorStop(1, '#1e1a28');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, startY, areaWidth, areaHeight, 12);
    ctx.fill();

    ctx.strokeStyle = COLORS.battleAreaBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ground
    const groundHeight = 30;
    const groundY = startY + areaHeight - groundHeight;
    ctx.fillStyle = COLORS.groundColor;
    ctx.beginPath();
    ctx.roundRect(x + 2, groundY, areaWidth - 4, groundHeight - 2, [0, 0, 10, 10]);
    ctx.fill();

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
    if (heroImageLoaded && heroImage) {
        ctx.drawImage(heroImage, x, y + 10, 55, 75);
    } else {
        ctx.font = '40px Arial';
        ctx.fillText('🧙', x + 27, y + 50);
    }
}

function renderCreature(rd, x, y) {
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
    if (spriteSheetLoaded && creatureSpriteSheet) {
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
        ctx.drawImage(creatureSpriteSheet, sx, sy, srcWidth, CONFIG.SPRITE_SIZE, 0, 0, destWidth, renderSize);
        ctx.restore();
    } else {
        ctx.font = '35px Arial';
        ctx.fillText('🐉', x + renderSize / 2, y + 45);
    }
}

function renderCreatureAbilities(rd, rightX, topY) {
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

function renderActiveBuffs(rd) {
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

function renderSpellBar(rd) {
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

function renderBattleLog(rd) {
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

function renderStatsBar(rd) {
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

// ============ FLOATING TEXTS & PARTICLES ============

function renderFloatingTexts(rd) {
    const texts = rd.floatingTexts || [];

    texts.forEach(ft => {
        const alpha = 1 - ft.progress;
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 16px Georgia';
        ctx.textAlign = 'center';

        if (ft.type === 'damage') ctx.fillStyle = '#ff6b6b';
        else if (ft.type === 'heal') ctx.fillStyle = '#4ecdc4';
        else if (ft.type === 'gold') ctx.fillStyle = COLORS.gold;
        else if (ft.type === 'crit') ctx.fillStyle = '#ff4444';
        else if (ft.type === 'effective') ctx.fillStyle = '#7bc96a';
        else if (ft.type === 'resist') ctx.fillStyle = '#c96a6a';
        else if (ft.type === 'spell') ctx.fillStyle = '#a987c9';
        else ctx.fillStyle = COLORS.text;

        const yOffset = ft.progress * 30;
        ctx.fillText(ft.text, ft.x, ft.y - yOffset);
        ctx.globalAlpha = 1;
    });
}

function renderParticles(rd) {
    const particles = rd.particles || [];

    particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
}

// ============ POPUPS ============

function renderHouseSelect(rd) {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const popupWidth = Math.min(320, canvasWidth - 40);
    const popupHeight = 380;
    const startX = centerX - popupWidth / 2;
    const startY = canvasHeight / 2 - popupHeight / 2;

    ctx.fillStyle = '#252530';
    ctx.beginPath();
    ctx.roundRect(startX, startY, popupWidth, popupHeight, 12);
    ctx.fill();

    ctx.strokeStyle = '#6a6050';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = COLORS.gold;
    ctx.font = '20px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🎩 The Sorting Hat', centerX, startY + 30);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText('Choose your house wisely...', centerX, startY + 55);

    const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
    const optHeight = 60;

    houses.forEach((house, i) => {
        const h = HOUSE_DATA[house];
        const oy = startY + 75 + i * (optHeight + 8);

        ctx.fillStyle = 'rgba(60, 55, 70, 0.8)';
        ctx.beginPath();
        ctx.roundRect(startX + 10, oy, popupWidth - 20, optHeight, 8);
        ctx.fill();

        ctx.strokeStyle = '#5a5048';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.text;
        ctx.fillText(h.icon, startX + 20, oy + 28);

        ctx.font = 'bold 14px Georgia';
        ctx.fillText(h.name, startX + 55, oy + 22);

        const bonusText = house === 'gryffindor' ? '+20% ATK, -10% DEF' :
                         house === 'slytherin' ? '+10% ATK, +5% Crit' :
                         house === 'ravenclaw' ? '+8% Crit, +20% XP' :
                         '+15% HP, +10% DEF';

        ctx.font = '10px Georgia';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(bonusText, startX + 55, oy + 38);

        ctx.fillStyle = COLORS.gold;
        ctx.fillText(`Spell: ${h.spell}`, startX + 55, oy + 52);
    });
}

function renderSpellTutorial(rd) {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const page = rd.spellTutorialPage;

    if (page === 1) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('🧙 Welcome, Young Wizard!', centerX, centerY - 80);

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Georgia';
        ctx.fillText('Your journey at Hogwarts begins now!', centerX, centerY - 40);
        ctx.fillText('Let me teach you how to cast spells.', centerX, centerY - 20);

        ctx.font = '50px Arial';
        ctx.fillText('⚔️🪄✨', centerX, centerY + 40);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '11px Georgia';
        ctx.fillText("You'll fight creatures automatically,", centerX, centerY + 80);
        ctx.fillText('but spells give you special powers!', centerX, centerY + 95);
    } else if (page === 2) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ Attack Spells', centerX, centerY - 80);

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Georgia';
        ctx.fillText('💥 Deal Extra Damage', centerX, centerY - 45);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '12px Georgia';
        ctx.fillText('Tap a spell button to cast it!', centerX, centerY - 20);
        ctx.fillText('Attack spells deal damage and apply', centerX, centerY);
        ctx.fillText('effects like stun, burn, or poison.', centerX, centerY + 20);

        ctx.font = '30px Arial';
        ctx.fillText('⚡ → 🐉 → -50 💥', centerX, centerY + 60);
    } else {
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('💚 Healing & Buffs', centerX, centerY - 80);

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Georgia';
        ctx.fillText('🛡️ Protect Yourself', centerX, centerY - 45);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '12px Georgia';
        ctx.fillText('Some spells heal you or give you buffs!', centerX, centerY - 20);
        ctx.fillText('Use them when your health is low', centerX, centerY);
        ctx.fillText('or to boost your power.', centerX, centerY + 20);

        ctx.font = '30px Arial';
        ctx.fillText('💚 → 🧙 → +30% ❤️', centerX, centerY + 60);
    }

    const btnText = page < 3 ? 'Next →' : 'Start Playing! ⚔️';
    renderButton(centerX - 80, centerY + 110, 160, 44, btnText, '#c9a857', '#a08040');

    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i + 1 === page ? COLORS.gold : COLORS.textMuted;
        ctx.beginPath();
        ctx.arc(centerX - 20 + i * 20, centerY + 170, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderShieldTutorial(rd) {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ Shield Magic Tutorial', centerX, centerY - 100);

    ctx.fillStyle = COLORS.text;
    ctx.font = '13px Georgia';
    ctx.fillText('The boss is casting spells at you!', centerX, centerY - 60);
    ctx.fillText('Watch the color of the incoming spell', centerX, centerY - 40);
    ctx.fillText('and tap the matching shield button!', centerX, centerY - 20);

    const btnSize = 40;
    const btns = [
        { icon: '🔥', color: '#8a3030' },
        { icon: '💧', color: '#303080' },
        { icon: '⚡', color: '#807830' },
        { icon: '🌿', color: '#308030' }
    ];
    const totalWidth = 4 * btnSize + 3 * 10;
    const startX = centerX - totalWidth / 2;

    btns.forEach((btn, i) => {
        const bx = startX + i * (btnSize + 10);
        ctx.fillStyle = btn.color;
        ctx.beginPath();
        ctx.roundRect(bx, centerY + 10, btnSize, btnSize, 8);
        ctx.fill();

        ctx.font = '20px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.fillText(btn.icon, bx + btnSize / 2, centerY + 35);
    });

    ctx.fillStyle = COLORS.gold;
    ctx.font = '12px Georgia';
    ctx.fillText('⬇️ Tap the matching color! ⬇️', centerX, centerY + 70);

    renderButton(centerX - 90, centerY + 100, 180, 44, "Got it! Let's go!", '#4a9060', '#3a7050');
}

function renderShieldMinigame(rd) {
    ctx.fillStyle = 'rgba(15, 15, 25, 0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ Block the incoming spell!', centerX, 80);

    // Flying spells
    const spells = rd.shieldSpells || [];
    spells.forEach(spell => {
        if (spell.flying) {
            ctx.font = '30px Arial';
            ctx.fillStyle = spell.color === 'red' ? '#ff4444' :
                           spell.color === 'blue' ? '#4488ff' :
                           spell.color === 'yellow' ? '#ffdd44' : '#44dd44';
            ctx.fillText('✨', spell.x, spell.y);
        }
    });

    // Shield buttons
    const btnSize = 60;
    const btnPadding = 15;
    const colors = [
        { name: 'red', bg: '#8a3030', icon: '🔥' },
        { name: 'blue', bg: '#303080', icon: '💧' },
        { name: 'yellow', bg: '#807830', icon: '⚡' },
        { name: 'green', bg: '#308030', icon: '🌿' }
    ];
    const totalWidth = 4 * btnSize + 3 * btnPadding;
    const startX = centerX - totalWidth / 2;
    const btnY = canvasHeight - 120;

    colors.forEach((c, i) => {
        const bx = startX + i * (btnSize + btnPadding);
        const isHighlighted = rd.shieldHighlightColor === c.name;

        ctx.fillStyle = c.bg;
        ctx.beginPath();
        ctx.roundRect(bx, btnY, btnSize, btnSize, 12);
        ctx.fill();

        if (isHighlighted) {
            ctx.strokeStyle = COLORS.gold;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowColor = COLORS.gold;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.fillText(c.icon, bx + btnSize / 2, btnY + btnSize / 2 + 8);
    });

    // Timer bar
    const timerWidth = totalWidth;
    const timerHeight = 8;
    const timerX = startX;
    const timerY = btnY - 30;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(timerX, timerY, timerWidth, timerHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.roundRect(timerX, timerY, timerWidth * (rd.shieldTimer / 100), timerHeight, 4);
    ctx.fill();

    // Result
    if (rd.shieldResult) {
        ctx.fillStyle = rd.shieldResult.includes('Blocked') ? '#4ecdc4' : '#ff6b6b';
        ctx.font = 'bold 16px Georgia';
        ctx.fillText(rd.shieldResult, centerX, btnY - 50);
    }
}

function renderBuffSelect(rd) {
    ctx.fillStyle = 'rgba(15, 15, 20, 0.85)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = '18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 Choose a reward:', centerX, centerY - 70);

    const buffs = rd.buffChoices || [];
    const buffWidth = 90;
    const buffHeight = 100;
    const totalWidth = buffs.length * (buffWidth + 10) - 10;
    const startX = centerX - totalWidth / 2;
    const startY = centerY - buffHeight / 2;

    buffs.forEach((buff, i) => {
        const bx = startX + i * (buffWidth + 10);

        ctx.fillStyle = 'rgba(60, 55, 80, 0.9)';
        ctx.beginPath();
        ctx.roundRect(bx, startY, buffWidth, buffHeight, 8);
        ctx.fill();

        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '30px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText(buff.icon, bx + buffWidth / 2, startY + 35);

        ctx.font = '10px Georgia';
        ctx.fillText(buff.name, bx + buffWidth / 2, startY + 60);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px Georgia';

        const words = (buff.desc || '').split(' ');
        let line = '';
        let lineY = startY + 75;
        words.forEach(word => {
            const test = line + word + ' ';
            if (ctx.measureText(test).width > buffWidth - 10) {
                ctx.fillText(line, bx + buffWidth / 2, lineY);
                line = word + ' ';
                lineY += 10;
            } else {
                line = test;
            }
        });
        ctx.fillText(line, bx + buffWidth / 2, lineY);
    });
}

function renderRoomTransition(rd) {
    ctx.fillStyle = 'rgba(20, 20, 28, 0.95)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 24px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Victory! ✨', centerX, centerY - 50);

    ctx.fillStyle = COLORS.text;
    ctx.font = '16px Georgia';
    ctx.fillText(`+${rd.roomTransitionData.loot} Galleons`, centerX, centerY - 15);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText(`Room ${rd.roomTransitionData.nextRoom} awaits...`, centerX, centerY + 15);

    renderButton(centerX - 75, centerY + 40, 150, 44, 'Continue', '#6a9a70', '#5a8a60');
}

function renderGameOver(rd) {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 24px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('☠️ Defeated!', centerX, centerY - 80);

    ctx.fillStyle = COLORS.text;
    ctx.font = '16px Georgia';
    ctx.fillText(`Reached Floor ${rd.gameOverData.floor}`, centerX, centerY - 50);

    ctx.font = '14px Georgia';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`🗡️ Creatures defeated: ${rd.gameOverData.kills}`, centerX, centerY - 15);
    ctx.fillText(`💰 Gold earned: ${rd.gameOverData.gold}`, centerX, centerY + 10);
    ctx.fillText(`🔥 Max combo: ${rd.gameOverData.combo}`, centerX, centerY + 35);

    renderButton(centerX - 75, centerY + 60, 150, 44, 'Try Again', '#c07070', '#a05050');
}

function renderVictory(rd) {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 24px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ Victory! ⚡', centerX, centerY - 80);

    ctx.fillStyle = COLORS.gold;
    ctx.font = '16px Georgia';
    ctx.fillText('You defeated Voldemort!', centerX, centerY - 50);

    ctx.font = '14px Georgia';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`🗡️ Creatures defeated: ${rd.victoryData.kills}`, centerX, centerY - 15);
    ctx.fillText(`💰 Gold earned: ${rd.victoryData.gold}`, centerX, centerY + 10);
    ctx.fillText(`🔥 Max combo: ${rd.victoryData.combo}`, centerX, centerY + 35);

    renderButton(centerX - 75, centerY + 60, 150, 44, 'Play Again', '#ffd700', '#cc9900');
}

function renderButton(x, y, width, height, text, colorTop, colorBottom) {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBottom);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
}

// ============ UTILITIES ============

function formatNum(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ============ HIT TESTING (for click handling) ============

export function getClickTarget(x, y, canvasW, canvasH, layout, renderData) {
    // Check popups first
    if (renderData.showHouseSelect) {
        return getHouseSelectClick(x, y, canvasW, canvasH);
    }
    if (renderData.showSpellTutorial) {
        return { type: 'tutorialNext' };
    }
    if (renderData.showShieldTutorial) {
        return { type: 'shieldTutorialStart' };
    }
    if (renderData.showShieldMinigame) {
        return getShieldMinigameClick(x, y, canvasW, canvasH);
    }
    if (renderData.showBuffSelect) {
        return getBuffSelectClick(x, y, canvasW, canvasH, renderData);
    }
    if (renderData.showGameOver || renderData.showVictory) {
        return { type: 'restart' };
    }
    if (renderData.showRoomTransition) {
        return { type: 'roomContinue' };
    }

    // Check spell bar
    const spellBarY = layout.HEADER_HEIGHT + layout.TABS_HEIGHT + layout.TABS_PADDING + layout.BATTLE_AREA_HEIGHT + layout.BATTLE_AREA_MARGIN + layout.BUFFS_HEIGHT;
    if (y >= spellBarY && y <= spellBarY + layout.SPELL_BAR_HEIGHT) {
        return getSpellClick(x, y, canvasW, renderData, spellBarY);
    }

    return null;
}

function getHouseSelectClick(x, y, canvasW, canvasH) {
    const centerX = canvasW / 2;
    const popupWidth = Math.min(320, canvasW - 40);
    const startX = centerX - popupWidth / 2;
    const startY = canvasH / 2 - 190;

    const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
    const optHeight = 60;
    const houseY = startY + 75;

    for (let i = 0; i < houses.length; i++) {
        const oy = houseY + i * (optHeight + 8);
        if (x >= startX + 10 && x <= startX + popupWidth - 10 &&
            y >= oy && y <= oy + optHeight) {
            return { type: 'houseSelect', house: houses[i] };
        }
    }
    return null;
}

function getShieldMinigameClick(x, y, canvasW, canvasH) {
    const btnSize = 60;
    const btnPadding = 15;
    const totalWidth = 4 * btnSize + 3 * btnPadding;
    const startX = canvasW / 2 - totalWidth / 2;
    const btnY = canvasH - 120;

    const colors = ['red', 'blue', 'yellow', 'green'];

    for (let i = 0; i < colors.length; i++) {
        const bx = startX + i * (btnSize + btnPadding);
        if (x >= bx && x <= bx + btnSize && y >= btnY && y <= btnY + btnSize) {
            return { type: 'shieldPress', color: colors[i] };
        }
    }
    return null;
}

function getBuffSelectClick(x, y, canvasW, canvasH, renderData) {
    const buffs = renderData.buffChoices || [];
    if (buffs.length === 0) return null;

    const buffWidth = 90;
    const buffHeight = 100;
    const totalWidth = buffs.length * (buffWidth + 10) - 10;
    const startX = canvasW / 2 - totalWidth / 2;
    const startY = canvasH / 2 - buffHeight / 2;

    for (let i = 0; i < buffs.length; i++) {
        const bx = startX + i * (buffWidth + 10);
        if (x >= bx && x <= bx + buffWidth && y >= startY && y <= startY + buffHeight) {
            return { type: 'buffSelect', buffId: buffs[i].id };
        }
    }
    return null;
}

function getSpellClick(x, y, canvasW, renderData, spellBarY) {
    const spells = renderData.spells || [];
    if (spells.length === 0) return null;

    const spellSize = 44;
    const spellPadding = 6;
    const totalWidth = spells.length * (spellSize + spellPadding) - spellPadding;
    const startX = (canvasW - totalWidth) / 2;

    for (let i = 0; i < spells.length; i++) {
        const sx = startX + i * (spellSize + spellPadding);
        if (x >= sx && x <= sx + spellSize && y >= spellBarY + 3 && y <= spellBarY + 3 + spellSize) {
            const spell = spells[i];
            if (spell.isReady && !spell.isBlocked) {
                return { type: 'spellCast', spellId: spell.id };
            }
        }
    }
    return null;
}

export function getCanvas() { return canvas; }
