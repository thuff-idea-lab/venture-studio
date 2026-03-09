# SmoothScreen Recorder

> Effortless Screen Recordings with Natural Enhancements

A Chrome extension that automatically enhances screen recordings with natural zooms and smooth cursor animations, reducing post-editing time for product managers creating demo videos.

## Features (V1)

- **Screen recording** with `chrome.desktopCapture` API
- **Smooth cursor animations** — exponential moving average smoothing (adjustable 1–10)
- **Auto-zoom** — natural zoom into focused areas when cursor is still
- **Cursor highlight** — configurable highlight circle with customizable color/size
- **Settings page** — adjust zoom level, cursor smoothness, highlight options
- **7-day free trial** with one-time purchase ($29.99) or subscription ($4.99/mo)

## Tech Stack

- Plain HTML/CSS/JavaScript (no build step)
- Chrome Extension Manifest V3
- `chrome.desktopCapture` + `MediaRecorder` API
- `OffscreenCanvas` for real-time cursor overlay compositing
- `chrome.storage.local` for settings persistence
- Stripe for payment processing

## Project Structure

```
src/
  manifest.json          — Extension manifest (MV3)
  popup/                 — Main popup UI (start/stop recording)
    popup.html
    popup.css
    popup.js
  background/            — Service worker (recording state management)
    background.js
  offscreen/             — Offscreen document (screen capture + canvas compositing)
    offscreen.html
    offscreen.js
  content/               — Content script (cursor position tracking)
    content.js
    content.css
  options/               — Settings page (zoom, smoothness, highlight, account)
    options.html
    options.css
    options.js
  help/                  — Help & FAQ page
    help.html
    help.css
    help.js
  lib/                   — Shared utilities
    storage.js           — chrome.storage wrapper with defaults
    cursor-smoother.js   — EMA cursor smoothing + interpolation
    zoom-handler.js      — Dynamic zoom viewport computation
  assets/                — Icons (16, 48, 128px)
    icon16.png
    icon48.png
    icon128.png
```

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `src/` directory from this project
5. The SmoothScreen Recorder icon will appear in your toolbar

## Usage

1. Click the extension icon to open the popup
2. (Optional) Click the gear icon to adjust settings
3. Click **Start Recording** and select the screen/window/tab to capture
4. Record your demo — cursor smoothing and zoom are applied in real-time
5. Click **Stop Recording** — the recording downloads as a `.webm` file

## Payment Integration

- Stripe checkout link placeholder in settings and popup upgrade flow
- Replace `https://buy.stripe.com/smoothscreen-recorder` with your actual Stripe payment link
- Set `isPaid: true` in `chrome.storage.local` after successful payment verification

## License

Proprietary — all rights reserved.
