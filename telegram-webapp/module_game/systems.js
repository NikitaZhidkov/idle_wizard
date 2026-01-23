/**
 * SYSTEMS MODULE (Game Logic)
 * ===========================
 * What it IS: the "brain" that decides what happens each frame
 * What it DOES:
 *   - Reads Entities, applies rules, updates Entities
 *   - Owns game modes via FSM (menu/loading/playing/paused/win/lose)
 *   - Runs logic in fixed phases (input -> simulation -> resolution -> presentation)
 *   - Produces RenderData for the current frame
 * How to keep it from becoming a monolith:
 *   - Many small systems (Movement, Collision, Combat, Spawn, UI, etc.)
 *   - Execute in fixed order via scheduler
 *   - Prefer events over scattered if-statements
 */

import {
    CONFIG,
    MAGIC_TYPES,
    ABILITIES,
    CREATURE_TEMPLATES,
    BOSS_TEMPLATES,
    ENCOUNTER_ORDER,
    SPELL_TEMPLATES,
    BUFF_TEMPLATES,
    HOUSE_DATA,
    SHIELD_COLORS,
    SHIELD_ICONS,
    createEntity,
    getEntity,
    removeEntity,
    clearEntities,
    createPlayerState,
    createCreatureState,
    createGameSession,
    createRenderData,
    computePlayerStats,
    getMagicMultiplier
} from './entities.js';

// ============ EVENT BUS ============

const eventListeners = new Map();

export function emit(event, data) {
    const listeners = eventListeners.get(event) || [];
    listeners.forEach(fn => fn(data));
}

export function on(event, callback) {
    if (!eventListeners.has(event)) {
        eventListeners.set(event, []);
    }
    eventListeners.get(event).push(callback);
}

export function off(event, callback) {
    const listeners = eventListeners.get(event);
    if (listeners) {
        const idx = listeners.indexOf(callback);
        if (idx >= 0) listeners.splice(idx, 1);
    }
}

// ============ GAME STATE ============

let session = null;
let player = null;
let creature = null;
let renderData = null;

// Battle log buffer
let battleLog = [];
const MAX_LOG_ENTRIES = 6;

function addLog(text, type = '') {
    battleLog.push({ text, type, time: Date.now() });
    while (battleLog.length > MAX_LOG_ENTRIES) {
        battleLog.shift();
    }
    emit('log', { text, type });
}

// Floating texts and particles
let floatingTexts = [];
let particles = [];

function addFloatingText(text, x, y, type = '') {
    floatingTexts.push({ text, x, y, type, startTime: Date.now(), duration: 800 });
}

function addParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3 - 1,
            color,
            size: 3 + Math.random() * 4,
            startTime: Date.now(),
            duration: 600
        });
    }
}

// ============ INITIALIZATION ============

export function initGame() {
    clearEntities();
    battleLog = [];
    floatingTexts = [];
    particles = [];

    session = createGameSession();
    player = createPlayerState();
    session.playerId = player.id;

    renderData = createRenderData();

    // Start at house selection
    session.state = 'houseSelect';
    renderData.showHouseSelect = true;

    emit('init');
    return { session, player, renderData };
}

export function getSession() { return session; }
export function getPlayer() { return player; }
export function getCreature() { return creature; }
export function getRenderData() { return renderData; }

// ============ FSM TRANSITIONS ============

export function selectHouse(houseName) {
    if (session.state !== 'houseSelect') return;

    const house = HOUSE_DATA[houseName];
    if (!house) return;

    player.house = houseName;
    player.houseChosen = true;
    player.unlockedSpells = [house.spell];

    // Apply house stats
    const stats = computePlayerStats(player);
    player.currentHp = stats.hp;
    player.maxHp = stats.hp;

    addLog(`Welcome to ${house.name}!`, 'log-levelup');
    emit('houseSelected', { house: houseName });
    emit('sound', { freq: 800, type: 'sine', duration: 0.2 });

    renderData.showHouseSelect = false;

    // Check spell tutorial
    if (!player.spellTutorialDone) {
        session.state = 'spellTutorial';
        renderData.showSpellTutorial = true;
        renderData.spellTutorialPage = 1;
    } else {
        startGame();
    }
}

export function advanceSpellTutorial() {
    if (session.state !== 'spellTutorial') return;

    if (renderData.spellTutorialPage < 3) {
        renderData.spellTutorialPage++;
        emit('sound', { freq: 500, type: 'sine', duration: 0.1 });
    } else {
        finishSpellTutorial();
    }
}

