// Canvas Renderer - Unified single-canvas rendering system
// All game UI rendered on one canvas element

// Canvas and context
let canvas = null;
let ctx = null;
let canvasWidth = 360;
let canvasHeight = 700;

// Images
let heroImage = null;
let creatureSpriteSheet = null;
let heroImageLoaded = false;
let spriteSheetLoaded = false;

// Layout constants
const HEADER_HEIGHT = 50;
const TABS_HEIGHT = 36;
const TABS_PADDING = 4;
const BATTLE_AREA_HEIGHT = 200;
const BATTLE_AREA_MARGIN = 8;
const BUFFS_HEIGHT = 30;
const SPELL_BAR_HEIGHT = 50;
const SPELL_PADDING = 6;
const BATTLE_LOG_HEIGHT = 80;
const BATTLE_LOG_MAX_ENTRIES = 6;
const STATS_BAR_HEIGHT = 50;
const STATS_BAR_MARGIN = 8;

// Animation state
let animationFrame = null;
let lastFrameTime = 0;
const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;

// Visual effects
let floatingTexts = []; // Array of { text, x, y, type, startTime, duration }
let particles = []; // Array of { x, y, vx, vy, color, size, startTime, duration }

// Game state for rendering
let gameState = {
    // Header
    gold: 0,
    gems: 0,
    skillPoints: 0,
    level: 1,
    floor: 1,

    // Tabs
    activeTab: 'battle',

    // Battle area
    roomTheme: 'castle',
    floorDisplay: '',
    comboDisplay: '',
    isBoss: false,

    // Characters
    heroHp: 100,
    heroMaxHp: 100,
    heroName: 'Wizard',
    creatureName: '',
    creatureHp: 0,
    creatureMaxHp: 100,
    creatureType: 0, // Sprite index
    creatureAbilities: [],
    creatureHasShield: false,
    houseIcon: '🦁',

    // Buffs
    activeBuffs: [],

    // Spells
    spells: [],
    shieldMinigameActive: false,

    // Log
    battleLog: [],

    // Stats
    atk: 10,
    def: 5,
    crit: 5,
    hp: 100,

    // Popups
    showHouseSelect: false,
    showGameOver: false,
    showVictory: false,
    showBuffSelect: false,
    showSpellTutorial: false,
    showShieldTutorial: false,
    showShieldMinigame: false,
    showRoomTransition: false,

    // Popup data
    gameOverData: { floor: 1, kills: 0, gold: 0, combo: 0 },
    victoryData: { kills: 0, gold: 0, combo: 0 },
    buffChoices: [],
    spellTutorialPage: 1,
    roomTransitionData: { loot: 0, nextRoom: 2 },

    // Shield minigame
    shieldSpells: [], // Array of { color, x, y, flying }
    shieldHighlightColor: null,
    shieldTimer: 100,
    shieldResult: '',

    // Tab content
    shopItems: [],
    skillTree: [],
    bestiary: [],
    spellbook: []
};

// Callbacks
let onTabClick = null;
let onSpellClick = null;
let onHouseSelect = null;
let onBuffSelect = null;
let onRetryClick = null;
let onVictoryClick = null;
let onShieldButtonClick = null;
let onTutorialNext = null;
let onTutorialFinish = null;
let onShieldTutorialStart = null;
let onRoomContinue = null;

// Colors
const COLORS = {
    background: '#1a1a2e',
    headerBg: '#16213e',
    gold: '#ffd700',
    silver: '#c0c0c0',
    text: '#ffffff',
    textMuted: '#a0a0a8',
    border: '#3a3a5e',
    tabBg: 'rgba(90, 80, 70, 0.25)',
    tabActiveBg: 'rgba(90, 80, 70, 0.5)',
    tabBorder: '#5a5048',
    tabActiveBorder: '#c9a857',
    tabText: '#c8c4bc',
    battleAreaBorder: '#3d3a35',
    battleAreaBg: 'rgba(30, 28, 35, 0.8)',
    groundColor: '#3a3530',
    spellReady: 'rgba(90, 80, 70, 0.6)',
    spellCooldown: 'rgba(50, 45, 40, 0.6)',
    spellBlocked: 'rgba(80, 40, 40, 0.6)',
    spellBorder: '#5a5048',
    spellReadyBorder: '#c9a857',
    buffBg: 'rgba(70, 65, 90, 0.6)',
    statusBg: 'rgba(60, 55, 80, 0.7)',
    logBg: 'rgba(20, 20, 30, 0.8)',
    logText: '#c8c4bc',
    logGold: '#c9a857',
    logSpell: '#a987c9',
    logEffective: '#7bc96a',
    logResist: '#c96a6a',
    logBoss: '#ff6b6b',
    logLevelup: '#ffd700',
    panelBg: 'rgba(30, 28, 40, 0.9)',
    popupBg: 'rgba(15, 15, 20, 0.95)',
    healthPlayer: '#4ecdc4',
    healthEnemy: '#ff6b6b',
    healthLow: '#ff6b6b',
    healthMid: '#ffe66d'
};

// House data
const HOUSES = {
    gryffindor: { icon: '🦁', name: 'Gryffindor', bonus: '+20% Attack, -10% Defense', item: '🗡️ Sword of Gryffindor', color: '#ae0001' },
    slytherin: { icon: '🐍', name: 'Slytherin', bonus: '+10% Attack, +5% Crit', item: '📿 Slytherin Locket', color: '#1a472a' },
    ravenclaw: { icon: '🦅', name: 'Ravenclaw', bonus: '+8% Crit, +20% XP', item: '👑 Ravenclaw Diadem', color: '#0e1a40' },
    hufflepuff: { icon: '🦡', name: 'Hufflepuff', bonus: '+15% HP, +10% Defense', item: '🏆 Hufflepuff Cup', color: '#ecb939' }
};

