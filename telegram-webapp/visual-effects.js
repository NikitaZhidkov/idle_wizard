// Visual effects module - particles, floating text, spell visuals
// Extracted from main.js

// Spell visual icons
export const SPELL_VISUALS = {
    spark: '✨', bolt: '⚡', fire: '🔥', ice: '❄️', wind: '💨', push: '🌀',
    cut: '✂️', explode: '💥', bomb: '💣', slash: '🗡️', torture: '⛓️',
    hellfire: '🔥👹', heal: '💚', healbig: '💖', shield: '🛡️',
    patronus: '🦌', death: '💀', snake: '🐍', plant: '🌿', light: '💡'
};

let battleArea = null;

export function initVisualEffects(battleAreaElement) {
    battleArea = battleAreaElement;
}

export function showFloat(text, x, y, type = '') {
    if (!battleArea) return;
    const el = document.createElement('div');
    el.className = `floating-text ${type}`;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    battleArea.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

export function createParticles(x, y, color, count = 5) {
    if (!battleArea) return;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left = (x + Math.random() * 25 - 12) + 'px';
        p.style.top = (y + Math.random() * 25 - 12) + 'px';
        p.style.width = p.style.height = (4 + Math.random() * 6) + 'px';
        p.style.background = color;
        battleArea.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }
}

export function spellEffect(x, y, color) {
    if (!battleArea) return;
    const el = document.createElement('div');
    el.className = 'spell-effect';
    el.style.left = (x - 15) + 'px';
    el.style.top = (y - 15) + 'px';
    el.style.background = `radial-gradient(circle, ${color}, transparent)`;
    battleArea.appendChild(el);
    setTimeout(() => el.remove(), 500);
}

export function castSpellVisual(spell, targetX, targetY) {
    if (!battleArea) return;
    const visual = spell.visual || 'bolt';
    const icon = SPELL_VISUALS[visual] || '✨';
    const color = spell.color || '#ffffff';

    const el = document.createElement('div');
    el.className = `spell-visual ${visual}`;
    el.textContent = icon;
    el.style.left = targetX + 'px';
    el.style.top = targetY + 'px';
    el.style.color = color;
    battleArea.appendChild(el);

    const duration = visual === 'patronus' ? 800 : (visual === 'heal' || visual === 'healbig') ? 600 : 500;
    setTimeout(() => el.remove(), duration);
}

export function shakeScreen() {
    if (!battleArea) return;
    battleArea.classList.add('shake');
    setTimeout(() => battleArea.classList.remove('shake'), 150);
}
