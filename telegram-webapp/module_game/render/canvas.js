/**
 * Canvas initialization, images, and input handling
 */

import { LAYOUT } from './constants.js';

// Canvas state
let canvas = null;
let ctx = null;
let canvasWidth = 360;
let canvasHeight = 700;

// Images
let heroImage = null;
let creatureSpriteSheet = null;
let backgroundImage = null;
let heroImageLoaded = false;
let spriteSheetLoaded = false;
let backgroundImageLoaded = false;

// Background constants (image contains 3 vertical segments)
const BG_SEGMENT_COUNT = 3;
let bgSegmentHeight = 0; // Will be calculated after image loads

// Background scrolling state
let bgScrollOffset = 0;         // Current scroll position in pixels
let bgScrollTarget = 0;         // Target scroll position
const BG_SCROLL_SPEED = 5;      // Pixels per frame for smooth scrolling
const BG_SCROLL_DISTANCE = 300; // Pixels to scroll per creature kill

// Click callback
let onClickCallback = null;

export function initRenderer(containerElement, onClick) {
    onClickCallback = onClick;

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

    containerElement.innerHTML = '';
    containerElement.appendChild(canvas);

    loadImages();
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleTouch, { passive: false });

    return { canvas, ctx };
}

function loadImages() {
    heroImage = new Image();
    heroImage.onload = () => { heroImageLoaded = true; };
    heroImage.src = '../hero.png';

    creatureSpriteSheet = new Image();
    creatureSpriteSheet.onload = () => { spriteSheetLoaded = true; };
    creatureSpriteSheet.src = '../creatures.png?v=5';

    backgroundImage = new Image();
    backgroundImage.onload = () => {
        backgroundImageLoaded = true;
        bgSegmentHeight = backgroundImage.height / BG_SEGMENT_COUNT;
    };
    backgroundImage.src = '../bg_1.jpg';
}

function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
}

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
    const scaleX = canvasWidth / canvas.clientWidth;
    const scaleY = canvasHeight / canvas.clientHeight;
    x *= scaleX;
    y *= scaleY;

    if (onClickCallback) {
        onClickCallback(x, y, canvasWidth, canvasHeight, LAYOUT);
    }
}

// Trigger background scroll (call when creature is killed)
export function scrollBackground() {
    bgScrollTarget += BG_SCROLL_DISTANCE;
}

// Update scroll animation (call each frame)
function updateBackgroundScroll() {
    if (bgScrollOffset < bgScrollTarget) {
        bgScrollOffset += BG_SCROLL_SPEED;
        if (bgScrollOffset > bgScrollTarget) {
            bgScrollOffset = bgScrollTarget;
        }
    }
}

// Render background - tiles 3 segments horizontally, covers 50% of screen height
export function renderBackground() {
    if (!backgroundImageLoaded || !ctx) return false;

    // Update smooth scrolling animation
    updateBackgroundScroll();

    const segmentWidth = backgroundImage.width;
    const segmentHeight = bgSegmentHeight;

    // Background covers 50% of screen height (first half)
    const bgHeight = canvasHeight * 0.5;

    // Scale to fit the 50% height
    const scale = bgHeight / segmentHeight;
    const scaledWidth = segmentWidth * scale;

    // Total width of all 3 segments (for looping)
    const totalLoopWidth = scaledWidth * BG_SEGMENT_COUNT;

    // Apply scroll offset with looping
    const scrolledOffset = bgScrollOffset % totalLoopWidth;

    // Calculate starting segment index based on scroll position
    const startSegmentIndex = Math.floor(bgScrollOffset / scaledWidth);

    // Calculate how many segments we need to fill width (+ extra buffer to prevent gaps)
    const segmentsNeeded = Math.ceil(canvasWidth / scaledWidth) + 3;

    // Draw segments horizontally with scroll offset
    for (let i = 0; i < segmentsNeeded; i++) {
        // Calculate which segment in the loop (0, 1, 2, 0, 1, 2...)
        const segmentIndex = (startSegmentIndex + i) % BG_SEGMENT_COUNT;
        const srcY = segmentIndex * segmentHeight;

        // Calculate x position
        const baseX = i * scaledWidth - (scrolledOffset % scaledWidth);

        ctx.drawImage(
            backgroundImage,
            0, srcY, segmentWidth, segmentHeight,  // Source: one segment
            baseX, 0, scaledWidth, bgHeight        // Dest: with scroll offset
        );
    }

    return true;
}

// Getters
export function getCanvas() { return canvas; }
export function getCtx() { return ctx; }
export function getCanvasWidth() { return canvasWidth; }
export function getCanvasHeight() { return canvasHeight; }
export function getHeroImage() { return heroImage; }
export function getCreatureSpriteSheet() { return creatureSpriteSheet; }
export function isHeroImageLoaded() { return heroImageLoaded; }
export function isSpriteSheetLoaded() { return spriteSheetLoaded; }
export function isBackgroundImageLoaded() { return backgroundImageLoaded; }
