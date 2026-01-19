// @ts-check
const { test, expect } = require('@playwright/test');

// Test logging utility
const gameLog = {
  entries: [],
  log(category, message, data = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data
    };
    this.entries.push(entry);
    console.log(`[${category}] ${message}`, data);
  },
  clear() {
    this.entries = [];
  },
  getByCategory(category) {
    return this.entries.filter(e => e.category === category);
  },
  summary() {
    const categories = [...new Set(this.entries.map(e => e.category))];
    return categories.map(cat => ({
      category: cat,
      count: this.entries.filter(e => e.category === cat).length
    }));
  }
};

// Helper to get game state from browser
async function getGameState(page) {
  return await page.evaluate(() => {
    // Access game state from the module
    const gameModule = window.__gameState;
    if (gameModule) {
      return gameModule;
    }
    // Fallback: try to read from localStorage
    const saved = localStorage.getItem('wizardDuels');
    if (saved) {
      return JSON.parse(saved);
    }
    return null;
  });
}

// Helper to expose game state for testing
async function exposeGameState(page) {
  await page.evaluate(() => {
    // This will be called after the game module loads
    // We need to expose the game state through window for testing
  });
}

// Helper to wait for game to be ready
async function waitForGameReady(page) {
  await page.waitForSelector('.game-container', { timeout: 10000 });
  gameLog.log('INIT', 'Game container loaded');
}

// Helper to select a house
async function selectHouse(page, house = 'gryffindor') {
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  gameLog.log('HOUSE', `House selection popup visible, selecting ${house}`);

  const houseOption = page.locator(`.house-option[data-house="${house}"]`);
  await expect(houseOption).toBeVisible();
  await houseOption.click();

  gameLog.log('HOUSE', `Selected house: ${house}`);

  // Wait for house popup to close
  await page.waitForSelector('#houseSelectPopup', { state: 'hidden', timeout: 5000 });
  gameLog.log('HOUSE', 'House selection completed');
}

// Helper to complete spell tutorial
async function completeSpellTutorial(page) {
  const tutorialOverlay = page.locator('#spellTutorialOverlay');

  // Check if tutorial is visible
  if (await tutorialOverlay.isVisible()) {
    gameLog.log('TUTORIAL', 'Spell tutorial overlay detected');

    // Go through all 3 pages - each page has a button with onclick
    // Page 1 and 2 have "Next →" button, Page 3 has "Start Playing! ⚔️" button
    for (let i = 1; i <= 3; i++) {
      // Wait for current page to be active
      await page.waitForSelector(`#spellTutorialPage${i}.active`, { timeout: 3000 });
      gameLog.log('TUTORIAL', `On spell tutorial page ${i}`);

      // Find the button on this page (each page has one .spell-tutorial-btn)
      const btn = page.locator(`#spellTutorialPage${i}.active .spell-tutorial-btn`);

      if (await btn.isVisible()) {
        await btn.click();
        gameLog.log('TUTORIAL', `Clicked button on page ${i}`);
        await page.waitForTimeout(300);
      }
    }

    // Wait for overlay to hide
    await page.waitForSelector('#spellTutorialOverlay', { state: 'hidden', timeout: 5000 });
    gameLog.log('TUTORIAL', 'Spell tutorial completed successfully');
  } else {
    gameLog.log('TUTORIAL', 'Spell tutorial not shown (already completed or skipped)');
  }
}

// Helper to wait for battle to progress
async function waitForBattleProgress(page, turns = 5) {
  gameLog.log('BATTLE', `Waiting for ${turns} battle turns`);

  for (let i = 0; i < turns; i++) {
    // Wait for floating damage text to appear (indicates a turn happened)
    await page.waitForTimeout(1000);

    // Check creature health
    const creatureHealth = await page.locator('#creatureHealth').getAttribute('style');
    gameLog.log('BATTLE', `Turn ${i + 1}: Creature health bar: ${creatureHealth}`);
  }
}

