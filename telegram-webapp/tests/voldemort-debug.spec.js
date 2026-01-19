// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Voldemort Debug Test
 * Fights Voldemort 3 times and collects damage logs
 */

test.describe.configure({ timeout: 600000 });

const log = (category, message) => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] [${category}] ${message}`);
};

async function waitForGameReady(page) {
  await page.waitForSelector('.game-container', { timeout: 10000 });
}

async function selectHouse(page) {
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator('.house-option[data-house="slytherin"]').click();
  await page.waitForSelector('#houseSelectPopup', { state: 'hidden', timeout: 5000 });
}

async function completeSpellTutorial(page) {
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
}

async function handleBuffSelection(page) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 200 }).catch(() => false)) {
    await buffChoice.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(300);
    return true;
  }
  return false;
}

async function handleShieldMinigame(page) {
  // Handle tutorial overlay
  const tutorialOverlay = page.locator('#shieldTutorialOverlay');
  if (await tutorialOverlay.isVisible({ timeout: 200 }).catch(() => false)) {
    const startBtn = page.locator('#shieldTutorialStartBtn');
    await startBtn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // Handle shield minigame - just click buttons rapidly
  const shieldMinigame = page.locator('#shieldMinigame.active');
  let attempts = 0;

  while (await shieldMinigame.isVisible({ timeout: 300 }).catch(() => false) && attempts < 50) {
    attempts++;

    // Try highlighted button first (tutorial)
    const highlighted = page.locator('.shield-btn.highlight');
    if (await highlighted.isVisible({ timeout: 100 }).catch(() => false)) {
      await highlighted.click({ timeout: 500, force: true }).catch(() => {});
      await page.waitForTimeout(500);
      continue;
    }

    // Look for flying spell
    const flyingSpell = page.locator('.shield-spell.flying');
    if (await flyingSpell.isVisible({ timeout: 100 }).catch(() => false)) {
      const style = await flyingSpell.getAttribute('style').catch(() => '');
      let color = 'red';
      if (style?.includes('#4488ff')) color = 'blue';
      else if (style?.includes('#ffdd44')) color = 'yellow';
      else if (style?.includes('#44dd44')) color = 'green';

      await page.locator(`.shield-btn.${color}`).click({ timeout: 500, force: true }).catch(() => {});
      await page.waitForTimeout(300);
    } else {
      await page.waitForTimeout(200);
    }
  }

  return attempts > 0;
}

async function fightVoldemort(page, fightNum) {
  log('FIGHT', `=== Fight #${fightNum} START ===`);

  const startTime = Date.now();
  const maxTime = 90000; // 90 seconds per fight
  let lastHp = 0;

  while (Date.now() - startTime < maxTime) {
    // Get state directly from game
    const state = await page.evaluate(() => {
      const g = window.game;
      const creature = window.getCurrentCreature ? window.getCurrentCreature() : null;
      return {
        playerHp: g?.currentHp || 0,
        playerMaxHp: g?.maxHp || 100,
        creatureName: creature?.name || document.getElementById('battleCreatureName')?.textContent || '',
        creatureHp: window.getCreatureHp ? window.getCreatureHp() : 0,
        poisonStacks: g?.poisonStacks || 0,
        gameOver: document.getElementById('gameoverPopup')?.style?.display === 'flex',
        shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
        floor: g?.floor || 1
      };
    });

    // Log damage
    if (state.playerHp !== lastHp && lastHp > 0) {
      const dmg = lastHp - state.playerHp;
      if (dmg > 0) {
        log('DAMAGE', `HP: ${lastHp} -> ${state.playerHp} (-${dmg}), Poison: ${state.poisonStacks}, Creature: ${state.creatureName}`);
      }
    }
    lastHp = state.playerHp;

    // Check game over
    if (state.gameOver) {
      log('FIGHT', `Fight #${fightNum} DIED at ${Date.now() - startTime}ms`);
      return { result: 'died', duration: Date.now() - startTime };
    }

    // Check if Voldemort defeated
    if (!state.creatureName.includes('Voldemort') && state.floor > 20) {
      log('FIGHT', `Fight #${fightNum} WON at ${Date.now() - startTime}ms`);
      return { result: 'won', duration: Date.now() - startTime };
    }

    // Handle shield minigame
    if (state.shieldActive) {
      await handleShieldMinigame(page);
      continue;
    }

    // Handle tutorial overlay
    const tutorialOverlay = page.locator('#shieldTutorialOverlay');
    if (await tutorialOverlay.isVisible({ timeout: 50 }).catch(() => false)) {
      await handleShieldMinigame(page);
      continue;
    }

    // Handle buff selection
    await handleBuffSelection(page);

    // Cast spells
    const readySpell = page.locator('#spellsContainer .spell.ready').first();
    if (await readySpell.isVisible({ timeout: 50 }).catch(() => false)) {
      await readySpell.click({ timeout: 500 }).catch(() => {});
    }

    await page.waitForTimeout(100);
  }

  log('FIGHT', `Fight #${fightNum} TIMEOUT`);
  return { result: 'timeout', duration: Date.now() - startTime };
}