// Creature sprite positions (4 per row in 500x500 sheet)
// Each creature is 120x120, with 3px borders around edges and between creatures
const SPRITE_COLS = 4;
const SPRITE_SIZE = 120; // Each creature is 120x120 pixels
const SPRITE_BORDER = 3; // 3px border around and between creatures
const SPRITE_STRIDE = SPRITE_SIZE + SPRITE_BORDER; // 123px from one creature start to next

const CREATURE_SPRITES = {
    pixie: 0, doxy: 1, grindylow: 2, redcap: 3,
    boggart: 4, hippogriff: 5, acromantula: 6, dementor: 7,
    werewolf: 8, horntail: 9, basilisk: 10, troll: 11,
    deatheater: 12, nagini: 13, voldemort: 14
};

// ============== INITIALIZATION ==============

export function initCanvasRenderer(containerElement) {
    // Create full-page canvas
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.style.display = 'block';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.touchAction = 'none';

    ctx = canvas.getContext('2d');

    // Replace container contents with canvas
    containerElement.innerHTML = '';
    containerElement.appendChild(canvas);

    // Load images
    loadImages();

    // Set initial size
    resizeCanvas();

    // Event listeners
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    // Start render loop
    startRenderLoop();

    return { canvas, ctx };
}

function loadImages() {
    // Load hero image
    heroImage = new Image();
    heroImage.onload = () => {
        heroImageLoaded = true;
    };
    heroImage.src = 'hero.png';

    // Load creature sprite sheet
    creatureSpriteSheet = new Image();
    creatureSpriteSheet.onload = () => {
        spriteSheetLoaded = true;
    };
    creatureSpriteSheet.src = 'creatures.png?v=5';
}

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
}

function startRenderLoop() {
    function loop(timestamp) {
        if (timestamp - lastFrameTime >= FRAME_DURATION) {
            lastFrameTime = timestamp;
            updateAnimations(timestamp);
            render();
        }
        animationFrame = requestAnimationFrame(loop);
    }
    animationFrame = requestAnimationFrame(loop);
}

// ============== STATE UPDATES ==============

export function updateGameState(newState) {
    gameState = { ...gameState, ...newState };
}

export function addLogEntry(text, type = '') {
    gameState.battleLog.push({ text, type, time: Date.now() });
    while (gameState.battleLog.length > BATTLE_LOG_MAX_ENTRIES) {
        gameState.battleLog.shift();
    }
}

export function clearBattleLog() {
    gameState.battleLog = [];
}

export function showFloatingText(text, x, y, type = '') {
    floatingTexts.push({
        text, x, y, type,
        startTime: Date.now(),
        duration: 800
    });
}

export function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 30,
            y: y + (Math.random() - 0.5) * 30,
            vx: (Math.random() - 0.5) * 3,
            vy: -Math.random() * 3 - 1,
            color,
            size: 3 + Math.random() * 4,
            startTime: Date.now(),
            duration: 600
        });
    }
}

// ============== CALLBACKS ==============

export function setCallbacks(callbacks) {
    onTabClick = callbacks.onTabClick;
    onSpellClick = callbacks.onSpellClick;
    onHouseSelect = callbacks.onHouseSelect;
    onBuffSelect = callbacks.onBuffSelect;
    onRetryClick = callbacks.onRetryClick;
    onVictoryClick = callbacks.onVictoryClick;
    onShieldButtonClick = callbacks.onShieldButtonClick;
    onTutorialNext = callbacks.onTutorialNext;
    onTutorialFinish = callbacks.onTutorialFinish;
    onShieldTutorialStart = callbacks.onShieldTutorialStart;
    onRoomContinue = callbacks.onRoomContinue;
}

// ============== INPUT HANDLING ==============

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    processClick(x, y);
}

function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    processClick(x, y);
}

function processClick(x, y) {
    // Scale coordinates
    const scaleX = canvasWidth / canvas.clientWidth;
    const scaleY = canvasHeight / canvas.clientHeight;
    x *= scaleX;
    y *= scaleY;

    // Check popups first (they're on top)
    if (gameState.showHouseSelect) {
        handleHouseSelectClick(x, y);
        return;
    }

    if (gameState.showGameOver) {
        handleGameOverClick(x, y);
        return;
    }

    if (gameState.showVictory) {
        handleVictoryClick(x, y);
        return;
    }

    if (gameState.showBuffSelect) {
        handleBuffSelectClick(x, y);
        return;
    }

    if (gameState.showSpellTutorial) {
        handleSpellTutorialClick(x, y);
        return;
    }

    if (gameState.showShieldTutorial) {
        handleShieldTutorialClick(x, y);
        return;
    }

    if (gameState.showShieldMinigame) {
        handleShieldMinigameClick(x, y);
        return;
    }

    if (gameState.showRoomTransition) {
        handleRoomTransitionClick(x, y);
        return;
    }

    // Check tabs
    const tabsY = HEADER_HEIGHT;
    if (y >= tabsY && y <= tabsY + TABS_HEIGHT) {
        handleTabClick(x, y);
        return;
    }

    // Check spell bar (only on battle tab)
    if (gameState.activeTab === 'battle') {
        const spellBarY = HEADER_HEIGHT + TABS_HEIGHT + TABS_PADDING + BATTLE_AREA_HEIGHT + BATTLE_AREA_MARGIN + BUFFS_HEIGHT;
        if (y >= spellBarY && y <= spellBarY + SPELL_BAR_HEIGHT) {
            handleSpellClick(x, y);
            return;
        }
    }
}

