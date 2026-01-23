/**
 * Visual effects - floating texts and particles
 */

import { COLORS } from './constants.js';
import { getCtx } from './canvas.js';

export function renderFloatingTexts(rd) {
    const ctx = getCtx();
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

export function renderParticles(rd) {
    const ctx = getCtx();
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
