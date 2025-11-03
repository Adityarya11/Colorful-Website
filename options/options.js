// options.js
// Manage presets, per-site settings, import/export, and defaults

const defaultState = {
    globalPreset: {
        bg: "#0f1113",
        text: "#e6e6e6",
        accent: "#82aaff",
        overlayAlpha: 0.12,
        mode: "stylesheet"
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
        preserveImages: "auto"
    }
};

const el = {
    globalBg: document.getElementById('globalBg'),
    globalAccent: document.getElementById('globalAccent'),
    saveGlobalBtn: document.getElementById('saveGlobal'),
    resetDefaultsBtn: document.getElementById('resetDefaults'),

    presetsList: document.getElementById('presetsList'),
    presetName: document.getElementById('presetName'),
    presetBg: document.getElementById('presetBg'),
    presetAccent: document.getElementById('presetAccent'),
    addPresetBtn: document.getElementById('addPreset'),

    perSiteList: document.getElementById('perSiteList'),
    clearAllPerSiteBtn: document.getElementById('clearAllPerSite'),

    exportBtn: document.getElementById('exportBtn'),
    importFile: document.getElementById('importFile'),
    importBtn: document.getElementById('importBtn'),
    importStatus: document.getElementById('importStatus')
};

// Helpers
function showImportStatus(text, duration = 3000) {
    el.importStatus.textContent = text;
    setTimeout(() => { el.importStatus.textContent = ''; }, duration);
}

// Load state from storage
function loadState() {
    chrome.storage.sync.get(null, (items) => {
        const state = Object.assign({}, defaultState, items);
        // merge presets properly
        state.presets = Object.assign({}, defaultState.presets, items.presets || {});
        state.perSite = items.perSite || {};
        populateGlobal(state.globalPreset);
        populatePresets(state.presets);
        populatePerSite(state.perSite);
    });
}

// Populate global preset inputs
function populateGlobal(globalPreset) {
    el.globalBg.value = globalPreset.bg || defaultState.globalPreset.bg;
    el.globalAccent.value = globalPreset.accent || defaultState.globalPreset.accent;
}

// Save global preset to storage
el.saveGlobalBtn.addEventListener('click', () => {
    const globalPreset = {
        bg: el.globalBg.value,
        accent: el.globalAccent.value,
        text: defaultState.globalPreset.text,
        overlayAlpha: defaultState.globalPreset.overlayAlpha,
        mode: defaultState.globalPreset.mode
    };
    chrome.storage.sync.set({ globalPreset }, () => {
        if (chrome.runtime.lastError) {
            alert('Failed to save global preset: ' + chrome.runtime.lastError.message);
        } else {
            alert('Global preset saved.');
        }
    });
});

// Reset to defaults
el.resetDefaultsBtn.addEventListener('click', () => {
    if (!confirm('Reset all extension settings to defaults?')) return;
    chrome.storage.sync.set(defaultState, () => {
        if (chrome.runtime.lastError) {
            alert('Failed to reset: ' + chrome.runtime.lastError.message);
        } else {
            loadState();
            alert('Defaults restored.');
        }
    });
});

// Presets: render list and wire remove/apply
function populatePresets(presets) {
    el.presetsList.innerHTML = '';
    for (const [name, p] of Object.entries(presets)) {
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = `
      <div class="meta">
        <div class="swatch" style="width:32px;height:24px;background:${p.bg};border-radius:4px;border:1px solid rgba(0,0,0,0.2)"></div>
        <div>
          <div class="title">${name}</div>
          <div class="small muted">${p.bg} • ${p.accent}</div>
        </div>
      </div>
      <div class="actions">
        <button class="apply" data-name="${name}">Apply</button>
        <button class="delete" data-name="${name}">Delete</button>
      </div>
    `;
        el.presetsList.appendChild(item);
    }

    // attach listeners
    el.presetsList.querySelectorAll('button.apply').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
            const name = ev.target.dataset.name;
            // read presets and set globalPreset = presets[name]
            chrome.storage.sync.get(['presets'], (items) => {
                const presetsObj = items.presets || {};
                if (presetsObj[name]) {
                    chrome.storage.sync.set({ globalPreset: presetsObj[name] }, () => {
                        alert('Applied preset as global preset: ' + name);
                        loadState();
                    });
                }
            });
        });
    });

    el.presetsList.querySelectorAll('button.delete').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            const name = ev.target.dataset.name;
            if (!confirm(`Delete preset "${name}"?`)) return;
            chrome.storage.sync.get(['presets'], (items) => {
                const presetsObj = items.presets || {};
                if (presetsObj[name]) {
                    delete presetsObj[name];
                    chrome.storage.sync.set({ presets: presetsObj }, () => {
                        loadState();
                    });
                }
            });
        });
    });
}

