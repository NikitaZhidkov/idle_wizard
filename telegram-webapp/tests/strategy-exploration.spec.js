// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * ROOM EXPLORATION STRATEGY
 * Test room transitions, encounter progression, floor advancement
 */

test.describe.configure({ timeout: 300000 });

const log = (cat, msg) => console.log(`[${new Date().toISOString().split('T')[1].split('.')[0]}] [${cat}] ${msg}`);

async function setupGame(page) {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.game-container', { timeout: 10000 });

  // Select Ravenclaw for XP bonus (faster progression)
  await page.waitForSelector('#houseSelectPopup', { state: 'visible', timeout: 5000 });
  await page.locator('.house-option[data-house="ravenclaw"]').click();
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
  log('SETUP', 'Game initialized with Ravenclaw (exploration)');
}

async function getState(page) {
  return page.evaluate(() => {
    const creatureName = document.getElementById('battleCreatureName')?.textContent || '';
    const isBoss = creatureName.includes('Troll') ||
                   creatureName.includes('Death Eater') ||
                   creatureName.includes('Nagini') ||
                   creatureName.includes('Voldemort');

    // Get room theme from background or decor
    const battleArea = document.getElementById('battleArea');
    const bgStyle = battleArea?.style?.background || '';

    return {
      floor: parseInt(document.getElementById('floor')?.textContent?.replace('Floor: ', '') || '1'),
      hp: document.getElementById('hpStat')?.textContent || '',
      gold: document.getElementById('gold')?.textContent || '0',
      buffVisible: document.getElementById('buffSelectionPanel')?.style?.display === 'block',
      shieldActive: document.getElementById('shieldMinigame')?.classList?.contains('active'),
      gameOver: document.getElementById('gameoverPopup')?.style?.display === 'flex',
      creature: creatureName,
      isBoss,
      hasRoomTransition: document.querySelector('.room-transition') !== null,
      bgStyle
    };
  });
}

async function explorationStrategy(page) {
  // Simple combat - just cast spells
  const readySpells = page.locator('#spellsContainer .spell.ready');
  const count = await readySpells.count();
  if (count > 0) {
    await readySpells.first().click().catch(() => {});
  }
}

async function handleBuffSelection(page) {
  const buffChoice = page.locator('.buff-choice').first();
  if (await buffChoice.isVisible({ timeout: 300 }).catch(() => false)) {
    // EXPLORATION: Prioritize XP and gold buffs
    const exploreBuff = page.locator('.buff-choice:has-text("XP"), .buff-choice:has-text("Gold"), .buff-choice:has-text("Learn")').first();
    if (await exploreBuff.isVisible().catch(() => false)) {
      await exploreBuff.click();
      log('BUFF', 'Selected exploration buff (XP/Gold)');
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

test('Room exploration strategy - track progression', async ({ page }) => {
  const errors = [];
  const encounterLog = [];
  let roomTransitions = 0;
  let totalGoldEarned = 0;

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await setupGame(page);
  log('TEST', 'Starting room exploration strategy');

  const startTime = Date.now();
  let lastFloor = 1;
  let lastCreature = '';
  let lastGold = 0;

  // Expected encounter order based on data.js
  const expectedOrder = [
    'Cornish Pixie', 'Doxy', 'Grindylow', 'Troll',
    'Red Cap', 'Boggart', 'Hippogriff', 'Death Eater',
    'Acromantula', 'Dementor', 'Werewolf', 'Nagini',
    'Hungarian Horntail', 'Basilisk', 'Voldemort'
  ];

  while (Date.now() - startTime < 300000) {
    const state = await getState(page);

    // Track gold earned
    const currentGold = parseInt(state.gold) || 0;
    if (currentGold > lastGold) {
      const earned = currentGold - lastGold;
      totalGoldEarned += earned;
      log('GOLD', `Earned ${earned} gold (total: ${totalGoldEarned})`);
      lastGold = currentGold;
    }

    // Track creature encounters
    if (state.creature && state.creature !== lastCreature) {
      const encounterIndex = encounterLog.length;
      const expectedCreature = expectedOrder[encounterIndex] || 'Unknown';
      const matches = state.creature.includes(expectedCreature) || expectedCreature.includes(state.creature);

      encounterLog.push({
        floor: state.floor,
        creature: state.creature,
        expected: expectedCreature,
        correct: matches,
        isBoss: state.isBoss
      });

      log('ENCOUNTER', `#${encounterIndex + 1}: ${state.creature} (expected: ${expectedCreature}) ${matches ? '✓' : '✗'} ${state.isBoss ? '[BOSS]' : ''}`);
      lastCreature = state.creature;
    }

    if (state.floor >= 15 || state.creature.includes('Voldemort')) {
      log('TEST', `SUCCESS: Reached final boss at floor ${state.floor}`);
      break;
    }

    if (state.gameOver) {
      log('TEST', `Exploration ended at floor ${state.floor}`);
      break;
    }

    if (state.floor !== lastFloor) {
      roomTransitions++;
      log('FLOOR', `=== FLOOR ${state.floor} === (transition #${roomTransitions})`);
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

    await explorationStrategy(page);
    await page.waitForTimeout(400);
  }

  const finalState = await getState(page);

  log('TEST', '=== EXPLORATION RESULTS ===');
  log('TEST', `Final Floor: ${finalState.floor}`);
  log('TEST', `Room Transitions: ${roomTransitions}`);
  log('TEST', `Total Encounters: ${encounterLog.length}`);
  log('TEST', `Total Gold Earned: ${totalGoldEarned}`);

  // Check encounter order
  const correctEncounters = encounterLog.filter(e => e.correct).length;
  log('TEST', `Correct Encounter Order: ${correctEncounters}/${encounterLog.length}`);

  // Log any mismatches
  const mismatches = encounterLog.filter(e => !e.correct);
  if (mismatches.length > 0) {
    log('WARN', 'Encounter order mismatches:');
    mismatches.forEach(m => log('WARN', `  Floor ${m.floor}: Got "${m.creature}", expected "${m.expected}"`));
  }

  expect(finalState.floor).toBeGreaterThanOrEqual(5);
  expect(encounterLog.length).toBeGreaterThanOrEqual(4); // At least 4 encounters
  expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
});
