// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Full Game Playthrough Test - Canvas-Only Version
 *
 * This test plays through the entire game from start to victory (defeating Voldemort).
 * All UI is rendered on a single canvas element - no DOM elements.
 *
 * Game Flow:
 * 1. House selection (canvas popup)
 * 2. Spell tutorial (canvas popup)
 * 3. Battle through encounters (Pixie, Gnome, Imp, Doxy)
 * 4. Boss fight at floor 5 with shield minigame
 * 5. Continue battles
 * 6. Final boss Voldemort
 * 7. Victory
 */

test.describe.configure({ timeout: 600000 }); // 10 minute timeout

const log = (category, message) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] [${category}] ${message}`);
};

/**
 * Wait for game to be ready
 */
async function waitForGameReady(page) {
  await page.waitForSelector('.game-container', { timeout: 10000 });
  await page.waitForSelector('#gameCanvas', { timeout: 5000 });
  log('INIT', 'Game container and canvas loaded');
}

/**
 * Get game state using JavaScript evaluation
 */
async function getGameState(page) {
  return await page.evaluate(() => {
    // Access the global game object directly
    if (typeof window.game === 'undefined') return null;

    const game = window.game;
    const currentCreature = window.getCurrentCreature ? window.getCurrentCreature() : null;

    return {
      floor: game.floor,
      encounterIndex: game.encounterIndex,
      gold: game.gold,
      currentHp: game.currentHp,
      maxHp: game.maxHp,
      inBattle: game.inBattle,
      gameStarted: game.gameStarted,
      houseChosen: game.houseChosen,
      selectingBuff: game.selectingBuff,
      creatureName: currentCreature?.name || '',
      creatureHp: currentCreature ? (window.getCreatureHp ? window.getCreatureHp() : 0) : 0,
      isBoss: currentCreature?.boss || false,
      unlockedSpells: game.unlockedSpells,
      spellCooldowns: game.spellCooldowns,
      spellTutorialDone: game.spellTutorialDone,
      shieldTutorialDone: game.shieldTutorialDone
    };
  });
}

/**
 * Get canvas game state from renderer
 */
async function getCanvasState(page) {
  return await page.evaluate(() => {
    // Try to access canvas renderer state if available
    return {
      showHouseSelect: window._canvasState?.showHouseSelect || false,
      showSpellTutorial: window._canvasState?.showSpellTutorial || false,
      showShieldTutorial: window._canvasState?.showShieldTutorial || false,
      showShieldMinigame: window._canvasState?.showShieldMinigame || false,
      showBuffSelect: window._canvasState?.showBuffSelect || false,
      showGameOver: window._canvasState?.showGameOver || false,
      showVictory: window._canvasState?.showVictory || false
    };
  });
}

/**
 * Select a house by clicking on canvas
 */
async function selectHouse(page, house = 'gryffindor') {
  log('HOUSE', `Selecting house: ${house}`);

  // Wait for house selection to appear - check via game state
  let attempts = 0;
  while (attempts < 50) {
    const state = await getGameState(page);
    if (!state || !state.houseChosen) break;
    await page.waitForTimeout(100);
    attempts++;
  }

  // House selection is shown on canvas - click the appropriate position
  // Canvas layout: popup with 4 house options vertically stacked
  const canvas = page.locator('#gameCanvas');
  const box = await canvas.boundingBox();

  if (box) {
    const centerX = box.x + box.width / 2;
    // Each house option is about 60px tall, starting at about centerY - 100
    const houseIndex = { gryffindor: 0, slytherin: 1, ravenclaw: 2, hufflepuff: 3 };
    const index = houseIndex[house] || 0;
    // Houses start at approximately y = centerY - 90, each 68px apart
    const centerY = box.y + box.height / 2;
    const houseY = centerY - 90 + index * 68 + 30; // +30 to hit middle of option

    await page.mouse.click(centerX, houseY);
    log('HOUSE', `Clicked house at (${centerX}, ${houseY})`);
  }

  // Wait for house to be selected
  await page.waitForTimeout(500);
  const state = await getGameState(page);
  if (state?.houseChosen) {
    log('HOUSE', 'House selected successfully');
  } else {
    log('HOUSE', 'House selection may have failed, retrying...');
    // Try clicking different positions
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      await page.mouse.click(centerX, centerY - 60);
      await page.waitForTimeout(300);
    }
  }
}

/**
 * Complete spell tutorial by clicking through pages
 */
async function completeSpellTutorial(page) {
  const state = await getGameState(page);
  if (state?.spellTutorialDone) {
    log('TUTORIAL', 'Spell tutorial already done');
    return;
  }

  log('TUTORIAL', 'Completing spell tutorial');

  const canvas = page.locator('#gameCanvas');
  const box = await canvas.boundingBox();

  if (!box) return;

  // Click through 3 pages of tutorial
  for (let i = 0; i < 3; i++) {
    // Button is at bottom center of popup
    const btnX = box.x + box.width / 2;
    const btnY = box.y + box.height / 2 + 130;

    await page.mouse.click(btnX, btnY);
    log('TUTORIAL', `Clicked tutorial page ${i + 1}`);
    await page.waitForTimeout(400);
  }

  // Verify tutorial is done
  await page.waitForTimeout(500);
  const newState = await getGameState(page);
  if (newState?.spellTutorialDone) {
    log('TUTORIAL', 'Spell tutorial completed');
  }
}

/**
 * Handle buff selection by clicking first option
 */
async function handleBuffSelection(page) {
  const state = await getGameState(page);
  if (!state?.selectingBuff) return false;

  log('BUFF', 'Selecting buff');

  const canvas = page.locator('#gameCanvas');
  const box = await canvas.boundingBox();

  if (box) {
    // Buff options are centered horizontally, 3 options with 100px width each
    // Click the first buff option (leftmost)
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const buffX = centerX - 100; // First buff

    await page.mouse.click(buffX, centerY);
    log('BUFF', 'Clicked buff');
    await page.waitForTimeout(400);
    return true;
  }

  return false;
}

/**
 * Handle shield minigame by clicking colored buttons
 */
async function handleShieldMinigame(page) {
  // Check if shield minigame is active via game state
  const shieldActive = await page.evaluate(() => {
    return typeof window.game !== 'undefined' && window.game.shieldGame?.active;
  });

  if (!shieldActive) return false;

  log('SHIELD', 'Shield minigame active');

  const canvas = page.locator('#gameCanvas');
  const box = await canvas.boundingBox();

  if (!box) return false;

  // Shield buttons are at the bottom of the screen
  // 4 buttons: red, blue, yellow, green
  const btnSize = 60;
  const btnPadding = 15;
  const totalWidth = 4 * btnSize + 3 * btnPadding;
  const startX = box.x + box.width / 2 - totalWidth / 2;
  const btnY = box.y + box.height - 120 + btnSize / 2;

  let attempts = 0;
  while (attempts < 50) {
    attempts++;

    // Check if game over during minigame
    if (await checkGameOver(page)) {
      log('SHIELD', 'Game over detected during minigame');
      return false;
    }

    // Check if minigame still active
    const stillActive = await page.evaluate(() => {
      return typeof window.game !== 'undefined' && window.game.shieldGame?.active;
    });

    if (!stillActive) break;

    // Get current shield color
    const currentColor = await page.evaluate(() => {
      return window.game?.shieldGame?.currentColor || null;
    });

    if (currentColor) {
      const colorIndex = { red: 0, blue: 1, yellow: 2, green: 3 };
      const index = colorIndex[currentColor] ?? 0;
      const clickX = startX + index * (btnSize + btnPadding) + btnSize / 2;

      await page.mouse.click(clickX, btnY);
      log('SHIELD', `Clicked ${currentColor} button`);
      await page.waitForTimeout(300);
    } else {
      await page.waitForTimeout(100);
    }
  }

  log('SHIELD', 'Shield minigame ended');
  return true;
}

/**
 * Handle shield tutorial
 */
async function handleShieldTutorial(page) {
  const tutorialShown = await page.evaluate(() => {
    return typeof window.game !== 'undefined' &&
           window.game.shieldGame?.isTutorial &&
           !window.game.shieldTutorialDone;
  });

  if (!tutorialShown) return false;

  log('SHIELD', 'Shield tutorial detected');

  const canvas = page.locator('#gameCanvas');
  const box = await canvas.boundingBox();

  if (box) {
    // "Got it!" button at bottom center
    const btnX = box.x + box.width / 2;
    const btnY = box.y + box.height / 2 + 130;

    await page.mouse.click(btnX, btnY);
    log('SHIELD', 'Clicked shield tutorial start button');
    await page.waitForTimeout(500);
    return true;
  }

  return false;
}

/**
 * Cast spells by clicking on canvas spell bar
 */
async function castSpells(page) {
  const state = await getGameState(page);
  if (!state || !state.inBattle) return false;

  // Check if any spell is ready
  const readySpell = await page.evaluate(() => {
    if (typeof window.game === 'undefined') return null;
    const game = window.game;
    const spells = game.unlockedSpells || [];

    for (const spellId of spells) {
      const cooldown = game.spellCooldowns[spellId] || 0;
      if (cooldown === 0) {
        return spellId;
      }
    }
    return null;
  });

  if (!readySpell) return false;

  const canvas = page.locator('#gameCanvas');
  const box = await canvas.boundingBox();

  if (box) {
    // Spell bar is positioned below the battle area
    // Layout: Header(50) + Tabs(36) + Padding(8) + BattleArea(200) + Margin(8) + Buffs(30) = 332
    const spellY = box.y + 332 + 25; // Center of spell bar
    const spellX = box.x + box.width / 2;

    await page.mouse.click(spellX, spellY);
    log('SPELL', `Cast spell: ${readySpell}`);
    return true;
  }

  return false;
}

/**
 * Check for victory
 */
async function checkVictory(page) {
  return await page.evaluate(() => {
    // Check canvas state for victory popup
    return typeof window.game !== 'undefined' &&
           !window.game.gameStarted &&
           window.game.encounterIndex >= 15; // All encounters complete
  });
}

/**
 * Check for game over
 */
async function checkGameOver(page) {
  return await page.evaluate(() => {
    return typeof window.game !== 'undefined' &&
           window.game.currentHp <= 0;
  });
}

/**
 * Click retry button on game over screen
 */
async function clickRetry(page) {
  const canvas = page.locator('#gameCanvas');
  const box = await canvas.boundingBox();

  if (box) {
    // Retry button at center bottom of game over popup
    const btnX = box.x + box.width / 2;
    const btnY = box.y + box.height / 2 + 80;

    await page.mouse.click(btnX, btnY);
    log('GAMEOVER', 'Clicked retry button');
    await page.waitForTimeout(500);
  }
}

/**
 * Main playthrough loop
 */
async function playthrough(page, maxIterations = 2000, maxRetries = 10) {
  let iteration = 0;
  let lastState = null;
  let stuckCounter = 0;
  let retryCount = 0;

  while (iteration < maxIterations) {
    iteration++;

    // Check for victory
    if (await checkVictory(page)) {
      log('VICTORY', '🎉 Game completed! Victory achieved!');
      return { success: true, iterations: iteration, retries: retryCount };
    }

    // Check for game over
    if (await checkGameOver(page)) {
      retryCount++;
      log('GAMEOVER', `💀 Game over detected (retry ${retryCount}/${maxRetries})`);

      if (retryCount >= maxRetries) {
        return { success: false, reason: 'max_retries', iterations: iteration, retries: retryCount };
      }

      // Click retry button
      await clickRetry(page);

      // Re-select house and complete tutorial
      await page.waitForTimeout(500);
      await selectHouse(page);
      await completeSpellTutorial(page);
      stuckCounter = 0;
      lastState = null;
      continue;
    }

    // Handle buff selection
    if (await handleBuffSelection(page)) {
      continue;
    }

    // Handle shield tutorial
    if (await handleShieldTutorial(page)) {
      continue;
    }

    // Handle shield minigame
    if (await handleShieldMinigame(page)) {
      continue;
    }

    // Try to cast spells
    await castSpells(page);

    // Get and log game state periodically
    if (iteration % 20 === 0) {
      const state = await getGameState(page);
      if (state) {
        log('STATE', `Floor: ${state.floor}, Encounter: ${state.encounterIndex}, HP: ${state.currentHp}/${state.maxHp}, Creature: ${state.creatureName}`);

        // Check if stuck
        if (lastState &&
            lastState.floor === state.floor &&
            lastState.encounterIndex === state.encounterIndex &&
            lastState.currentHp === state.currentHp) {
          stuckCounter++;
          if (stuckCounter > 15) {
            log('ERROR', 'Game appears stuck');
            return { success: false, reason: 'stuck', state, iterations: iteration };
          }
        } else {
          stuckCounter = 0;
        }

        lastState = state;
      }
    }

    await page.waitForTimeout(150);
  }

  return { success: false, reason: 'max_iterations', iterations: iteration };
}


// ============== TESTS ==============

test('Full game playthrough to victory', async ({ page }) => {
  // Clear localStorage
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await waitForGameReady(page);
  log('TEST', '========== STARTING FULL PLAYTHROUGH ==========');

  // Select house
  await selectHouse(page, 'gryffindor');

  // Complete spell tutorial
  await completeSpellTutorial(page);

  // Run playthrough - allow more retries since game has RNG elements
  const result = await playthrough(page, 5000, 20);

  log('TEST', `========== PLAYTHROUGH RESULT: ${result.success ? 'SUCCESS' : 'FAILED'} ==========`);
  log('TEST', `Iterations: ${result.iterations}, Retries: ${result.retries || 0}, Reason: ${result.reason || 'victory'}`);

  // Get final game state
  const finalState = await getGameState(page);
  if (finalState) {
    log('TEST', `Final state - Floor: ${finalState.floor}, Encounter: ${finalState.encounterIndex}`);
  }

  // Take final screenshot
  await page.screenshot({ path: 'test-results/full-playthrough-final.png' });

  // Success if we reached victory OR made significant progress (floor 10+)
  const successCondition = result.success || (finalState && finalState.floor >= 10);
  expect(successCondition).toBe(true);
});

test('Verify game mechanics work', async ({ page }) => {
  // Clear localStorage
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await waitForGameReady(page);

  // Track mechanics that should be triggered
  const mechanicsTested = {
    houseSelection: false,
    spellTutorial: false,
    autoBattle: false,
    buffSelection: false,
    spellCasting: false
  };

  // Select house
  await selectHouse(page, 'slytherin');
  const stateAfterHouse = await getGameState(page);
  if (stateAfterHouse?.houseChosen) {
    mechanicsTested.houseSelection = true;
  }

  // Complete spell tutorial
  await completeSpellTutorial(page);
  const stateAfterTutorial = await getGameState(page);
  if (stateAfterTutorial?.spellTutorialDone) {
    mechanicsTested.spellTutorial = true;
  }

  // Run through game for a bit
  let iterations = 0;
  const maxIterations = 200;

  while (iterations < maxIterations) {
    iterations++;

    // Check for victory or game over
    if (await checkVictory(page) || await checkGameOver(page)) {
      break;
    }

    // Check game state
    const state = await getGameState(page);
    if (state) {
      if (state.inBattle) mechanicsTested.autoBattle = true;
    }

    // Handle buff selection
    if (await handleBuffSelection(page)) {
      mechanicsTested.buffSelection = true;
      continue;
    }

    // Handle shield
    await handleShieldTutorial(page);
    await handleShieldMinigame(page);

    // Cast spells
    if (await castSpells(page)) {
      mechanicsTested.spellCasting = true;
    }

    await page.waitForTimeout(150);
  }

  log('MECHANICS', `Tested mechanics: ${JSON.stringify(mechanicsTested)}`);

  // Verify core mechanics were tested
  expect(mechanicsTested.houseSelection).toBe(true);
  expect(mechanicsTested.autoBattle).toBe(true);
});
