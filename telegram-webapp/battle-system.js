// Battle System module - Combat logic, creature spawning, damage calculations
// Extracted from main.js

import { MAGIC_TYPES, ABILITIES, CREATURES, BOSSES, ROOM_THEMES, SPELLS } from './data.js';
import {
    game,
    currentCreature,
    creatureHp,
    creatureBuffs,
    turnCount,
    setCurrentCreature,
    setCreatureHp,
    setCreatureBuffs,
    setTurnCount,
    getCurrentCreature,
    getCreatureHp,
    getCreatureBuffs,
    getBattleInterval,
    setBattleInterval,
    isShieldGameActive,
    playSound,
    formatNum,
    getSkillEffect,
    hasSkill,
    getStats,
    getMagicMultiplier,
    saveGame
} from './game.js';

import { showFloat, createParticles } from './visual-effects.js';
import { shouldTriggerShieldMinigame, startShieldMinigame } from './shield-minigame.js';
import { renderActiveBuffs, renderBuffChoices } from './ui-renderers.js';
import { renderSpellBar } from './spell-system.js';

// DOM references
let battleLog = null;
let heroCanvas = null;
let creatureCanvas = null;

// Callbacks to be set by main.js
let updateUICallback = null;
let gameOverCallback = null;
let showRoomTransitionCallback = null;
let drawCreatureCallback = null;
let renderCreatureStatusCallback = null;
let renderBattleCreatureCardCallback = null;

export function initBattleSystem(callbacks) {
    battleLog = callbacks.battleLog;
    heroCanvas = callbacks.heroCanvas;
    creatureCanvas = callbacks.creatureCanvas;
    updateUICallback = callbacks.updateUI;
    gameOverCallback = callbacks.gameOver;
    showRoomTransitionCallback = callbacks.showRoomTransition;
    drawCreatureCallback = callbacks.drawCreature;
    renderCreatureStatusCallback = callbacks.renderCreatureStatus;
    renderBattleCreatureCardCallback = callbacks.renderBattleCreatureCard;
}

export function addLog(text, type = '') {
    if (!battleLog) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = text;
    battleLog.appendChild(entry);
    battleLog.scrollTop = battleLog.scrollHeight;
    while (battleLog.children.length > 12) battleLog.removeChild(battleLog.firstChild);
}

export function calculateBalancedEnemy() {
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

export function spawnCreature() {
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

    const nameEl = document.getElementById('creatureName');
    if (nameEl) nameEl.textContent = creature.name;

    const healthEl = document.getElementById('creatureHealth');
    if (healthEl) healthEl.style.width = '100%';

    if (drawCreatureCallback) drawCreatureCallback();
    if (renderCreatureStatusCallback) renderCreatureStatusCallback();
    if (renderBattleCreatureCardCallback) renderBattleCreatureCardCallback();
}

export function processDebuffs() {
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
        setCreatureHp(getCreatureHp() - totalDot);
        showFloat(`-${totalDot}`, 220, 80, 'effective');
        addLog(`DoT deals ${totalDot} damage!`, 'log-effective');
    }

    game.combatDebuffs = game.combatDebuffs.filter(d => {
        d.turns--;
        return d.turns > 0;
    });
}

