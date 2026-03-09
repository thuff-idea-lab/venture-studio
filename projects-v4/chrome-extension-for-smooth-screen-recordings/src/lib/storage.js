/**
 * Storage utility — wraps chrome.storage.local for settings and state.
 */

const DEFAULTS = {
  zoomLevel: 150,         // percentage (100–300)
  cursorSmoothness: 5,    // 1–10 scale
  showCursorHighlight: true,
  highlightColor: '#007BFF',
  highlightSize: 24,
  trialStartDate: null,
  trialDays: 7,
  isPaid: false,
};

async function getSettings() {
  const data = await chrome.storage.local.get(DEFAULTS);
  return data;
}

async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

async function getSetting(key) {
  const defaults = { [key]: DEFAULTS[key] };
  const data = await chrome.storage.local.get(defaults);
  return data[key];
}

async function isTrialActive() {
  const { trialStartDate, trialDays, isPaid } = await getSettings();
  if (isPaid) return true;
  if (!trialStartDate) return true; // not started yet — first launch
  const start = new Date(trialStartDate);
  const now = new Date();
  const daysPassed = (now - start) / (1000 * 60 * 60 * 24);
  return daysPassed <= trialDays;
}

async function startTrialIfNeeded() {
  const { trialStartDate } = await chrome.storage.local.get({ trialStartDate: null });
  if (!trialStartDate) {
    await chrome.storage.local.set({ trialStartDate: new Date().toISOString() });
  }
}

export { DEFAULTS, getSettings, saveSettings, getSetting, isTrialActive, startTrialIfNeeded };
