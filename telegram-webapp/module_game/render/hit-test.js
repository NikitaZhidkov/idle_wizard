/**
 * Hit testing - click/touch detection for interactive elements
 */

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

    // Spell bar removed - only bonuses now

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
