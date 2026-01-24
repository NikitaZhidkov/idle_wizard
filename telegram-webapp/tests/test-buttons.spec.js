import { test, expect } from '@playwright/test';

test('test spell buttons', async ({ page }) => {
    // Listen for console messages
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        consoleLogs.push(text);
        console.log('CONSOLE:', text);
    });

    await page.goto('https://365f4b3782a0a5.lhr.life?v=1');
    await page.waitForTimeout(2000);

    // Click on Slytherin house to start (need to hit the right y position)
    console.log('Clicking house select (Slytherin at y=340)...');
    await page.click('canvas', { position: { x: 180, y: 340 } });
    await page.waitForTimeout(500);

    // Click through tutorial (3 pages) - click on "Start Playing" button
    console.log('Clicking through tutorial...');
    for (let i = 0; i < 3; i++) {
        await page.click('canvas', { position: { x: 200, y: 530 } }); // Start Playing button
        await page.waitForTimeout(500);
    }
    await page.waitForTimeout(1000);

    // Take screenshot after setup
    await page.screenshot({ path: 'test-results/game-started.png' });

    // Now the game should be in battle mode - try to click the spell
    // The spell icon is visible at around y=350, x=200 (center)
    console.log('Clicking spell button...');
    await page.click('canvas', { position: { x: 200, y: 350 } });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/after-spell-click.png' });

    // Print all click-related console logs
    console.log('\n=== CLICK LOGS ===');
    consoleLogs.filter(l => l.includes('[CLICK]')).forEach(l => console.log(l));

    console.log('Test complete');
});
