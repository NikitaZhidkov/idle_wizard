/**
 * Hit testing - click/touch detection for interactive elements
 */

export function getClickTarget(x, y, canvasW, canvasH, layout, renderData) {
    // Check popups first
    if (renderData.showBuffSelect) {
        return getBuffSelectClick(x, y, canvasW, canvasH, renderData);
    }
    if (renderData.showGameOver || renderData.showVictory) {
        return { type: 'restart' };
    }
    if (renderData.showRoomTransition) {
        return { type: 'roomContinue' };
    }

    return null;
}

function getBuffSelectClick(x, y, canvasW, canvasH, renderData) {
    const buffs = renderData.buffChoices || [];
    if (buffs.length === 0) return null;

    const buffWidth = 90;
    const buffHeight = 100;
    const gap = 10;
    const totalWidth = buffs.length * (buffWidth + gap) - gap;
    const startX = canvasW / 2 - totalWidth / 2;
    // Match the rendering position: centered in bottom half of screen
    const bottomHalfY = canvasH * 0.5;
    const bottomHalfCenterY = bottomHalfY + (canvasH * 0.5) / 2;
    const startY = bottomHalfCenterY - buffHeight / 2;

    for (let i = 0; i < buffs.length; i++) {
        const bx = startX + i * (buffWidth + gap);
        if (x >= bx && x <= bx + buffWidth && y >= startY && y <= startY + buffHeight) {
            return { type: 'buffSelect', buffId: buffs[i].id };
        }
    }
    // Return null but don't propagate clicks during buff selection
    return { type: 'none' };
}