function handleTabClick(x, y) {
    const tabs = ['battle', 'spellbook', 'skills', 'shop', 'bestiary'];
    const tabWidth = (canvasWidth - TABS_PADDING * 6) / 5;
    const tabIndex = Math.floor((x - TABS_PADDING) / (tabWidth + TABS_PADDING));

    if (tabIndex >= 0 && tabIndex < tabs.length) {
        gameState.activeTab = tabs[tabIndex];
        if (onTabClick) onTabClick(tabs[tabIndex]);
    }
}

function handleSpellClick(x, y) {
    const spells = gameState.spells;
    if (spells.length === 0) return;

    const spellSize = 44;
    const spellPadding = 6;
    const totalWidth = spells.length * (spellSize + spellPadding) - spellPadding;
    const startX = (canvasWidth - totalWidth) / 2;
    const startY = HEADER_HEIGHT + TABS_HEIGHT + TABS_PADDING + BATTLE_AREA_HEIGHT + BATTLE_AREA_MARGIN + BUFFS_HEIGHT + 3;

    const spellIndex = Math.floor((x - startX) / (spellSize + spellPadding));
    if (spellIndex >= 0 && spellIndex < spells.length) {
        const spell = spells[spellIndex];
        if (spell.isReady && !spell.isBlocked && onSpellClick) {
            onSpellClick(spell);
        }
    }
}

function handleHouseSelectClick(x, y) {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const popupWidth = Math.min(320, canvasWidth - 40);
    const startX = centerX - popupWidth / 2;
    const startY = centerY - 180;

    // House options start at startY + 80
    const houseY = startY + 90;
    const houseHeight = 60;
    const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];

    for (let i = 0; i < houses.length; i++) {
        const optY = houseY + i * (houseHeight + 8);
        if (x >= startX + 10 && x <= startX + popupWidth - 10 &&
            y >= optY && y <= optY + houseHeight) {
            if (onHouseSelect) onHouseSelect(houses[i]);
            return;
        }
    }
}

function handleGameOverClick(x, y) {
    // Check retry button
    const btnWidth = 150;
    const btnHeight = 44;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 80;

    if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
        if (onRetryClick) onRetryClick();
    }
}

function handleVictoryClick(x, y) {
    // Check play again button
    const btnWidth = 150;
    const btnHeight = 44;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 80;

    if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
        if (onVictoryClick) onVictoryClick();
    }
}

function handleBuffSelectClick(x, y) {
    const buffs = gameState.buffChoices;
    if (buffs.length === 0) return;

    const buffWidth = 90;
    const buffHeight = 100;
    const totalWidth = buffs.length * (buffWidth + 10) - 10;
    const startX = canvasWidth / 2 - totalWidth / 2;
    const startY = canvasHeight / 2 - buffHeight / 2;

    for (let i = 0; i < buffs.length; i++) {
        const bx = startX + i * (buffWidth + 10);
        if (x >= bx && x <= bx + buffWidth && y >= startY && y <= startY + buffHeight) {
            if (onBuffSelect) onBuffSelect(buffs[i], i);
            return;
        }
    }
}

function handleSpellTutorialClick(x, y) {
    // Check next/finish button
    const btnWidth = 160;
    const btnHeight = 44;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 120;

    if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
        if (gameState.spellTutorialPage < 3) {
            gameState.spellTutorialPage++;
            if (onTutorialNext) onTutorialNext(gameState.spellTutorialPage);
        } else {
            if (onTutorialFinish) onTutorialFinish();
        }
    }
}

function handleShieldTutorialClick(x, y) {
    const btnWidth = 180;
    const btnHeight = 44;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 100;

    if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
        if (onShieldTutorialStart) onShieldTutorialStart();
    }
}

function handleShieldMinigameClick(x, y) {
    // Shield buttons at bottom
    const btnSize = 60;
    const btnPadding = 15;
    const colors = ['red', 'blue', 'yellow', 'green'];
    const totalWidth = 4 * btnSize + 3 * btnPadding;
    const startX = canvasWidth / 2 - totalWidth / 2;
    const btnY = canvasHeight - 120;

    for (let i = 0; i < colors.length; i++) {
        const bx = startX + i * (btnSize + btnPadding);
        if (x >= bx && x <= bx + btnSize && y >= btnY && y <= btnY + btnSize) {
            if (onShieldButtonClick) onShieldButtonClick(colors[i]);
            return;
        }
    }
}

function handleRoomTransitionClick(x, y) {
    const btnWidth = 150;
    const btnHeight = 44;
    const btnX = canvasWidth / 2 - btnWidth / 2;
    const btnY = canvasHeight / 2 + 60;

    if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
        if (onRoomContinue) onRoomContinue();
    }
}

// ============== ANIMATION UPDATE ==============

function updateAnimations(timestamp) {
    const now = Date.now();

    // Update floating texts
    floatingTexts = floatingTexts.filter(ft => {
        const elapsed = now - ft.startTime;
        if (elapsed >= ft.duration) return false;
        ft.y -= 1; // Move up
        return true;
    });

    // Update particles
    particles = particles.filter(p => {
        const elapsed = now - p.startTime;
        if (elapsed >= p.duration) return false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // Gravity
        return true;
    });
}

// ============== RENDERING ==============

function render() {
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Render based on active tab
    renderHeader();
    renderTabs();

    if (gameState.activeTab === 'battle') {
        renderBattleTab();
    } else if (gameState.activeTab === 'spellbook') {
        renderSpellbookTab();
    } else if (gameState.activeTab === 'skills') {
        renderSkillsTab();
    } else if (gameState.activeTab === 'shop') {
        renderShopTab();
    } else if (gameState.activeTab === 'bestiary') {
        renderBestiaryTab();
    }

    // Render effects on top
    renderFloatingTexts();
    renderParticles();

    // Render popups on top of everything
    if (gameState.showRoomTransition) renderRoomTransition();
    if (gameState.showBuffSelect) renderBuffSelect();
    if (gameState.showShieldMinigame) renderShieldMinigame();
    if (gameState.showShieldTutorial) renderShieldTutorial();
    if (gameState.showSpellTutorial) renderSpellTutorial();
    if (gameState.showGameOver) renderGameOver();
    if (gameState.showVictory) renderVictory();
    if (gameState.showHouseSelect) renderHouseSelect();
}

