# Colorful Website

**Dark Mode Wheel** is a browser extension that enables users to apply a custom dark or tinted theme to any website. It overrides native color modes to provide a consistent browsing experience based on user-defined color preferences.

---

## Features

- **Custom Color Themes:** Apply a custom background and accent color to any webpage.
- **Adjustable Tint Strength:** Control the intensity of the color tint using an overlay alpha slider.
- **Theme Presets:** Save, manage, and apply multiple color theme presets.
- **Per-Site Settings:** Save specific theme configurations for individual domains.
- **Intelligent Text Color:** Automatically calculates and applies a readable text color (black or white) based on contrast ratio.
- **Image Inversion:** Optionally invert images and media for better dark mode consistency.
- **Settings Management:** Export and import complete configuration data (presets and per-site settings) as JSON.

---

## How It Works

The extension functions by injecting content scripts and CSS into the active webpage:

1. **User Interaction:** The user selects a background color, accent color, and tint strength via the popup interface.
2. **Script Injection:** The popup script (`popup.js`) injects `content/injector.js`, `content/helpers.js`, and `content/injected_styles.css` into the active tab.
3. **Message Passing:** `popup.js` sends the user's theme configuration to the content script through Chrome’s message API.
4. **Style Application:**

   - `injector.js` receives theme data and requests helper functions from `helpers.js` to compute readable text color.
   - CSS variables (e.g., `--dm-bg`, `--dm-text`, `--dm-accent`) are applied to the root element.
   - The stylesheet `injected_styles.css` enforces these variables with `!important` rules, recoloring the webpage.
   - A tint overlay (`#dmw-overlay`) is added or updated using the accent color and alpha value.

5. **Dynamic Content Handling:** `injector.js` initializes a `MutationObserver` to maintain styling on dynamically loaded content (e.g., single-page apps).
6. **Disabling:** When turned off, injected styles, overlays, and variables are removed to restore the original appearance.

---

## Project Structure

```
dark-mode-wheel-extension/
├─ manifest.json               # Defines the extension, permissions, and entry points
├─ background.js               # Service worker for managing defaults and installation setup
├─ content/
│  ├─ injector.js              # Applies or reverts themes and observes DOM changes
│  ├─ helpers.js               # Color math and DOM utility functions
│  └─ injected_styles.css      # Base stylesheet using CSS custom properties
├─ popup/
│  ├─ popup.html               # Extension popup interface
│  ├─ popup.js                 # Handles UI events and sends messages to content scripts
│  └─ popup.css                # Popup styling
├─ options/
│  ├─ options.html             # Options page interface for presets and settings
│  └─ options.js               # Logic for presets, per-site data, and import/export
├─ icons/
│  ├─ icon16.png
│  ├─ icon48.png
│  └─ icon128.png
└─ README.md
```

---

## Core Components

### `manifest.json`

Defines the extension as a **Manifest V3** project, registers background service workers, declares required permissions (`storage`, `scripting`, `activeTab`), and links to the popup and options pages.

### `background.js`

A lightweight service worker responsible for initialization tasks such as setting up default presets and configuration in `chrome.storage.sync`.

### `content/`

- **`helpers.js`** – Contains reusable functions for color conversion, contrast ratio calculations, and DOM manipulations.
- **`injector.js`** – Main script that applies color themes, manages overlays, and ensures changes persist with DOM updates.
- **`injected_styles.css`** – Stylesheet injected into web pages, utilizing CSS variables for dark mode application.

### `popup/`

- **`popup.html` / `popup.css`** – Defines the popup user interface, including color pickers, sliders, and preset buttons.
- **`popup.js`** – Manages popup state, synchronizes storage data, and communicates with content scripts.

### `options/`

- **`options.html` / `options.css`** – Provides a dedicated interface for managing presets, global settings, and per-site configurations.
- **`options.js`** – Handles data persistence, preset management, and JSON import/export features.

---

## Installation and Usage

### Step 1: Clone the Repository

```bash
git clone https://github.com/<your-username>/dark-mode-wheel.git
cd dark-mode-wheel
```

### Step 2: Review the Code

Ensure all files (manifest, popup, content, options) are in place and configured properly for Manifest V3.

### Step 3: Load the Extension in Your Browser

_To test the extension locally:_

**For Chrome / Edge (Manifest V3):**

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right corner)
3. Click **Load unpacked**
4. Select the folder containing the extension (the folder with `manifest.json`)
5. The **Dark Mode Wheel** icon will appear in the toolbar

## Exporting and Importing Settings

Users can back up their configuration by exporting it to a `.json` file through the Options page. This file can later be imported to restore saved themes, presets, and per-site settings across devices or browser profiles.

---
