/**
 * Popup rendering - game over, victory, buff select
 */

import { COLORS } from './constants.js';
import { getCtx, getCanvasWidth, getCanvasHeight } from './canvas.js';
import { renderButton } from './utils.js';

export function renderBuffSelect(rd) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

    // Only darken the bottom half of the screen (UI area)
    const bottomHalfY = canvasHeight * 0.5;
    ctx.fillStyle = 'rgba(15, 15, 20, 0.85)';
    ctx.fillRect(0, bottomHalfY, canvasWidth, canvasHeight * 0.5);

    const centerX = canvasWidth / 2;
    // Center vertically in the bottom half
    const bottomHalfCenterY = bottomHalfY + (canvasHeight * 0.5) / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = '18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 Choose a reward:', centerX, bottomHalfCenterY - 70);

    const buffs = rd.buffChoices || [];
    const buffWidth = 90;
    const buffHeight = 100;
    const totalWidth = buffs.length * (buffWidth + 10) - 10;
    const startX = centerX - totalWidth / 2;
    const startY = bottomHalfCenterY - buffHeight / 2;

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
