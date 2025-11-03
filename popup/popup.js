// popup.js (updated) - now includes overlay alpha & invert images option

const toggleEl = document.getElementById('toggle');
const colorPicker = document.getElementById('colorPicker');
const accentPicker = document.getElementById('accentPicker');
const overlayRange = document.getElementById('overlayRange');
const overlayValue = document.getElementById('overlayValue');
const invertImagesEl = document.getElementById('invertImages');
const applyBtn = document.getElementById('applyBtn');
const removeBtn = document.getElementById('removeBtn');
const statusEl = document.getElementById('status');
const presets = document.querySelectorAll('.preset');
const openOptions = document.getElementById('openOptions');

let currentDomain = null;

function setStatus(text, timeout = 3000) {
    statusEl.textContent = text;
    if (timeout) setTimeout(() => { if (statusEl.textContent === text) statusEl.textContent = ''; }, timeout);
}

function getActiveTab() {
    return chrome.tabs.query({ active: true, currentWindow: true }).then(t => t[0]);
}
function getDomainFromUrl(url) {
    try { return new URL(url).hostname; } catch (e) { return null; }
}

overlayRange.addEventListener('input', () => {
    overlayValue.textContent = `${overlayRange.value}%`;
});

// convert 0-50 slider to 0..1
function sliderToAlpha(v) { return (Number(v) / 100); }

async function ensureContentInjected(tabId) {
    try {
        await chrome.scripting.insertCSS({ target: { tabId }, files: ['content/injected_styles.css'] });
    } catch (err) { /* ignore */ }
    try {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content/helpers.js', 'content/injector.js'] });
    } catch (e) { console.error('Injection failed', e); throw e; }
}

function sendApplyMessage(tabId, data) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: 'applyColorScheme', data }, (resp) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            resolve(resp);
        });
    });
}
function sendRemoveMessage(tabId) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { action: 'disableColorScheme' }, (resp) => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            resolve(resp);
        });
    });
}

async function applyThemeToTab(tabId, theme) {
    try {
        await sendApplyMessage(tabId, theme);
        return true;
    } catch (e) {
        try {
            await ensureContentInjected(tabId);
            await sendApplyMessage(tabId, theme);
            return true;
        } catch (err) {
            console.error('apply theme error', err);
            return false;
        }
    }
}

async function removeThemeFromTab(tabId) {
    try {
        await sendRemoveMessage(tabId);
        return true;
    } catch (e) {
        try {
            await ensureContentInjected(tabId);
            await sendRemoveMessage(tabId);
            return true;
        } catch (err) {
            console.error('remove theme error', err);
            return false;
        }
    }
}

// initialize popup fields from storage / per-site if present
async function init() {
    const tab = await getActiveTab();
    if (!tab) { setStatus('No active tab'); return; }
    currentDomain = getDomainFromUrl(tab.url);

    // load perSite/global
    chrome.storage.sync.get(['perSite', 'globalPreset'], (items) => {
        const perSite = items.perSite || {};
        const globalPreset = items.globalPreset || { bg: '#0f1113', accent: '#82aaff', overlayAlpha: 0.12 };
        const theme = (currentDomain && perSite[currentDomain]) ? perSite[currentDomain] : globalPreset;
        colorPicker.value = theme.bg || '#0f1113';
        accentPicker.value = theme.accent || '#82aaff';
        overlayRange.value = Math.round((theme.overlayAlpha ?? 0.12) * 100);
        overlayValue.textContent = `${overlayRange.value}%`;
    });

    // detect whether theme seems active by messaging (best-effort)
    try {
        await sendApplyMessage(tab.id, { bg: colorPicker.value, text: '#e6e6e6', accent: accentPicker.value, overlayAlpha: sliderToAlpha(overlayRange.value), invertMedia: invertImagesEl.checked });
        // if it applied, remove immediately (we're only probing)
        await sendRemoveMessage(tab.id);
        toggleEl.checked = false;
    } catch (_) {
        toggleEl.checked = false;
    }
}

// apply button
applyBtn.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) { setStatus('No active tab'); return; }

    const theme = {
        bg: colorPicker.value,
        text: null, // let injector pick readable color
        accent: accentPicker.value,
        overlayAlpha: sliderToAlpha(overlayRange.value),
        invertMedia: invertImagesEl.checked
    };

    const ok = await applyThemeToTab(tab.id, theme);
    if (ok) {
        setStatus('Applied');
        toggleEl.checked = true;
        // Save per-site if desired
        const perSiteChecked = document.getElementById('perSite')?.checked;
        if (perSiteChecked && currentDomain) {
            chrome.storage.sync.get(['perSite'], (items) => {
                const perSite = items.perSite || {};
                perSite[currentDomain] = theme;
                chrome.storage.sync.set({ perSite }, () => { setStatus('Saved for this site'); });
            });
        }
    } else {
        setStatus('Failed to apply');
    }
});

// remove button
removeBtn.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) { setStatus('No active tab'); return; }
    const ok = await removeThemeFromTab(tab.id);
    if (ok) {
        setStatus('Removed');
        toggleEl.checked = false;
    } else setStatus('Failed to remove');
});

// toggle quick enable/disable
toggleEl.addEventListener('change', async (ev) => {
    const tab = await getActiveTab();
    if (!tab) return;
    if (ev.target.checked) {
        const theme = {
            bg: colorPicker.value,
            text: null,
            accent: accentPicker.value,
            overlayAlpha: sliderToAlpha(overlayRange.value),
            invertMedia: invertImagesEl.checked
        };
        const ok = await applyThemeToTab(tab.id, theme);
        setStatus(ok ? 'Enabled' : 'Failed to enable');
    } else {
        const ok = await removeThemeFromTab(tab.id);
        setStatus(ok ? 'Disabled' : 'Failed to disable');
    }
});

// presets
presets.forEach(p => p.addEventListener('click', () => {
    colorPicker.value = p.dataset.bg;
    accentPicker.value = p.dataset.accent;
    setStatus(`Preset ${p.textContent}`);
}));

openOptions.addEventListener('click', (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

init().catch(err => { console.error('popup init error', err); setStatus('Init error'); });