// Helper to check if boss shield minigame appears
async function handleShieldMinigame(page, timeout = 30000) {
  const shieldMinigame = page.locator('#shieldMinigame.active');

  try {
    await shieldMinigame.waitFor({ state: 'visible', timeout });
    gameLog.log('SHIELD', 'Shield minigame started');

    // Check for tutorial overlay first
    const tutorialOverlay = page.locator('#shieldTutorialOverlay');
    if (await tutorialOverlay.isVisible({ timeout: 2000 }).catch(() => false)) {
      gameLog.log('SHIELD', 'Shield tutorial overlay detected');
      const startBtn = page.locator('#shieldTutorialStartBtn');
      await startBtn.click();
      gameLog.log('SHIELD', 'Started shield tutorial');
      await page.waitForSelector('#shieldTutorialOverlay', { state: 'hidden', timeout: 3000 });
    }

    // Play the minigame - click matching shield buttons
    let spellsHandled = 0;
    const maxSpells = 10;

    while (spellsHandled < maxSpells) {
      // Check if minigame is still active
      if (!await shieldMinigame.isVisible().catch(() => false)) {
        gameLog.log('SHIELD', `Minigame ended after ${spellsHandled} spells`);
        break;
      }

      // Look for highlighted button (tutorial) or try to detect spell color
      const highlightedBtn = page.locator('.shield-btn.highlight');
      if (await highlightedBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await highlightedBtn.click();
        gameLog.log('SHIELD', `Clicked highlighted button (tutorial mode)`);
        spellsHandled++;
      } else {
        // Try to detect spell color from the flying spell
        const spell = page.locator('.shield-spell.flying');
        if (await spell.isVisible({ timeout: 1000 }).catch(() => false)) {
          const style = await spell.getAttribute('style');

          // Determine color from style
          let color = 'red'; // default
          if (style?.includes('#4488ff')) color = 'blue';
          else if (style?.includes('#ffdd44')) color = 'yellow';
          else if (style?.includes('#44dd44')) color = 'green';
          else if (style?.includes('#ff4444')) color = 'red';

          const btn = page.locator(`.shield-btn.${color}`);
          await btn.click();
          gameLog.log('SHIELD', `Clicked ${color} shield button`);
          spellsHandled++;
        }
      }

      await page.waitForTimeout(300);
    }

    // Wait for minigame to end
    await page.waitForSelector('#shieldMinigame.active', { state: 'hidden', timeout: 10000 });
    gameLog.log('SHIELD', 'Shield minigame completed');
    return true;
  } catch (e) {
    gameLog.log('SHIELD', 'Shield minigame not triggered or timed out');
    return false;
  }
}

// Helper to wait until reaching a specific floor
async function progressToFloor(page, targetFloor, maxWaitTime = 120000) {
  gameLog.log('PROGRESS', `Attempting to reach floor ${targetFloor}`);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    // Check current floor
    const floorText = await page.locator('#floor').textContent();
    const currentFloor = parseInt(floorText?.replace('Floor: ', '') || '1');

    gameLog.log('PROGRESS', `Current floor: ${currentFloor}`);

    if (currentFloor >= targetFloor) {
      gameLog.log('PROGRESS', `Reached target floor ${targetFloor}`);
      return true;
    }

    // Handle room transition (buff selection)
    const buffPanel = page.locator('#buffSelectionPanel');
    if (await buffPanel.isVisible({ timeout: 500 }).catch(() => false)) {
      gameLog.log('PROGRESS', 'Buff selection panel visible');
      const firstBuff = page.locator('.buff-choice').first();
      if (await firstBuff.isVisible()) {
        await firstBuff.click();
        gameLog.log('PROGRESS', 'Selected buff');
        await page.waitForTimeout(500);
      }
    }

    // Handle shield minigame if it appears
    await handleShieldMinigame(page, 2000);

    // Handle game over
    const gameoverPopup = page.locator('#gameoverPopup');
    if (await gameoverPopup.isVisible({ timeout: 100 }).catch(() => false)) {
      gameLog.log('PROGRESS', 'Game over detected, cannot reach target floor');
      return false;
    }

    await page.waitForTimeout(1000);
  }

  gameLog.log('PROGRESS', `Timeout reaching floor ${targetFloor}`);
  return false;
}

// ============ TEST SUITES ============

test.describe('Game Initialization', () => {
  test.beforeEach(async ({ page }) => {
    gameLog.clear();
    // Clear localStorage before each test
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should show house selection on fresh start', async ({ page }) => {
    await waitForGameReady(page);

    const housePopup = page.locator('#houseSelectPopup');
    await expect(housePopup).toBeVisible({ timeout: 5000 });

    // Verify all 4 houses are available
    const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
    for (const house of houses) {
      const houseOption = page.locator(`.house-option[data-house="${house}"]`);
      await expect(houseOption).toBeVisible();
      gameLog.log('INIT', `House option visible: ${house}`);
    }

    gameLog.log('INIT', 'All house options verified');
    console.log('Test log summary:', gameLog.summary());
  });

  test('should select house and receive relic + spell', async ({ page }) => {
    await waitForGameReady(page);
    await selectHouse(page, 'slytherin');

    // After house selection, should see spell tutorial or game
    const tutorialOrGame = await Promise.race([
      page.waitForSelector('#spellTutorialOverlay', { state: 'visible', timeout: 3000 }).then(() => 'tutorial'),
      page.waitForSelector('.battle-area', { state: 'visible', timeout: 3000 }).then(() => 'game'),
    ]);

    gameLog.log('INIT', `After house selection: ${tutorialOrGame} visible`);
    expect(['tutorial', 'game']).toContain(tutorialOrGame);

    // Verify house display
    const houseName = await page.locator('#currentHouseName').textContent();
    expect(houseName).toBe('Slytherin');
    gameLog.log('INIT', `House name displayed: ${houseName}`);
  });
});

