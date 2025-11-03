// background.js (MV3 service worker)
// Keeps initial defaults, and can be used later for alarms / sync tasks.

const DEFAULTS = {
    globalPreset: {
        bg: "#0f1113",
        text: "#e6e6e6",
        accent: "#ff6b6b",
        overlayAlpha: 0.12,
        mode: "stylesheet" // stylesheet | tint | invert
    },
    presets: {
        "Dark Neutral": {
            bg: "#0f1113",
            text: "#e6e6e6",
            accent: "#82aaff",
            overlayAlpha: 0.12,
            mode: "stylesheet"
        },
        "Warm Tint": {
            bg: "#0b0a0a",
            text: "#f3efe6",
            accent: "#f08c00",
            overlayAlpha: 0.12,
            mode: "tint"
        }
    },
    perSite: {},
    blockedSites: [],
    options: {
        contrastThreshold: 4.5,
        preserveImages: "auto" // auto|always|never
    }
};

chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install" || details.reason === "update") {
        // Only set defaults if nothing present
        const current = await chrome.storage.sync.get(null);
        if (!current || Object.keys(current).length === 0) {
            await chrome.storage.sync.set(DEFAULTS);
            console.log("Dark Mode Wheel: default settings initialized.");
        }
    }
});

// Optional: message handler if other parts want to ask the service worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.action === "getDefaults") {
        sendResponse({ defaults: DEFAULTS });
    }
    // Keep sendResponse synchronous here (no return true).
});
