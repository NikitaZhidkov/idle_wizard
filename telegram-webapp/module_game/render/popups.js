/**
 * Popup rendering - house select, tutorials, game over, victory, buff select
 */

import { HOUSE_DATA } from '../entities/index.js';
import { COLORS } from './constants.js';
import { getCtx, getCanvasWidth, getCanvasHeight } from './canvas.js';
import { renderButton } from './utils.js';

export function renderHouseSelect(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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

export function renderSpellTutorial(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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

export function renderShieldTutorial(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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

export function renderShieldMinigame(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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

export function renderBuffSelect(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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

export function renderRoomTransition(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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

export function renderGameOver(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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

export function renderVictory(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

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
