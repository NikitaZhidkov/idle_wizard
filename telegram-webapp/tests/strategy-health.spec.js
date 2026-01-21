// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * HEALTH MANAGEMENT STRATEGY
 * Monitor HP closely, heal when low, balance offense/defense based on HP
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select Hufflepuff for regen/heal bonus
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
  log('SETUP', 'Game initialized with Hufflepuff (health focus)');
}

async function getState(page) {
  return page.evaluate(() => {
    const hpText = document.getElementById('hpStat')?.textContent || '100/100';
    const [current, max] = hpText.split('/').map(x => parseInt(x) || 100);
    const creatureHpWidth = document.getElementById('creatureHealth')?.style?.width || '100%';
    const creatureHpPercent = parseFloat(creatureHpWidth) || 100;

    return {
      floor: parseInt(document.getElementById('floor')?.textContent?.replace('Floor: ', '') || '1'),
      hp: hpText,
      currentHp: current,
      maxHp: max,
      hpPercent: (current / max) * 100,
      creatureHpPercent,
      buffVisible: document.getElementById('buffSelectionPanel')?.style?.display === 'block',
      shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
      gameOver: document.getElementById('gameoverPopup')?.style?.display === 'flex',
      creature: document.getElementById('battleCreatureName')?.textContent || ''
    };
  });
}

async function healthManagementStrategy(page, state) {
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();

  // Get all spell info
  const spells = [];
  for (let i = 0; i < count; i++) {
    const spell = readySpells.nth(i);
    const text = (await spell.textContent() || '').toLowerCase();
    const title = (await spell.getAttribute('title') || '').toLowerCase();
    spells.push({
      index: i,
      spell,
      isHeal: text.includes('heal') || title.includes('heal') || text.includes('herbivicus') || text.includes('episkey'),
      isShield: text.includes('shield') || text.includes('protego'),
      isDamage: !text.includes('heal') && !text.includes('shield')
    });
  }

  // HEALTH MANAGEMENT LOGIC:
  // < 30% HP: EMERGENCY - use any heal/shield
  // < 50% HP: Use heal if available
  // < 70% HP: Use heal only if creature HP > 50%
  // > 70% HP: Focus on damage

  if (state.hpPercent < 30) {
    log('HP', `EMERGENCY! HP at ${state.hpPercent.toFixed(0)}%`);
    const healOrShield = spells.find(s => s.isHeal || s.isShield);
    if (healOrShield) {
      await healOrShield.spell.click();
      log('HEALTH', 'Used emergency heal/shield');
      return;
    }
  }

  if (state.hpPercent < 50) {
    const heal = spells.find(s => s.isHeal);
    if (heal) {
      await heal.spell.click();
      log('HEALTH', `Healing at ${state.hpPercent.toFixed(0)}% HP`);
      return;
    }
  }

  if (state.hpPercent < 70 && state.creatureHpPercent > 50) {
    const heal = spells.find(s => s.isHeal);
    if (heal) {
      await heal.spell.click();
      log('HEALTH', `Preventive heal at ${state.hpPercent.toFixed(0)}% HP`);
      return;
    }
  }

  // HP is fine or no heals - deal damage
  const damage = spells.find(s => s.isDamage);
  if (damage) {
    await damage.spell.click();
    log('ATTACK', 'Using damage spell');
  } else if (spells.length > 0) {
    await spells[0].spell.click();
  }
}

async function handleBuffSelection(page, hpPercent) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 300 }).catch(() => false)) {
    // HEALTH MANAGEMENT: Choose based on current HP
    if (hpPercent < 50) {
      // Need HP/heal buffs
      const healthBuff = page.locator('.buff-choice:has-text("HP"), .buff-choice:has-text("Heal"), .buff-choice:has-text("Regen")').first();
      if (await healthBuff.isVisible().catch(() => false)) {
        await healthBuff.click();
        log('BUFF', 'Selected health buff (low HP)');
        await page.waitForTimeout(500);
        return true;
      }
    }

    // HP is fine, get offensive buffs
    const offBuff = page.locator('.buff-choice:has-text("Attack"), .buff-choice:has-text("Damage"), .buff-choice:has-text("Crit")').first();
    if (await offBuff.isVisible().catch(() => false)) {
      await offBuff.click();
      log('BUFF', 'Selected attack buff (HP is fine)');
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

test('Health management strategy - balanced HP management', async ({ page }) => {
  const errors = [];
  let healCount = 0;
  let emergencyCount = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await setupGame(page);
  log('TEST', 'Starting health management strategy');

  const startTime = Date.now();
  let lastFloor = 1;
  let lowestHp = 100;

  while (Date.now() - startTime < 240000) {
    const state = await getState(page);

    if (state.hpPercent < lowestHp) {
      lowestHp = state.hpPercent;
    }

    if (state.hpPercent < 30) {
      emergencyCount++;
    }

    if (state.floor >= 8) {
      log('TEST', `SUCCESS: Reached floor ${state.floor} with good HP management`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Died at floor ${state.floor}`);
      break;
    }

    if (state.floor !== lastFloor) {
      log('FLOOR', `Floor ${state.floor}, HP: ${state.hp} (${state.hpPercent.toFixed(0)}%)`);
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

    if (await handleBuffSelection(page, state.hpPercent)) continue;

    await healthManagementStrategy(page, state);
    await page.waitForTimeout(400);
  }

  const finalState = await getState(page);
  log('TEST', `Final: Floor ${finalState.floor}, HP: ${finalState.hp}`);
  log('TEST', `Lowest HP: ${lowestHp.toFixed(0)}%, Emergency situations: ${emergencyCount}`);

  expect(finalState.floor).toBeGreaterThanOrEqual(4);
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
