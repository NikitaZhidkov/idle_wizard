// Main entry point - imports and initializes all modules
// This orchestrates the modular game components

import {
    SPRITE_SIZE, SPRITE_CELL, SPRITE_BORDER,
    MAGIC_TYPES, ABILITIES, CREATURES, BOSSES,
    SPELLS, SKILL_TREES, SHOP_ITEMS, ROOM_THEMES,
    BUFFS, SHIELD_COLORS
} from './data.js';

import {
    game, currentCreature, creatureHp, creatureBuffs, turnCount,
    shieldGame, battleInterval, spellTutorialPage,
    setCurrentCreature, setCreatureHp, setCreatureBuffs, setTurnCount,
    setShieldGame, setBattleInterval, setSpellTutorialPage,
    playSound, formatNum, saveGame, getSkillEffect, hasSkill, getStats, getMagicMultiplier,
    calculateOffline
} from './game.js';

// Make functions available globally for onclick handlers in HTML
window.nextSpellTutorialPage = nextSpellTutorialPage;
window.finishSpellTutorial = finishSpellTutorial;

// ============ GLOBAL DOM REFERENCES ============
let battleArea, battleLog, heroCanvas, creatureCanvas, heroCtx, creatureCtx;
let heroImage, creatureSpriteSheet;
let spriteSheetLoaded = false;

// ============ UI FUNCTIONS ============

function initUI() {
    battleArea = document.getElementById('battleArea');
    battleLog = document.getElementById('battleLog');
    heroCanvas = document.getElementById('heroCanvas');
    creatureCanvas = document.getElementById('creatureCanvas');
    heroCtx = heroCanvas.getContext('2d');
    creatureCtx = creatureCanvas.getContext('2d');

    // Load hero image
    heroImage = new Image();
    heroImage.src = 'hero.png';

    // Load creature sprite sheet
    creatureSpriteSheet = new Image();
    creatureSpriteSheet.crossOrigin = 'anonymous';
    creatureSpriteSheet.onload = () => {
        console.log('Sprite sheet loaded:', creatureSpriteSheet.width, 'x', creatureSpriteSheet.height);
        spriteSheetLoaded = true;
        if (currentCreature) drawCreature();
    };
    creatureSpriteSheet.onerror = (e) => console.error('Failed to load sprite sheet:', e);
    creatureSpriteSheet.src = 'creatures.png?v=3';
}

function updateUI() {
    const stats = getStats();
    game.maxHp = stats.hp;
    if (game.currentHp > stats.hp) game.currentHp = stats.hp;

    document.getElementById('gold').textContent = `${formatNum(game.gold)} Galleons`;
    document.getElementById('gems').textContent = `${game.gems} Sickles | ${game.skillPoints} XP`;
    document.getElementById('level').textContent = `Year ${game.level}`;
    document.getElementById('floor').textContent = `Floor: ${game.floor}`;
    document.getElementById('availableSP').textContent = game.skillPoints;

    document.getElementById('atkStat').textContent = stats.atk;
    document.getElementById('defStat').textContent = stats.def;
    document.getElementById('critStat').textContent = stats.crit + '%';
    document.getElementById('hpStat').textContent = stats.hp;

    document.getElementById('playerHealth').style.width = `${(game.currentHp / stats.hp) * 100}%`;

    const comboEl = document.getElementById('comboDisplay');
    comboEl.textContent = game.combo > 1 ? `${game.combo}x Combo!` : '';

    document.getElementById('floorDisplay').textContent = game.floor % 5 === 0 ? '⚠️ BOSS!' : '';

    renderSpellBar();
    renderCreatureStatus();
}

function addLog(text, type = '') {
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = text;
    battleLog.appendChild(entry);
    battleLog.scrollTop = battleLog.scrollHeight;
    while (battleLog.children.length > 12) battleLog.removeChild(battleLog.firstChild);
}