export function finishSpellTutorial() {
    player.spellTutorialDone = true;
    renderData.showSpellTutorial = false;
    emit('sound', { freq: 800, type: 'sine', duration: 0.2 });
    startGame();
}

function startGame() {
    session.state = 'playing';
    session.gameStarted = true;
    session.inBattle = true;

    spawnCreature();
    startBattleLoop();

    addLog('Your adventure begins!', 'log-levelup');
    emit('gameStarted');
}

// ============ SPAWN SYSTEM ============

function spawnCreature() {
    const encounter = ENCOUNTER_ORDER[player.encounterIndex];
    if (!encounter) {
        // Victory!
        triggerVictory();
        return;
    }

    let template;
    let isBoss = false;

    if (encounter.type === 'boss') {
        template = BOSS_TEMPLATES[encounter.index];
        isBoss = true;
        addLog(`⚠️ BOSS: ${template.name}!`, 'log-boss');
        emit('sound', { freq: 200, type: 'sawtooth', duration: 0.3 });
    } else {
        template = CREATURE_TEMPLATES[encounter.index];
    }

    creature = createCreatureState(template, player.floor, isBoss);
    session.creatureId = creature.id;
    session.turnCount = 0;

    // Reset player combat state
    player.combatBuffs = [];
    player.combatDebuffs = [];
    player.fearDebuff = false;
    player.poisonStacks = 0;

    emit('creatureSpawned', { creature });
}

// ============ BATTLE LOOP ============

let battleLoopId = null;

function startBattleLoop() {
    if (battleLoopId) {
        clearInterval(battleLoopId);
    }
    battleLoopId = setInterval(() => {
        if (session.gameStarted && !session.shieldActive && session.state === 'playing') {
            battleTick();
        }
    }, CONFIG.BATTLE_TICK_MS);
    session.battleTimerId = battleLoopId;
}

function stopBattleLoop() {
    if (battleLoopId) {
        clearInterval(battleLoopId);
        battleLoopId = null;
    }
}

function battleTick() {
    if (!creature || creature.hp <= 0) {
        spawnCreature();
        return;
    }

    session.turnCount++;
    const stats = computePlayerStats(player);

    // Player attack
    const playerDamage = calculatePlayerDamage(stats);
    applyDamageToCreature(playerDamage.damage, playerDamage.isCrit, playerDamage.multiplier);

    // Check creature death
    if (creature.hp <= 0) {
        handleCreatureDeath();
        return;
    }

    // Shield minigame check for bosses
    if (shouldTriggerShieldMinigame()) {
        startShieldMinigame();
        return;
    }

    // Process player debuffs on enemy (DoT)
    processDebuffs();

    if (creature.hp <= 0) {
        handleCreatureDeath();
        return;
    }

    // Process player buffs
    processBuffs(stats);

    // Process creature abilities
    processCreatureAbilities();

    // Creature attack
    if (!isEnemyStunned()) {
        const creatureDamage = calculateCreatureDamage(stats);
        applyDamageToPlayer(creatureDamage, stats);
    } else {
        addLog('Enemy is stunned!', 'log-spell');
        addFloatingText('STUNNED', 220, 150, 'spell');
    }

    // Regen
    if (stats.regenFlat > 0) {
        player.currentHp = Math.min(stats.hp, player.currentHp + stats.regenFlat);
    }

    // Check player death
    if (player.currentHp <= 0) {
        handlePlayerDeath(stats);
    }

    emit('battleTick');
}

function calculatePlayerDamage(stats) {
    const isCrit = Math.random() * 100 < stats.crit;
    let damage = Math.max(1, stats.atk - Math.floor(creature.atk * 0.08));

    const mult = getMagicMultiplier('CHARMS', creature.magic); // Simplified
    damage = Math.floor(damage * mult);

    if (isCrit) {
        damage = Math.floor(damage * stats.critDmg);
    }

    if (stats.executeDmg > 0 && creature.hp < creature.maxHp * 0.3) {
        damage = Math.floor(damage * (1 + stats.executeDmg));
    }

    if (creature.hasShield) {
        damage = Math.floor(damage * 0.5);
        creature.hasShield = false;
    }

    if (stats.doubleAttack) {
        damage = Math.floor(damage * 2);
    }

    return { damage, isCrit, multiplier: mult };
}

