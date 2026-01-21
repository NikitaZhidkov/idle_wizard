// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * AGGRESSIVE ATTACK STRATEGY
 * Always attack, never defend, use damage spells immediately, prioritize kill speed
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select Gryffindor for +ATK bonus
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator('.house-option[data-house="gryffindor"]').click();
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
  log('SETUP', 'Game initialized with Gryffindor');
}

async function getState(page) {
  return page.evaluate(() => ({
    floor: parseInt(document.getElementById('floor')?.textContent?.replace('Floor: ', '') || '1'),
    hp: document.getElementById('hpStat')?.textContent || '',
    creatureHp: document.getElementById('creatureHealth')?.style?.width || '100%',
    buffVisible: document.getElementById('buffSelectionPanel')?.style?.display === 'block',
    shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
    gameOver: document.getElementById('gameoverPopup')?.style?.display === 'flex',
    creature: document.getElementById('battleCreatureName')?.textContent || ''
  }));
}

async function aggressiveStrategy(page) {
  // Cast ALL ready spells immediately for max damage
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();
  for (let i = 0; i < count; i++) {
    try {
      await readySpells.nth(i).click();
      log('ATTACK', `Cast spell ${i + 1}`);
      await page.waitForTimeout(100);
    } catch (e) { /* spell may have gone on cooldown */ }
  }
}

async function handleBuffSelection(page) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 300 }).catch(() => false)) {
    // AGGRESSIVE: Prioritize attack buffs
    const atkBuff = page.locator('.buff-choice:has-text("Attack"), .buff-choice:has-text("Damage"), .buff-choice:has-text("Power")').first();
    if (await atkBuff.isVisible().catch(() => false)) {
      await atkBuff.click();
      log('BUFF', 'Selected attack buff');
    } else {
      await buffChoice.click();
      log('BUFF', 'Selected first buff');
    }
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

test('Aggressive attack strategy - reach floor 8', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await setupGame(page);
  log('TEST', 'Starting aggressive attack strategy');

  const startTime = Date.now();
  let lastFloor = 1;

  while (Date.now() - startTime < 240000) {
    const state = await getState(page);

    if (state.floor >= 8) {
      log('TEST', `SUCCESS: Reached floor ${state.floor}`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Game over at floor ${state.floor}`);
      break;
    }

    if (state.floor !== lastFloor) {
      log('FLOOR', `Now on floor ${state.floor}, HP: ${state.hp}`);
      lastFloor = state.floor;
    }

    // Handle shield tutorial
    if (await page.locator('#shieldTutorialOverlay').isVisible({ timeout: 100 }).catch(() => false)) {
      await handleShieldMinigame(page);
      continue;
    }

    if (state.shieldActive) {
      await handleShieldMinigame(page);
      continue;
    }

    if (await handleBuffSelection(page)) continue;

    // AGGRESSIVE: Always attack
    await aggressiveStrategy(page);
    await page.waitForTimeout(400);
  }

  const finalState = await getState(page);
  log('TEST', `Final: Floor ${finalState.floor}, HP: ${finalState.hp}`);

  if (errors.length > 0) {
    log('ERRORS', `Console errors found: ${errors.join(', ')}`);
  }

  expect(finalState.floor).toBeGreaterThanOrEqual(4);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
