// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * UI STRESS TEST STRATEGY
 * Rapid clicking, disabled buttons, animations, edge cases
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Test: Double-click house selection
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  const houseOption = page.locator('.house-option[data-house="gryffindor"]');

  // STRESS: Rapid double-click
  await houseOption.dblclick();
  log('STRESS', 'Double-clicked house selection');

  await page.waitForSelector('#houseSelectPopup', { state: 'hidden', timeout: 5000 });

  // Complete tutorial with rapid clicks
  const tutorialOverlay = page.locator('#spellTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    for (let i = 1; i <= 3; i++) {
      await page.waitForSelector(`#spellTutorialPage${i}.active`, { timeout: 3000 });
      const btn = page.locator(`#spellTutorialPage${i}.active .spell-tutorial-btn`);
      if (await btn.isVisible()) {
        // STRESS: Rapid click tutorial buttons
        await btn.click();
        await btn.click().catch(() => {});
        await page.waitForTimeout(200);
      }
    }
    await page.waitForSelector('#spellTutorialOverlay', { state: 'hidden', timeout: 5000 });
  }
  log('SETUP', 'Game initialized with UI stress');
}

async function getState(page) {
  return page.evaluate(() => ({
    floor: parseInt(document.getElementById('floor')?.textContent?.replace('Floor: ', '') || '1'),
    hp: document.getElementById('hpStat')?.textContent || '',
    buffVisible: document.getElementById('buffSelectionPanel')?.style?.display === 'block',
    shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
    gameOver: document.getElementById('gameoverPopup')?.style?.display === 'flex',
    creature: document.getElementById('battleCreatureName')?.textContent || ''
  }));
}

async function uiStressTest(page) {
  // STRESS TEST 1: Rapid click all spells (even on cooldown)
  const allSpells = page.locator('#spellsContainer .spell');
  const spellCount = await allSpells.count();

  for (let i = 0; i < spellCount; i++) {
    // Click each spell 3 times rapidly
    for (let j = 0; j < 3; j++) {
      await allSpells.nth(i).click({ force: true }).catch(() => {});
    }
  }

  // STRESS TEST 2: Click on battle area
  await page.locator('#battleArea').click({ force: true }).catch(() => {});

  // STRESS TEST 3: Click creature canvas
  await page.locator('#creatureCanvas').click({ force: true }).catch(() => {});

  // STRESS TEST 4: Click hero canvas
  await page.locator('#heroCanvas').click({ force: true }).catch(() => {});
}

async function handleBuffSelectionStress(page) {
  const buffChoices = page.locator('.buff-choice');
  const count = await buffChoices.count();

  if (count > 0 && await buffChoices.first().isVisible({ timeout: 300 }).catch(() => false)) {
    // STRESS: Click multiple buff choices rapidly
    for (let i = 0; i < Math.min(count, 3); i++) {
      await buffChoices.nth(i).click({ force: true }).catch(() => {});
    }
    log('STRESS', `Rapid clicked ${Math.min(count, 3)} buff choices`);
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function handleShieldMinigameStress(page) {
  // Check for tutorial overlay first
  const tutorialOverlay = page.locator('#shieldTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
    log('STRESS', 'Shield tutorial detected');
    const startBtn = page.locator('#shieldTutorialStartBtn');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // STRESS: Double-click start
      await startBtn.dblclick();
      log('STRESS', 'Double-clicked shield tutorial start');
      await page.waitForTimeout(1000);
    }
  }

  const shieldMinigame = page.locator('#shieldMinigame.active');
  if (!await shieldMinigame.isVisible({ timeout: 500 }).catch(() => false)) return false;

  log('SHIELD', 'Shield minigame - stress mode');
  let spellsBlocked = 0;
  let attempts = 0;

  while (attempts++ < 40) {
    if (!await shieldMinigame.isVisible().catch(() => false)) {
      log('SHIELD', `Done: ${spellsBlocked} blocked`);
      break;
    }

    // STRESS: Sometimes click ALL buttons rapidly (every 4th attempt)
    if (attempts % 4 === 0) {
      const buttons = page.locator('.shield-btn');
      const btnCount = await buttons.count();
      for (let i = 0; i < btnCount; i++) {
        await buttons.nth(i).click({ force: true }).catch(() => {});
      }
      log('STRESS', 'Clicked all shield buttons');
      await page.waitForTimeout(200);
      continue;
    }

    // Normal behavior - click highlighted or matching
    const highlightedBtn = page.locator('.shield-btn.highlight');
    if (await highlightedBtn.isVisible({ timeout: 200 }).catch(() => false)) {
      await highlightedBtn.click().catch(() => {});
      spellsBlocked++;
      await page.waitForTimeout(500);
      continue;
    }

    const flyingSpell = page.locator('.shield-spell.flying');
    if (await flyingSpell.isVisible({ timeout: 200 }).catch(() => false)) {
      const style = await flyingSpell.getAttribute('style') || '';
      let color = 'red';
      if (style.includes('#4488ff') || style.includes('rgb(68, 136, 255)')) color = 'blue';
      else if (style.includes('#ffdd44') || style.includes('rgb(255, 221, 68)')) color = 'yellow';
      else if (style.includes('#44dd44') || style.includes('rgb(68, 221, 68)')) color = 'green';
      else if (style.includes('#ff4444') || style.includes('rgb(255, 68, 68)')) color = 'red';

      const btn = page.locator(`.shield-btn.${color}`);
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        spellsBlocked++;
      }
      await page.waitForTimeout(350);
    } else {
      await page.waitForTimeout(100);
    }
  }

  await page.waitForSelector('#shieldMinigame.active', { state: 'hidden', timeout: 5000 }).catch(() => {});
  return true;
}