// Add new preset
el.addPresetBtn.addEventListener('click', () => {
    const name = (el.presetName.value || '').trim();
    if (!name) { alert('Enter a name'); return; }
    const bg = el.presetBg.value;
    const accent = el.presetAccent.value;
    chrome.storage.sync.get(['presets'], (items) => {
        const presetsObj = items.presets || {};
        presetsObj[name] = { bg, accent, text: defaultState.globalPreset.text, overlayAlpha: defaultState.globalPreset.overlayAlpha, mode: defaultState.globalPreset.mode };
        chrome.storage.sync.set({ presets: presetsObj }, () => {
            el.presetName.value = '';
            loadState();
        });
    });
});

// Per-site list rendering
function populatePerSite(perSite) {
    el.perSiteList.innerHTML = '';
    const keys = Object.keys(perSite || {});
    if (keys.length === 0) {
        el.perSiteList.textContent = 'No per-site settings saved.';
        return;
    }
    keys.forEach(domain => {
        const p = perSite[domain];
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = `
      <div class="meta">
        <div style="width:32px;height:24px;background:${p.bg};border-radius:4px;border:1px solid rgba(0,0,0,0.2)"></div>
        <div>
          <div class="title">${domain}</div>
          <div class="small muted">${p.bg} • ${p.accent}</div>
        </div>
      </div>
      <div class="actions">
        <button class="edit" data-domain="${domain}">Edit</button>
        <button class="delete" data-domain="${domain}">Delete</button>
      </div>
    `;
        el.perSiteList.appendChild(item);
    });

    // attach listeners
    el.perSiteList.querySelectorAll('button.delete').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            const domain = ev.target.dataset.domain;
            if (!confirm(`Delete per-site setting for ${domain}?`)) return;
            chrome.storage.sync.get(['perSite'], (items) => {
                const perSiteObj = items.perSite || {};
                delete perSiteObj[domain];
                chrome.storage.sync.set({ perSite: perSiteObj }, () => {
                    loadState();
                });
            });
        });
    });

    el.perSiteList.querySelectorAll('button.edit').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            const domain = ev.target.dataset.domain;
            // For a minimal UX, open the site in a new tab so user can set via popup; or implement inline edit.
            if (confirm(`To edit ${domain}, open a new tab and use the popup to set per-site setting now?`)) {
                chrome.tabs.create({ url: 'https://' + domain });
            }
        });
    });
}

// Clear all per-site settings
el.clearAllPerSiteBtn.addEventListener('click', () => {
    if (!confirm('Clear all per-site settings?')) return;
    chrome.storage.sync.set({ perSite: {} }, () => {
        loadState();
    });
});

// Export: download a JSON file of current storage
el.exportBtn.addEventListener('click', () => {
    chrome.storage.sync.get(null, (items) => {
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dark-mode-wheel-settings.json';
        a.click();
        URL.revokeObjectURL(url);
    });
});

// Import: validate and write to storage (merges with existing)
el.importBtn.addEventListener('click', () => {
    const file = el.importFile.files[0];
    if (!file) { showImportStatus('Choose a JSON file first'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            // basic validation: should be an object
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                showImportStatus('Invalid format (expected JSON object)');
                return;
            }
            // Merge with existing keys (simple overwrite)
            chrome.storage.sync.set(parsed, () => {
                if (chrome.runtime.lastError) {
                    showImportStatus('Import failed: ' + chrome.runtime.lastError.message);
                } else {
                    showImportStatus('Import successful');
                    loadState();
                }
            });
        } catch (err) {
            showImportStatus('JSON parse error');
        }
    };
    reader.readAsText(file);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadState();
});