function showFloat(text, x, y, type = '') {
    const el = document.createElement('div');
    el.className = `floating-text ${type}`;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    battleArea.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

function createParticles(x, y, color, count = 5) {
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

function spellEffect(x, y, color) {
    const el = document.createElement('div');
    el.className = 'spell-effect';
    el.style.left = (x - 15) + 'px';
    el.style.top = (y - 15) + 'px';
    el.style.background = `radial-gradient(circle, ${color}, transparent)`;
    battleArea.appendChild(el);
    setTimeout(() => el.remove(), 500);
}

const SPELL_VISUALS = {
    spark: '✨', bolt: '⚡', fire: '🔥', ice: '❄️', wind: '💨', push: '🌀',
    cut: '✂️', explode: '💥', bomb: '💣', slash: '🗡️', torture: '⛓️',
    hellfire: '🔥👹', heal: '💚', healbig: '💖', shield: '🛡️',
    patronus: '🦌', death: '💀', snake: '🐍', plant: '🌿', light: '💡'
};

function castSpellVisual(spell, targetX, targetY) {
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

function renderSpellBar() {
    const container = document.getElementById('spellsContainer');
    container.innerHTML = '';

    SPELLS.forEach(spell => {
        if (!game.unlockedSpells.includes(spell.id)) return;

        const cd = game.spellCooldowns[spell.id] || 0;
        const div = document.createElement('div');
        div.className = `spell ${cd <= 0 ? 'ready' : 'on-cooldown'}`;
        div.innerHTML = `
            ${spell.icon}
            <span class="spell-cooldown">${cd > 0 ? cd + 's' : ''}</span>
            <span class="spell-type">${MAGIC_TYPES[spell.magic].icon}</span>
        `;
        div.title = `${spell.name}: ${spell.desc}`;
        div.onclick = () => castSpell(spell);
        container.appendChild(div);
    });
}

function renderCreatureStatus() {
    const container = document.getElementById('creatureStatus');
    container.innerHTML = '';
    if (!currentCreature) return;

    currentCreature.abilities.forEach(ab => {
        const ability = ABILITIES[ab];
        if (ability) {
            const div = document.createElement('div');
            div.className = 'status-icon';
            div.textContent = ability.icon;
            div.title = ability.name;
            container.appendChild(div);
        }
    });

    if (creatureBuffs.shield) {
        const div = document.createElement('div');
        div.className = 'status-icon';
        div.textContent = '🛡️';
        container.appendChild(div);
    }
}

function renderBattleCreatureCard() {
    if (!currentCreature) {
        document.getElementById('battleCreatureCard').style.display = 'none';
        return;
    }

    const card = document.getElementById('battleCreatureCard');
    card.style.display = 'flex';

    drawCreature();

    const isBoss = currentCreature.boss;
    const nameEl = document.getElementById('battleCreatureName');
    const shortName = currentCreature.name.split(' ').pop();
    nameEl.textContent = isBoss ? `👑 ${shortName}` : shortName;

    const hpPercent = (creatureHp / currentCreature.maxHp) * 100;
    document.getElementById('creatureHealth').style.width = `${Math.max(0, hpPercent)}%`;
}

function updateBattleCreatureHp() {
    if (!currentCreature) return;
    const hpPercent = (creatureHp / currentCreature.maxHp) * 100;
    document.getElementById('creatureHealth').style.width = `${Math.max(0, hpPercent)}%`;
}

function generateRoom() {
    const seed = game.floor + game.roomSeed;
    const seededRandom = () => {
        const x = Math.sin(seed * 9999 + Math.random() * 100) * 10000;
        return x - Math.floor(x);
    };

    const themeIndex = (game.floor + Math.floor(seededRandom() * 3)) % ROOM_THEMES.length;
    const theme = ROOM_THEMES[themeIndex];

    const battleAreaEl = document.getElementById('battleArea');
    const roomGround = document.getElementById('roomGround');
    const magicParticles = document.getElementById('magicParticles');

    battleAreaEl.style.background = `linear-gradient(180deg, ${theme.bg[0]} 0%, ${theme.bg[1]} 100%)`;
    roomGround.style.background = `linear-gradient(180deg, ${theme.ground} 0%, ${theme.bg[1]} 100%)`;

    const particleX1 = 20 + seededRandom() * 30;
    const particleX2 = 50 + seededRandom() * 30;
    magicParticles.style.background = `
        radial-gradient(circle at ${particleX1}% 40%, ${theme.particles} 0%, transparent 50%),
        radial-gradient(circle at ${particleX2}% 60%, ${theme.particles} 0%, transparent 50%)
    `;

    document.querySelectorAll('.room-decor').forEach(el => el.remove());

    const decorCount = 3 + Math.floor(seededRandom() * 3);
    for (let i = 0; i < decorCount; i++) {
        const decor = document.createElement('div');
        decor.className = 'room-decor';
        decor.textContent = theme.decor[Math.floor(seededRandom() * theme.decor.length)];
        decor.style.left = (5 + seededRandom() * 85) + '%';
        decor.style.top = (10 + seededRandom() * 50) + '%';
        decor.style.opacity = 0.3 + seededRandom() * 0.4;
        decor.style.fontSize = (12 + seededRandom() * 10) + 'px';
        decor.style.transform = `rotate(${seededRandom() * 30 - 15}deg)`;
        battleAreaEl.appendChild(decor);
    }

    game.roomSeed = Math.floor(Math.random() * 10000);
}

function showRoomTransition(goldGain) {
    game.inBattle = false;
    game.lastGoldGain = goldGain;
    game.selectingBuff = true;

    const transition = document.getElementById('roomTransition');
    document.getElementById('roomLoot').textContent = `+${formatNum(goldGain)} Galleons`;
    document.getElementById('roomNext').textContent = `Room ${game.floor} awaits...`;

    transition.classList.add('active');

    document.getElementById('buffSelectionPanel').style.display = 'block';
    renderBuffChoices();

    playSound(600, 'sine', 0.15);
}

function getRandomBuffs(count = 3) {
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

function renderBuffChoices() {
    const container = document.getElementById('buffChoices');
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
        div.onclick = () => selectBuff(buff);
        container.appendChild(div);
    });
}

function selectBuff(buff) {
    game.activeBuffs.push({ id: buff.id, name: buff.name, icon: buff.icon });

    const effect = buff.effect;
    const bs = game.buffStats;

    if (effect.atk) bs.atk += effect.atk;
    if (effect.def) bs.def += effect.def;
    if (effect.hp) bs.hp += effect.hp;
    if (effect.crit) bs.crit += effect.crit;
    if (effect.critDmg) bs.critDmg += effect.critDmg;
    if (effect.goldBonus) bs.goldBonus += effect.goldBonus;
    if (effect.xpBonus) bs.xpBonus += effect.xpBonus;
    if (effect.lifesteal) bs.lifesteal += effect.lifesteal;
    if (effect.regenFlat) bs.regenFlat += effect.regenFlat;
    if (effect.dodge) bs.dodge += effect.dodge;
    if (effect.thorns) bs.thorns += effect.thorns;
    if (effect.executeDmg) bs.executeDmg += effect.executeDmg;
    if (effect.spellPower) bs.spellPower += effect.spellPower;
    if (effect.deathSaves) bs.deathSaves += effect.deathSaves;
    if (effect.doubleAttack) bs.doubleAttack = true;

    if (effect.healNow) {
        const stats = getStats();
        game.currentHp = Math.min(stats.hp, game.currentHp + effect.healNow);
        addLog(`Healed ${effect.healNow} HP!`, 'log-spell');
    }
    if (effect.fullHeal) {
        const stats = getStats();
        game.currentHp = stats.hp;
        addLog('Fully healed!', 'log-spell');
    }
    if (effect.goldNow) {
        game.gold += effect.goldNow;
        addLog(`+${effect.goldNow} Gold!`, 'log-gold');
    }
    if (effect.unlockSpell) {
        if (!game.unlockedSpells.includes(effect.unlockSpell)) {
            game.unlockedSpells.push(effect.unlockSpell);
            const spell = SPELLS.find(s => s.id === effect.unlockSpell);
            addLog(`Learned ${spell ? spell.name : effect.unlockSpell}!`, 'log-spell');
            renderSpellBar();
        }
    }

    if (effect.hp) {
        const stats = getStats();
        game.maxHp = stats.hp;
        game.currentHp = Math.min(game.currentHp + effect.hp, stats.hp);
    }

    playSound(800, 'sine', 0.2);
    addLog(`Gained: ${buff.name}!`, 'log-levelup');

    renderActiveBuffs();
    updateUI();
    saveGame();

    continueToNextRoom();
}

function renderActiveBuffs() {
    const container = document.getElementById('activeBuffs');
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

function continueToNextRoom() {
    const transition = document.getElementById('roomTransition');
    transition.classList.remove('active');

    document.getElementById('buffSelectionPanel').style.display = 'none';

    game.selectingBuff = false;

    generateRoom();
    game.inBattle = true;
    spawnCreature();
}

function drawWizard() {
    heroCtx.clearRect(0, 0, 55, 75);
    if (heroImage && heroImage.complete) {
        heroCtx.drawImage(heroImage, 0, 0, 55, 75);
    }
}

function drawCreature() {
    if (!currentCreature) return;
    creatureCtx.clearRect(0, 0, 50, 60);

    const magic = MAGIC_TYPES[currentCreature.magic];

    if (spriteSheetLoaded && currentCreature.spriteX !== undefined) {
        const srcX = currentCreature.spriteX * SPRITE_CELL + SPRITE_BORDER;
        const srcY = currentCreature.spriteY * SPRITE_CELL + SPRITE_BORDER;
        creatureCtx.save();
        creatureCtx.scale(-1, 1);
        creatureCtx.drawImage(
            creatureSpriteSheet,
            srcX, srcY, SPRITE_SIZE, SPRITE_SIZE,
            -50, 0, 50, 60
        );
        creatureCtx.restore();
    } else {
        creatureCtx.fillStyle = magic.color;
        creatureCtx.fillRect(12, 22, 26, 26);
        creatureCtx.beginPath();
        creatureCtx.arc(25, 15, 12, 0, Math.PI * 2);
        creatureCtx.fill();
        creatureCtx.fillStyle = currentCreature.magic === 'DARK' ? '#ff0000' : '#fff';
        creatureCtx.fillRect(18, 12, 5, 5);
        creatureCtx.fillRect(28, 12, 5, 5);
    }

    document.getElementById('creatureMagic').textContent = magic.icon;
}

function renderShop() {
    const container = document.getElementById('shopItems');
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
            drawWizard();
            renderShop();
            updateUI();
            saveGame();
        };

        container.appendChild(div);
    });
}

