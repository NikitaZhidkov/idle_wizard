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
let heroImageLoaded = false;
let spriteSheetLoaded = false;

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

// Getters
export function getCanvas() { return canvas; }
export function getCtx() { return ctx; }
export function getCanvasWidth() { return canvasWidth; }
export function getCanvasHeight() { return canvasHeight; }
export function getHeroImage() { return heroImage; }
export function getCreatureSpriteSheet() { return creatureSpriteSheet; }
export function isHeroImageLoaded() { return heroImageLoaded; }
export function isSpriteSheetLoaded() { return spriteSheetLoaded; }
