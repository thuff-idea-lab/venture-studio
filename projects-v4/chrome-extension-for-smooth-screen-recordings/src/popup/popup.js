/**
 * Popup main script — handles recording UI and communicates with background.
 */

// ── DOM References ──
const btnRecord = document.getElementById('btn-record');
const btnRecordLabel = document.getElementById('btn-record-label');
const iconRecord = document.getElementById('icon-record');
const iconStop = document.getElementById('icon-stop');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const timerEl = document.getElementById('timer');
const zoomValue = document.getElementById('zoom-value');
const smoothnessValue = document.getElementById('smoothness-value');
const highlightValue = document.getElementById('highlight-value');
const trialBanner = document.getElementById('trial-banner');
const trialText = document.getElementById('trial-text');
const upgradeLink = document.getElementById('upgrade-link');
const errorContainer = document.getElementById('error-container');
const errorText = document.getElementById('error-text');
const errorDismiss = document.getElementById('error-dismiss');
const btnSettings = document.getElementById('btn-settings');
const btnHelp = document.getElementById('btn-help');

let isRecording = false;
let timerInterval = null;
let seconds = 0;

// ── Initialization ──
async function init() {
  await loadSettings();
  await checkTrialStatus();
  await syncRecordingState();
}

async function loadSettings() {
  const settings = await chrome.storage.local.get({
    zoomLevel: 150,
    cursorSmoothness: 5,
    showCursorHighlight: true,
  });
  zoomValue.textContent = settings.zoomLevel + '%';
  smoothnessValue.textContent = settings.cursorSmoothness + '/10';
  highlightValue.textContent = settings.showCursorHighlight ? 'On' : 'Off';
}

async function checkTrialStatus() {
  const { trialStartDate, trialDays = 7, isPaid = false } = await chrome.storage.local.get({
    trialStartDate: null,
    trialDays: 7,
    isPaid: false,
  });

  if (isPaid) {
    trialBanner.classList.add('hidden');
    return;
  }

  // Start trial on first launch
  if (!trialStartDate) {
    await chrome.storage.local.set({ trialStartDate: new Date().toISOString() });
    trialBanner.classList.remove('hidden');
    trialText.textContent = '7 days left in your free trial';
    return;
  }

  const start = new Date(trialStartDate);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil(trialDays - (now - start) / (1000 * 60 * 60 * 24)));

  if (daysLeft > 0) {
    trialBanner.classList.remove('hidden');
    trialText.textContent = `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial`;
  } else {
    trialBanner.classList.remove('hidden');
    trialText.textContent = 'Trial expired';
    btnRecord.disabled = true;
    btnRecord.style.opacity = '0.5';
  }
}

async function syncRecordingState() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
  if (response && response.isRecording) {
    setRecordingUI(true);
    seconds = response.elapsed || 0;
    startTimer();
  }
}

// ── Recording ──
btnRecord.addEventListener('click', async () => {
  if (isRecording) {
    await stopRecording();
  } else {
    await startRecording();
  }
});

async function startRecording() {
  try {
    // Show a transitional state — the picker dialog will open and the popup
    // will close. When the user reopens the popup, init() checks GET_STATE.
    setStatusUI('processing', 'Opening screen picker...');
    btnRecord.disabled = true;

    const response = await chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    if (response && response.success) {
      // The picker is now showing. The popup will close when it appears.
      // If somehow we're still open, show the waiting state.
      setStatusUI('processing', 'Select a screen to record...');
    } else {
      showError(response?.error || 'Unable to start recording. Please check permissions.');
      btnRecord.disabled = false;
    }
  } catch (err) {
    showError('Unable to start recording. Please check permissions.');
    btnRecord.disabled = false;
  }
}

async function stopRecording() {
  try {
    setStatusUI('processing', 'Processing...');
    const response = await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    if (response && response.success) {
      setRecordingUI(false);
      stopTimer();
    } else {
      showError(response?.error || 'Failed to stop recording.');
    }
  } catch (err) {
    showError('Failed to stop recording.');
  }
}

function setRecordingUI(recording) {
  isRecording = recording;
  if (recording) {
    btnRecord.classList.add('recording');
    btnRecordLabel.textContent = 'Stop Recording';
    iconRecord.classList.add('hidden');
    iconStop.classList.remove('hidden');
    timerEl.classList.remove('hidden');
    setStatusUI('recording', 'Recording...');
  } else {
    btnRecord.classList.remove('recording');
    btnRecordLabel.textContent = 'Start Recording';
    iconRecord.classList.remove('hidden');
    iconStop.classList.add('hidden');
    timerEl.classList.add('hidden');
    setStatusUI('idle', 'Ready to record');
  }
}

function setStatusUI(state, text) {
  statusIndicator.className = 'status-indicator ' + state;
  statusText.textContent = text;
}

// ── Timer ──
function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    seconds++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  seconds = 0;
  timerEl.textContent = '00:00';
}

function updateTimerDisplay() {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  timerEl.textContent = `${mins}:${secs}`;
}

// ── Errors ──
function showError(message) {
  errorText.textContent = message;
  errorContainer.classList.remove('hidden');
  setRecordingUI(false);
  stopTimer();
}

errorDismiss.addEventListener('click', () => {
  errorContainer.classList.add('hidden');
});

// ── Navigation ──
btnSettings.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

btnHelp.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('help/help.html') });
});

// Stripe checkout for upgrade
upgradeLink.addEventListener('click', (e) => {
  e.preventDefault();
  // Redirect to Stripe checkout — replace with actual Stripe payment link
  chrome.tabs.create({ url: 'https://buy.stripe.com/smoothscreen-recorder' });
});

// Listen for state changes from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'RECORDING_STOPPED') {
    setRecordingUI(false);
    stopTimer();
  }
  if (message.type === 'RECORDING_ERROR') {
    showError(message.error);
  }
});

init();
