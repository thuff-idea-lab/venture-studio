/**
 * Options page script — handles settings persistence via chrome.storage.
 */

const DEFAULTS = {
  zoomLevel: 150,
  cursorSmoothness: 5,
  showCursorHighlight: true,
  highlightColor: '#007BFF',
  highlightSize: 24,
};

// ── DOM References ──
const form = document.getElementById('settings-form');
const zoomLevel = document.getElementById('zoom-level');
const zoomLevelValue = document.getElementById('zoom-level-value');
const cursorSmoothness = document.getElementById('cursor-smoothness');
const cursorSmoothnessValue = document.getElementById('cursor-smoothness-value');
const showHighlight = document.getElementById('show-highlight');
const highlightOptions = document.getElementById('highlight-options');
const highlightColor = document.getElementById('highlight-color');
const highlightColorHex = document.getElementById('highlight-color-hex');
const highlightSize = document.getElementById('highlight-size');
const highlightSizeValue = document.getElementById('highlight-size-value');
const btnReset = document.getElementById('btn-reset');
const saveStatus = document.getElementById('save-status');
const accountStatus = document.getElementById('account-status');
const upgradeSection = document.getElementById('upgrade-section');

// ── Load Settings ──
async function loadSettings() {
  const settings = await chrome.storage.local.get(DEFAULTS);

  zoomLevel.value = settings.zoomLevel;
  zoomLevelValue.textContent = settings.zoomLevel + '%';

  cursorSmoothness.value = settings.cursorSmoothness;
  cursorSmoothnessValue.textContent = settings.cursorSmoothness;

  showHighlight.checked = settings.showCursorHighlight;
  highlightOptions.style.display = settings.showCursorHighlight ? '' : 'none';

  highlightColor.value = settings.highlightColor;
  highlightColorHex.textContent = settings.highlightColor;

  highlightSize.value = settings.highlightSize;
  highlightSizeValue.textContent = settings.highlightSize + 'px';

  await loadAccountStatus();
}

async function loadAccountStatus() {
  const { trialStartDate, trialDays = 7, isPaid = false } = await chrome.storage.local.get({
    trialStartDate: null,
    trialDays: 7,
    isPaid: false,
  });

  if (isPaid) {
    accountStatus.textContent = 'Full version — thank you for your purchase!';
    accountStatus.style.color = '#155724';
    upgradeSection.classList.add('hidden');
    return;
  }

  if (!trialStartDate) {
    accountStatus.textContent = 'Free trial — 7 days remaining';
    upgradeSection.classList.remove('hidden');
    return;
  }

  const start = new Date(trialStartDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil(trialDays - (now - start) / (1000 * 60 * 60 * 24)));

  if (daysLeft > 0) {
    accountStatus.textContent = `Free trial — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`;
  } else {
    accountStatus.textContent = 'Trial expired';
    accountStatus.style.color = '#DC3545';
  }
  upgradeSection.classList.remove('hidden');
}

// ── Live Range Updates ──
zoomLevel.addEventListener('input', () => {
  zoomLevelValue.textContent = zoomLevel.value + '%';
});

cursorSmoothness.addEventListener('input', () => {
  cursorSmoothnessValue.textContent = cursorSmoothness.value;
});

highlightSize.addEventListener('input', () => {
  highlightSizeValue.textContent = highlightSize.value + 'px';
});

highlightColor.addEventListener('input', () => {
  highlightColorHex.textContent = highlightColor.value;
});

showHighlight.addEventListener('change', () => {
  highlightOptions.style.display = showHighlight.checked ? '' : 'none';
});

// ── Save ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  await chrome.storage.local.set({
    zoomLevel: parseInt(zoomLevel.value, 10),
    cursorSmoothness: parseInt(cursorSmoothness.value, 10),
    showCursorHighlight: showHighlight.checked,
    highlightColor: highlightColor.value,
    highlightSize: parseInt(highlightSize.value, 10),
  });

  saveStatus.classList.remove('hidden');
  setTimeout(() => saveStatus.classList.add('hidden'), 2000);
});

// ── Reset ──
btnReset.addEventListener('click', async () => {
  await chrome.storage.local.set(DEFAULTS);
  await loadSettings();
  saveStatus.textContent = 'Settings reset to defaults!';
  saveStatus.classList.remove('hidden');
  setTimeout(() => {
    saveStatus.textContent = 'Settings saved!';
    saveStatus.classList.add('hidden');
  }, 2000);
});

// ── Init ──
loadSettings();
