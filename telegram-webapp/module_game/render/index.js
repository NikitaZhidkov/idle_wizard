/**
 * Render module - main entry point
 */

import { LAYOUT, COLORS } from './constants.js';
import { initRenderer, getCanvas, getCtx, getCanvasWidth, getCanvasHeight } from './canvas.js';
import { renderBattleArea } from './battle-area.js';
import { renderHeader, renderTabs, renderActiveBuffs, renderSpellBar, renderBattleLog, renderStatsBar } from './ui.js';
import { renderFloatingTexts, renderParticles } from './effects.js';
import {
    renderHouseSelect,
    renderSpellTutorial,
    renderShieldTutorial,
    renderShieldMinigame,
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

function renderBattleTab(rd) {
    renderBattleArea(rd);
    renderActiveBuffs(rd);
    renderSpellBar(rd);
    renderBattleLog(rd);
    renderStatsBar(rd);
}

// Re-exports
export { initRenderer, getCanvas } from './canvas.js';
export { getClickTarget } from './hit-test.js';
export { LAYOUT, COLORS } from './constants.js';