function renderSkillTree() {
    const container = document.getElementById('treePaths');
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
                    addLog(`Already learned ${skill.name}!`, 'log-spell');
                    return;
                }

                if (!meetsReq) {
                    addLog(`Requires previous skill first!`, 'log-resist');
                    playSound(300, 'square', 0.1);
                    return;
                }

                if (!affordable) {
                    addLog(`Need ${skill.cost} Study Points! (Have ${game.skillPoints})`, 'log-resist');
                    playSound(300, 'square', 0.1);
                    return;
                }

                game.skillPoints -= skill.cost;
                game.unlockedSkills.push(skill.id);
                playSound(1000, 'sine', 0.15);
                addLog(`Learned ${skill.name}!`, 'log-levelup');
                renderSkillTree();
                renderSpellBar();
                updateUI();
                saveGame();
            };

            skillsDiv.appendChild(skillDiv);
        });
    }
}

function renderBestiary() {
    const container = document.getElementById('bestiaryList');
    container.innerHTML = '';

    [...CREATURES, ...BOSSES].forEach(creature => {
        const discovered = game.discoveredCreatures.includes(creature.name);
        const div = document.createElement('div');
        div.className = `creature-entry ${!discovered ? 'unknown' : ''}`;

        const magic = MAGIC_TYPES[creature.magic];
        const weakTo = MAGIC_TYPES[magic.weakTo];

        const iconDiv = document.createElement('div');
        iconDiv.className = 'creature-icon';

        if (discovered && spriteSheetLoaded && creature.spriteX !== undefined) {
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

function renderSpellbook() {
    const container = document.getElementById('spellbookList');
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

function gameOver() {
    game.gameStarted = false;
    if (game.floor > game.bestFloor) game.bestFloor = game.floor;

    document.getElementById('gameoverFloor').textContent = `Reached Floor ${game.floor}`;
    document.getElementById('gameoverKills').textContent = game.runKills;
    document.getElementById('gameoverGold').textContent = formatNum(game.runGold);
    document.getElementById('gameoverCombo').textContent = game.maxCombo;
    document.getElementById('gameoverPopup').style.display = 'flex';

    playSound(150, 'sawtooth', 0.3);
    saveGame();
}

function restartGame() {
    // Stop any running battle interval first
    if (battleInterval) {
        clearInterval(battleInterval);
        setBattleInterval(null);
    }

    // Stop shield minigame timer if running
    if (shieldGame.timerInterval) {
        clearInterval(shieldGame.timerInterval);
    }

    // Reset all game state - equivalent to a fresh page load
    game.gold = 0;
    game.gems = 0;
    game.level = 1;
    game.floor = 1;
    game.exp = 0;
    game.expToLevel = 100;
    game.currentHp = 100;
    game.maxHp = 100;
    game.bestFloor = 0;
    game.totalKills = 0;
    game.totalGoldEarned = 0;
    game.discoveredCreatures = [];
    game.equipment = { wand: null, robe: null, amulet: null, book: null, relic: null };
    game.owned = [];
    game.skillPoints = 0;
    game.unlockedSkills = [];
    game.combo = 0;
    game.maxCombo = 0;
    game.spellCooldowns = {};
    game.poisonStacks = 0;
    game.fearDebuff = false;
    game.felixUsed = false;
    game.runKills = 0;
    game.runGold = 0;
    game.houseChosen = false;
    game.house = null;
    game.gameStarted = false;
    game.inBattle = false;
    game.selectingBuff = false;
    game.roomSeed = 0;
    game.lastGoldGain = 0;
    game.combatBuffs = [];
    game.combatDebuffs = [];
    game.unlockedSpells = [];
    game.activeBuffs = [];
    game.buffStats = { atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0, goldBonus: 0, xpBonus: 0, lifesteal: 0, regenFlat: 0, dodge: 0, thorns: 0, executeDmg: 0, spellPower: 0, deathSaves: 0, doubleAttack: false };
    // Reset tutorial flags so tutorials show again on new game
    game.spellTutorialDone = false;
    game.shieldTutorialDone = false;

    // Reset all battle state
    setCurrentCreature(null);
    setCreatureHp(0);
    setCreatureBuffs({});
    setTurnCount(0);

    // Reset shield minigame state completely
    setShieldGame({
        active: false,
        currentColor: null,
        timeLeft: 0,
        timerInterval: null,
        isTutorial: false,
        bossSpellQueue: [],
        spellsBlocked: 0,
        spellsMissed: 0,
        tutorialShown: false
    });

    // Hide all popups and overlays
    document.getElementById('gameoverPopup').style.display = 'none';
    document.getElementById('buffSelectionPanel').style.display = 'none';
    document.getElementById('shieldMinigame').classList.remove('active');
    document.getElementById('shieldTutorialOverlay').style.display = 'none';
    document.getElementById('spellTutorialOverlay').style.display = 'none';
    document.getElementById('roomTransition').classList.remove('active');

    // Clear battle log
    if (battleLog) {
        battleLog.innerHTML = '';
    }

    renderActiveBuffs();
    updateUI();

    // Clear saved game so it starts fresh
    localStorage.removeItem('wizardDuels');

    showHouseSelection();
}

function showHouseSelection() {
    document.getElementById('houseSelectPopup').style.display = 'flex';
}

function updateHouseDisplay() {
    const houseIcons = {
        gryffindor: '🦁',
        slytherin: '🐍',
        ravenclaw: '🦅',
        hufflepuff: '🦡'
    };
    const houseNames = {
        gryffindor: 'Gryffindor',
        slytherin: 'Slytherin',
        ravenclaw: 'Ravenclaw',
        hufflepuff: 'Hufflepuff'
    };
    if (game.house) {
        document.getElementById('currentHouseIcon').textContent = houseIcons[game.house];
        document.getElementById('currentHouseName').textContent = houseNames[game.house];
    }
}

function selectHouse(house) {
    game.house = house;
    game.houseChosen = true;
    game.runKills = 0;
    game.runGold = 0;
    game.roomSeed = Math.floor(Math.random() * 10000);
    game.activeBuffs = [];
    game.buffStats = { atk: 0, def: 0, hp: 0, crit: 0, critDmg: 0, goldBonus: 0, xpBonus: 0, lifesteal: 0, regenFlat: 0, dodge: 0, thorns: 0, executeDmg: 0, spellPower: 0, deathSaves: 0, doubleAttack: false };

    const relicMap = {
        gryffindor: 'gryffindor_sword',
        slytherin: 'slytherin_locket',
        ravenclaw: 'ravenclaw_diadem',
        hufflepuff: 'hufflepuff_cup'
    };
    const relicId = relicMap[house];
    game.owned.push(relicId);
    game.equipment.relic = relicId;

    const spellMap = {
        gryffindor: 'expelliarmus',
        slytherin: 'serpensortia',
        ravenclaw: 'lumos',
        hufflepuff: 'herbivicus'
    };
    game.unlockedSpells = [spellMap[house]];

    updateHouseDisplay();

    document.getElementById('houseSelectPopup').style.display = 'none';

    const stats = getStats();
    game.currentHp = stats.hp;
    game.maxHp = stats.hp;

    generateRoom();
    drawWizard();
    renderShop();
    renderSkillTree();
    renderBestiary();
    renderActiveBuffs();
    renderSpellBar();
    updateUI();
    spawnCreature();
    saveGame();

    addLog(`Welcome to ${house.charAt(0).toUpperCase() + house.slice(1)}!`, 'log-levelup');

    if (!game.spellTutorialDone) {
        showSpellTutorial();
    } else {
        game.gameStarted = true;
        game.inBattle = true;
        startBattle();
    }
}

function showOffline(rewards) {
    document.getElementById('offlineGold').textContent = `+${formatNum(rewards.gold)} Galleons`;
    document.getElementById('offlinePopup').style.display = 'flex';
    document.getElementById('offlineClaimBtn').onclick = () => {
        game.gold += rewards.gold;
        game.totalGoldEarned += rewards.gold;
        document.getElementById('offlinePopup').style.display = 'none';
        updateUI();
        saveGame();
    };
}

// ============ BATTLE SYSTEM ============

function calculateBalancedEnemy() {
    const stats = getStats();

    const avgCritMult = 1 + (stats.crit / 100) * stats.critDmg;
    const playerDPS = stats.atk * avgCritMult;

    const effectiveDefense = stats.def * 0.4;
    const dodgeMultiplier = 1 - (stats.dodge / 100);

    const targetTurnsToKill = 5 + Math.random() * 3;
    const targetDamageToPlayer = stats.hp * (0.3 + Math.random() * 0.2);

    const enemyHP = Math.floor(playerDPS * targetTurnsToKill * (0.8 + Math.random() * 0.2));

    const rawDamageNeeded = targetDamageToPlayer / targetTurnsToKill;
    const damageBeforeDefense = rawDamageNeeded / dodgeMultiplier;
    const enemyATK = Math.floor(damageBeforeDefense + effectiveDefense * 0.3);

    const difficultyFactor = (enemyHP + enemyATK * 10) / 100;
    const enemyGold = Math.floor(10 + difficultyFactor * (1 + game.floor * 0.1));

    return { hp: enemyHP, atk: enemyATK, gold: enemyGold };
}

function spawnCreature() {
    setTurnCount(0);
    setCreatureBuffs({});
    game.fearDebuff = false;

    const isBoss = game.floor % 5 === 0;
    let template;

    if (isBoss) {
        const bossIdx = Math.min(Math.floor(game.floor / 5) - 1, BOSSES.length - 1);
        template = BOSSES[bossIdx];
        addLog(`⚠️ BOSS: ${template.name}!`, 'log-boss');
        playSound(200, 'sawtooth', 0.3);
    } else {
        const maxIdx = Math.min(Math.floor(game.floor / 3), CREATURES.length - 1);
        template = CREATURES[Math.floor(Math.random() * (maxIdx + 1))];
    }

    const balanced = calculateBalancedEnemy();

    const bossHpMultiplier = isBoss ? 1.8 : 1;
    const bossAtkMultiplier = isBoss ? 1.4 : 1;

    const minHP = template.hp * (1 + game.floor * 0.02);
    const minATK = template.atk * (1 + game.floor * 0.015);

    const creature = {
        ...template,
        hp: Math.floor(Math.max(minHP, balanced.hp) * bossHpMultiplier),
        maxHp: Math.floor(Math.max(minHP, balanced.hp) * bossHpMultiplier),
        atk: Math.floor(Math.max(minATK, balanced.atk) * bossAtkMultiplier),
        gold: Math.floor(Math.max(template.gold, balanced.gold) * bossHpMultiplier)
    };

    setCurrentCreature(creature);
    setCreatureHp(creature.hp);

    if (!game.discoveredCreatures.includes(template.name)) {
        game.discoveredCreatures.push(template.name);
        addLog(`New creature: ${template.name}!`, 'log-gold');
    }

    document.getElementById('creatureName').textContent = creature.name;
    document.getElementById('creatureHealth').style.width = '100%';
    drawCreature();
    renderCreatureStatus();
    renderBattleCreatureCard();
}

function castSpell(spell) {
    if (!currentCreature || (game.spellCooldowns[spell.id] || 0) > 0) return;

    const stats = getStats();
    game.spellCooldowns[spell.id] = spell.cooldown;

    playSound(800, 'sine', 0.15);

    if (spell.heal || spell.shield) {
        castSpellVisual(spell, 60, 60);
    } else {
        castSpellVisual(spell, 200, 60);
    }
    spellEffect(220, 70, spell.color || MAGIC_TYPES[spell.magic].color);

    if (spell.buff) {
        game.combatBuffs.push({ ...spell.buff });
        addLog(`${spell.buff.type} buff for ${spell.buff.turns} turns!`, 'log-spell');
    }

    if (spell.debuff) {
        if (spell.debuff.stacks) {
            const existing = game.combatDebuffs.find(d => d.type === spell.debuff.type);
            if (existing) {
                existing.value += spell.debuff.value;
                existing.turns = Math.max(existing.turns, spell.debuff.turns);
            } else {
                game.combatDebuffs.push({ ...spell.debuff });
            }
        } else {
            const existing = game.combatDebuffs.find(d => d.type === spell.debuff.type);
            if (existing) {
                existing.turns = spell.debuff.turns;
                if (spell.debuff.value) existing.value = spell.debuff.value;
            } else {
                game.combatDebuffs.push({ ...spell.debuff });
            }
        }
        addLog(`Enemy ${spell.debuff.type}!`, 'log-effective');
    }

    if (spell.healNow) {
        game.currentHp = Math.min(stats.hp, game.currentHp + spell.healNow);
        showFloat(`+${spell.healNow}`, 60, 40, 'heal');
    }

    if (spell.special === 'reduceCooldowns') {
        for (let key in game.spellCooldowns) {
            if (game.spellCooldowns[key] > 0) {
                game.spellCooldowns[key] = Math.max(0, game.spellCooldowns[key] - 2);
            }
        }
        addLog('Cooldowns reduced by 2!', 'log-spell');
    }
    if (spell.special === 'cleanse') {
        game.combatDebuffs = game.combatDebuffs.filter(d => !['poison', 'burn', 'bleed'].includes(d.type));
        game.poisonStacks = 0;
        addLog('Cleansed negative effects!', 'log-spell');
    }
    if (spell.special === 'dispelFear') {
        game.fearDebuff = false;
        addLog('Fear dispelled!', 'log-spell');
    }

    if (spell.shield) {
        const shieldAmt = Math.floor(stats.hp * spell.shield);
        game.currentHp = Math.min(stats.hp, game.currentHp + shieldAmt);
        showFloat(`+${shieldAmt} Shield`, 60, 60, 'heal');
        createParticles(60, 80, '#88aaff', 8);
        addLog(`${spell.name}! Shield ${shieldAmt} HP`, 'log-spell');
    } else if (spell.heal) {
        const amt = Math.floor(stats.hp * spell.heal);
        game.currentHp = Math.min(stats.hp, game.currentHp + amt);
        showFloat(`+${amt}`, 60, 60, 'heal');
        createParticles(60, 80, spell.color || '#00ff00', 6);
        addLog(`${spell.name}! Healed ${amt} HP`, 'log-spell');
    } else {
        let damage = Math.floor(stats.atk * spell.damage);
        const spellBonus = getSkillEffect('spellDamage');
        if (spellBonus) damage = Math.floor(damage * (1 + spellBonus));
        if (stats.spellPower > 0) damage = Math.floor(damage * (1 + stats.spellPower));

        const atkBuff = game.combatBuffs.filter(b => b.type === 'atk').reduce((sum, b) => sum + b.value, 0);
        if (atkBuff > 0) damage = Math.floor(damage * (1 + atkBuff));

        const critDmgBuff = game.combatBuffs.filter(b => b.type === 'critDmg').reduce((sum, b) => sum + b.value, 0);
        const critBuff = game.combatBuffs.filter(b => b.type === 'crit').reduce((sum, b) => sum + b.value, 0);
        const empowerBuff = game.combatBuffs.find(b => b.type === 'empower');
        if (empowerBuff) damage = Math.floor(damage * (1 + empowerBuff.value));

        const mult = getMagicMultiplier(spell.magic, currentCreature.magic);
        damage = Math.floor(damage * mult);

        if (spell.special === 'percentDamage' && spell.percentDmg) {
            const percentDmg = Math.floor(currentCreature.maxHp * spell.percentDmg);
            damage += percentDmg;
            addLog(`${spell.name} deals ${percentDmg} bonus damage!`, 'log-effective');
        }

        if (spell.special === 'avadaKedavra') {
            const hpCost = Math.floor(game.currentHp * 0.5);
            game.currentHp -= hpCost;
            showFloat(`-${hpCost}`, 60, 60, 'crit');
            addLog(`Avada Kedavra costs ${hpCost} HP!`, 'log-boss');

            damage = creatureHp;
            addLog('AVADA KEDAVRA!', 'log-boss');
            showFloat('DEATH!', 220, 40, 'crit');

            if (game.currentHp <= 0) {
                if (stats.deathSaves > 0) {
                    game.buffStats.deathSaves--;
                    game.currentHp = Math.floor(stats.hp * 0.1);
                    addLog('Death saved! (' + (stats.deathSaves - 1) + ' left)', 'log-spell');
                } else {
                    game.currentHp = 1;
                    addLog('Nearly killed yourself!', 'log-resist');
                }
            }
        }

        const totalCrit = stats.crit + critBuff;
        if (Math.random() * 100 < totalCrit) {
            const totalCritDmg = stats.critDmg + critDmgBuff;
            damage = Math.floor(damage * (1 + totalCritDmg));
            showFloat(`CRIT -${damage}`, 220, 50, 'crit');
        } else {
            const floatType = mult > 1 ? 'effective' : (mult < 1 ? 'resist' : 'spell');
            showFloat(`-${damage}`, 220, 60, floatType);
        }

        if (mult > 1) addLog(`${spell.name} is super effective!`, 'log-effective');
        else if (mult < 1) addLog(`${spell.name} is not very effective...`, 'log-resist');

        setCreatureHp(creatureHp - damage);

        if (stats.lifesteal > 0) {
            const healAmt = Math.floor(damage * stats.lifesteal);
            if (healAmt > 0) game.currentHp = Math.min(stats.hp, game.currentHp + healAmt);
        }

        createParticles(220, 80, spell.color || MAGIC_TYPES[spell.magic].color, 8);
        battleArea.classList.add('shake');
        setTimeout(() => battleArea.classList.remove('shake'), 150);
    }

    checkCreatureDeath();
    updateUI();
    saveGame();
}

function processDebuffs() {
    let totalDot = 0;

    game.combatDebuffs.forEach(debuff => {
        if (debuff.type === 'poison' || debuff.type === 'burn' || debuff.type === 'bleed') {
            totalDot += debuff.value;
        }
        if (debuff.type === 'hellfire') {
            totalDot += debuff.burnValue;
        }
    });

    if (totalDot > 0) {
        setCreatureHp(creatureHp - totalDot);
        showFloat(`-${totalDot}`, 220, 80, 'effective');
        addLog(`DoT deals ${totalDot} damage!`, 'log-effective');
    }

    game.combatDebuffs = game.combatDebuffs.filter(d => {
        d.turns--;
        return d.turns > 0;
    });
}

function processBuffs() {
    const regenBuff = game.combatBuffs.filter(b => b.type === 'regen').reduce((sum, b) => sum + b.value, 0);
    if (regenBuff > 0) {
        const stats = getStats();
        game.currentHp = Math.min(stats.hp, game.currentHp + regenBuff);
        showFloat(`+${regenBuff}`, 60, 60, 'heal');
    }

    game.combatBuffs = game.combatBuffs.filter(b => {
        b.turns--;
        return b.turns > 0;
    });
}

function isEnemyStunned() {
    return game.combatDebuffs.some(d => d.type === 'stun' && d.turns > 0);
}

function getEnemyAtkMod() {
    let mod = 1;
    game.combatDebuffs.forEach(d => {
        if (d.type === 'weaken') mod -= d.value;
        if (d.type === 'torture') mod -= d.atkReduce;
    });
    return Math.max(0.1, mod);
}

function getReflectMod() {
    const reflect = game.combatBuffs.find(b => b.type === 'reflect');
    return reflect ? reflect.value : 0;
}

function processCreatureAbilities() {
    if (!currentCreature) return;

    currentCreature.abilities.forEach(ab => {
        switch(ab) {
            case 'REGEN':
                if (creatureHp < currentCreature.maxHp) {
                    const heal = Math.floor(currentCreature.maxHp * 0.05);
                    setCreatureHp(Math.min(currentCreature.maxHp, creatureHp + heal));
                    showFloat(`+${heal}`, 220, 50, 'heal');
                }
                break;
            case 'SHIELD':
                if (Math.random() < 0.25) creatureBuffs.shield = true;
                break;
            case 'RAGE':
                if (creatureHp < currentCreature.maxHp * 0.3) creatureBuffs.enraged = true;
                break;
            case 'POISON':
                if (Math.random() < 0.3) {
                    game.poisonStacks = Math.min(5, game.poisonStacks + 1);
                    addLog('Poisoned!', 'log-damage');
                }
                break;
            case 'FEAR':
                if (Math.random() < 0.2 && !hasSkill('fearImmune')) {
                    game.fearDebuff = true;
                    addLog('Terrified! Attack reduced!', 'log-damage');
                }
                break;
        }
    });

    if (game.poisonStacks > 0) {
        const dmg = Math.floor(game.maxHp * 0.02 * game.poisonStacks);
        game.currentHp -= dmg;
        showFloat(`-${dmg} ☠️`, 60, 50);
    }

    renderCreatureStatus();
}

function battle() {
    if (!game.inBattle) return;

    if (!currentCreature) {
        spawnCreature();
        return;
    }

    setTurnCount(turnCount + 1);
    const stats = getStats();

    const isCrit = Math.random() * 100 < stats.crit;
    let damage = Math.max(1, stats.atk - Math.floor(currentCreature.atk * 0.08));

    const mult = getMagicMultiplier(stats.wandMagic, currentCreature.magic);
    damage = Math.floor(damage * mult);

    if (isCrit) damage = Math.floor(damage * (1 + stats.critDmg));

    if (stats.executeDmg > 0 && creatureHp < currentCreature.maxHp * 0.3) {
        damage = Math.floor(damage * (1 + stats.executeDmg));
    }

    if (creatureBuffs.shield) {
        damage = Math.floor(damage * 0.5);
        creatureBuffs.shield = false;
    }

    if (stats.doubleAttack) {
        damage = Math.floor(damage * 2);
    }

    if (currentCreature.abilities.includes('DODGE') && Math.random() < 0.15) {
        showFloat('MISS', 220, 60, 'resist');
    } else {
        if (hasSkill('execute') && creatureHp < currentCreature.maxHp * 0.15) {
            damage = creatureHp;
            addLog('Avada Kedavra!', 'log-crit');
        }

        setCreatureHp(creatureHp - damage);
        const floatType = isCrit ? 'crit' : (mult > 1 ? 'effective' : '');
        showFloat(`${isCrit ? 'CRIT ' : ''}-${damage}`, 220, 60, floatType);
        playSound(isCrit ? 600 : 400, isCrit ? 'sawtooth' : 'square', 0.08);

        if (stats.lifesteal > 0) {
            const healAmt = Math.floor(damage * stats.lifesteal);
            if (healAmt > 0) {
                game.currentHp = Math.min(stats.hp, game.currentHp + healAmt);
                showFloat(`+${healAmt}`, 80, 50, 'heal');
            }
        }
    }

    heroCanvas.classList.add('attacking');
    setTimeout(() => heroCanvas.classList.remove('attacking'), 100);
    setTimeout(() => {
        creatureCanvas.classList.add('hit');
        setTimeout(() => creatureCanvas.classList.remove('hit'), 100);
    }, 100);

    document.getElementById('creatureHealth').style.width = `${Math.max(0, (creatureHp / currentCreature.maxHp) * 100)}%`;
    updateBattleCreatureHp();

    if (creatureHp <= 0) {
        checkCreatureDeath();
    } else {
        if (shouldTriggerShieldMinigame()) {
            startShieldMinigame();
            updateUI();
            return;
        }

        processDebuffs();

        if (creatureHp <= 0) {
            checkCreatureDeath();
            updateUI();
            return;
        }

        processBuffs();

        processCreatureAbilities();

        if (isEnemyStunned()) {
            addLog('Enemy is stunned!', 'log-spell');
            showFloat('STUNNED', 220, 50, 'spell');
        } else {
            if (stats.dodge > 0 && Math.random() * 100 < stats.dodge) {
                showFloat('DODGE!', 60, 50, 'spell');
            } else {
                let creatureDmg = Math.max(1, currentCreature.atk - Math.floor(stats.def * 0.4));
                creatureDmg = Math.floor(creatureDmg * (1 - stats.dmgReduce));
                if (creatureBuffs.enraged) creatureDmg = Math.floor(creatureDmg * 1.5);

                creatureDmg = Math.floor(creatureDmg * getEnemyAtkMod());

                if (stats.thorns > 0) {
                    const thornsDmg = Math.floor(creatureDmg * stats.thorns);
                    setCreatureHp(creatureHp - thornsDmg);
                    showFloat(`-${thornsDmg}🌹`, 220, 40);
                }

                const reflectMod = getReflectMod();
                if (reflectMod > 0) {
                    const reflectDmg = Math.floor(creatureDmg * reflectMod);
                    setCreatureHp(creatureHp - reflectDmg);
                    showFloat(`-${reflectDmg}🛡️`, 220, 30, 'spell');
                }

                if (currentCreature.abilities.includes('REFLECT')) {
                    const reflectDmg = Math.floor(damage * 0.2);
                    game.currentHp -= reflectDmg;
                    showFloat(`-${reflectDmg}`, 100, 50);
                }

                game.currentHp -= creatureDmg;
                showFloat(`-${creatureDmg}`, 60, 60);
            }
        }

        if (stats.regenFlat > 0) {
            game.currentHp = Math.min(stats.hp, game.currentHp + stats.regenFlat);
        }

        if (hasSkill('regen')) {
            const regenAmt = Math.floor(stats.hp * 0.03);
            game.currentHp = Math.min(stats.hp, game.currentHp + regenAmt);
        }

        if (game.currentHp <= 0) {
            if (stats.deathSaves > 0) {
                game.buffStats.deathSaves--;
                game.currentHp = Math.floor(stats.hp * 0.3);
                addLog('Death saved! (' + stats.deathSaves + ' left)', 'log-spell');
            } else if (hasSkill('felix') && !game.felixUsed) {
                game.currentHp = Math.floor(stats.hp * 0.3);
                game.felixUsed = true;
                addLog('Felix Felicis saved you!', 'log-spell');
            } else {
                gameOver();
                return;
            }
        }
    }

    updateUI();
    saveGame();
}

function checkCreatureDeath() {
    if (creatureHp <= 0 && currentCreature) {
        const stats = getStats();
        let goldGain = currentCreature.gold;
        const goldBonus = getSkillEffect('goldBonus');
        if (goldBonus) goldGain = Math.floor(goldGain * (1 + goldBonus));
        if (stats.goldBonus > 0) goldGain = Math.floor(goldGain * (1 + stats.goldBonus));

        game.gold += goldGain;
        game.totalGoldEarned += goldGain;
        game.runGold += goldGain;
        game.totalKills++;
        game.runKills++;
        game.combo++;
        if (game.combo > game.maxCombo) game.maxCombo = game.combo;
        game.poisonStacks = Math.max(0, game.poisonStacks - 1);
        game.fearDebuff = false;

        const hpRestore = Math.floor(stats.hp * 0.15);
        game.currentHp = Math.min(stats.hp, game.currentHp + hpRestore);
        if (hpRestore > 0) {
            showFloat(`+${hpRestore} HP`, 60, 40, 'heal');
        }

        game.combatBuffs = [];
        game.combatDebuffs = [];

        let expGain = 10 + game.floor * 5;
        if (stats.xpBonus) expGain = Math.floor(expGain * (1 + stats.xpBonus));
        game.exp += expGain;
        if (game.exp >= game.expToLevel) {
            game.level++;
            game.exp -= game.expToLevel;
            game.expToLevel = Math.floor(game.expToLevel * 1.25);
            game.skillPoints++;
            game.currentHp = getStats().hp;
            addLog(`Year ${game.level}! +1 Study Point!`, 'log-levelup');
            playSound(1000, 'sine', 0.2);
        }

        if (Math.random() < 0.04 + (currentCreature.boss ? 0.25 : 0)) {
            game.gems++;
            addLog('Found a Sickle!', 'log-gold');
        }

        showFloat(`+${goldGain}`, 220, 40, 'gold');
        createParticles(220, 80, MAGIC_TYPES[currentCreature.magic].color, 6);

        game.floor++;
        setCurrentCreature(null);
        game.inBattle = false;
        updateUI();
        saveGame();

        setTimeout(() => showRoomTransition(goldGain), 400);
    }
}

function startBattle() {
    if (battleInterval) clearInterval(battleInterval);
    setBattleInterval(setInterval(() => {
        if (game.gameStarted && !shieldGame.active) battle();
    }, 900));
}

// ============ SHIELD MINIGAME ============

function isFirstBossEver() {
    return game.floor === 5 && game.bestFloor < 5;
}

function startShieldMinigame() {
    const isFirstPhase = !creatureBuffs.shieldPhase2;
    const shouldShowTutorial = isFirstBossEver() && isFirstPhase && !game.shieldTutorialDone;

    setShieldGame({
        active: true,
        currentColor: null,
        timeLeft: 0,
        timerInterval: null,
        isTutorial: shouldShowTutorial,
        bossSpellQueue: generateBossSpells(shouldShowTutorial ? 3 : 5),
        spellsBlocked: 0,
        spellsMissed: 0,
        tutorialShown: false
    });

    if (currentCreature) {
        document.getElementById('shieldEnemyIcon').textContent = currentCreature.icon;
    }

    if (shouldShowTutorial && !shieldGame.tutorialShown) {
        showTutorialOverlay();
        return;
    }

    beginShieldMinigame();
}

function showTutorialOverlay() {
    document.getElementById('shieldTutorialOverlay').style.display = 'flex';
    playSound(500, 'sine', 0.2);

    document.getElementById('shieldTutorialStartBtn').onclick = () => {
        document.getElementById('shieldTutorialOverlay').style.display = 'none';
        shieldGame.tutorialShown = true;
        game.shieldTutorialDone = true;
        beginShieldMinigame();
    };
}

function showSpellTutorial() {
    if (game.spellTutorialDone) return;

    setSpellTutorialPage(1);
    updateSpellTutorialPages();
    document.getElementById('spellTutorialOverlay').style.display = 'flex';
    playSound(600, 'sine', 0.2);
}

function nextSpellTutorialPage() {
    setSpellTutorialPage(spellTutorialPage + 1);
    updateSpellTutorialPages();
    playSound(500, 'sine', 0.1);
}

function updateSpellTutorialPages() {
    for (let i = 1; i <= 3; i++) {
        const page = document.getElementById(`spellTutorialPage${i}`);
        if (page) {
            page.classList.toggle('active', i === spellTutorialPage);
        }
    }
}

function finishSpellTutorial() {
    game.spellTutorialDone = true;
    document.getElementById('spellTutorialOverlay').style.display = 'none';
    playSound(800, 'sine', 0.2);
    saveGame();

    game.gameStarted = true;
    game.inBattle = true;
    startBattle();
    addLog('Your adventure begins!', 'log-levelup');
}

function beginShieldMinigame() {
    document.getElementById('shieldMinigame').classList.add('active');
    document.getElementById('shieldResult').textContent = '';
    document.getElementById('shieldResult').className = 'shield-result';

    document.getElementById('shieldIncoming').innerHTML = `
        <span class="shield-player-icon">🧙</span>
        <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
    `;

    if (shieldGame.isTutorial) {
        document.getElementById('shieldTitle').textContent = '🛡️ TUTORIAL: Tap the glowing button!';
        document.getElementById('shieldHint').textContent = 'Watch the spell color and tap the matching shield!';
        document.getElementById('shieldTimerBar').classList.add('tutorial');
    } else {
        document.getElementById('shieldTitle').textContent = '🛡️ Block the incoming spells!';
        document.getElementById('shieldHint').textContent = '';
        document.getElementById('shieldTimerBar').classList.remove('tutorial');
    }

    addLog('🛡️ Boss casting spells! Block them!', 'log-boss');
    playSound(400, 'sine', 0.2);

    document.querySelectorAll('.shield-btn').forEach(btn => {
        btn.onclick = () => handleShieldPress(btn.dataset.color);
    });

    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, shieldGame.isTutorial ? 1000 : 500);
}

function generateBossSpells(count) {
    const colors = ['red', 'blue', 'yellow', 'green'];
    const spells = [];
    for (let i = 0; i < count; i++) {
        spells.push(colors[Math.floor(Math.random() * colors.length)]);
    }
    return spells;
}

function sendNextBossSpell() {
    if (shieldGame.bossSpellQueue.length === 0) {
        endShieldMinigame();
        return;
    }

    const color = shieldGame.bossSpellQueue.shift();
    shieldGame.currentColor = color;

    const baseTime = shieldGame.isTutorial ? 4000 : 1500;
    const speedBonus = shieldGame.isTutorial ? 0 : Math.min((game.floor / 5 - 1) * 100, 600);
    shieldGame.timeLeft = baseTime - speedBonus;

    const incomingDiv = document.getElementById('shieldIncoming');
    const spellData = SHIELD_COLORS[color];
    incomingDiv.innerHTML = `
        <span class="shield-player-icon">🧙</span>
        <span class="shield-spell flying ${shieldGame.isTutorial ? 'tutorial' : ''}" style="color: ${getShieldColor(color)}">${spellData.spellIcon}</span>
        <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
    `;

    if (shieldGame.isTutorial) {
        const colorName = SHIELD_COLORS[color].name;
        document.getElementById('shieldHint').innerHTML = `<b style="color: ${getShieldColor(color)}">${colorName}</b> spell incoming! Tap the <b style="color: ${getShieldColor(color)}">${spellData.icon}</b> button!`;
    }

    document.querySelectorAll('.shield-btn').forEach(btn => btn.classList.remove('highlight'));

    if (shieldGame.isTutorial) {
        document.querySelector(`.shield-btn.${color}`).classList.add('highlight');
    }

    updateShieldTimer();
    shieldGame.timerInterval = setInterval(() => {
        shieldGame.timeLeft -= 100;
        updateShieldTimer();

        if (shieldGame.timeLeft <= 0) {
            clearInterval(shieldGame.timerInterval);
            shieldMiss();
        }
    }, 100);

    playSound(600 + (color === 'red' ? 0 : color === 'blue' ? 100 : color === 'yellow' ? 200 : 300), 'sine', 0.15);
}

function getShieldColor(color) {
    switch(color) {
        case 'red': return '#ff4444';
        case 'blue': return '#4488ff';
        case 'yellow': return '#ffdd44';
        case 'green': return '#44dd44';
        default: return '#ffffff';
    }
}

function updateShieldTimer() {
    const maxTime = shieldGame.isTutorial ? 4000 : 1500;
    const percent = (shieldGame.timeLeft / maxTime) * 100;
    document.getElementById('shieldTimerBar').style.width = percent + '%';
}

function handleShieldPress(color) {
    if (!shieldGame.active || !shieldGame.currentColor) return;

    clearInterval(shieldGame.timerInterval);

    if (color === shieldGame.currentColor) {
        shieldSuccess();
    } else {
        shieldMiss();
    }
}

function shieldSuccess() {
    shieldGame.spellsBlocked++;
    document.getElementById('shieldResult').textContent = '✓ Blocked!';
    document.getElementById('shieldResult').className = 'shield-result success';
    document.getElementById('shieldIncoming').innerHTML = `
        <span class="shield-player-icon">🧙</span>
        <span style="color: #70c070; font-size: 28px;">🛡️ PROTEGO!</span>
        <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
    `;

    if (shieldGame.isTutorial) {
        document.getElementById('shieldHint').textContent = '✓ Great job! Get ready for the next spell...';
    }

    playSound(800, 'sine', 0.15);
    addLog('🛡️ Spell blocked!', 'log-effective');

    const pauseTime = shieldGame.isTutorial ? 1200 : 600;
    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, pauseTime);
}

function shieldMiss() {
    shieldGame.spellsMissed++;
    document.getElementById('shieldResult').textContent = '✗ Hit!';
    document.getElementById('shieldResult').className = 'shield-result fail';
    document.getElementById('shieldIncoming').innerHTML = `
        <span class="shield-player-icon">🧙</span>
        <span style="color: #c07070; font-size: 28px;">💥 OUCH!</span>
        <span class="shield-enemy-icon">${currentCreature ? currentCreature.icon : '🧌'}</span>
    `;

    if (shieldGame.isTutorial) {
        document.getElementById('shieldHint').textContent = '✗ Missed! Try to tap the matching color faster!';
    }

    const stats = getStats();
    const damageMultiplier = shieldGame.isTutorial ? 0.3 : 0.5;
    const damage = Math.floor(currentCreature.atk * damageMultiplier);
    game.currentHp -= damage;
    showFloat(`-${damage}`, 60, 50, 'damage');
    addLog(`💥 Hit by spell! -${damage} HP`, 'log-damage');
    playSound(200, 'sawtooth', 0.2);

    updateUI();

    if (game.currentHp <= 0) {
        endShieldMinigame();
        gameOver();
        return;
    }

    setTimeout(() => {
        if (shieldGame.active) sendNextBossSpell();
    }, 600);
}

function endShieldMinigame() {
    shieldGame.active = false;
    shieldGame.currentColor = null;
    clearInterval(shieldGame.timerInterval);

    document.getElementById('shieldMinigame').classList.remove('active');
    document.querySelectorAll('.shield-btn').forEach(btn => btn.classList.remove('highlight'));

    const blocked = shieldGame.spellsBlocked;
    const total = blocked + shieldGame.spellsMissed;

    if (blocked === total && total > 0) {
        addLog(`🎉 Perfect defense! All ${total} spells blocked!`, 'log-effective');
        const bonusDmg = Math.floor(currentCreature.maxHp * 0.1);
        setCreatureHp(creatureHp - bonusDmg);
        showFloat(`PERFECT! -${bonusDmg}`, 220, 40, 'effective');
        playSound(1000, 'sine', 0.2);
    } else if (blocked > 0) {
        addLog(`🛡️ Blocked ${blocked}/${total} spells`, 'log-spell');
    } else {
        addLog(`💥 Failed to block any spells!`, 'log-damage');
    }

    updateUI();

    if (game.currentHp > 0 && creatureHp > 0) {
        addLog('⚔️ Resume battle!', 'log-boss');
        game.gameStarted = true;
        game.inBattle = true;
        startBattle();
    }
}

function shouldTriggerShieldMinigame() {
    if (!currentCreature || !currentCreature.boss) return false;
    if (shieldGame.active) return false;

    if (!creatureBuffs.shieldPhase1) {
        creatureBuffs.shieldPhase1 = true;
        return true;
    }

    const hpPercent = creatureHp / currentCreature.maxHp;
    if (hpPercent <= 0.5 && !creatureBuffs.shieldPhase2) {
        creatureBuffs.shieldPhase2 = true;
        return true;
    }

    return false;
}

// ============ INITIALIZATION ============

function init() {
    // Clear saved game on page load - always start fresh
    localStorage.removeItem('wizardDuels');

    initUI();

    // Setup tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');

            if (tab.dataset.tab === 'spellbook') renderSpellbook();
            if (tab.dataset.tab === 'skills') renderSkillTree();
            if (tab.dataset.tab === 'shop') renderShop();
            if (tab.dataset.tab === 'bestiary') renderBestiary();
        });
    });

    // House selection
    document.querySelectorAll('.house-option').forEach(opt => {
        opt.addEventListener('click', () => selectHouse(opt.dataset.house));
    });

    // Game over retry button
    document.getElementById('gameoverRetryBtn').addEventListener('click', restartGame);

    // Start game
    if (!game.houseChosen || !game.gameStarted) {
        showHouseSelection();
    } else {
        const offline = calculateOffline();
        if (offline) showOffline(offline);

        game.inBattle = true;
        updateHouseDisplay();
        generateRoom();
        updateUI();
        renderShop();
        renderSkillTree();
        renderBestiary();
        renderActiveBuffs();
        drawWizard();
        spawnCreature();
        startBattle();
    }

    // Cooldown timer
    setInterval(() => {
        if (game.selectingBuff) return;
        for (const id in game.spellCooldowns) {
            if (game.spellCooldowns[id] > 0) game.spellCooldowns[id]--;
        }
        renderSpellBar();
    }, 1000);

    setInterval(saveGame, 10000);
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