function renderHeader() {
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, 0, canvasWidth, HEADER_HEIGHT);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT - 1);
    ctx.lineTo(canvasWidth, HEADER_HEIGHT - 1);
    ctx.stroke();

    // Left - Currency
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${formatNum(gameState.gold)} Galleons`, 12, 16);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Arial';
    ctx.fillText(`${gameState.gems} Sickles | ${gameState.skillPoints} XP`, 12, 34);

    // Right - Level/Floor
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Year ${gameState.level}`, canvasWidth - 12, 16);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Arial';
    ctx.fillText(`Floor: ${gameState.floor}`, canvasWidth - 12, 34);
}

function renderTabs() {
    const tabs = [
        { id: 'battle', label: '⚔️ Duel' },
        { id: 'spellbook', label: '📜 Spells' },
        { id: 'skills', label: '📚 Studies' },
        { id: 'shop', label: '🏪 Diagon' },
        { id: 'bestiary', label: '📖 Creatures' }
    ];

    const startY = HEADER_HEIGHT + TABS_PADDING;
    const tabWidth = (canvasWidth - TABS_PADDING * 6) / 5;
    const tabHeight = TABS_HEIGHT - TABS_PADDING * 2;

    tabs.forEach((tab, i) => {
        const x = TABS_PADDING + i * (tabWidth + TABS_PADDING);
        const isActive = gameState.activeTab === tab.id;

        ctx.fillStyle = isActive ? COLORS.tabActiveBg : COLORS.tabBg;
        ctx.beginPath();
        ctx.roundRect(x, startY, tabWidth, tabHeight, 6);
        ctx.fill();

        ctx.strokeStyle = isActive ? COLORS.tabActiveBorder : COLORS.tabBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = COLORS.tabText;
        ctx.font = '10px Georgia';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tab.label, x + tabWidth / 2, startY + tabHeight / 2);
    });
}

function renderBattleTab() {
    renderBattleArea();
    renderActiveBuffs();
    renderSpellBar();
    renderBattleLog();
    renderStatsBar();
}

function renderBattleArea() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + BATTLE_AREA_MARGIN;
    const areaWidth = canvasWidth - BATTLE_AREA_MARGIN * 2;
    const areaHeight = BATTLE_AREA_HEIGHT;
    const x = BATTLE_AREA_MARGIN;

    // Background gradient
    const gradient = ctx.createLinearGradient(x, startY, x, startY + areaHeight);
    gradient.addColorStop(0, '#2a2535');
    gradient.addColorStop(1, '#1e1a28');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, startY, areaWidth, areaHeight, 12);
    ctx.fill();

    ctx.strokeStyle = COLORS.battleAreaBorder;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ground
    const groundHeight = 30;
    const groundY = startY + areaHeight - groundHeight;
    ctx.fillStyle = COLORS.groundColor;
    ctx.beginPath();
    ctx.roundRect(x + 2, groundY, areaWidth - 4, groundHeight - 2, [0, 0, 10, 10]);
    ctx.fill();

    // Floor/Boss display
    if (gameState.floorDisplay) {
        ctx.fillStyle = '#ff6b6b';
        ctx.font = '16px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(gameState.floorDisplay, canvasWidth / 2, startY + 20);
    }

    // Combo display
    if (gameState.comboDisplay) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = '12px Georgia';
        ctx.textAlign = 'right';
        ctx.fillText(gameState.comboDisplay, x + areaWidth - 10, startY + 20);
    }

    // Hero
    const heroX = x + 50;
    const heroY = groundY - 75;
    renderHero(heroX, heroY);

    // Creature
    if (gameState.creatureName) {
        const creatureX = x + areaWidth - 110;
        const creatureY = groundY - 80;
        renderCreature(creatureX, creatureY);
    }

    // Creature abilities
    renderCreatureAbilities(x + areaWidth - 10, startY + 40);

    // House icon
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.houseIcon, canvasWidth / 2, startY + areaHeight + 15);
}

function renderHero(x, y) {
    // Name and health bar
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.heroName, x + 27, y - 5);

    // Health bar
    const barWidth = 50;
    const barHeight = 6;
    const barX = x + 2;
    const barY = y + 2;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = gameState.heroHp / gameState.heroMaxHp;
    const hpColor = hpPercent > 0.5 ? COLORS.healthPlayer : hpPercent > 0.25 ? COLORS.healthMid : COLORS.healthLow;
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

    // Hero sprite
    if (heroImageLoaded && heroImage) {
        ctx.drawImage(heroImage, x, y + 10, 55, 75);
    } else {
        ctx.font = '40px Arial';
        ctx.fillText('🧙', x + 27, y + 50);
    }
}

