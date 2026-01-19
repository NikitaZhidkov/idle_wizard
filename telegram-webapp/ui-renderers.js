// UI Renderers module - Tab rendering functions
// Extracted from main.js

import {
    MAGIC_TYPES, ABILITIES, CREATURES, BOSSES,
    SPELLS, SKILL_TREES, SHOP_ITEMS, BUFFS
} from './data.js';

import {
    game,
    playSound, formatNum, saveGame, getStats
} from './game.js';

// Sprite sheet configuration - imported from data.js for bestiary
import { SPRITE_SIZE, SPRITE_CELL, SPRITE_BORDER } from './data.js';

let creatureSpriteSheet = null;
let spriteSheetLoaded = false;

export function initUIRenderers(spriteSheet, isLoaded) {
    creatureSpriteSheet = spriteSheet;
    spriteSheetLoaded = isLoaded;
}

export function updateSpriteSheetStatus(isLoaded) {
    spriteSheetLoaded = isLoaded;
}

export function renderShop() {
    const container = document.getElementById('shopItems');
    if (!container) return;
    container.innerHTML = '';

    SHOP_ITEMS.forEach(item => {
        if (item.house && item.house !== game.house) return;

        const owned = game.owned.includes(item.id);
        const equipped = game.equipment[item.type] === item.id;
        const canAfford = game.gold >= item.price;
        const isRelic = item.type === 'relic';

        const div = document.createElement('div');
        div.className = `shop-item ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''} ${!owned && !canAfford && !isRelic ? 'locked' : ''}`;

        let stats = '';
        if (item.atk) stats += `+${item.atk} MAG `;
        if (item.def) stats += `+${item.def} SHD `;
        if (item.hp) stats += `+${item.hp} HP `;
        if (item.crit) stats += `+${item.crit}% CRT`;
        if (item.xpBonus) stats += `+${Math.floor(item.xpBonus * 100)}% XP`;

        div.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-name">${item.name}</div>
            <div class="item-stat">${stats}</div>
            ${item.magic ? `<div class="item-magic">${MAGIC_TYPES[item.magic].icon} ${MAGIC_TYPES[item.magic].name}</div>` : ''}
            <div class="item-price">${owned ? (equipped ? '✓ Equipped' : 'Equip') : (isRelic ? 'House Relic' : item.price + ' G')}</div>
        `;

        div.onclick = () => {
            if (owned) {
                game.equipment[item.type] = item.id;
                playSound(600, 'sine', 0.1);
            } else if (canAfford && !isRelic) {
                game.gold -= item.price;
                game.owned.push(item.id);
                game.equipment[item.type] = item.id;
                playSound(800, 'sine', 0.15);
            }
            renderShop();
            saveGame();
        };

        container.appendChild(div);
    });
}

export function renderSkillTree(addLogCallback) {
    const container = document.getElementById('treePaths');
    if (!container) return;
    container.innerHTML = '';

    for (const [key, tree] of Object.entries(SKILL_TREES)) {
        const pathDiv = document.createElement('div');
        pathDiv.className = 'tree-path';
        pathDiv.innerHTML = `
            <div class="path-header">
                <div class="path-icon">${tree.icon}</div>
                <div class="path-name" style="color:${tree.color}">${tree.name}</div>
            </div>
            <div class="tree-skills" id="tree-${key}"></div>
        `;
        container.appendChild(pathDiv);

        const skillsDiv = pathDiv.querySelector('.tree-skills');
        tree.skills.forEach(skill => {
            const unlocked = game.unlockedSkills.includes(skill.id);
            const hasReq = !skill.requires || game.unlockedSkills.includes(skill.requires);
            const canAfford = game.skillPoints >= skill.cost;
            const available = !unlocked && hasReq && canAfford;

            const skillDiv = document.createElement('div');
            skillDiv.className = `tree-skill ${unlocked ? 'unlocked' : ''} ${available ? 'available' : ''} ${!unlocked && !hasReq ? 'locked' : ''}`;
            skillDiv.innerHTML = `
                <div class="tree-skill-header">
                    <span class="tree-skill-icon">${skill.icon}</span>
                    <span class="tree-skill-name">${skill.name}</span>
                    <span class="tree-skill-cost">${unlocked ? '✓' : skill.cost}</span>
                </div>
                <div class="tree-skill-desc">${skill.desc}</div>
            `;

            skillDiv.onclick = () => {
                const isUnlocked = game.unlockedSkills.includes(skill.id);
                const meetsReq = !skill.requires || game.unlockedSkills.includes(skill.requires);
                const affordable = game.skillPoints >= skill.cost;

                if (isUnlocked) {
                    if (addLogCallback) addLogCallback(`Already learned ${skill.name}!`, 'log-spell');
                    return;
                }

                if (!meetsReq) {
                    if (addLogCallback) addLogCallback(`Requires previous skill first!`, 'log-resist');
                    playSound(300, 'square', 0.1);
                    return;
                }

                if (!affordable) {
                    if (addLogCallback) addLogCallback(`Need ${skill.cost} Study Points! (Have ${game.skillPoints})`, 'log-resist');
                    playSound(300, 'square', 0.1);
                    return;
                }

                game.skillPoints -= skill.cost;
                game.unlockedSkills.push(skill.id);
                playSound(1000, 'sine', 0.15);
                if (addLogCallback) addLogCallback(`Learned ${skill.name}!`, 'log-levelup');
                renderSkillTree(addLogCallback);
                saveGame();
            };

            skillsDiv.appendChild(skillDiv);
        });
    }
}

export function renderBestiary() {
    const container = document.getElementById('bestiaryList');
    if (!container) return;
    container.innerHTML = '';

    [...CREATURES, ...BOSSES].forEach(creature => {
        const discovered = game.discoveredCreatures.includes(creature.name);
        const div = document.createElement('div');
        div.className = `creature-entry ${!discovered ? 'unknown' : ''}`;

        const magic = MAGIC_TYPES[creature.magic];
        const weakTo = MAGIC_TYPES[magic.weakTo];

        const iconDiv = document.createElement('div');
        iconDiv.className = 'creature-icon';

        if (discovered && spriteSheetLoaded && creature.spriteX !== undefined && creatureSpriteSheet) {
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 48;
            canvas.style.width = '40px';
            canvas.style.height = '48px';
            const ctx = canvas.getContext('2d');

            const srcX = creature.spriteX * SPRITE_CELL + SPRITE_BORDER;
            const srcY = creature.spriteY * SPRITE_CELL + SPRITE_BORDER;
            ctx.drawImage(
                creatureSpriteSheet,
                srcX, srcY, SPRITE_SIZE, SPRITE_SIZE,
                0, 0, 40, 48
            );
            iconDiv.appendChild(canvas);
        } else {
            iconDiv.textContent = discovered ? creature.icon : '❓';
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = 'creature-info';
        infoDiv.innerHTML = `
            <div class="creature-title">
                ${discovered ? creature.name : '???'}
                ${discovered ? magic.icon : ''}
                ${creature.boss ? '👑' : ''}
            </div>
            ${discovered ? `
                <div class="creature-stats">HP: ${creature.hp} | ATK: ${creature.atk}</div>
                <div class="creature-weakness">Weak to: ${weakTo ? weakTo.icon + ' ' + weakTo.name : 'None'}</div>
                ${creature.abilities.length ? `<div class="creature-ability">Traits: ${creature.abilities.map(a => ABILITIES[a]?.icon || a).join(' ')}</div>` : ''}
            ` : '<div class="creature-stats">Defeat to discover</div>'}
        `;

        div.appendChild(iconDiv);
        div.appendChild(infoDiv);
        container.appendChild(div);
    });
}

export function renderSpellbook() {
    const container = document.getElementById('spellbookList');
    if (!container) return;
    container.innerHTML = '';

    SPELLS.forEach(spell => {
        const isUnlocked = game.unlockedSpells.includes(spell.id);
        const magic = MAGIC_TYPES[spell.magic];

        const div = document.createElement('div');
        div.className = `spell-entry ${isUnlocked ? 'unlocked' : 'locked'}`;

        div.innerHTML = `
            <div class="spell-entry-icon" style="color: ${spell.color}">${spell.icon}</div>
            <div class="spell-entry-info">
                <div class="spell-entry-name">
                    ${spell.name}
                    <span class="spell-entry-magic" style="background: ${magic.color}20; color: ${magic.color}">${magic.icon} ${magic.name}</span>
                </div>
                <div class="spell-entry-desc">${spell.desc}</div>
                <div class="spell-entry-cooldown">⏱️ Cooldown: ${spell.cooldown}s${spell.damage > 0 ? ` | 💥 Damage: ${spell.damage}x` : ''}${spell.heal ? ` | 💚 Heal: ${Math.floor(spell.heal * 100)}%` : ''}${spell.shield ? ` | 🛡️ Shield: ${Math.floor(spell.shield * 100)}%` : ''}</div>
            </div>
            <div class="spell-entry-status ${isUnlocked ? 'unlocked' : 'locked'}">${isUnlocked ? '✓ Learned' : '🔒 Locked'}</div>
        `;

        container.appendChild(div);
    });
}

export function renderActiveBuffs() {
    const container = document.getElementById('activeBuffs');
    if (!container) return;
    container.innerHTML = '';

    const buffCounts = {};
    game.activeBuffs.forEach(b => {
        if (!buffCounts[b.id]) buffCounts[b.id] = { ...b, count: 0 };
        buffCounts[b.id].count++;
    });

    Object.values(buffCounts).forEach(buff => {
        const div = document.createElement('div');
        div.className = 'active-buff';
        div.title = buff.name;
        div.innerHTML = `
            <span class="active-buff-icon">${buff.icon}</span>
            ${buff.count > 1 ? `<span class="active-buff-count">x${buff.count}</span>` : ''}
        `;
        container.appendChild(div);
    });
}

export function getRandomBuffs(count = 3) {
    const roll = Math.random() * 100;
    const floorBonus = Math.min(game.floor * 0.5, 15);

    let rarityPool;
    if (roll < 2 + floorBonus * 0.1) rarityPool = 'legendary';
    else if (roll < 10 + floorBonus * 0.3) rarityPool = 'epic';
    else if (roll < 40 + floorBonus) rarityPool = 'rare';
    else rarityPool = 'common';

    const available = BUFFS.filter(b => {
        if (b.effect.unlockSpell && game.unlockedSpells.includes(b.effect.unlockSpell)) return false;
        if (b.rarity === rarityPool) return true;
        if (rarityPool === 'legendary' && ['epic', 'rare'].includes(b.rarity)) return true;
        if (rarityPool === 'epic' && b.rarity === 'rare') return true;
        if (rarityPool === 'rare' && b.rarity === 'common') return true;
        return false;
    });

    const shuffled = available.sort(() => Math.random() - 0.5);
    const choices = [];

    for (const buff of shuffled) {
        if (choices.length >= count) break;
        if (!choices.find(c => c.id === buff.id)) {
            choices.push(buff);
        }
    }

    while (choices.length < count && shuffled.length > 0) {
        const buff = shuffled.pop();
        if (!choices.includes(buff)) choices.push(buff);
    }

    return choices;
}

export function renderBuffChoices(onSelectBuff) {
    const container = document.getElementById('buffChoices');
    if (!container) return;
    container.innerHTML = '';

    const choices = getRandomBuffs(2);

    choices.forEach(buff => {
        const div = document.createElement('div');
        div.className = 'buff-choice';
        div.innerHTML = `
            <div class="buff-header">
                <span class="buff-icon">${buff.icon}</span>
                <span class="buff-name">${buff.name}</span>
                <span class="buff-rarity ${buff.rarity}">${buff.rarity}</span>
            </div>
            <div class="buff-desc">${buff.desc}</div>
            <div class="buff-stats">${buff.stats}</div>
        `;
        div.onclick = () => onSelectBuff(buff);
        container.appendChild(div);
    });
}
