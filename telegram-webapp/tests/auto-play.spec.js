// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Automated Game Playthrough Test
 *
 * This test plays the game automatically from start and reaches floor 6,
 * passing at least 1 boss (floor 5).
 *
 * Game mechanics:
 * - Auto-battle runs every 900ms
 * - After each creature death, buff selection appears
 * - Boss appears at floor 5, 10, 15, etc.
 * - Boss has shield minigame at start and at 50% HP
 * - Shield minigame: match spell color to button color
 */

// Test configuration
test.describe.configure({ timeout: 300000 }); // 5 minute timeout for full playthrough

// Logging utility
const log = (category, message, data = null) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
  console.log(`[${timestamp}] [${category}] ${message}${dataStr}`);
};

/**
 * Wait for game container to be ready
 */
async function waitForGameReady(page) {
  await page.waitForSelector('.game-container', { timeout: 10000 });
  log('INIT', 'Game container loaded');
}

/**
 * Select a house
 */
async function selectHouse(page, house = 'gryffindor') {
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  log('HOUSE', `Selecting house: ${house}`);

  const houseOption = page.locator(`.house-option[data-house="${house}"]`);
  await expect(houseOption).toBeVisible();
  await houseOption.click();

  await page.waitForSelector('#houseSelectPopup', { state: 'hidden', timeout: 5000 });
  log('HOUSE', `House ${house} selected`);
}

/**
 * Complete the spell tutorial (3 pages)
 */
async function completeSpellTutorial(page) {
  const tutorialOverlay = page.locator('#spellTutorialOverlay');

  if (await tutorialOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
    log('TUTORIAL', 'Spell tutorial started');

    for (let i = 1; i <= 3; i++) {
      await page.waitForSelector(`#spellTutorialPage${i}.active`, { timeout: 3000 });
      log('TUTORIAL', `On page ${i}`);

      const btn = page.locator(`#spellTutorialPage${i}.active .spell-tutorial-btn`);
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(300);
      }
    }

    await page.waitForSelector('#spellTutorialOverlay', { state: 'hidden', timeout: 5000 });
    log('TUTORIAL', 'Spell tutorial completed');
  } else {
    log('TUTORIAL', 'No spell tutorial (skipped)');
  }
}

/**
 * Get current game state from the page
 */
async function getGameState(page) {
  return await page.evaluate(() => {
    const floorEl = document.getElementById('floor');
    const goldEl = document.getElementById('gold');
    const hpEl = document.getElementById('heroHp');
    const creatureHealthEl = document.getElementById('creatureHealth');
    const buffPanel = document.getElementById('buffSelectionPanel');
    const shieldMinigame = document.getElementById('shieldMinigame');
    const gameoverPopup = document.getElementById('gameoverPopup');
    const battleCreatureName = document.getElementById('battleCreatureName');

    return {
      floor: parseInt(floorEl?.textContent?.replace('Floor: ', '') || '1'),
      gold: parseInt(goldEl?.textContent || '0'),
      hp: hpEl?.textContent || '',
      creatureHealthWidth: creatureHealthEl?.style?.width || '100%',
      buffPanelVisible: buffPanel?.style?.display === 'flex' || buffPanel?.classList?.contains('active'),
      shieldMinigameActive: shieldMinigame?.classList?.contains('active') || false,
      gameOver: gameoverPopup?.style?.display === 'flex',
      creatureName: battleCreatureName?.textContent || ''
    };
  });
}

/**
 * Handle buff selection after killing a creature
 */
async function handleBuffSelection(page) {
  // Check if buff panel is visible by looking for visible buff choices
  const buffChoice = page.locator('.buff-choice').first();

  try {
    // Try to check if a buff choice is visible
    const isVisible = await buffChoice.isVisible({ timeout: 300 });

    if (isVisible) {
      log('BUFF', 'Buff selection panel detected');

      // Wait a moment for animations
      await page.waitForTimeout(100);

      // Click the first buff choice
      await buffChoice.click();
      log('BUFF', 'Selected buff');

      // Wait for the panel to close and battle to resume
      await page.waitForTimeout(500);
      return true;
    }
  } catch (e) {
    // Not visible, continue
  }

  return false;
}