function applyDamageToCreature(damage, isCrit, mult) {
    // Check dodge
    if (creature.abilities.includes('DODGE') && Math.random() < 0.15) {
        addFloatingText('MISS', 220, 160, 'resist');
        return;
    }

    creature.hp -= damage;
    const floatType = isCrit ? 'crit' : (mult > 1 ? 'effective' : '');
    addFloatingText(`${isCrit ? 'CRIT ' : ''}-${damage}`, 220, 160, floatType);
    emit('sound', { freq: isCrit ? 600 : 400, type: isCrit ? 'sawtooth' : 'square', duration: 0.08 });

    // Lifesteal
    const stats = computePlayerStats(player);
    if (stats.lifesteal > 0) {
        const healAmt = Math.floor(damage * stats.lifesteal);
        if (healAmt > 0) {
            player.currentHp = Math.min(stats.hp, player.currentHp + healAmt);
            addFloatingText(`+${healAmt}`, 80, 150, 'heal');
        }
    }
}

function calculateCreatureDamage(stats) {
    let damage = Math.max(1, creature.atk - Math.floor(stats.def * 0.6));

    // Creature enraged
    if (creature.enraged) {
        damage = Math.floor(damage * 1.5);
    }

    // Player debuffs on enemy (weaken, etc.)
    const atkMod = getEnemyAtkMod();
    damage = Math.floor(damage * atkMod);

    return damage;
}

function applyDamageToPlayer(damage, stats) {
    // Dodge check
    if (stats.dodge > 0 && Math.random() * 100 < stats.dodge) {
        addFloatingText('DODGE!', 60, 150, 'spell');
        return;
    }

    // Thorns
    if (stats.thorns > 0) {
        const thornsDmg = Math.floor(damage * stats.thorns);
        creature.hp -= thornsDmg;
        addFloatingText(`-${thornsDmg}🌹`, 220, 140);
    }

    // Reflect buff
    const reflectMod = getReflectMod();
    if (reflectMod > 0) {
        const reflectDmg = Math.floor(damage * reflectMod);
        creature.hp -= reflectDmg;
        addFloatingText(`-${reflectDmg}🛡️`, 220, 130, 'spell');
    }

    // Creature reflect ability
    if (creature.abilities.includes('REFLECT')) {
        const reflectDmg = Math.floor(damage * 0.2);
        player.currentHp -= reflectDmg;
        addFloatingText(`-${reflectDmg}`, 100, 150);
        addLog(`💫 Reflect: -${reflectDmg} HP`, 'log-damage');
    }

    player.currentHp -= damage;
    addFloatingText(`-${damage}`, 60, 160);
    addLog(`⚔️ ${creature.name} hits: -${damage} HP`, 'log-damage');
}

function handlePlayerDeath(stats) {
    if (stats.deathSaves > 0) {
        player.buffStats.deathSaves--;
        player.currentHp = Math.floor(stats.hp * 0.3);
        addLog(`Death saved! (${stats.deathSaves - 1} left)`, 'log-spell');
    } else {
        triggerGameOver();
    }
}

function handleCreatureDeath() {
    const stats = computePlayerStats(player);

    // Gold reward
    let goldGain = creature.gold;
    if (stats.goldBonus > 0) {
        goldGain = Math.floor(goldGain * (1 + stats.goldBonus));
    }
    player.gold += goldGain;
    player.totalGoldEarned += goldGain;
    player.runGold += goldGain;

    // Kill tracking
    player.totalKills++;
    player.runKills++;
    player.combo++;
    if (player.combo > player.maxCombo) {
        player.maxCombo = player.combo;
    }

    // Clear debuffs
    player.poisonStacks = Math.max(0, player.poisonStacks - 1);
    player.fearDebuff = false;
    player.combatBuffs = [];
    player.combatDebuffs = [];

    // Heal after kill
    const hpRestore = Math.floor(stats.hp * CONFIG.HEAL_AFTER_KILL_PERCENT);
    player.currentHp = Math.min(stats.hp, player.currentHp + hpRestore);
    if (hpRestore > 0) {
        addFloatingText(`+${hpRestore} HP`, 60, 140, 'heal');
    }

    // XP
    let expGain = 10 + player.floor * 5;
    if (stats.xpBonus) {
        expGain = Math.floor(expGain * (1 + stats.xpBonus));
    }
    player.exp += expGain;

    // Level up
    if (player.exp >= player.expToLevel) {
        player.level++;
        player.exp -= player.expToLevel;
        player.expToLevel = Math.floor(player.expToLevel * CONFIG.EXP_MULTIPLIER);
        player.currentHp = computePlayerStats(player).hp;
        addLog(`Year ${player.level}! +1 Study Point!`, 'log-levelup');
        emit('sound', { freq: 1000, type: 'sine', duration: 0.2 });
    }

    addFloatingText(`+${goldGain}`, 220, 140, 'gold');
    addParticles(220, 180, MAGIC_TYPES[creature.magic].color, 6);

    player.floor++;
    player.encounterIndex++;

    // Check victory
    if (player.encounterIndex >= ENCOUNTER_ORDER.length) {
        creature = null;
        session.creatureId = null;
        session.inBattle = false;
        setTimeout(() => triggerVictory(), 400);
        return;
    }

    // Show buff selection
    creature = null;
    session.creatureId = null;
    session.inBattle = false;
    session.selectingBuff = true;
    session.lastGoldGain = goldGain;

    emit('creatureKilled', { goldGain });

    setTimeout(() => showBuffSelection(), 400);
}

