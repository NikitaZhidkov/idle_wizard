// Shared test helpers for strategy tests

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

/**
 * Handle shield tutorial overlay
 */
async function handleShieldTutorial(page) {
  const tutorialOverlay = page.locator('#shieldTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
    log('SHIELD', '=== SHIELD TUTORIAL DETECTED ===');
    const startBtn = page.locator('#shieldTutorialStartBtn');
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      log('SHIELD', 'Clicked tutorial start button');
      await page.waitForTimeout(1000);
      return true;
    }
  }
  return false;
}

/**
 * Handle shield minigame - works for both tutorial and normal mode
 */
async function handleShieldMinigame(page) {
  // First check for tutorial
  await handleShieldTutorial(page);

  const shieldMinigame = page.locator('#shieldMinigame.active');
  if (!await shieldMinigame.isVisible({ timeout: 500 }).catch(() => false)) {
    return false;
  }

  log('SHIELD', '=== SHIELD MINIGAME STARTED ===');
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
      await highlightedBtn.click();
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

/**
 * Get game state with correct element IDs
 */
async function getGameState(page) {
  return page.evaluate(() => {
    const hpStat = document.getElementById('hpStat')?.textContent || '100';
    const playerHealthBar = document.getElementById('playerHealth');
    const healthWidth = playerHealthBar?.style?.width || '100%';
    const hpPercent = parseInt(healthWidth) || 100;

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
      creature: document.getElementById('battleCreatureName')?.textContent || ''
    };
  });
}

/**
 * Handle buff selection
 */
async function handleBuffSelection(page) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 300 }).catch(() => false)) {
    await buffChoice.click();
    log('BUFF', 'Selected first buff');
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

/**
 * Setup game with house selection and tutorial
 */
async function setupGame(page, house = 'gryffindor') {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select house
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator(`.house-option[data-house="${house}"]`).click();
  await page.waitForSelector('#houseSelectPopup', { state: 'hidden', timeout: 5000 });

  // Complete spell tutorial
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
  log('SETUP', `Game initialized with ${house}`);
}

module.exports = {
  log,
  handleShieldTutorial,
  handleShieldMinigame,
  getGameState,
  handleBuffSelection,
  setupGame
};