export function processBuffs() {
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

export function isEnemyStunned() {
    return game.combatDebuffs.some(d => d.type === 'stun' && d.turns > 0);
}

export function getEnemyAtkMod() {
    let mod = 1;
    game.combatDebuffs.forEach(d => {
        if (d.type === 'weaken') mod -= d.value;
        if (d.type === 'torture') mod -= d.atkReduce;
    });
    return Math.max(0.1, mod);
}

export function getReflectMod() {
    const reflect = game.combatBuffs.find(b => b.type === 'reflect');
    return reflect ? reflect.value : 0;
}

export function processCreatureAbilities() {
    const currentCreature = getCurrentCreature();
    if (!currentCreature) return;

    const creatureBuffs = getCreatureBuffs();

    currentCreature.abilities.forEach(ab => {
        switch(ab) {
            case 'REGEN':
                if (getCreatureHp() < currentCreature.maxHp) {
                    const heal = Math.floor(currentCreature.maxHp * 0.05);
                    setCreatureHp(Math.min(currentCreature.maxHp, getCreatureHp() + heal));
                    showFloat(`+${heal}`, 220, 50, 'heal');
                }
                break;
            case 'SHIELD':
                if (Math.random() < 0.25) creatureBuffs.shield = true;
                break;
            case 'RAGE':
                if (getCreatureHp() < currentCreature.maxHp * 0.3) creatureBuffs.enraged = true;
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
        addLog(`☠️ Poison (${game.poisonStacks}x): -${dmg} HP`, 'log-damage');
    }

    if (renderCreatureStatusCallback) renderCreatureStatusCallback();
}

export function checkCreatureDeath() {
    const currentCreature = getCurrentCreature();
    if (getCreatureHp() <= 0 && currentCreature) {
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
        if (updateUICallback) updateUICallback();
        saveGame();

        setTimeout(() => {
            if (showRoomTransitionCallback) showRoomTransitionCallback(goldGain);
        }, 400);
    }
}

export function battle() {
    if (!game.inBattle) return;

    const currentCreature = getCurrentCreature();
    if (!currentCreature) {
        spawnCreature();
        return;
    }

    setTurnCount(turnCount + 1);
    const stats = getStats();
    const creatureBuffs = getCreatureBuffs();

    const isCrit = Math.random() * 100 < stats.crit;
    let damage = Math.max(1, stats.atk - Math.floor(currentCreature.atk * 0.08));

    const mult = getMagicMultiplier(stats.wandMagic, currentCreature.magic);
    damage = Math.floor(damage * mult);

    if (isCrit) damage = Math.floor(damage * (1 + stats.critDmg));

    if (stats.executeDmg > 0 && getCreatureHp() < currentCreature.maxHp * 0.3) {
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
        if (hasSkill('execute') && getCreatureHp() < currentCreature.maxHp * 0.15) {
            damage = getCreatureHp();
            addLog('Avada Kedavra!', 'log-crit');
        }

        setCreatureHp(getCreatureHp() - damage);
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

    if (heroCanvas) {
        heroCanvas.classList.add('attacking');
        setTimeout(() => heroCanvas.classList.remove('attacking'), 100);
    }
    if (creatureCanvas) {
        setTimeout(() => {
            creatureCanvas.classList.add('hit');
            setTimeout(() => creatureCanvas.classList.remove('hit'), 100);
        }, 100);
    }

    const healthEl = document.getElementById('creatureHealth');
    if (healthEl) healthEl.style.width = `${Math.max(0, (getCreatureHp() / currentCreature.maxHp) * 100)}%`;

    // Update battle creature HP bar
    const battleHealthEl = document.getElementById('creatureHealth');
    if (battleHealthEl) {
        const hpPercent = (getCreatureHp() / currentCreature.maxHp) * 100;
        battleHealthEl.style.width = `${Math.max(0, hpPercent)}%`;
    }

    if (getCreatureHp() <= 0) {
        checkCreatureDeath();
    } else {
        if (shouldTriggerShieldMinigame(creatureBuffs)) {
            startShieldMinigame(creatureBuffs);
            if (updateUICallback) updateUICallback();
            return;
        }

        processDebuffs();

        if (getCreatureHp() <= 0) {
            checkCreatureDeath();
            if (updateUICallback) updateUICallback();
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
                    setCreatureHp(getCreatureHp() - thornsDmg);
                    showFloat(`-${thornsDmg}🌹`, 220, 40);
                }

                const reflectMod = getReflectMod();
                if (reflectMod > 0) {
                    const reflectDmg = Math.floor(creatureDmg * reflectMod);
                    setCreatureHp(getCreatureHp() - reflectDmg);
                    showFloat(`-${reflectDmg}🛡️`, 220, 30, 'spell');
                }

                if (currentCreature.abilities.includes('REFLECT')) {
                    const reflectDmg = Math.floor(damage * 0.2);
                    game.currentHp -= reflectDmg;
                    showFloat(`-${reflectDmg}`, 100, 50);
                    addLog(`💫 Reflect: -${reflectDmg} HP`, 'log-damage');
                }

                game.currentHp -= creatureDmg;
                showFloat(`-${creatureDmg}`, 60, 60);
                addLog(`⚔️ ${currentCreature.name} hits: -${creatureDmg} HP`, 'log-damage');
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
                if (gameOverCallback) gameOverCallback();
                return;
            }
        }
    }

    if (updateUICallback) updateUICallback();
    saveGame();
}

export function startBattle() {
    const currentInterval = getBattleInterval();
    if (currentInterval) {
        clearInterval(currentInterval);
        console.log('[BATTLE] Cleared previous battle interval');
    }
    const newInterval = setInterval(() => {
        const shieldActive = isShieldGameActive();
        if (game.gameStarted && !shieldActive) {
            battle();
        }
    }, 900);
    setBattleInterval(newInterval);
    console.log('[BATTLE] Started new battle interval');
}

export function generateRoom() {
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

    if (battleAreaEl) {
        battleAreaEl.style.background = `linear-gradient(180deg, ${theme.bg[0]} 0%, ${theme.bg[1]} 100%)`;
    }
    if (roomGround) {
        roomGround.style.background = `linear-gradient(180deg, ${theme.ground} 0%, ${theme.bg[1]} 100%)`;
    }

    const particleX1 = 20 + seededRandom() * 30;
    const particleX2 = 50 + seededRandom() * 30;
    if (magicParticles) {
        magicParticles.style.background = `
            radial-gradient(circle at ${particleX1}% 40%, ${theme.particles} 0%, transparent 50%),
            radial-gradient(circle at ${particleX2}% 60%, ${theme.particles} 0%, transparent 50%)
        `;
    }

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
        if (battleAreaEl) battleAreaEl.appendChild(decor);
    }

    game.roomSeed = Math.floor(Math.random() * 10000);
}