/**
 * Handle the shield minigame for boss fights
 *
 * The minigame:
 * 1. Shows tutorial overlay on first boss (click start button)
 * 2. Colored spells fly towards player
 * 3. Player must click matching colored button
 * 4. 5 spells per phase (3 in tutorial mode)
 */
async function handleShieldMinigame(page, maxAttempts = 20) {
  // First check for tutorial overlay - this appears BEFORE the minigame becomes active
  const tutorialOverlay = page.locator('#shieldTutorialOverlay');
  const tutorialVisible = await tutorialOverlay.isVisible({ timeout: 300 }).catch(() => false);

  if (tutorialVisible) {
    log('SHIELD', '=== Shield tutorial overlay detected ===');
    const startBtn = page.locator('#shieldTutorialStartBtn');
    if (await startBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await startBtn.click();
      log('SHIELD', 'Clicked start button on tutorial overlay');
      await page.waitForTimeout(800);
    }
  }

  // Now check for the actual shield minigame
  const shieldMinigame = page.locator('#shieldMinigame.active');
  if (!await shieldMinigame.isVisible({ timeout: 500 }).catch(() => false)) {
    // Maybe the minigame just started or tutorial is still showing
    if (tutorialVisible) {
      // Wait a bit more for minigame to become active after tutorial
      await page.waitForTimeout(500);
    }
    if (!await shieldMinigame.isVisible({ timeout: 500 }).catch(() => false)) {
      return tutorialVisible; // Return true if we handled the tutorial
    }
  }

  log('SHIELD', '=== Shield minigame started ===');

  let spellsHandled = 0;
  let attempts = 0;
  let noSpellCounter = 0;

  while (attempts < maxAttempts && spellsHandled < 10) {
    attempts++;

    // Check if minigame is still active
    const minigameActive = await shieldMinigame.isVisible().catch(() => false);
    if (!minigameActive) {
      log('SHIELD', `Minigame ended after ${spellsHandled} spells`);
      break;
    }

    // In tutorial mode, look for highlighted button
    const highlightedBtn = page.locator('.shield-btn.highlight');
    if (await highlightedBtn.isVisible({ timeout: 200 }).catch(() => false)) {
      await highlightedBtn.click();
      log('SHIELD', `Clicked highlighted button (tutorial)`);
      spellsHandled++;
      noSpellCounter = 0;
      await page.waitForTimeout(600);
      continue;
    }

    // Look for flying spell and detect its color
    const flyingSpell = page.locator('.shield-spell.flying');
    if (await flyingSpell.isVisible({ timeout: 200 }).catch(() => false)) {
      // Get the color from the spell's style
      const style = await flyingSpell.getAttribute('style');

      let color = 'red'; // default
      if (style) {
        if (style.includes('#4488ff') || style.includes('rgb(68, 136, 255)')) color = 'blue';
        else if (style.includes('#ffdd44') || style.includes('rgb(255, 221, 68)')) color = 'yellow';
        else if (style.includes('#44dd44') || style.includes('rgb(68, 221, 68)')) color = 'green';
        else if (style.includes('#ff4444') || style.includes('rgb(255, 68, 68)')) color = 'red';
      }

      // Click the matching button
      const btn = page.locator(`.shield-btn.${color}`);
      if (await btn.isVisible()) {
        await btn.click();
        log('SHIELD', `Clicked ${color} button for spell`);
        spellsHandled++;
        noSpellCounter = 0;
        await page.waitForTimeout(400);
      }
    } else {
      // No spell visible, wait a bit
      noSpellCounter++;
      if (noSpellCounter > 10) {
        // Too long without seeing a spell, might be done
        log('SHIELD', 'No spells detected for a while, checking if done');
        break;
      }
      await page.waitForTimeout(150);
    }
  }

  // Wait for minigame to fully end
  await page.waitForSelector('#shieldMinigame.active', { state: 'hidden', timeout: 5000 }).catch(() => {});
  log('SHIELD', `=== Shield minigame completed (${spellsHandled} spells handled) ===`);

  return true;
}

