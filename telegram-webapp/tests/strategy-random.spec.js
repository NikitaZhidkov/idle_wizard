// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * RANDOM/CHAOS STRATEGY
 * Fuzz testing - random actions, random buff selection, test edge cases
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

const randomChoice = arr => arr[Math.floor(Math.random() * arr.length)];

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Random house selection
  const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
  const house = randomChoice(houses);

  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator(`.house-option[data-house="${house}"]`).click();
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
  log('SETUP', `Game initialized with random house: ${house}`);
}

async function getState(page) {
  return page.evaluate(() => {
    // Get HP from correct element
    const hpStat = document.getElementById('hpStat')?.textContent || '100';
    const playerHealthBar = document.getElementById('playerHealth');
    const healthWidth = playerHealthBar?.style?.width || '100%';
    const hpPercent = parseInt(healthWidth) || 100;

    // Better game-over detection with fallback checks
    const gameoverPopup = document.getElementById('gameoverPopup');
    const gameOver = gameoverPopup?.style?.display === 'flex' ||
                     gameoverPopup?.classList?.contains('active') ||
                     hpPercent <= 0;

    return {
      floor: parseInt(document.getElementById('floor')?.textContent?.replace('Floor: ', '') || '1'),
      hp: hpStat,
      hpPercent: hpPercent,
      buffVisible: document.getElementById('buffSelectionPanel')?.style?.display === 'block',
      shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
      gameOver: gameOver,
      creature: document.getElementById('battleCreatureName')?.textContent || ''
    };
  });
}

async function randomStrategy(page) {
  // CHAOS: Random actions
  const actions = [
    'cast_spell',
    'cast_spell',
    'cast_spell',
    'click_random',
    'wait',
    'rapid_click'
  ];

  const action = randomChoice(actions);

  switch (action) {
    case 'cast_spell':
      const readySpells = page.locator('#spellsContainer .spell.ready');
      const count = await readySpells.count();
      if (count > 0) {
        const idx = Math.floor(Math.random() * count);
        await readySpells.nth(idx).click().catch(() => {});
        log('CHAOS', 'Cast random spell');
      }
      break;

    case 'click_random':
      // Click random visible elements (fuzz test)
      const elements = ['#battleArea', '.spell', '.game-container'];
      const el = randomChoice(elements);
      await page.locator(el).first().click({ force: true }).catch(() => {});
      log('CHAOS', `Clicked ${el}`);
      break;

    case 'rapid_click':
      // Rapid click spells (even if not ready)
      const allSpells = page.locator('#spellsContainer .spell');
      const spellCount = await allSpells.count();
      for (let i = 0; i < Math.min(5, spellCount); i++) {
        await allSpells.nth(i).click({ force: true }).catch(() => {});
      }
      log('CHAOS', 'Rapid clicked all spells');
      break;

    case 'wait':
      await page.waitForTimeout(Math.random() * 500);
      break;
  }
}

async function handleBuffSelection(page) {
  const buffChoices = page.locator('.buff-choice');
  const count = await buffChoices.count();

  if (count > 0 && await buffChoices.first().isVisible({ timeout: 300 }).catch(() => false)) {
    // RANDOM: Pick a random buff
    const idx = Math.floor(Math.random() * count);
    await buffChoices.nth(idx).click();
    log('BUFF', `Selected random buff #${idx + 1}`);
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function handleShieldMinigame(page) {
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

test('Random/chaos fuzz testing strategy', async ({ page }) => {
  const errors = [];
  let chaosActions = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await setupGame(page);
  log('TEST', 'Starting chaos/fuzz testing strategy');

  const startTime = Date.now();
  let lastFloor = 1;

  while (Date.now() - startTime < 180000) { // 3 minutes for chaos test
    const state = await getState(page);

    if (state.floor >= 6) {
      log('TEST', `SUCCESS: Chaos reached floor ${state.floor}`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Chaos died at floor ${state.floor} - this is OK for fuzz testing`);
      break;
    }

    if (state.floor !== lastFloor) {
      log('FLOOR', `Floor ${state.floor}, HP: ${state.hp}`);
      lastFloor = state.floor;
    }

    if (await page.locator('#shieldTutorialOverlay').isVisible({ timeout: 100 }).catch(() => false)) {
      await handleShieldMinigame(page);
      continue;
    }

    if (state.shieldActive) {
      await handleShieldMinigame(page);
      continue;
    }

    if (await handleBuffSelection(page)) continue;

    await randomStrategy(page);
    chaosActions++;

    await page.waitForTimeout(200 + Math.random() * 300);
  }

  const finalState = await getState(page);
  log('TEST', `Final: Floor ${finalState.floor}, HP: ${finalState.hp}, Chaos actions: ${chaosActions}`);

  // For chaos testing, we care more about no crashes than reaching a floor
  const criticalErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('net::ERR') &&
    e.includes('Error') || e.includes('Uncaught')
  );

  log('TEST', `Critical errors found: ${criticalErrors.length}`);
  criticalErrors.forEach(e => log('ERROR', e));

  expect(criticalErrors).toHaveLength(0);
  expect(chaosActions).toBeGreaterThan(50); // Should have done many random actions
});
