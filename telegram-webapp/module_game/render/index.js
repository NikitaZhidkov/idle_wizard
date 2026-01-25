/**
 * Render module - main entry point
 */

import { LAYOUT, COLORS } from './constants.js';
import { initRenderer, getCanvas, getCtx, getCanvasWidth, getCanvasHeight, renderBackground, scrollBackground } from './canvas.js';
import { renderBattleArea } from './battle-area.js';
import { renderHeader, renderTabs, renderActiveBuffs, renderBattleLog, renderStatsBar } from './ui.js';
import { renderFloatingTexts, renderParticles } from './effects.js';
import {
    renderBuffSelect,
    renderRoomTransition,
    renderGameOver,
    renderVictory
} from './popups.js';
import { getClickTarget } from './hit-test.js';

// Main render function
export function render(renderData) {
    const ctx = getCtx();
    const canvasWidth = getCanvasWidth();
    const canvasHeight = getCanvasHeight();

    if (!ctx || !renderData) return;

    // Clear entire canvas first
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw background (covers top 50%)
    renderBackground();

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
    if (renderData.showGameOver) renderGameOver(renderData);
    if (renderData.showVictory) renderVictory(renderData);
}

function renderBattleTab(rd) {
    renderBattleArea(rd);
    renderActiveBuffs(rd);
    // Spell bar removed - only bonuses now
    renderBattleLog(rd);
    renderStatsBar(rd);
}

// Re-exports
export { initRenderer, getCanvas, scrollBackground } from './canvas.js';
export { getClickTarget } from './hit-test.js';
export { LAYOUT, COLORS } from './constants.js';
