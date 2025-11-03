// injector.js - content script
// Depends on helpers.js (both can be injected together)

let mutationObserver = null;
let lastApplied = null;

/**
 * Ensure MutationObserver is watching dynamic content and reapplying
 * theme-sensitive attributes (we rely mostly on CSS variables and :root attribute,
 * but this observer can re-add overlay and reapply image fixes if nodes are added).
 */
function startMutationObserver(opts = {}) {
    if (mutationObserver) return;
    mutationObserver = new MutationObserver((mutations) => {
        // Debounce minimal work: if overlay missing, re-create; if new media added and invertMedia true -> add class
        let needsOverlay = false;
        for (const m of mutations) {
            if (m.addedNodes && m.addedNodes.length) {
                needsOverlay = true;
                break;
            }
        }
        if (needsOverlay && lastApplied) {
            createOrUpdateOverlay(lastApplied.accent, lastApplied.overlayAlpha);
            if (lastApplied.invertMedia) {
                document.documentElement.classList.add('dmw-fix-media');
            }
        }
    });
    mutationObserver.observe(document.documentElement || document, { childList: true, subtree: true });
}

function stopMutationObserver() {
    if (mutationObserver) {
        mutationObserver.disconnect();
        mutationObserver = null;
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        try {
            if (message.action === 'applyColorScheme') {
                const data = message.data || {};
                // If text not provided, choose readable color automatically
                if (!data.text) {
                    const { color, ratio } = pickReadableTextColor(data.bg || '#0f1113');
                    data.text = color;
                    data._contrast = ratio;
                }
                // Save last applied for observer
                lastApplied = Object.assign({}, data);

                // Inject stylesheet, set CSS variables and overlay
                injectDarkStyle();
                applyColorVariables(data);

                // Overlay: create or update
                createOrUpdateOverlay(data.accent || '#000000', data.overlayAlpha ?? 0.12);

                // If invertMedia flag is set, add class to invert images/videos
                if (data.invertMedia) {
                    document.documentElement.classList.add('dmw-fix-media');
                } else {
                    document.documentElement.classList.remove('dmw-fix-media');
                }

                // Start observer to keep overlay & media rules alive for SPA dynamic content
                startMutationObserver();

                sendResponse({ status: 'applied', contrast: data._contrast });
            }

            if (message.action === 'disableColorScheme') {
                lastApplied = null;
                disableColorVariables();
                stopMutationObserver();
                sendResponse({ status: 'removed' });
            }
        } catch (err) {
            console.error('injector error', err);
            sendResponse({ status: 'error', message: err.message });
        }
    })();
    return true; // indicate async response
});
