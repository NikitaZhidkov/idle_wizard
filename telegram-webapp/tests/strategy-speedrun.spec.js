// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * SPEEDRUN STRATEGY
 * Complete floors as fast as possible - measure time per floor
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select Gryffindor for +ATK (faster kills)
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator('.house-option[data-house="gryffindor"]').click();
  await page.waitForSelector('#houseSelectPopup', { state: 'hidden', timeout: 5000 });

  // Complete tutorial FAST
  const tutorialOverlay = page.locator('#spellTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    for (let i = 1; i <= 3; i++) {
      await page.waitForSelector(`#spellTutorialPage${i}.active`, { timeout: 3000 });
      const btn = page.locator(`#spellTutorialPage${i}.active .spell-tutorial-btn`);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(200); // Faster clicks
      }
    }
    await page.waitForSelector('#spellTutorialOverlay', { state: 'hidden', timeout: 5000 });
  }
  log('SETUP', 'Game initialized - SPEEDRUN MODE');
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

async function speedrunStrategy(page) {
  // SPEEDRUN: Cast ALL spells immediately, no waiting
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();

  // Rapid fire all spells
  const clicks = [];
  for (let i = 0; i < count; i++) {
    clicks.push(readySpells.nth(i).click().catch(() => {}));
  }
  await Promise.all(clicks);

  return count;
}

async function handleBuffSelectionFast(page) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 100 }).catch(() => false)) {
    // SPEEDRUN: Just click first buff immediately
    await buffChoice.click();
    await page.waitForTimeout(300); // Minimal wait
    return true;
  }
  return false;
}

async function handleShieldMinigameFast(page) {
  // Check for tutorial overlay first
  const tutorialOverlay = page.locator('#shieldTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
    log('SHIELD', 'Tutorial detected');
    const startBtn = page.locator('#shieldTutorialStartBtn');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      log('SHIELD', 'Clicked tutorial start');
      await page.waitForTimeout(1000);
    }
  }

  const shieldMinigame = page.locator('#shieldMinigame.active');
  if (!await shieldMinigame.isVisible({ timeout: 500 }).catch(() => false)) return false;

  log('SHIELD', 'Speed shield minigame');
  let spellsBlocked = 0;
  let attempts = 0;

  while (attempts++ < 40) {
    if (!await shieldMinigame.isVisible().catch(() => false)) {
      log('SHIELD', `Done: ${spellsBlocked} blocked`);
      break;
    }

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

test('Speedrun strategy - fastest completion', async ({ page }) => {
  const errors = [];
  const floorTimes = [];
  let lastFloorTime = Date.now();

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const startTime = Date.now();
  await setupGame(page);

  log('TEST', 'SPEEDRUN START!');

  let lastFloor = 1;
  const targetFloor = 8;

  while (Date.now() - startTime < 180000) { // 3 minutes max for speedrun
    const state = await getState(page);

    if (state.floor >= targetFloor) {
      const totalTime = (Date.now() - startTime) / 1000;
      log('TEST', `SPEEDRUN COMPLETE! Floor ${state.floor} in ${totalTime.toFixed(1)}s`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `SPEEDRUN FAILED at floor ${state.floor}`);
      break;
    }

    if (state.floor !== lastFloor) {
      const floorTime = (Date.now() - lastFloorTime) / 1000;
      floorTimes.push({ floor: lastFloor, time: floorTime });
      log('SPEED', `Floor ${lastFloor} completed in ${floorTime.toFixed(1)}s`);
      lastFloor = state.floor;
      lastFloorTime = Date.now();
    }

    if (await page.locator('#shieldTutorialOverlay').isVisible({ timeout: 50 }).catch(() => false)) {
      await handleShieldMinigameFast(page);
      continue;
    }

    if (state.shieldActive) {
      await handleShieldMinigameFast(page);
      continue;
    }

    if (await handleBuffSelectionFast(page)) continue;

    await speedrunStrategy(page);
    await page.waitForTimeout(250); // Minimal delay
  }

  const totalTime = (Date.now() - startTime) / 1000;
  const finalState = await getState(page);

  log('TEST', '=== SPEEDRUN RESULTS ===');
  log('TEST', `Final Floor: ${finalState.floor}`);
  log('TEST', `Total Time: ${totalTime.toFixed(1)}s`);

  if (floorTimes.length > 0) {
    const avgTime = floorTimes.reduce((sum, f) => sum + f.time, 0) / floorTimes.length;
    log('TEST', `Avg Time/Floor: ${avgTime.toFixed(1)}s`);
    log('TEST', `Floor times: ${floorTimes.map(f => `F${f.floor}:${f.time.toFixed(1)}s`).join(', ')}`);
  }

  expect(finalState.floor).toBeGreaterThanOrEqual(5);
  expect(totalTime).toBeLessThan(180); // Should complete in under 3 minutes
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