function renderCreature(x, y) {
    const renderSize = 70;

    // Name and health bar - centered over creature
    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.creatureName, x + renderSize / 2, y - 5);

    // Health bar
    const barWidth = 60;
    const barHeight = 6;
    const barX = x + (renderSize - barWidth) / 2;
    const barY = y + 2;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    const hpPercent = gameState.creatureHp / gameState.creatureMaxHp;
    ctx.fillStyle = COLORS.healthEnemy;
    ctx.fillRect(barX, barY, barWidth * Math.max(0, hpPercent), barHeight);

    // Creature sprite
    if (spriteSheetLoaded && creatureSpriteSheet) {
        const spriteIndex = gameState.creatureType;
        // Calculate source position in the 4x4 grid
        // Layout: 3px border, then 120px creature, repeated (stride = 123px)
        const col = spriteIndex % SPRITE_COLS;
        const row = Math.floor(spriteIndex / SPRITE_COLS);
        const sx = SPRITE_BORDER + col * SPRITE_STRIDE;
        const sy = SPRITE_BORDER + row * SPRITE_STRIDE;

        // Creatures face right in sprite sheet - flip to face left (toward hero)
        // Trim 3px from right side of source to remove border
        const srcWidth = SPRITE_SIZE - 3;
        const destWidth = renderSize * (srcWidth / SPRITE_SIZE);
        ctx.save();
        ctx.translate(x + renderSize, y + 10);
        ctx.scale(-1, 1);
        ctx.drawImage(creatureSpriteSheet, sx, sy, srcWidth, SPRITE_SIZE, 0, 0, destWidth, renderSize);
        ctx.restore();
    } else {
        ctx.font = '35px Arial';
        ctx.fillText('🐉', x + renderSize / 2, y + 45);
    }
}

function renderCreatureAbilities(rightX, topY) {
    const abilities = gameState.creatureAbilities || [];
    if (gameState.creatureHasShield) {
        abilities.push({ icon: '🛡️' });
    }

    if (abilities.length === 0) return;

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';

    abilities.forEach((ab, i) => {
        const iconX = rightX - i * 24 - 12;

        ctx.fillStyle = COLORS.statusBg;
        ctx.beginPath();
        ctx.arc(iconX, topY, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COLORS.text;
        ctx.fillText(ab.icon, iconX, topY + 4);
    });
}

function renderActiveBuffs() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + TABS_PADDING + BATTLE_AREA_HEIGHT + BATTLE_AREA_MARGIN;
    const buffs = gameState.activeBuffs || [];

    if (buffs.length === 0) return;

    const buffSize = 24;
    const totalWidth = buffs.length * (buffSize + 4) - 4;
    const startX = (canvasWidth - totalWidth) / 2;

    ctx.font = '16px Arial';
    ctx.textAlign = 'center';

    buffs.forEach((buff, i) => {
        const bx = startX + i * (buffSize + 4) + buffSize / 2;
        const by = startY + BUFFS_HEIGHT / 2;

        ctx.fillStyle = COLORS.buffBg;
        ctx.beginPath();
        ctx.roundRect(bx - buffSize / 2, by - buffSize / 2, buffSize, buffSize, 4);
        ctx.fill();

        ctx.fillStyle = COLORS.text;
        ctx.fillText(buff.icon, bx, by + 4);

        if (buff.count > 1) {
            ctx.font = '10px Arial';
            ctx.fillStyle = COLORS.gold;
            ctx.fillText(`x${buff.count}`, bx + buffSize / 2 - 4, by + buffSize / 2);
            ctx.font = '16px Arial';
        }
    });
}

function renderSpellBar() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + TABS_PADDING + BATTLE_AREA_HEIGHT + BATTLE_AREA_MARGIN + BUFFS_HEIGHT;
    const spells = gameState.spells || [];

    if (spells.length === 0) return;

    const spellSize = 44;
    const spellPadding = 6;
    const totalWidth = spells.length * (spellSize + spellPadding) - spellPadding;
    const startX = (canvasWidth - totalWidth) / 2;

    spells.forEach((spell, i) => {
        const sx = startX + i * (spellSize + spellPadding);
        const sy = startY + 3;

        // Background
        let bgColor = spell.isBlocked ? COLORS.spellBlocked : spell.isReady ? COLORS.spellReady : COLORS.spellCooldown;
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(sx, sy, spellSize, spellSize, 8);
        ctx.fill();

        // Border
        ctx.strokeStyle = spell.isReady && !spell.isBlocked ? COLORS.spellReadyBorder : COLORS.spellBorder;
        ctx.lineWidth = spell.isReady && !spell.isBlocked ? 2 : 1;
        ctx.stroke();

        // Icon
        ctx.font = '20px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText(spell.icon, sx + spellSize / 2, sy + spellSize / 2);

        // Cooldown
        if (spell.cooldown > 0) {
            ctx.font = '10px Arial';
            ctx.fillStyle = COLORS.textMuted;
            ctx.fillText(`${spell.cooldown}s`, sx + spellSize / 2, sy + spellSize - 6);
        }
    });
}

function renderBattleLog() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + TABS_PADDING + BATTLE_AREA_HEIGHT + BATTLE_AREA_MARGIN + BUFFS_HEIGHT + SPELL_BAR_HEIGHT + SPELL_PADDING;
    const logWidth = canvasWidth - BATTLE_AREA_MARGIN * 2;
    const x = BATTLE_AREA_MARGIN;

    ctx.fillStyle = COLORS.logBg;
    ctx.beginPath();
    ctx.roundRect(x, startY, logWidth, BATTLE_LOG_HEIGHT, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    const entries = gameState.battleLog || [];
    if (entries.length === 0) return;

    ctx.font = '11px Georgia';
    ctx.textAlign = 'left';

    const lineHeight = 12;
    const padding = 6;
    const maxLines = Math.floor((BATTLE_LOG_HEIGHT - padding * 2) / lineHeight);
    const visible = entries.slice(-maxLines);

    visible.forEach((entry, i) => {
        const entryY = startY + padding + i * lineHeight + 8;

        let color = COLORS.logText;
        if (entry.type === 'log-gold') color = COLORS.logGold;
        else if (entry.type === 'log-spell') color = COLORS.logSpell;
        else if (entry.type === 'log-effective') color = COLORS.logEffective;
        else if (entry.type === 'log-resist') color = COLORS.logResist;
        else if (entry.type === 'log-boss') color = COLORS.logBoss;
        else if (entry.type === 'log-levelup') color = COLORS.logLevelup;

        ctx.fillStyle = color;
        ctx.fillText(entry.text, x + padding, entryY, logWidth - padding * 2);
    });
}