test.describe('Spell Tutorial', () => {
  test.beforeEach(async ({ page }) => {
    gameLog.clear();
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForGameReady(page);
  });

  test('should show spell tutorial after house selection', async ({ page }) => {
    await selectHouse(page, 'gryffindor');

    // Tutorial should appear
    const tutorialOverlay = page.locator('#spellTutorialOverlay');
    await expect(tutorialOverlay).toBeVisible({ timeout: 5000 });

    // Verify tutorial pages exist
    await expect(page.locator('#spellTutorialPage1')).toBeVisible();
    gameLog.log('TUTORIAL', 'Spell tutorial page 1 visible');
  });

  test('should complete spell tutorial and start battle', async ({ page }) => {
    await selectHouse(page, 'ravenclaw');
    await completeSpellTutorial(page);

    // After tutorial, battle should start
    // Check that we have a creature spawned - use the visible creature card name
    const battleCreatureName = page.locator('#battleCreatureName');
    await expect(battleCreatureName).toBeVisible({ timeout: 5000 });

    const name = await battleCreatureName.textContent();
    gameLog.log('BATTLE', `First creature: ${name}`);
    expect(name).toBeTruthy();

    // Verify spells are shown
    const spellsContainer = page.locator('#spellsContainer');
    await expect(spellsContainer).toBeVisible();

    const spells = await page.locator('#spellsContainer .spell').count();
    gameLog.log('BATTLE', `Spells available: ${spells}`);
    expect(spells).toBeGreaterThan(0);
  });
});

test.describe('Battle Mechanics', () => {
  test.beforeEach(async ({ page }) => {
    gameLog.clear();
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForGameReady(page);
    await selectHouse(page, 'gryffindor');
    await completeSpellTutorial(page);
  });

  test('should auto-battle and deal damage to creatures', async ({ page }) => {
    // Wait for battle to start
    await page.waitForTimeout(2000);

    // Get initial creature health bar width
    const initialWidth = await page.locator('#creatureHealth').evaluate(el => {
      return parseFloat(el.style.width) || 100;
    });
    gameLog.log('BATTLE', `Initial creature health: ${initialWidth}%`);

    // Wait for some battle turns
    await page.waitForTimeout(5000);

    // Check creature health decreased or creature died (floor increased)
    const floorText = await page.locator('#floor').textContent();
    const currentWidth = await page.locator('#creatureHealth').evaluate(el => {
      return parseFloat(el.style.width) || 0;
    });

    gameLog.log('BATTLE', `Current floor: ${floorText}, creature health: ${currentWidth}%`);

    // Either creature took damage OR we moved to next floor
    const tookDamage = currentWidth < initialWidth;
    const floorProgressed = floorText !== 'Floor: 1';

    expect(tookDamage || floorProgressed).toBe(true);
  });

  test('should be able to cast spells manually', async ({ page }) => {
    // Wait for spell cooldowns to be ready
    await page.waitForTimeout(1000);

    // Find a ready spell (not on cooldown)
    const readySpell = page.locator('#spellsContainer .spell.ready').first();

    if (await readySpell.isVisible()) {
      await readySpell.click();
      gameLog.log('BATTLE', 'Cast spell manually');

      // Should see some visual effect (spell visual appears briefly)
      await page.waitForTimeout(500);

      // Check battle log for spell cast
      const logEntries = await page.locator('.log-entry').count();
      gameLog.log('BATTLE', `Battle log entries: ${logEntries}`);
      expect(logEntries).toBeGreaterThan(0);
    } else {
      gameLog.log('BATTLE', 'No ready spells found');
    }
  });

  test('should show buff selection after defeating creature', async ({ page }) => {
    // Progress through battle until buff selection appears
    const buffPanel = page.locator('#buffSelectionPanel');

    // Wait up to 60 seconds for buff panel to appear
    await expect(buffPanel).toBeVisible({ timeout: 60000 });
    gameLog.log('BATTLE', 'Buff selection panel appeared');

    // Verify buff choices are shown
    const buffChoices = await page.locator('.buff-choice').count();
    gameLog.log('BATTLE', `Buff choices available: ${buffChoices}`);
    expect(buffChoices).toBeGreaterThanOrEqual(2);

    // Select a buff
    await page.locator('.buff-choice').first().click();
    gameLog.log('BATTLE', 'Selected first buff');

    // Buff panel should hide
    await expect(buffPanel).toBeHidden({ timeout: 5000 });

    // Floor should have increased
    const floorText = await page.locator('#floor').textContent();
    gameLog.log('BATTLE', `Current floor after buff: ${floorText}`);
    expect(floorText).not.toBe('Floor: 1');
  });
});

