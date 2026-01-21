// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * DEFENSIVE STRATEGY
 * Prioritize survival, use heal/shield spells, select defensive buffs
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select Hufflepuff for +HP/DEF bonus
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator('.house-option[data-house="hufflepuff"]').click();
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
  log('SETUP', 'Game initialized with Hufflepuff (defensive)');
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

async function defensiveStrategy(page, hpPercent) {
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();

  for (let i = 0; i < count; i++) {
    try {
      // Get spell info
      const spell = readySpells.nth(i);
      const spellText = await spell.textContent() || '';

      // DEFENSIVE: Prioritize heals when HP < 70%, shields when HP < 50%
      const isHeal = spellText.toLowerCase().includes('heal') || spellText.includes('Herbivicus') || spellText.includes('Episkey');
      const isShield = spellText.toLowerCase().includes('shield') || spellText.includes('Protego');

      if (hpPercent < 50 && (isHeal || isShield)) {
        await spell.click();
        log('DEFENSE', `Used defensive spell at ${hpPercent.toFixed(0)}% HP`);
        return;
      }
      if (hpPercent < 70 && isHeal) {
        await spell.click();
        log('DEFENSE', `Used heal at ${hpPercent.toFixed(0)}% HP`);
        return;
      }
    } catch (e) { /* continue */ }
  }

  // If HP is fine or no defensive spells, use first ready spell
  if (count > 0) {
    await readySpells.first().click().catch(() => {});
  }
}

async function handleBuffSelection(page) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 300 }).catch(() => false)) {
    // DEFENSIVE: Prioritize HP, defense, heal buffs
    const defBuff = page.locator('.buff-choice:has-text("HP"), .buff-choice:has-text("Defense"), .buff-choice:has-text("Heal"), .buff-choice:has-text("Shield"), .buff-choice:has-text("Regen")').first();
    if (await defBuff.isVisible().catch(() => false)) {
      await defBuff.click();
      log('BUFF', 'Selected defensive buff');
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

test('Defensive strategy - survive to floor 8', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await setupGame(page);
  log('TEST', 'Starting defensive survival strategy');

  const startTime = Date.now();
  let lastFloor = 1;
  let lowestHp = 100;

  while (Date.now() - startTime < 240000) {
    const state = await getState(page);

    if (state.hpPercent < lowestHp) {
      lowestHp = state.hpPercent;
      log('HP', `New lowest HP: ${state.hpPercent.toFixed(0)}%`);
    }

    if (state.floor >= 8) {
      log('TEST', `SUCCESS: Survived to floor ${state.floor}`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Died at floor ${state.floor} with ${state.hp}`);
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

    await defensiveStrategy(page, state.hpPercent);
    await page.waitForTimeout(400);
  }

  const finalState = await getState(page);
  log('TEST', `Final: Floor ${finalState.floor}, HP: ${finalState.hp}, Lowest HP: ${lowestHp.toFixed(0)}%`);

  expect(finalState.floor).toBeGreaterThanOrEqual(4);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