function renderStatsBar() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + TABS_PADDING + BATTLE_AREA_HEIGHT + BATTLE_AREA_MARGIN + BUFFS_HEIGHT + SPELL_BAR_HEIGHT + SPELL_PADDING + BATTLE_LOG_HEIGHT + STATS_BAR_MARGIN;
    const barWidth = canvasWidth - BATTLE_AREA_MARGIN * 2;
    const x = BATTLE_AREA_MARGIN;

    ctx.fillStyle = COLORS.panelBg;
    ctx.beginPath();
    ctx.roundRect(x, startY, barWidth, STATS_BAR_HEIGHT, 8);
    ctx.fill();

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    const stats = [
        { value: gameState.atk, label: 'MAGIC', color: '#ff6b6b' },
        { value: gameState.def, label: 'SHIELD', color: '#4ecdc4' },
        { value: gameState.crit + '%', label: 'CRIT', color: '#ffe66d' },
        { value: gameState.hp, label: 'HP', color: '#95e1d3' }
    ];

    const statWidth = barWidth / 4;

    stats.forEach((stat, i) => {
        const sx = x + i * statWidth + statWidth / 2;

        ctx.fillStyle = stat.color;
        ctx.font = 'bold 16px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(stat.value.toString(), sx, startY + 18);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '10px Georgia';
        ctx.fillText(stat.label, sx, startY + 34);
    });

    // Health bar
    const hpBarY = startY + STATS_BAR_HEIGHT - 8;
    const hpBarWidth = barWidth - 16;
    const hpBarX = x + 8;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(hpBarX, hpBarY, hpBarWidth, 4, 2);
    ctx.fill();

    const hpPercent = gameState.heroHp / gameState.heroMaxHp;
    const hpColor = hpPercent > 0.5 ? '#4ecdc4' : hpPercent > 0.25 ? '#ffe66d' : '#ff6b6b';
    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(hpBarX, hpBarY, hpBarWidth * hpPercent, 4, 2);
    ctx.fill();
}

function renderFloatingTexts() {
    const now = Date.now();

    floatingTexts.forEach(ft => {
        const elapsed = now - ft.startTime;
        const progress = elapsed / ft.duration;
        const alpha = 1 - progress;

        ctx.globalAlpha = alpha;
        ctx.font = 'bold 16px Georgia';
        ctx.textAlign = 'center';

        if (ft.type === 'damage') ctx.fillStyle = '#ff6b6b';
        else if (ft.type === 'heal') ctx.fillStyle = '#4ecdc4';
        else if (ft.type === 'gold') ctx.fillStyle = COLORS.gold;
        else ctx.fillStyle = COLORS.text;

        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1;
    });
}

function renderParticles() {
    const now = Date.now();

    particles.forEach(p => {
        const elapsed = now - p.startTime;
        const alpha = 1 - (elapsed / p.duration);

        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalAlpha = 1;
}

// ============== POPUP RENDERS ==============

function renderHouseSelect() {
    // Overlay
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const popupWidth = Math.min(320, canvasWidth - 40);
    const popupHeight = 380;
    const startX = centerX - popupWidth / 2;
    const startY = canvasHeight / 2 - popupHeight / 2;

    // Popup background
    ctx.fillStyle = '#252530';
    ctx.beginPath();
    ctx.roundRect(startX, startY, popupWidth, popupHeight, 12);
    ctx.fill();

    ctx.strokeStyle = '#6a6050';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.fillStyle = COLORS.gold;
    ctx.font = '20px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🎩 The Sorting Hat', centerX, startY + 30);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText('Choose your house wisely...', centerX, startY + 55);

    // House options
    const houses = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
    const optHeight = 60;

    houses.forEach((house, i) => {
        const h = HOUSES[house];
        const oy = startY + 75 + i * (optHeight + 8);

        ctx.fillStyle = 'rgba(60, 55, 70, 0.8)';
        ctx.beginPath();
        ctx.roundRect(startX + 10, oy, popupWidth - 20, optHeight, 8);
        ctx.fill();

        ctx.strokeStyle = '#5a5048';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Icon and name
        ctx.font = '24px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.text;
        ctx.fillText(h.icon, startX + 20, oy + 28);

        ctx.font = 'bold 14px Georgia';
        ctx.fillText(h.name, startX + 55, oy + 22);

        ctx.font = '10px Georgia';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(h.bonus, startX + 55, oy + 38);

        ctx.fillStyle = COLORS.gold;
        ctx.fillText(h.item, startX + 55, oy + 52);
    });
}

function renderGameOver() {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 24px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('☠️ Defeated!', centerX, centerY - 80);

    ctx.fillStyle = COLORS.text;
    ctx.font = '16px Georgia';
    ctx.fillText(`Reached Floor ${gameState.gameOverData.floor}`, centerX, centerY - 50);

    ctx.font = '14px Georgia';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`🗡️ Creatures defeated: ${gameState.gameOverData.kills}`, centerX, centerY - 15);
    ctx.fillText(`💰 Gold earned: ${gameState.gameOverData.gold}`, centerX, centerY + 10);
    ctx.fillText(`🔥 Max combo: ${gameState.gameOverData.combo}`, centerX, centerY + 35);

    // Retry button
    renderButton(centerX - 75, centerY + 60, 150, 44, 'Try Again', '#c07070', '#a05050');
}