/**
 * Cast spells when available to speed up battles
 */
async function castAvailableSpells(page) {
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();

  if (count > 0) {
    // Click the first ready spell
    const spell = readySpells.first();
    await spell.click();
    log('SPELL', 'Cast a spell');
    return true;
  }
  return false;
}

/**
 * Main game loop - plays the game until reaching target floor or game over
 */
async function playUntilFloor(page, targetFloor, maxDurationMs = 240000) {
  const startTime = Date.now();
  let lastFloor = 1;
  let lastLogTime = Date.now();

  log('GAME', `Starting game loop, target floor: ${targetFloor}`);

  while (Date.now() - startTime < maxDurationMs) {
    const state = await getGameState(page);

    // Log state every 5 seconds
    if (Date.now() - lastLogTime > 5000) {
      log('STATE', `Floor: ${state.floor}, HP: ${state.hp}, Gold: ${state.gold}, Creature: ${state.creatureName}`);
      lastLogTime = Date.now();
    }

    // Check if we reached the target
    if (state.floor >= targetFloor) {
      log('GAME', `🎉 Reached floor ${state.floor}! Target was ${targetFloor}`);
      return { success: true, floor: state.floor, reason: 'target_reached' };
    }

    // Check for game over
    if (state.gameOver) {
      log('GAME', `Game over at floor ${state.floor}`);
      return { success: false, floor: state.floor, reason: 'game_over' };
    }

    // Floor changed - log it
    if (state.floor !== lastFloor) {
      log('FLOOR', `Advanced to floor ${state.floor}`);
      lastFloor = state.floor;
    }

    // PRIORITY: Check for shield tutorial overlay (blocks everything else)
    const tutorialOverlay = page.locator('#shieldTutorialOverlay');
    if (await tutorialOverlay.isVisible({ timeout: 100 }).catch(() => false)) {
      log('SHIELD', 'Shield tutorial overlay detected in main loop');
      await handleShieldMinigame(page);
      continue;
    }

    // Handle shield minigame (appears on boss)
    if (state.shieldMinigameActive) {
      await handleShieldMinigame(page);
      continue;
    }

    // Handle buff selection (appears after killing creature)
    if (await handleBuffSelection(page)) {
      continue;
    }

    // Try to cast spells to speed up battle
    await castAvailableSpells(page);

    // Wait for next check
    await page.waitForTimeout(500);
  }

  const finalState = await getGameState(page);
  log('GAME', `Timeout reached at floor ${finalState.floor}`);
  return { success: false, floor: finalState.floor, reason: 'timeout' };
}


// ============ TEST ============

test('Automated playthrough to floor 6 (pass 1 boss)', async ({ page }) => {
  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      log('BROWSER', `Error: ${msg.text()}`);
    }
  });

  log('TEST', '========== Starting automated playthrough test ==========');

  // Navigate and clear state
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Step 1: Wait for game to load
  await waitForGameReady(page);

  // Step 2: Select house (Gryffindor for +20% ATK)
  await selectHouse(page, 'gryffindor');

  // Step 3: Complete spell tutorial
  await completeSpellTutorial(page);

  // Step 4: Play the game until floor 6
  log('TEST', 'Starting main game loop...');
  const result = await playUntilFloor(page, 6, 240000); // 4 minutes max

  // Log final result
  log('TEST', '========== Test Result ==========');
  log('TEST', `Success: ${result.success}`);
  log('TEST', `Final Floor: ${result.floor}`);
  log('TEST', `Reason: ${result.reason}`);

  // Get final stats
  const finalState = await getGameState(page);
  log('TEST', `Final Gold: ${finalState.gold}`);
  log('TEST', `Final HP: ${finalState.hp}`);

  // Assert we reached floor 6
  expect(result.floor).toBeGreaterThanOrEqual(6);
  expect(result.success).toBe(true);

  log('TEST', '========== Test completed successfully! ==========');
});