// ============ DEBUFF/BUFF PROCESSING ============

function processDebuffs() {
    let totalDot = 0;

    player.combatDebuffs.forEach(debuff => {
        if (debuff.type === 'poison' || debuff.type === 'burn' || debuff.type === 'bleed') {
            totalDot += debuff.value;
        }
    });

    if (totalDot > 0) {
        creature.hp -= totalDot;
        addFloatingText(`-${totalDot}`, 220, 180, 'effective');
        addLog(`DoT deals ${totalDot} damage!`, 'log-effective');
    }

    // Tick down debuffs
    player.combatDebuffs = player.combatDebuffs.filter(d => {
        d.turns--;
        return d.turns > 0;
    });
}

function processBuffs(stats) {
    // Regen buff
    const regenBuff = player.combatBuffs.filter(b => b.type === 'regen').reduce((sum, b) => sum + b.value, 0);
    if (regenBuff > 0) {
        player.currentHp = Math.min(stats.hp, player.currentHp + regenBuff);
        addFloatingText(`+${regenBuff}`, 60, 160, 'heal');
    }

    // Tick down buffs
    player.combatBuffs = player.combatBuffs.filter(b => {
        b.turns--;
        return b.turns > 0;
    });
}

function isEnemyStunned() {
    return player.combatDebuffs.some(d => d.type === 'stun' && d.turns > 0);
}

function getEnemyAtkMod() {
    let mod = 1;
    player.combatDebuffs.forEach(d => {
        if (d.type === 'weaken') mod -= d.value;
    });
    return Math.max(0.1, mod);
}

function getReflectMod() {
    const reflect = player.combatBuffs.find(b => b.type === 'reflect');
    return reflect ? reflect.value : 0;
}

// ============ CREATURE ABILITIES ============

function processCreatureAbilities() {
    if (!creature) return;

    creature.abilities.forEach(ab => {
        switch (ab) {
            case 'REGEN':
                if (creature.hp < creature.maxHp) {
                    const heal = Math.floor(creature.maxHp * 0.05);
                    creature.hp = Math.min(creature.maxHp, creature.hp + heal);
                    addFloatingText(`+${heal}`, 220, 150, 'heal');
                }
                break;
            case 'SHIELD':
                if (Math.random() < 0.25) {
                    creature.hasShield = true;
                }
                break;
            case 'RAGE':
                if (creature.hp < creature.maxHp * 0.3) {
                    creature.enraged = true;
                }
                break;
            case 'POISON':
                if (Math.random() < 0.3) {
                    player.poisonStacks = Math.min(5, player.poisonStacks + 1);
                    addLog('Poisoned!', 'log-damage');
                }
                break;
            case 'FEAR':
                if (Math.random() < 0.2) {
                    player.fearDebuff = true;
                    addLog('Terrified! Attack reduced!', 'log-damage');
                }
                break;
        }
    });

    // Apply poison damage to player
    if (player.poisonStacks > 0) {
        const stats = computePlayerStats(player);
        const dmg = Math.floor(stats.hp * 0.02 * player.poisonStacks);
        player.currentHp -= dmg;
        addFloatingText(`-${dmg} ☠️`, 60, 150);
        addLog(`☠️ Poison (${player.poisonStacks}x): -${dmg} HP`, 'log-damage');
    }
}

// ============ SPELL SYSTEM ============