function renderVictory() {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 24px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ Victory! ⚡', centerX, centerY - 80);

    ctx.fillStyle = COLORS.gold;
    ctx.font = '16px Georgia';
    ctx.fillText('You defeated Voldemort!', centerX, centerY - 50);

    ctx.font = '14px Georgia';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`🗡️ Creatures defeated: ${gameState.victoryData.kills}`, centerX, centerY - 15);
    ctx.fillText(`💰 Gold earned: ${gameState.victoryData.gold}`, centerX, centerY + 10);
    ctx.fillText(`🔥 Max combo: ${gameState.victoryData.combo}`, centerX, centerY + 35);

    renderButton(centerX - 75, centerY + 60, 150, 44, 'Play Again', '#ffd700', '#cc9900');
}

function renderBuffSelect() {
    ctx.fillStyle = 'rgba(15, 15, 20, 0.85)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = '18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 Choose a reward:', centerX, centerY - 70);

    const buffs = gameState.buffChoices || [];
    const buffWidth = 90;
    const buffHeight = 100;
    const totalWidth = buffs.length * (buffWidth + 10) - 10;
    const startX = centerX - totalWidth / 2;
    const startY = centerY - buffHeight / 2;

    buffs.forEach((buff, i) => {
        const bx = startX + i * (buffWidth + 10);

        ctx.fillStyle = 'rgba(60, 55, 80, 0.9)';
        ctx.beginPath();
        ctx.roundRect(bx, startY, buffWidth, buffHeight, 8);
        ctx.fill();

        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = '30px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText(buff.icon, bx + buffWidth / 2, startY + 35);

        ctx.font = '10px Georgia';
        ctx.fillText(buff.name, bx + buffWidth / 2, startY + 60);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '9px Georgia';

        // Word wrap description
        const words = (buff.desc || '').split(' ');
        let line = '';
        let lineY = startY + 75;
        words.forEach(word => {
            const test = line + word + ' ';
            if (ctx.measureText(test).width > buffWidth - 10) {
                ctx.fillText(line, bx + buffWidth / 2, lineY);
                line = word + ' ';
                lineY += 10;
            } else {
                line = test;
            }
        });
        ctx.fillText(line, bx + buffWidth / 2, lineY);
    });
}

function renderSpellTutorial() {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const page = gameState.spellTutorialPage;

    if (page === 1) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('🧙 Welcome, Young Wizard!', centerX, centerY - 80);

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Georgia';
        ctx.fillText('Your journey at Hogwarts begins now!', centerX, centerY - 40);
        ctx.fillText('Let me teach you how to cast spells.', centerX, centerY - 20);

        ctx.font = '50px Arial';
        ctx.fillText('⚔️🪄✨', centerX, centerY + 40);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '11px Georgia';
        ctx.fillText('You\'ll fight creatures automatically,', centerX, centerY + 80);
        ctx.fillText('but spells give you special powers!', centerX, centerY + 95);
    } else if (page === 2) {
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ Attack Spells', centerX, centerY - 80);

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Georgia';
        ctx.fillText('💥 Deal Extra Damage', centerX, centerY - 45);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '12px Georgia';
        ctx.fillText('Tap a spell button to cast it!', centerX, centerY - 20);
        ctx.fillText('Attack spells deal damage and apply', centerX, centerY);
        ctx.fillText('effects like stun, burn, or poison.', centerX, centerY + 20);

        ctx.font = '30px Arial';
        ctx.fillText('⚡ → 🐉 → -50 💥', centerX, centerY + 60);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '10px Georgia';
        ctx.fillText('Each spell has a cooldown - wait before casting again!', centerX, centerY + 95);
    } else {
        ctx.fillStyle = COLORS.gold;
        ctx.font = 'bold 20px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText('💚 Healing & Buffs', centerX, centerY - 80);

        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Georgia';
        ctx.fillText('🛡️ Protect Yourself', centerX, centerY - 45);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '12px Georgia';
        ctx.fillText('Some spells heal you or give you buffs!', centerX, centerY - 20);
        ctx.fillText('Use them when your health is low', centerX, centerY);
        ctx.fillText('or to boost your power.', centerX, centerY + 20);

        ctx.font = '30px Arial';
        ctx.fillText('💚 → 🧙 → +30% ❤️', centerX, centerY + 60);

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '10px Georgia';
        ctx.fillText('You\'ll unlock more spells as you progress!', centerX, centerY + 95);
    }

    // Button
    const btnText = page < 3 ? 'Next →' : 'Start Playing! ⚔️';
    renderButton(centerX - 80, centerY + 110, 160, 44, btnText, '#c9a857', '#a08040');

    // Dots
    for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i + 1 === page ? COLORS.gold : COLORS.textMuted;
        ctx.beginPath();
        ctx.arc(centerX - 20 + i * 20, centerY + 170, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderShieldTutorial() {
    ctx.fillStyle = COLORS.popupBg;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ Shield Magic Tutorial', centerX, centerY - 100);

    ctx.fillStyle = COLORS.text;
    ctx.font = '13px Georgia';
    ctx.fillText('The boss is casting spells at you!', centerX, centerY - 60);
    ctx.fillText('Watch the color of the incoming spell', centerX, centerY - 40);
    ctx.fillText('and tap the matching shield button!', centerX, centerY - 20);

    // Demo buttons
    const btnSize = 40;
    const btns = [
        { icon: '🔥', color: '#8a3030' },
        { icon: '💧', color: '#303080' },
        { icon: '⚡', color: '#807830' },
        { icon: '🌿', color: '#308030' }
    ];
    const totalWidth = 4 * btnSize + 3 * 10;
    const startX = centerX - totalWidth / 2;

    btns.forEach((btn, i) => {
        const bx = startX + i * (btnSize + 10);
        ctx.fillStyle = btn.color;
        ctx.beginPath();
        ctx.roundRect(bx, centerY + 10, btnSize, btnSize, 8);
        ctx.fill();

        ctx.font = '20px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.fillText(btn.icon, bx + btnSize / 2, centerY + 35);
    });

    ctx.fillStyle = COLORS.gold;
    ctx.font = '12px Georgia';
    ctx.fillText('⬇️ Tap the matching color! ⬇️', centerX, centerY + 70);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '11px Georgia';
    ctx.fillText('The correct button will glow during tutorial.', centerX, centerY + 90);

    renderButton(centerX - 90, centerY + 110, 180, 44, "Got it! Let's go!", '#4a9060', '#3a7050');
}

function renderShieldMinigame() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(15, 15, 25, 0.8)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;

    // Title
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️ Block the incoming spell!', centerX, 80);

    // Render flying spells
    const spells = gameState.shieldSpells || [];
    spells.forEach(spell => {
        if (spell.flying) {
            ctx.font = '30px Arial';
            ctx.fillStyle = spell.color === 'red' ? '#ff4444' :
                           spell.color === 'blue' ? '#4488ff' :
                           spell.color === 'yellow' ? '#ffdd44' : '#44dd44';
            ctx.fillText('✨', spell.x, spell.y);
        }
    });

    // Shield buttons
    const btnSize = 60;
    const btnPadding = 15;
    const colors = [
        { name: 'red', bg: '#8a3030', icon: '🔥' },
        { name: 'blue', bg: '#303080', icon: '💧' },
        { name: 'yellow', bg: '#807830', icon: '⚡' },
        { name: 'green', bg: '#308030', icon: '🌿' }
    ];
    const totalWidth = 4 * btnSize + 3 * btnPadding;
    const startX = centerX - totalWidth / 2;
    const btnY = canvasHeight - 120;

    colors.forEach((c, i) => {
        const bx = startX + i * (btnSize + btnPadding);
        const isHighlighted = gameState.shieldHighlightColor === c.name;

        ctx.fillStyle = c.bg;
        ctx.beginPath();
        ctx.roundRect(bx, btnY, btnSize, btnSize, 12);
        ctx.fill();

        if (isHighlighted) {
            ctx.strokeStyle = COLORS.gold;
            ctx.lineWidth = 3;
            ctx.stroke();

            // Glow effect
            ctx.shadowColor = COLORS.gold;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        ctx.font = '28px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.fillText(c.icon, bx + btnSize / 2, btnY + btnSize / 2 + 8);
    });

    // Timer bar
    const timerWidth = totalWidth;
    const timerHeight = 8;
    const timerX = startX;
    const timerY = btnY - 30;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(timerX, timerY, timerWidth, timerHeight, 4);
    ctx.fill();

    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.roundRect(timerX, timerY, timerWidth * (gameState.shieldTimer / 100), timerHeight, 4);
    ctx.fill();

    // Result text
    if (gameState.shieldResult) {
        ctx.fillStyle = gameState.shieldResult.includes('Blocked') ? '#4ecdc4' : '#ff6b6b';
        ctx.font = 'bold 16px Georgia';
        ctx.fillText(gameState.shieldResult, centerX, btnY - 50);
    }
}

function renderRoomTransition() {
    ctx.fillStyle = 'rgba(20, 20, 28, 0.95)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 24px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Victory! ✨', centerX, centerY - 50);

    ctx.fillStyle = COLORS.text;
    ctx.font = '16px Georgia';
    ctx.fillText(`+${gameState.roomTransitionData.loot} Galleons`, centerX, centerY - 15);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText(`Room ${gameState.roomTransitionData.nextRoom} awaits...`, centerX, centerY + 15);

    renderButton(centerX - 75, centerY + 40, 150, 44, 'Continue', '#6a9a70', '#5a8a60');
}

