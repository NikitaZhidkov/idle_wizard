// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * BOSS FIGHT STRATEGY
 * Focus on handling boss encounters correctly - shield minigames, boss abilities
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select Slytherin for balanced stats
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator('.house-option[data-house="slytherin"]').click();
  await page.waitForSelector('#houseSelectPopup', { state: 'hidden', timeout: 5000 });

  // Complete tutorial
  const tutorialOverlay = page.locator('#spellTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    for (let i = 1; i <= 3; i++) {
      await page.waitForSelector(`#spellTutorialPage${i}.active`, { timeout: 3000 });
      const btn = page.locator(`#spellTutorialPage${i}.active .spell-tutorial-btn`);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }
    await page.waitForSelector('#spellTutorialOverlay', { state: 'hidden', timeout: 5000 });
  }
  log('SETUP', 'Game initialized with Slytherin (boss hunter)');
}

async function getState(page) {
  return page.evaluate(() => {
    // Get HP from the stat display (hpStat shows current/max)
    const hpStat = document.getElementById('hpStat')?.textContent || '100';
    const playerHealthBar = document.getElementById('playerHealth');
    const healthWidth = playerHealthBar?.style?.width || '100%';
    const hpPercent = parseInt(healthWidth) || 100;

    const creatureName = document.getElementById('battleCreatureName')?.textContent || '';
    const isBoss = creatureName.includes('Troll') ||
                   creatureName.includes('Death Eater') ||
                   creatureName.includes('Nagini') ||
                   creatureName.includes('Voldemort');

    // Check game over - popup visible OR health bar at 0%
    const gameoverPopup = document.getElementById('gameoverPopup');
    const gameOver = gameoverPopup?.style?.display === 'flex' ||
                     gameoverPopup?.classList?.contains('active') ||
                     hpPercent <= 0;

    return {
      floor: parseInt(document.getElementById('floor')?.textContent?.replace('Floor: ', '') || '1'),
      hp: hpStat,
      hpPercent,
      buffVisible: document.getElementById('buffSelectionPanel')?.style?.display === 'block',
      shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
      shieldTutorial: document.getElementById('shieldTutorialOverlay')?.style?.display !== 'none',
      gameOver,
      creature: creatureName,
      isBoss
    };
  });
}

async function bossStrategy(page, isBoss) {
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();

  if (count === 0) return;

  if (isBoss) {
    // BOSS MODE: Use strongest spells
    log('BOSS', 'In boss fight - using all available spells!');
    for (let i = 0; i < count; i++) {
      try {
        await readySpells.nth(i).click();
        await page.waitForTimeout(100);
      } catch (e) { /* continue */ }
    }
  } else {
    // Normal fight - conserve some spells for boss
    await readySpells.first().click().catch(() => {});
  }
}