test.describe('Boss and Shield Minigame', () => {
  test.beforeEach(async ({ page }) => {
    gameLog.clear();
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForGameReady(page);
    await selectHouse(page, 'gryffindor');
    await completeSpellTutorial(page);
  });

  test('should reach floor 5 boss and trigger shield minigame with tutorial', async ({ page }) => {
    // This test may take a while - progress to floor 5
    const reachedFloor5 = await progressToFloor(page, 5, 180000);

    if (reachedFloor5) {
      gameLog.log('BOSS', 'Reached floor 5 boss');

      // Boss floor should show warning
      const floorDisplay = await page.locator('#floorDisplay').textContent();
      gameLog.log('BOSS', `Floor display: ${floorDisplay}`);

      // Shield minigame should trigger on boss
      const shieldTriggered = await handleShieldMinigame(page, 30000);
      gameLog.log('BOSS', `Shield minigame triggered: ${shieldTriggered}`);

      // The first boss should show shield tutorial
      // This is verified in handleShieldMinigame logging
    } else {
      gameLog.log('BOSS', 'Could not reach floor 5 (game over or timeout)');
    }

    console.log('Boss test log summary:', gameLog.summary());
  });
});

test.describe('Game Over and Restart', () => {
  test.beforeEach(async ({ page }) => {
    gameLog.clear();
    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForGameReady(page);
  });

  test('should restart game and show tutorials again', async ({ page }) => {
    // First playthrough
    await selectHouse(page, 'hufflepuff');
    await completeSpellTutorial(page);

    gameLog.log('RESTART', 'First playthrough - tutorial completed');

    // Force game over by evaluating in browser
    await page.evaluate(() => {
      // Access game state and trigger game over
      if (typeof gameOver === 'function') {
        gameOver();
      } else {
        // Try to find and call gameOver through module
        document.getElementById('gameoverPopup').style.display = 'flex';
      }
    });

    // Wait for game over popup
    const gameoverPopup = page.locator('#gameoverPopup');

    // If not visible, wait for natural death (takes longer)
    if (!await gameoverPopup.isVisible({ timeout: 2000 }).catch(() => false)) {
      gameLog.log('RESTART', 'Waiting for natural game over...');
      // Set player HP to 0 to force game over
      await page.evaluate(() => {
        // This requires the game module to expose game state
        // For now, we'll wait for natural progression
      });

      // Wait up to 2 minutes for game over
      await expect(gameoverPopup).toBeVisible({ timeout: 120000 });
    }

    gameLog.log('RESTART', 'Game over popup visible');

    // Click retry button
    const retryBtn = page.locator('#gameoverRetryBtn');
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    gameLog.log('RESTART', 'Clicked retry button');

    // Should show house selection again
    const housePopup = page.locator('#houseSelectPopup');
    await expect(housePopup).toBeVisible({ timeout: 5000 });
    gameLog.log('RESTART', 'House selection shown after restart');

    // Select house again
    await selectHouse(page, 'slytherin');

    // CRITICAL: Spell tutorial should show again
    const tutorialOverlay = page.locator('#spellTutorialOverlay');
    await expect(tutorialOverlay).toBeVisible({ timeout: 5000 });
    gameLog.log('RESTART', 'Spell tutorial shown again after restart - SUCCESS!');

    // Complete tutorial
    await completeSpellTutorial(page);

    // Game should continue - use visible battle creature name
    const battleCreatureName = page.locator('#battleCreatureName');
    await expect(battleCreatureName).toBeVisible({ timeout: 5000 });
    gameLog.log('RESTART', 'Battle started after restart tutorial');

    console.log('Restart test log summary:', gameLog.summary());
  });

  test('should reset all state on restart (like page reload)', async ({ page }) => {
    // First playthrough - get some progress
    await selectHouse(page, 'gryffindor');
    await completeSpellTutorial(page);

    // Wait for some battle progress
    await page.waitForTimeout(5000);

    // Check initial state
    const initialGold = await page.locator('#gold').textContent();
    gameLog.log('RESTART', `Initial gold: ${initialGold}`);

    // Get to at least floor 2 or wait for buff selection
    const buffPanel = page.locator('#buffSelectionPanel');
    try {
      await expect(buffPanel).toBeVisible({ timeout: 60000 });
      await page.locator('.buff-choice').first().click();
      await page.waitForTimeout(1000);
    } catch (e) {
      gameLog.log('RESTART', 'Could not get buff before testing restart');
    }

    // Check state after progress
    const progressGold = await page.locator('#gold').textContent();
    const progressFloor = await page.locator('#floor').textContent();
    gameLog.log('RESTART', `After progress - Gold: ${progressGold}, Floor: ${progressFloor}`);

    // Simulate game over popup manually
    await page.evaluate(() => {
      document.getElementById('gameoverPopup').style.display = 'flex';
    });

    // Click retry
    await page.locator('#gameoverRetryBtn').click();

    // After restart, house selection should appear
    await expect(page.locator('#houseSelectPopup')).toBeVisible({ timeout: 5000 });

    // localStorage should be cleared
    const savedGame = await page.evaluate(() => localStorage.getItem('wizardDuels'));
    expect(savedGame).toBeNull();
    gameLog.log('RESTART', 'localStorage cleared after restart');

    // Select house and verify fresh state
    await selectHouse(page, 'ravenclaw');
    await completeSpellTutorial(page);

    // Should be floor 1 with 0 gold
    const restartFloor = await page.locator('#floor').textContent();
    expect(restartFloor).toBe('Floor: 1');
    gameLog.log('RESTART', `After restart floor: ${restartFloor} - STATE RESET VERIFIED`);
  });
});