export function castSpell(spellId) {
    if (session.shieldActive || !creature) return;

    const spell = SPELL_TEMPLATES.find(s => s.id === spellId);
    if (!spell) return;

    const cooldown = player.spellCooldowns[spellId] || 0;
    if (cooldown > 0) return;

    if (!player.unlockedSpells.includes(spellId)) return;

    // Set cooldown
    player.spellCooldowns[spellId] = spell.cooldown;

    emit('sound', { freq: 800, type: 'sine', duration: 0.15 });

    const stats = computePlayerStats(player);

    // Apply buff
    if (spell.buff) {
        player.combatBuffs.push({ ...spell.buff });
        addLog(`${spell.buff.type} buff for ${spell.buff.turns} turns!`, 'log-spell');
    }

    // Apply debuff to enemy
    if (spell.debuff) {
        const existing = player.combatDebuffs.find(d => d.type === spell.debuff.type);
        if (existing) {
            existing.turns = spell.debuff.turns;
            if (spell.debuff.value) existing.value = spell.debuff.value;
        } else {
            player.combatDebuffs.push({ ...spell.debuff });
        }
        addLog(`Enemy ${spell.debuff.type}!`, 'log-effective');
    }

    // Heal now
    if (spell.healNow) {
        player.currentHp = Math.min(stats.hp, player.currentHp + spell.healNow);
        addFloatingText(`+${spell.healNow}`, 60, 40, 'heal');
    }

    // Special: cleanse
    if (spell.special === 'cleanse') {
        player.combatDebuffs = player.combatDebuffs.filter(d => !['poison', 'burn', 'bleed'].includes(d.type));
        player.poisonStacks = 0;
        addLog('Cleansed negative effects!', 'log-spell');
    }

    // Shield spell
    if (spell.shield) {
        const shieldAmt = Math.floor(stats.hp * spell.shield);
        player.currentHp = Math.min(stats.hp, player.currentHp + shieldAmt);
        addFloatingText(`+${shieldAmt} Shield`, 60, 60, 'heal');
        addLog(`${spell.name}! Shield ${shieldAmt} HP`, 'log-spell');
    } else if (spell.heal) {
        const amt = Math.floor(stats.hp * spell.heal);
        player.currentHp = Math.min(stats.hp, player.currentHp + amt);
        addFloatingText(`+${amt}`, 60, 60, 'heal');
        addLog(`${spell.name}! Healed ${amt} HP`, 'log-spell');
    } else if (spell.damage > 0) {
        // Damage spell
        let damage = Math.floor(stats.atk * spell.damage);
        if (stats.spellPower > 0) {
            damage = Math.floor(damage * (1 + stats.spellPower));
        }

        const mult = getMagicMultiplier(spell.magic, creature.magic);
        damage = Math.floor(damage * mult);

        const isCrit = Math.random() * 100 < stats.crit;
        if (isCrit) {
            damage = Math.floor(damage * stats.critDmg);
            addFloatingText(`CRIT -${damage}`, 220, 50, 'crit');
        } else {
            const floatType = mult > 1 ? 'effective' : (mult < 1 ? 'resist' : 'spell');
            addFloatingText(`-${damage}`, 220, 60, floatType);
        }

        if (mult > 1) addLog(`${spell.name} is super effective!`, 'log-effective');
        else if (mult < 1) addLog(`${spell.name} is not very effective...`, 'log-resist');

        creature.hp -= damage;
        addParticles(220, 80, spell.color || MAGIC_TYPES[spell.magic].color, 8);

        // Lifesteal
        if (stats.lifesteal > 0) {
            const healAmt = Math.floor(damage * stats.lifesteal);
            if (healAmt > 0) {
                player.currentHp = Math.min(stats.hp, player.currentHp + healAmt);
            }
        }
    }

    // Check creature death
    if (creature && creature.hp <= 0) {
        handleCreatureDeath();
    }

    emit('spellCast', { spell });
}

// ============ SHIELD MINIGAME ============

function shouldTriggerShieldMinigame() {
    if (!creature || !creature.boss) return false;
    if (session.shieldActive) return false;

    if (!creature.shieldPhase1) {
        creature.shieldPhase1 = true;
        return true;
    }

    const hpPercent = creature.hp / creature.maxHp;
    if (hpPercent <= 0.5 && !creature.shieldPhase2) {
        creature.shieldPhase2 = true;
        return true;
    }

    return false;
}

function startShieldMinigame() {
    const isFirstPhase = !creature.shieldPhase2 || (creature.shieldPhase1 && !creature.shieldPhase2);
    const showTutorial = isFirstBossEver() && isFirstPhase && !player.shieldTutorialDone;

    session.shieldActive = true;
    session.shieldSpellQueue = generateShieldSpells(showTutorial ? 3 : 5);
    session.shieldCurrentColor = null;
    session.shieldTimeLeft = 0;
    session.shieldIsTutorial = showTutorial;
    session.shieldSpellsBlocked = 0;
    session.shieldSpellsMissed = 0;

    if (showTutorial) {
        session.state = 'shieldTutorial';
        renderData.showShieldTutorial = true;
        emit('sound', { freq: 500, type: 'sine', duration: 0.2 });
    } else {
        beginShieldMinigame();
    }
}

