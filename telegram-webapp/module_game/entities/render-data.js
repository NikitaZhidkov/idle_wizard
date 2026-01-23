/**
 * RenderData - output structure for Render module
 */

export function createRenderData() {
    return {
        // Screen to render
        screen: 'battle', // battle, spellbook, skills, shop, bestiary

        // Popups
        showHouseSelect: false,
        showSpellTutorial: false,
        showShieldTutorial: false,
        showShieldMinigame: false,
        showBuffSelect: false,
        showRoomTransition: false,
        showGameOver: false,
        showVictory: false,

        // Header
        gold: 0,
        gems: 0,
        level: 1,
        floor: 1,
        skillPoints: 0,

        // Hero
        heroHp: 100,
        heroMaxHp: 100,
        heroName: 'Wizard',
        houseIcon: '🧙',

        // Creature
        creatureName: '',
        creatureHp: 0,
        creatureMaxHp: 100,
        creatureSpriteIndex: 0,
        creatureAbilities: [],
        creatureHasShield: false,

        // Combat
        isBoss: false,
        comboDisplay: '',

        // Buffs bar
        activeBuffs: [],

        // Spell bar
        spells: [],

        // Battle log
        battleLog: [],

        // Stats bar
        atk: 10,
        def: 5,
        crit: 5,
        hp: 100,

        // Floating texts & particles (visual effects)
        floatingTexts: [],
        particles: [],

        // Popup data
        spellTutorialPage: 1,
        buffChoices: [],
        gameOverData: { floor: 1, kills: 0, gold: 0, combo: 0 },
        victoryData: { kills: 0, gold: 0, combo: 0 },
        roomTransitionData: { loot: 0, nextRoom: 2 },

        // Shield minigame
        shieldSpells: [],
        shieldHighlightColor: null,
        shieldTimer: 100,
        shieldResult: ''
    };
}