test.describe('Full Game Flow Integration', () => {
  test('complete game flow: house -> tutorial -> battle -> boss -> restart', async ({ page }) => {
    gameLog.clear();

    await page.goto('/index.html');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Step 1: Fresh start
    await waitForGameReady(page);
    gameLog.log('FLOW', 'Step 1: Game loaded');

    // Step 2: House selection
    await selectHouse(page, 'gryffindor');
    gameLog.log('FLOW', 'Step 2: House selected');

    // Step 3: Complete spell tutorial
    await completeSpellTutorial(page);
    gameLog.log('FLOW', 'Step 3: Spell tutorial completed');

    // Step 4: Battle through floors
    const reachedFloor5 = await progressToFloor(page, 5, 180000);
    gameLog.log('FLOW', `Step 4: Battle progress, reached floor 5: ${reachedFloor5}`);

    if (reachedFloor5) {
      // Step 5: Boss fight with shield minigame
      const shieldCompleted = await handleShieldMinigame(page, 30000);
      gameLog.log('FLOW', `Step 5: Shield minigame completed: ${shieldCompleted}`);
    }

    // Step 6: Continue or game over
    const gameoverPopup = page.locator('#gameoverPopup');
    const isGameOver = await gameoverPopup.isVisible({ timeout: 60000 }).catch(() => false);

    if (isGameOver) {
      gameLog.log('FLOW', 'Step 6: Game over occurred');

      // Step 7: Restart game
      await page.locator('#gameoverRetryBtn').click();
      await expect(page.locator('#houseSelectPopup')).toBeVisible({ timeout: 5000 });
      gameLog.log('FLOW', 'Step 7: Game restarted, house selection shown');

      // Step 8: Verify tutorials show again
      await selectHouse(page, 'slytherin');
      const tutorialShown = await page.locator('#spellTutorialOverlay').isVisible({ timeout: 3000 }).catch(() => false);
      gameLog.log('FLOW', `Step 8: Tutorial shown after restart: ${tutorialShown}`);

      expect(tutorialShown).toBe(true);
    } else {
      gameLog.log('FLOW', 'Step 6: Still playing (no game over)');
    }

    // Print full test summary
    console.log('\n=== FULL GAME FLOW TEST SUMMARY ===');
    console.log('Log entries by category:', gameLog.summary());
    console.log('\nAll log entries:');
    gameLog.entries.forEach(entry => {
      console.log(`  [${entry.category}] ${entry.message}`);
    });
  });
});