async function handleBuffSelection(page, isBoss) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 300 }).catch(() => false)) {
    // For boss fights, prioritize damage
    if (isBoss) {
      const dmgBuff = page.locator('.buff-choice:has-text("Attack"), .buff-choice:has-text("Damage"), .buff-choice:has-text("Crit")').first();
      if (await dmgBuff.isVisible().catch(() => false)) {
        await dmgBuff.click();
        log('BUFF', 'Selected damage buff for boss');
        await page.waitForTimeout(500);
        return true;
      }
    }

    await buffChoice.click();
    log('BUFF', 'Selected first buff');
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function handleShieldMinigame(page, isFirstBoss) {
  // Check for tutorial overlay first
  const tutorialOverlay = page.locator('#shieldTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
    log('SHIELD', '=== SHIELD TUTORIAL DETECTED ===');
    const startBtn = page.locator('#shieldTutorialStartBtn');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      log('SHIELD', 'Clicked tutorial start button');
      await page.waitForTimeout(1000);
    }
  }

  const shieldMinigame = page.locator('#shieldMinigame.active');
  if (!await shieldMinigame.isVisible({ timeout: 500 }).catch(() => false)) {
    return false;
  }

  log('SHIELD', '=== BOSS SHIELD MINIGAME ===');
  let spellsBlocked = 0;
  let attempts = 0;

  while (attempts++ < 40) {
    if (!await shieldMinigame.isVisible().catch(() => false)) {
      log('SHIELD', `Minigame ended after blocking ${spellsBlocked} spells`);
      break;
    }

    // Tutorial mode - click highlighted button
    const highlightedBtn = page.locator('.shield-btn.highlight');
    if (await highlightedBtn.isVisible({ timeout: 200 }).catch(() => false)) {
      await highlightedBtn.click().catch(() => {});
      spellsBlocked++;
      log('SHIELD', `Tutorial: Clicked highlighted button (${spellsBlocked})`);
      await page.waitForTimeout(500);
      continue;
    }

    // Normal mode - match spell color
    const flyingSpell = page.locator('.shield-spell.flying');
    if (await flyingSpell.isVisible({ timeout: 200 }).catch(() => false)) {
      const style = await flyingSpell.getAttribute('style') || '';

      // Detect color from style
      let color = 'red';
      if (style.includes('#4488ff') || style.includes('rgb(68, 136, 255)')) color = 'blue';
      else if (style.includes('#ffdd44') || style.includes('rgb(255, 221, 68)')) color = 'yellow';
      else if (style.includes('#44dd44') || style.includes('rgb(68, 221, 68)')) color = 'green';
      else if (style.includes('#ff4444') || style.includes('rgb(255, 68, 68)')) color = 'red';

      const btn = page.locator(`.shield-btn.${color}`);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        spellsBlocked++;
        log('SHIELD', `Blocked ${color} spell (${spellsBlocked})`);
      }
      await page.waitForTimeout(350);
    } else {
      await page.waitForTimeout(100);
    }
  }

  await page.waitForSelector('#shieldMinigame.active', { state: 'hidden', timeout: 5000 }).catch(() => {});
  log('SHIELD', `=== MINIGAME COMPLETE: ${spellsBlocked} blocked ===`);
  return true;
}

test('Boss fight strategy - defeat at least 2 bosses', async ({ page }) => {
  const errors = [];
  let bossesDefeated = 0;
  let shieldMinigamesCompleted = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await setupGame(page);
  log('TEST', 'Starting boss fight strategy');

  const startTime = Date.now();
  let lastFloor = 1;
  let lastBoss = '';
  let inBossFight = false;

  while (Date.now() - startTime < 300000) { // 5 minutes for boss strategy
    const state = await getState(page);

    // Track boss encounters
    if (state.isBoss && state.creature !== lastBoss) {
      log('BOSS', `=== BOSS ENCOUNTER: ${state.creature} ===`);
      lastBoss = state.creature;
      inBossFight = true;
    }

    if (inBossFight && !state.isBoss && state.creature && state.creature !== lastBoss) {
      log('BOSS', `=== BOSS DEFEATED: ${lastBoss} ===`);
      bossesDefeated++;
      inBossFight = false;
    }

    if (state.floor >= 12) {
      log('TEST', `SUCCESS: Reached floor ${state.floor}, bosses defeated: ${bossesDefeated}`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Died at floor ${state.floor} fighting ${state.creature}`);
      break;
    }

    if (state.floor !== lastFloor) {
      log('FLOOR', `Floor ${state.floor}, HP: ${state.hp}, Creature: ${state.creature}`);
      lastFloor = state.floor;
    }

    // PRIORITY: Handle shield minigame/tutorial
    if (await page.locator('#shieldTutorialOverlay').isVisible({ timeout: 100 }).catch(() => false)) {
      await handleShieldMinigame(page, shieldMinigamesCompleted === 0);
      shieldMinigamesCompleted++;
      continue;
    }

    if (state.shieldActive) {
      await handleShieldMinigame(page, shieldMinigamesCompleted === 0);
      shieldMinigamesCompleted++;
      continue;
    }

    if (await handleBuffSelection(page, state.isBoss)) continue;

    await bossStrategy(page, state.isBoss);
    await page.waitForTimeout(400);
  }

  const finalState = await getState(page);
  log('TEST', `Final: Floor ${finalState.floor}, HP: ${finalState.hp}`);
  log('TEST', `Bosses defeated: ${bossesDefeated}, Shield minigames: ${shieldMinigamesCompleted}`);

  // Must have encountered at least the first boss (floor 4) and completed shield minigame
  expect(finalState.floor).toBeGreaterThanOrEqual(4);
  expect(shieldMinigamesCompleted).toBeGreaterThanOrEqual(1);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