function renderButton(x, y, width, height, text, colorTop, colorBottom) {
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, colorTop);
    gradient.addColorStop(1, colorBottom);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2);
}

// ============== TAB CONTENT RENDERS ==============

function renderSpellbookTab() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + 20;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('📜 Spellbook', canvasWidth / 2, startY);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText('Your learned spells', canvasWidth / 2, startY + 25);

    const spells = gameState.spellbook || [];
    const startX = 20;
    const spellY = startY + 50;

    spells.forEach((spell, i) => {
        const sy = spellY + i * 60;

        ctx.fillStyle = 'rgba(40, 38, 50, 0.8)';
        ctx.beginPath();
        ctx.roundRect(startX, sy, canvasWidth - 40, 50, 8);
        ctx.fill();

        ctx.font = '24px Arial';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'left';
        ctx.fillText(spell.icon, startX + 15, sy + 30);

        ctx.font = 'bold 13px Georgia';
        ctx.fillText(spell.name, startX + 50, sy + 20);

        ctx.font = '10px Georgia';
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText(spell.desc || '', startX + 50, sy + 38);
    });
}

function renderSkillsTab() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + 20;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('📚 Studies', canvasWidth / 2, startY);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText(`Study Points: ${gameState.skillPoints}`, canvasWidth / 2, startY + 25);

    ctx.fillStyle = COLORS.text;
    ctx.font = '11px Georgia';
    ctx.fillText('Skill tree content here...', canvasWidth / 2, startY + 60);
}

function renderShopTab() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + 20;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('🏪 Diagon Alley', canvasWidth / 2, startY);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText('Shop items here...', canvasWidth / 2, startY + 40);
}

function renderBestiaryTab() {
    const startY = HEADER_HEIGHT + TABS_HEIGHT + 20;

    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('📖 Creatures', canvasWidth / 2, startY);

    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px Georgia';
    ctx.fillText('Discovered creatures here...', canvasWidth / 2, startY + 40);
}

// ============== UTILITIES ==============

function formatNum(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// ============== EXPORTS ==============

export function getCanvas() { return canvas; }
export function getContext() { return ctx; }
export function getGameState() { return gameState; }
