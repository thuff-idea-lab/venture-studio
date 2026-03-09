/**
 * Content script — tracks cursor movement on the active page
 * and sends position data to the background service worker.
 */

let isTracking = false;
let throttleTimer = null;
const THROTTLE_MS = 16; // ~60fps

function onMouseMove(e) {
  if (!isTracking) return;

  // Throttle to ~60fps
  if (throttleTimer) return;
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
  }, THROTTLE_MS);

  chrome.runtime.sendMessage({
    type: 'CURSOR_MOVE',
    data: {
      x: e.clientX,
      y: e.clientY,
      pageX: e.pageX,
      pageY: e.pageY,
      screenX: e.screenX,
      screenY: e.screenY,
      timestamp: Date.now(),
    },
  }).catch(() => {
    // Extension context may have been invalidated — stop tracking
    stopTracking();
  });
}

function startTracking() {
  if (isTracking) return;
  isTracking = true;
  document.addEventListener('mousemove', onMouseMove, { passive: true });
}

function stopTracking() {
  isTracking = false;
  document.removeEventListener('mousemove', onMouseMove);
  if (throttleTimer) {
    clearTimeout(throttleTimer);
    throttleTimer = null;
  }
}

// Listen for start/stop messages from background
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case 'START_CURSOR_TRACKING':
      startTracking();
      break;
    case 'STOP_CURSOR_TRACKING':
      stopTracking();
      break;
  }
});