test('Debug Voldemort - fight 3 times', async ({ page }) => {
  // Capture console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[VOLDEMORT]') || text.includes('[BATTLE]')) {
      log('CONSOLE', text);
    }
  });

  log('TEST', '========== VOLDEMORT DEBUG TEST ==========');

  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForGameReady(page);
  await selectHouse(page);
  await completeSpellTutorial(page);

  const results = [];

  for (let fight = 1; fight <= 3; fight++) {
    log('TEST', `\n=== ATTEMPT ${fight}/3 ===`);

    // Teleport to floor 19 with strong stats
    await page.evaluate(() => {
      const g = window.game;
      g.floor = 19;
      g.currentHp = 500;
      g.maxHp = 500;
      g.poisonStacks = 0;
      g.fearDebuff = false;
      g.buffStats = g.buffStats || {};
      g.buffStats.hp = 300;
      g.buffStats.atk = 80;
      g.buffStats.def = 30;
      g.buffStats.lifesteal = 0.15;
    });

    // Wait for Voldemort to spawn (floor 20)
    log('TEST', 'Waiting for Voldemort...');
    let foundVoldemort = false;
    const waitStart = Date.now();

    while (Date.now() - waitStart < 60000) {
      const state = await page.evaluate(() => ({
        creatureName: document.getElementById('battleCreatureName')?.textContent || '',
        floor: window.game?.floor || 1,
        shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
        gameOver: document.getElementById('gameoverPopup')?.style?.display === 'flex'
      }));

      if (state.creatureName.includes('Voldemort')) {
        log('TEST', `Found Voldemort at floor ${state.floor}!`);
        foundVoldemort = true;
        break;
      }

      if (state.gameOver) {
        log('TEST', 'Game over before reaching Voldemort');
        break;
      }

      // Handle shield minigame on the way
      if (state.shieldActive) {
        await handleShieldMinigame(page);
      }

      // Handle tutorial overlay
      const tutorialOverlay = page.locator('#shieldTutorialOverlay');
      if (await tutorialOverlay.isVisible({ timeout: 50 }).catch(() => false)) {
        await handleShieldMinigame(page);
      }

      await handleBuffSelection(page);

      // Cast spells to speed up
      const readySpell = page.locator('#spellsContainer .spell.ready').first();
      if (await readySpell.isVisible({ timeout: 50 }).catch(() => false)) {
        await readySpell.click({ timeout: 500 }).catch(() => {});
      }

      await page.waitForTimeout(200);
    }

    if (!foundVoldemort) {
      log('TEST', 'Failed to reach Voldemort, restarting...');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await waitForGameReady(page);
      await selectHouse(page);
      await completeSpellTutorial(page);
      continue;
    }

    // Fight Voldemort
    const result = await fightVoldemort(page, fight);
    results.push(result);

    // Restart for next fight
    if (fight < 3) {
      log('TEST', 'Restarting for next fight...');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await waitForGameReady(page);
      await selectHouse(page);
      await completeSpellTutorial(page);
    }
  }

  // Summary
  log('TEST', '\n========== FINAL RESULTS ==========');
  results.forEach((r, i) => {
    log('RESULT', `Fight ${i+1}: ${r.result} (${r.duration}ms)`);
  });
  log('TEST', `Wins: ${results.filter(r => r.result === 'won').length}`);
  log('TEST', `Deaths: ${results.filter(r => r.result === 'died').length}`);
  log('TEST', '========== TEST COMPLETE ==========');

  // Test passes if we completed at least one fight
  expect(results.length).toBeGreaterThan(0);
});