function isFirstBossEver() {
    return player.encounterIndex === 3 && player.bestFloor < 4;
}

function generateShieldSpells(count) {
    const spells = [];
    for (let i = 0; i < count; i++) {
        spells.push(SHIELD_COLORS[Math.floor(Math.random() * SHIELD_COLORS.length)]);
    }
    return spells;
}

export function startShieldFromTutorial() {
    player.shieldTutorialDone = true;
    session.state = 'shieldMinigame';
    renderData.showShieldTutorial = false;
    beginShieldMinigame();
}

function beginShieldMinigame() {
    session.state = 'shieldMinigame';
    renderData.showShieldMinigame = true;
    renderData.shieldTimer = 100;
    renderData.shieldResult = '';
    renderData.shieldHighlightColor = null;

    addLog('🛡️ Boss casting spells! Block them!', 'log-boss');
    emit('sound', { freq: 400, type: 'sine', duration: 0.2 });

    const delay = session.shieldIsTutorial ? 1000 : 500;
    setTimeout(() => {
        if (session.shieldActive) sendNextShieldSpell();
    }, delay);
}

let shieldTimerId = null;

function sendNextShieldSpell() {
    if (session.shieldSpellQueue.length === 0) {
        endShieldMinigame();
        return;
    }

    const color = session.shieldSpellQueue.shift();
    session.shieldCurrentColor = color;

    const baseTime = session.shieldIsTutorial ? CONFIG.SHIELD_TUTORIAL_TIME_MS : CONFIG.SHIELD_BASE_TIME_MS;
    const speedBonus = session.shieldIsTutorial ? 0 : Math.min((player.floor / 5 - 1) * 100, 600);
    session.shieldTimeLeft = baseTime - speedBonus;

    renderData.shieldSpells = [{ color, x: 200, y: 100, flying: true }];
    renderData.shieldHighlightColor = session.shieldIsTutorial ? color : null;
    renderData.shieldTimer = 100;
    renderData.shieldResult = '';

    const maxTime = session.shieldTimeLeft;
    shieldTimerId = setInterval(() => {
        session.shieldTimeLeft -= 100;
        renderData.shieldTimer = (session.shieldTimeLeft / maxTime) * 100;

        if (session.shieldTimeLeft <= 0) {
            clearInterval(shieldTimerId);
            shieldMiss();
        }
    }, 100);
    session.shieldTimerId = shieldTimerId;

    emit('sound', { freq: 600 + (SHIELD_COLORS.indexOf(color) * 100), type: 'sine', duration: 0.15 });
}

export function handleShieldPress(color) {
    if (!session.shieldActive || !session.shieldCurrentColor) return;

    if (shieldTimerId) {
        clearInterval(shieldTimerId);
        shieldTimerId = null;
    }

    if (color === session.shieldCurrentColor) {
        shieldSuccess();
    } else {
        shieldMiss();
    }
}

function shieldSuccess() {
    session.shieldSpellsBlocked++;
    renderData.shieldResult = '✓ Blocked!';
    renderData.shieldSpells = [];

    emit('sound', { freq: 800, type: 'sine', duration: 0.15 });
    addLog('🛡️ Spell blocked!', 'log-effective');

    const pauseTime = session.shieldIsTutorial ? 1200 : 600;
    setTimeout(() => {
        if (session.shieldActive) sendNextShieldSpell();
    }, pauseTime);
}

function shieldMiss() {
    session.shieldSpellsMissed++;
    renderData.shieldResult = '✗ Hit!';

    const damageMultiplier = session.shieldIsTutorial ? 0.3 : 0.5;
    const damage = Math.floor(creature.atk * damageMultiplier);
    player.currentHp -= damage;

    addFloatingText(`-${damage}`, 60, 200, 'damage');
    addLog(`💥 Hit by spell! -${damage} HP`, 'log-damage');
    emit('sound', { freq: 200, type: 'sawtooth', duration: 0.2 });

    if (player.currentHp <= 0) {
        endShieldMinigame();
        triggerGameOver();
        return;
    }

    setTimeout(() => {
        if (session.shieldActive) sendNextShieldSpell();
    }, 600);
}