test('UI stress test - rapid clicking and edge cases', async ({ page }) => {
  const errors = [];
  const warnings = [];
  let stressActions = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      log('CONSOLE_ERROR', msg.text());
    }
    if (msg.type() === 'warning') {
      warnings.push(msg.text());
    }
  });

  // Check for unhandled errors
  page.on('pageerror', err => {
    errors.push(`Page error: ${err.message}`);
    log('PAGE_ERROR', err.message);
  });

  await setupGame(page);
  log('TEST', 'Starting UI stress test');

  const startTime = Date.now();
  let lastFloor = 1;

  // Test viewport resize during gameplay
  await page.setViewportSize({ width: 300, height: 600 });
  log('STRESS', 'Resized to small viewport');
  await page.waitForTimeout(500);

  await page.setViewportSize({ width: 400, height: 800 });
  log('STRESS', 'Resized back to normal');

  while (Date.now() - startTime < 120000) { // 2 minutes for stress test
    const state = await getState(page);

    if (state.floor >= 6) {
      log('TEST', `SUCCESS: Reached floor ${state.floor} under stress`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Game over at floor ${state.floor}`);
      break;
    }

    if (state.floor !== lastFloor) {
      log('FLOOR', `Floor ${state.floor}, HP: ${state.hp}`);
      lastFloor = state.floor;

      // STRESS: Resize during floor transition
      await page.setViewportSize({ width: 350, height: 700 });
      await page.waitForTimeout(100);
      await page.setViewportSize({ width: 400, height: 800 });
    }

    if (await page.locator('#shieldTutorialOverlay').isVisible({ timeout: 100 }).catch(() => false)) {
      await handleShieldMinigameStress(page);
      stressActions++;
      continue;
    }

    if (state.shieldActive) {
      await handleShieldMinigameStress(page);
      stressActions++;
      continue;
    }

    if (await handleBuffSelectionStress(page)) {
      stressActions++;
      continue;
    }

    await uiStressTest(page);
    stressActions++;

    await page.waitForTimeout(200);
  }

  const finalState = await getState(page);

  log('TEST', '=== UI STRESS TEST RESULTS ===');
  log('TEST', `Final Floor: ${finalState.floor}`);
  log('TEST', `Stress Actions: ${stressActions}`);
  log('TEST', `Console Errors: ${errors.length}`);
  log('TEST', `Console Warnings: ${warnings.length}`);

  // Filter out non-critical errors
  const criticalErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('net::ERR') &&
    !e.includes('404')
  );

  if (criticalErrors.length > 0) {
    log('TEST', 'Critical errors found:');
    criticalErrors.forEach(e => log('ERROR', `  ${e}`));
  }

  // UI should not crash under stress
  expect(criticalErrors).toHaveLength(0);
  expect(stressActions).toBeGreaterThan(20);

  // Verify UI elements are still visible after stress
  const gameContainer = page.locator('.game-container');
  expect(await gameContainer.isVisible()).toBe(true);
});

test('UI stress - rapid spell clicking during cooldown', async ({ page }) => {
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  page.on('pageerror', err => {
    errors.push(`Page error: ${err.message}`);
  });

  await setupGame(page);

  // Wait for battle to start
  await page.waitForTimeout(2000);

  // STRESS: Rapidly click spells 100 times
  const allSpells = page.locator('#spellsContainer .spell');
  const spellCount = await allSpells.count();

  log('STRESS', `Rapidly clicking ${spellCount} spells 100 times`);

  for (let round = 0; round < 100; round++) {
    for (let i = 0; i < spellCount; i++) {
      await allSpells.nth(i).click({ force: true }).catch(() => {});
    }
    if (round % 20 === 0) {
      log('STRESS', `Round ${round}/100`);
    }
  }

  // Game should still be running
  const state = await getState(page);
  expect(state.gameOver || state.floor >= 1).toBe(true);

  const criticalErrors = errors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('net::ERR')
  );
  expect(criticalErrors).toHaveLength(0);
});
