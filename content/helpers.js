// helpers.js - utility functions for color math, overlays, and injection

/**
 * Parse a hex color (#RRGGBB or #RGB) into {r,g,b}
 */
function hexToRgbObj(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    let h = hex.replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const intval = parseInt(h, 16);
    return {
        r: (intval >> 16) & 255,
        g: (intval >> 8) & 255,
        b: intval & 255
    };
}

/**
 * Return relative luminance for sRGB color (0..1)
 * Uses standard formula per WCAG.
 */
function relativeLuminance({ r, g, b }) {
    const srgb = [r, g, b].map(v => v / 255).map((c) =>
        c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

/**
 * Contrast ratio between two hex colors per WCAG: (L1 + 0.05) / (L2 + 0.05)
 */
function contrastRatio(hexA, hexB) {
    const A = relativeLuminance(hexToRgbObj(hexA));
    const B = relativeLuminance(hexToRgbObj(hexB));
    const L1 = Math.max(A, B), L2 = Math.min(A, B);
    return (L1 + 0.05) / (L2 + 0.05);
}

/**
 * Pick readable text color (either '#ffffff' or '#000000') for given background.
 * We prefer white for dark backgrounds; but choose the one with higher contrast.
 * Returns object { color: '#ffffff', ratio: 7.5 }.
 */
function pickReadableTextColor(bgHex) {
    const white = '#ffffff';
    const black = '#000000';
    const contrastWhite = contrastRatio(bgHex, white);
    const contrastBlack = contrastRatio(bgHex, black);
    if (contrastWhite >= contrastBlack) {
        return { color: white, ratio: contrastWhite };
    } else {
        return { color: black, ratio: contrastBlack };
    }
}

/**
 * Converts hex (#RRGGBB) and alpha to CSS rgba(...) string.
 */
function hexToRgba(hex, alpha = 1.0) {
    const { r, g, b } = hexToRgbObj(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Injects the CSS file (link) if not already present (by id)
 */
function injectDarkStyle() {
    if (!document.getElementById('dmw-style')) {
        const link = document.createElement('link');
        link.id = 'dmw-style';
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('content/injected_styles.css');
        document.head.appendChild(link);
    }
}

/**
 * Removes the injected CSS (if present)
 */
function removeDarkStyle() {
    const el = document.getElementById('dmw-style');
    if (el) el.remove();
}

/**
 * Creates overlay element or updates its background color.
 * overlayColorHex: '#RRGGBB'; alpha: 0..1
 */
function createOrUpdateOverlay(overlayColorHex, alpha) {
    let ov = document.getElementById('dmw-overlay');
    const bg = hexToRgba(overlayColorHex, alpha);
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'dmw-overlay';
        document.documentElement.appendChild(ov);
    }
    ov.style.backgroundColor = bg;
}

/**
 * Removes overlay element if exists
 */
function removeOverlay() {
    const ov = document.getElementById('dmw-overlay');
    if (ov) ov.remove();
}

/**
 * Set the CSS variables on documentElement and mark active attribute.
 * theme = { bg, text, accent, overlayAlpha }
 */
function applyColorVariables(theme) {
    const root = document.documentElement;
    if (!theme) return;
    root.setAttribute('data-dmw-active', 'true');
    root.style.setProperty('--dm-bg', theme.bg);
    root.style.setProperty('--dm-text', theme.text);
    root.style.setProperty('--dm-accent', theme.accent);
    root.style.setProperty('--dm-overlay-alpha', String(theme.overlayAlpha ?? 0.12));
}

/**
 * Disable theme: remove attribute and variables
 */
function disableColorVariables() {
    const root = document.documentElement;
    root.removeAttribute('data-dmw-active');
    root.style.removeProperty('--dm-bg');
    root.style.removeProperty('--dm-text');
    root.style.removeProperty('--dm-accent');
    root.style.removeProperty('--dm-overlay-alpha');
    // also remove overlay & stylesheet
    removeOverlay();
    removeDarkStyle();
}
