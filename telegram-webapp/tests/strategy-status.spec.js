// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * STATUS EFFECTS STRATEGY
 * Focus on poison, debuffs, damage-over-time effects
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select Slytherin for poison/debuff spells
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator('.house-option[data-house="slytherin"]').click();
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
  log('SETUP', 'Game initialized with Slytherin (status effects)');
}

async function getState(page) {
  return page.evaluate(() => {
    const hpText = document.getElementById('hpStat')?.textContent || '100/100';
    const [current, max] = hpText.split('/').map(x => parseInt(x) || 100);

    // Check for status effect indicators in battle log
    const battleLog = document.getElementById('battleLog')?.textContent || '';
    const hasPoison = battleLog.includes('poison') || battleLog.includes('Poison');
    const hasBurn = battleLog.includes('burn') || battleLog.includes('Burn');
    const hasBleed = battleLog.includes('bleed') || battleLog.includes('Bleed');

    return {
      floor: parseInt(document.getElementById('floor')?.textContent?.replace('Floor: ', '') || '1'),
      hp: hpText,
      hpPercent: (current / max) * 100,
      buffVisible: document.getElementById('buffSelectionPanel')?.style?.display === 'block',
      shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
      gameOver: document.getElementById('gameoverPopup')?.style?.display === 'flex',
      creature: document.getElementById('battleCreatureName')?.textContent || '',
      battleLog,
      hasPoison,
      hasBurn,
      hasBleed
    };
  });
}

async function statusEffectStrategy(page) {
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();

  // Prioritize status effect spells
  for (let i = 0; i < count; i++) {
    try {
      const spell = readySpells.nth(i);
      const text = (await spell.textContent() || '').toLowerCase();
      const title = (await spell.getAttribute('title') || '').toLowerCase();
      const combined = text + ' ' + title;

      // STATUS EFFECTS: Prioritize DoT and debuff spells
      const isStatusSpell =
        combined.includes('poison') ||
        combined.includes('burn') ||
        combined.includes('bleed') ||
        combined.includes('serpensortia') ||
        combined.includes('incendio') ||
        combined.includes('sectumsempra') ||
        combined.includes('confringo') ||
        combined.includes('crucio');

      if (isStatusSpell) {
        await spell.click();
        log('STATUS', `Applied status effect spell`);
        return true;
      }
    } catch (e) { /* continue */ }
  }

  // No status spell ready, use any spell
  if (count > 0) {
    await readySpells.first().click().catch(() => {});
  }
  return false;
}

async function handleBuffSelection(page) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 300 }).catch(() => false)) {
    // STATUS: Prioritize spell unlocks and DoT buffs
    const statusBuff = page.locator('.buff-choice:has-text("Learn"), .buff-choice:has-text("Poison"), .buff-choice:has-text("Burn"), .buff-choice:has-text("Bleed")').first();
    if (await statusBuff.isVisible().catch(() => false)) {
      await statusBuff.click();
      log('BUFF', 'Selected status effect buff');
      await page.waitForTimeout(500);
      return true;
    }

    await buffChoice.click();
    log('BUFF', 'Selected first buff');
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

test('Status effects strategy - DoT and debuff focus', async ({ page }) => {
  const errors = [];
  let statusEffectsApplied = 0;
  let poisonTicks = 0;
  let burnTicks = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
    // Count status effect ticks in console
    const text = msg.text();
    if (text.includes('poison')) poisonTicks++;
    if (text.includes('burn')) burnTicks++;
  });

  await setupGame(page);
  log('TEST', 'Starting status effects strategy');

  const startTime = Date.now();
  let lastFloor = 1;

  while (Date.now() - startTime < 240000) {
    const state = await getState(page);

    if (state.floor >= 8) {
      log('TEST', `SUCCESS: Reached floor ${state.floor}`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Died at floor ${state.floor}`);
      break;
    }

    if (state.floor !== lastFloor) {
      log('FLOOR', `Floor ${state.floor}, HP: ${state.hp}, Effects active: poison=${state.hasPoison}, burn=${state.hasBurn}`);
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

    const appliedStatus = await statusEffectStrategy(page);
    if (appliedStatus) statusEffectsApplied++;

    await page.waitForTimeout(400);
  }

  const finalState = await getState(page);
  log('TEST', `Final: Floor ${finalState.floor}, HP: ${finalState.hp}`);
  log('TEST', `Status effects applied: ${statusEffectsApplied}`);
  log('TEST', `Poison ticks observed: ${poisonTicks}, Burn ticks: ${burnTicks}`);

  expect(finalState.floor).toBeGreaterThanOrEqual(4);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