function endShieldMinigame() {
    session.shieldActive = false;
    session.shieldCurrentColor = null;

    if (shieldTimerId) {
        clearInterval(shieldTimerId);
        shieldTimerId = null;
    }

    renderData.showShieldMinigame = false;
    renderData.shieldHighlightColor = null;

    const blocked = session.shieldSpellsBlocked;
    const total = blocked + session.shieldSpellsMissed;

    if (blocked === total && total > 0) {
        addLog(`🎉 Perfect defense! All ${total} spells blocked!`, 'log-effective');
        const bonusDmg = Math.floor(creature.maxHp * 0.1);
        creature.hp -= bonusDmg;
        addFloatingText(`PERFECT! -${bonusDmg}`, 220, 150, 'effective');
        emit('sound', { freq: 1000, type: 'sine', duration: 0.2 });
    } else if (blocked > 0) {
        addLog(`🛡️ Blocked ${blocked}/${total} spells`, 'log-spell');
    } else {
        addLog(`💥 Failed to block any spells!`, 'log-damage');
    }

    // Check if boss died from perfect defense bonus damage
    if (creature && creature.hp <= 0) {
        handleCreatureDeath();
        return;
    }

    if (player.currentHp > 0 && creature && creature.hp > 0) {
        session.state = 'playing';
        session.gameStarted = true;
        session.inBattle = true;
        addLog('⚔️ Resume battle!', 'log-boss');
        startBattleLoop();
    }
}

// ============ BUFF SELECTION ============

function showBuffSelection() {
    session.state = 'buffSelect';
    renderData.showBuffSelect = true;

    // Generate 3 random buff choices
    const shuffled = [...BUFF_TEMPLATES].sort(() => Math.random() - 0.5);
    const choices = shuffled.slice(0, 3);
    session.buffChoices = choices;
    renderData.buffChoices = choices;

    emit('sound', { freq: 600, type: 'sine', duration: 0.15 });
}

export function selectBuff(buffId) {
    if (session.state !== 'buffSelect') return;

    const buff = session.buffChoices.find(b => b.id === buffId);
    if (!buff) return;

    const stats = computePlayerStats(player);

    // Apply buff
    player.activeBuffs.push({ id: buff.id, name: buff.name, icon: buff.icon });
    const effect = buff.effect;
    const bs = player.buffStats;

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

    if (effect.healPercent) {
        const newStats = computePlayerStats(player);
        const healAmt = Math.floor(newStats.hp * effect.healPercent);
        player.currentHp = Math.min(newStats.hp, player.currentHp + healAmt);
        addLog(`Healed ${healAmt} HP!`, 'log-spell');
    }
    if (effect.goldNow) {
        player.gold += effect.goldNow;
        addLog(`+${effect.goldNow} Gold!`, 'log-gold');
    }

    // Apply HP increase
    if (effect.hp) {
        const newStats = computePlayerStats(player);
        player.maxHp = newStats.hp;
        player.currentHp = Math.min(player.currentHp + effect.hp, newStats.hp);
    }

    emit('sound', { freq: 800, type: 'sine', duration: 0.2 });
    addLog(`Gained: ${buff.name}!`, 'log-levelup');

    emit('buffSelected', { buff });

    // Continue to next room
    continueToNextRoom();
}

function continueToNextRoom() {
    renderData.showBuffSelect = false;
    session.selectingBuff = false;

    session.state = 'playing';
    session.inBattle = true;

    spawnCreature();

    if (!battleLoopId) {
        startBattleLoop();
    }

    emit('roomContinue');
}

// ============ GAME OVER / VICTORY ============

function triggerGameOver() {
    stopBattleLoop();
    session.state = 'gameOver';
    session.gameStarted = false;

    if (player.floor > player.bestFloor) {
        player.bestFloor = player.floor;
    }

    renderData.showGameOver = true;
    renderData.gameOverData = {
        floor: player.floor,
        kills: player.runKills,
        gold: player.runGold,
        combo: player.maxCombo
    };

    emit('sound', { freq: 150, type: 'sawtooth', duration: 0.3 });
    emit('gameOver');
}

