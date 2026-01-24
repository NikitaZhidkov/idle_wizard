import { test, expect } from '@playwright/test';

test('test creature progression', async ({ page }) => {
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log('CONSOLE:', text);
    });

    await page.goto('https://9ccd3793945f60.lhr.life?v=4');
    await page.waitForTimeout(2000);

    // Click to enable audio context
    await page.click('canvas', { position: { x: 200, y: 300 } });
    
    // Wait for creature to die (with 125 HP and ~15 ATK, about 9 hits = 8 seconds)
    console.log('Waiting for first creature to die...');
    await page.waitForTimeout(10000);

    // Take screenshot - should show buff selection
    await page.screenshot({ path: 'test-results/buff-select.png' });

    // Click on buff (middle of screen where buff cards appear)
    console.log('Clicking buff...');
    await page.click('canvas', { position: { x: 200, y: 400 } });
    await page.waitForTimeout(2000);

    // Take screenshot after buff selection
    await page.screenshot({ path: 'test-results/after-buff.png' });

    // Wait for next creature
    await page.waitForTimeout(5000);
    await page.screenshot({ path: 'test-results/next-creature.png' });

    // Print all game logs
    console.log('\n=== ALL GAME LOGS ===');
    consoleLogs.filter(l => l.includes('[GAME')).forEach(l => console.log(l));
});
