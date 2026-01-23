/**
 * Playwright test for module_game
 * Plays through the entire game and wins by defeating Voldemort
 */

const { test, expect } = require('@playwright/test');

test.describe('Module Game Full Playthrough', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to the module game
        await page.goto('http://localhost:8080/module_game/index.html');

        // Wait for game to initialize
        await page.waitForFunction(() => window.game !== undefined, { timeout: 10000 });
        await page.waitForTimeout(500);
    });

    test('should complete the game by defeating Voldemort', async ({ page }) => {
        console.log('=== Starting Full Playthrough Test ===');

        // Step 1: Select a house (Hufflepuff for survivability)
        console.log('Step 1: Selecting house...');
        await page.waitForFunction(() => {
            const rd = window.game.renderData;
            return rd && rd.showHouseSelect === true;
        }, { timeout: 5000 });

        // Click on Hufflepuff (4th house option)
        await page.evaluate(() => {
            window.game.selectHouse('hufflepuff');
        });

        await page.waitForTimeout(300);

        // Step 2: Complete spell tutorial
        console.log('Step 2: Completing spell tutorial...');
        await page.waitForFunction(() => {
            const rd = window.game.renderData;
            return rd && rd.showSpellTutorial === true;
        }, { timeout: 5000 });

        // Advance through all 3 tutorial pages
        for (let i = 0; i < 3; i++) {
            await page.evaluate(() => {
                window.game.advanceSpellTutorial();
            });
            await page.waitForTimeout(200);
        }

        // Step 3: Wait for game to start
        console.log('Step 3: Waiting for game to start...');
        await page.waitForFunction(() => {
            const session = window.game.session;
            return session && session.state === 'playing';
        }, { timeout: 5000 });

        console.log('Game started! Beginning battle loop...');

        // Step 4: Play through all encounters
        const totalEncounters = 15; // 11 creatures + 4 bosses
        let currentEncounter = 0;

        while (currentEncounter < totalEncounters) {
            const state = await page.evaluate(() => ({
                session: window.game.session,
                player: window.game.player,
                creature: window.game.creature,
                renderData: window.game.renderData
            }));

            // Check for victory
            if (state.renderData.showVictory) {
                console.log('Victory screen shown! Game completed!');
                break;
            }

            // Check for game over
            if (state.renderData.showGameOver) {
                console.log(`Game Over at floor ${state.player.floor}!`);
                // Take screenshot for debugging
                await page.screenshot({ path: `module-game-over-${state.player.floor}.png` });
                throw new Error(`Game Over at floor ${state.player.floor}`);
            }

            // Handle shield minigame (for bosses)
            if (state.renderData.showShieldTutorial) {
                console.log('Shield tutorial - starting...');
                await page.evaluate(() => {
                    window.game.startShieldFromTutorial();
                });
                await page.waitForTimeout(300);
                continue;
            }

            if (state.renderData.showShieldMinigame) {
                // Wait for spell color to be set
                const shieldState = await page.evaluate(() => ({
                    currentColor: window.game.session.shieldCurrentColor,
                    shieldActive: window.game.session.shieldActive,
                    highlightColor: window.game.renderData.shieldHighlightColor,
                    queueLength: window.game.session.shieldSpellQueue ? window.game.session.shieldSpellQueue.length : 0
                }));

                if (shieldState.currentColor && shieldState.shieldActive) {
                    // Press the correct color
                    const color = shieldState.highlightColor || shieldState.currentColor;
                    console.log(`Shield: pressing ${color} (queue: ${shieldState.queueLength})`);
                    await page.evaluate((c) => {
                        window.game.handleShieldPress(c);
                    }, color);
                    await page.waitForTimeout(400); // Longer pause for shield animations
                } else if (!shieldState.shieldActive) {
                    // Shield minigame ended but popup still showing, continue
                    await page.waitForTimeout(200);
                } else {
                    // Waiting for next spell
                    await page.waitForTimeout(200);
                }
                continue;
            }

            // Handle buff selection
            if (state.renderData.showBuffSelect) {
                console.log('Buff selection - choosing first buff...');
                const buffs = state.renderData.buffChoices;
                if (buffs && buffs.length > 0) {
                    // Prefer heal or HP buffs
                    let selectedBuff = buffs[0];
                    for (const buff of buffs) {
                        if (buff.id.includes('heal') || buff.id.includes('hp')) {
                            selectedBuff = buff;
                            break;
                        }
                    }
                    await page.evaluate((buffId) => {
                        window.game.selectBuff(buffId);
                    }, selectedBuff.id);
                    await page.waitForTimeout(300);

                    // Update encounter counter
                    const newState = await page.evaluate(() => ({
                        encounterIndex: window.game.player.encounterIndex
                    }));
                    if (newState.encounterIndex > currentEncounter) {
                        currentEncounter = newState.encounterIndex;
                        console.log(`Progress: Encounter ${currentEncounter}/${totalEncounters}`);
                    }
                }
                continue;
            }

            // During normal battle, cast spells when available
            if (state.session.state === 'playing' && state.creature) {
                const spells = state.renderData.spells;
                if (spells) {
                    for (const spell of spells) {
                        if (spell.isReady && !spell.isBlocked) {
                            console.log(`Casting spell: ${spell.id}`);
                            await page.evaluate((spellId) => {
                                window.game.castSpell(spellId);
                            }, spell.id);
                            await page.waitForTimeout(100);
                            break;
                        }
                    }
                }
            }

            // Wait for next battle tick
            await page.waitForTimeout(300);
        }

        // Verify victory
        const finalState = await page.evaluate(() => ({
            showVictory: window.game.renderData.showVictory,
            kills: window.game.player.runKills,
            gold: window.game.player.runGold
        }));

        console.log(`Final state: Victory=${finalState.showVictory}, Kills=${finalState.kills}, Gold=${finalState.gold}`);

        expect(finalState.showVictory).toBe(true);
        console.log('=== Test Completed Successfully ===');
    });

    test('should initialize correctly', async ({ page }) => {
        // Verify game object exists
        const gameExists = await page.evaluate(() => window.game !== undefined);
        expect(gameExists).toBe(true);

        // Verify house selection is shown
        const showHouseSelect = await page.evaluate(() => window.game.renderData.showHouseSelect);
        expect(showHouseSelect).toBe(true);

        // Verify session state
        const sessionState = await page.evaluate(() => window.game.session.state);
        expect(sessionState).toBe('houseSelect');
    });

    test('should handle house selection', async ({ page }) => {
        // Wait for house select screen
        await page.waitForFunction(() => window.game.renderData.showHouseSelect === true);

        // Select Gryffindor
        await page.evaluate(() => window.game.selectHouse('gryffindor'));

        // Verify house was selected
        const house = await page.evaluate(() => window.game.player.house);
        expect(house).toBe('gryffindor');

        // Verify spell tutorial is shown (since it's first game)
        const showTutorial = await page.evaluate(() => window.game.renderData.showSpellTutorial);
        expect(showTutorial).toBe(true);
    });

    test('should have all houses available', async ({ page }) => {
        const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];

        for (const house of houses) {
            const houseData = await page.evaluate((h) => window.game.HOUSE_DATA[h], house);
            expect(houseData).toBeDefined();
            expect(houseData.spell).toBeDefined();
        }
    });
});