function triggerVictory() {
    stopBattleLoop();
    session.state = 'victory';
    session.gameStarted = false;

    if (player.floor > player.bestFloor) {
        player.bestFloor = player.floor;
    }

    renderData.showVictory = true;
    renderData.victoryData = {
        kills: player.runKills,
        gold: player.runGold,
        combo: player.maxCombo
    };

    // Victory sound
    emit('sound', { freq: 800, type: 'sine', duration: 0.3 });
    setTimeout(() => emit('sound', { freq: 1000, type: 'sine', duration: 0.3 }), 150);
    setTimeout(() => emit('sound', { freq: 1200, type: 'sine', duration: 0.3 }), 300);

    emit('victory');
}

export function restartGame() {
    stopBattleLoop();
    if (shieldTimerId) {
        clearInterval(shieldTimerId);
        shieldTimerId = null;
    }
    initGame();
}

// ============ COOLDOWN TICK ============

let cooldownIntervalId = null;

export function startCooldownTick() {
    if (cooldownIntervalId) return;

    cooldownIntervalId = setInterval(() => {
        if (session && !session.selectingBuff) {
            for (const id in player.spellCooldowns) {
                if (player.spellCooldowns[id] > 0) {
                    player.spellCooldowns[id]--;
                }
            }
        }
    }, 1000);
}

export function stopCooldownTick() {
    if (cooldownIntervalId) {
        clearInterval(cooldownIntervalId);
        cooldownIntervalId = null;
    }
}

// ============ UPDATE RENDER DATA ============

export function updateRenderData() {
    if (!renderData || !session || !player) return renderData;

    const stats = computePlayerStats(player);
    player.maxHp = stats.hp;
    if (player.currentHp > stats.hp) player.currentHp = stats.hp;

    // Update animations
    const now = Date.now();
    floatingTexts = floatingTexts.filter(ft => now - ft.startTime < ft.duration);
    particles = particles.filter(p => {
        if (now - p.startTime >= p.duration) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        return true;
    });

    // Header
    renderData.gold = player.gold;
    renderData.gems = player.gems;
    renderData.level = player.level;
    renderData.floor = player.floor;
    renderData.skillPoints = 0;

    // Hero
    renderData.heroHp = player.currentHp;
    renderData.heroMaxHp = stats.hp;
    renderData.heroName = 'Wizard';
    renderData.houseIcon = player.house ? HOUSE_DATA[player.house].icon : '🧙';

    // Creature
    if (creature) {
        renderData.creatureName = creature.name;
        renderData.creatureHp = creature.hp;
        renderData.creatureMaxHp = creature.maxHp;
        renderData.creatureSpriteIndex = creature.spriteIndex;
        renderData.creatureAbilities = creature.abilities
            .map(ab => ABILITIES[ab])
            .filter(a => a)
            .map(a => ({ icon: a.icon, name: a.name }));
        renderData.creatureHasShield = creature.hasShield;
        renderData.isBoss = creature.boss;
    } else {
        renderData.creatureName = '';
        renderData.creatureHp = 0;
        renderData.creatureMaxHp = 100;
        renderData.creatureAbilities = [];
        renderData.creatureHasShield = false;
        renderData.isBoss = false;
    }

    // Combo
    renderData.comboDisplay = player.combo > 1 ? `${player.combo}x Combo!` : '';

    // Active buffs
    const buffCounts = {};
    player.activeBuffs.forEach(b => {
        if (!buffCounts[b.id]) buffCounts[b.id] = { ...b, count: 0 };
        buffCounts[b.id].count++;
    });
    renderData.activeBuffs = Object.values(buffCounts).map(b => ({
        icon: b.icon,
        name: b.name,
        count: b.count
    }));

    // Spells
    renderData.spells = SPELL_TEMPLATES
        .filter(s => player.unlockedSpells.includes(s.id))
        .map(s => {
            const cd = player.spellCooldowns[s.id] || 0;
            return {
                id: s.id,
                icon: s.icon,
                magicIcon: MAGIC_TYPES[s.magic].icon,
                cooldown: cd,
                isReady: cd <= 0 && !session.shieldActive,
                isBlocked: session.shieldActive
            };
        });

    // Stats
    renderData.atk = stats.atk;
    renderData.def = stats.def;
    renderData.crit = stats.crit;
    renderData.hp = stats.hp;

    // Battle log
    renderData.battleLog = [...battleLog];

    // Visual effects
    renderData.floatingTexts = floatingTexts.map(ft => ({
        ...ft,
        progress: (now - ft.startTime) / ft.duration
    }));
    renderData.particles = particles.map(p => ({
        ...p,
        alpha: 1 - (now - p.startTime) / p.duration
    }));

    return renderData;
}

// ============ EXPORTS FOR TESTING ============

export function getState() {
    return {
        session,
        player,
        creature,
        renderData
    };
}
