/**
 * Background service worker — manages recording state, screen capture,
 * cursor data collection, and video processing.
 */

let recordingState = {
  isRecording: false,
  startTime: null,
  mediaRecorder: null,
  recordedChunks: [],
  cursorData: [],
  streamId: null,
};

// ── Message Handler ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      handleGetState(sendResponse);
      return true;
    case 'START_RECORDING':
      handleStartRecording(sendResponse);
      return true;
    case 'STOP_RECORDING':
      handleStopRecording(sendResponse);
      return true;
    case 'CURSOR_MOVE':
      handleCursorMove(message.data);
      return false;
    case 'DOWNLOAD_RECORDING':
      handleDownload(message.url, message.filename);
      return false;
    default:
      return false;
  }
});

// ── Get State ──
function handleGetState(sendResponse) {
  const elapsed = recordingState.isRecording
    ? Math.floor((Date.now() - recordingState.startTime) / 1000)
    : 0;
  sendResponse({ isRecording: recordingState.isRecording, elapsed });
}

// ── Start Recording ──
async function handleStartRecording(sendResponse) {
  try {
    // Request desktop capture via desktopCapture API
    chrome.desktopCapture.chooseDesktopMedia(
      ['screen', 'window', 'tab'],
      async (streamId, options) => {
        if (!streamId) {
          sendResponse({ success: false, error: 'Screen share was cancelled.' });
          return;
        }

        try {
          // Create offscreen document to access getUserMedia
          await createOffscreenDocument();

          // Send stream ID to offscreen document to start capture
          const response = await chrome.runtime.sendMessage({
            type: 'OFFSCREEN_START_CAPTURE',
            target: 'offscreen',
            streamId: streamId,
          });

          if (response && response.success) {
            recordingState.isRecording = true;
            recordingState.startTime = Date.now();
            recordingState.recordedChunks = [];
            recordingState.cursorData = [];
            recordingState.streamId = streamId;

            // Notify content scripts to start tracking cursor
            broadcastToContentScripts({ type: 'START_CURSOR_TRACKING' });

            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: response?.error || 'Failed to start capture.' });
          }
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      }
    );
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

// ── Stop Recording ──
async function handleStopRecording(sendResponse) {
  try {
    // Tell offscreen document to stop recording
    const response = await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_STOP_CAPTURE',
      target: 'offscreen',
    });

    recordingState.isRecording = false;

    // Notify content scripts to stop tracking cursor
    broadcastToContentScripts({ type: 'STOP_CURSOR_TRACKING' });

    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

// ── Cursor Data ──
function handleCursorMove(data) {
  if (recordingState.isRecording) {
    recordingState.cursorData.push({
      x: data.x,
      y: data.y,
      timestamp: Date.now() - recordingState.startTime,
    });

    // Forward to offscreen document for live cursor overlay
    chrome.runtime.sendMessage({
      type: 'CURSOR_DATA',
      target: 'offscreen',
      data: { x: data.screenX || data.x, y: data.screenY || data.y },
    }).catch(() => {});
  }
}

// ── Download ──
function handleDownload(url, filename) {
  chrome.downloads.download({
    url: url,
    filename: filename,
    saveAs: true,
  });
}

// ── Offscreen Document ──
async function createOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Recording screen capture stream via MediaRecorder',
  });
}

// ── Broadcast to Content Scripts ──
async function broadcastToContentScripts(message) {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Tab may not have content script, ignore
      });
    }
  }
}

// ── Install Handler ──
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Start the 7-day trial
    const { trialStartDate } = await chrome.storage.local.get({ trialStartDate: null });
    if (!trialStartDate) {
      await chrome.storage.local.set({ trialStartDate: new Date().toISOString() });
    }
  }
});
