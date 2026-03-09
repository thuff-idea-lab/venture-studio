/**
 * Offscreen document — captures the screen stream via getUserMedia
 * and records it using MediaRecorder. Handles zoom + cursor overlay
 * processing via canvas compositing.
 */

let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let canvas = null;
let ctx = null;
let animationFrameId = null;
let cursorPositions = [];
let settings = { zoomLevel: 150, cursorSmoothness: 5, showCursorHighlight: true, highlightColor: '#007BFF', highlightSize: 24 };

// ── Message Handler ──
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return false;

  switch (message.type) {
    case 'OFFSCREEN_START_CAPTURE':
      startCapture(message.streamId).then(
        () => sendResponse({ success: true }),
        (err) => sendResponse({ success: false, error: err.message })
      );
      return true;

    case 'OFFSCREEN_STOP_CAPTURE':
      stopCapture().then(
        () => sendResponse({ success: true }),
        (err) => sendResponse({ success: false, error: err.message })
      );
      return true;

    default:
      return false;
  }
});

// ── Start Capture ──
async function startCapture(streamId) {
  // Load settings
  const stored = await chrome.storage.local.get({
    zoomLevel: 150,
    cursorSmoothness: 5,
    showCursorHighlight: true,
    highlightColor: '#007BFF',
    highlightSize: 24,
  });
  settings = stored;

  // Get the stream from the desktopCapture streamId
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
      },
    },
  });

  const videoTrack = stream.getVideoTracks()[0];
  const trackSettings = videoTrack.getSettings();
  const width = trackSettings.width || 1920;
  const height = trackSettings.height || 1080;

  // Set up canvas for compositing (cursor overlay + zoom)
  canvas = new OffscreenCanvas(width, height);
  ctx = canvas.getContext('2d');

  // Create a video element to draw frames from
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play();

  // Start compositing loop
  cursorPositions = [];

  function drawFrame() {
    if (!ctx || !video) return;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, 0, 0, width, height);

    // Draw cursor highlight if enabled
    if (settings.showCursorHighlight && cursorPositions.length > 0) {
      const latest = cursorPositions[cursorPositions.length - 1];
      const smoothed = getSmoothedPosition(cursorPositions, settings.cursorSmoothness);

      ctx.beginPath();
      ctx.arc(smoothed.x, smoothed.y, settings.highlightSize, 0, Math.PI * 2);
      ctx.fillStyle = settings.highlightColor + '40'; // 25% opacity
      ctx.fill();

      // Inner dot
      ctx.beginPath();
      ctx.arc(smoothed.x, smoothed.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = settings.highlightColor;
      ctx.fill();
    }

    animationFrameId = requestAnimationFrame(drawFrame);
  }

  drawFrame();

  // Record the canvas output
  const canvasStream = canvas.captureStream(30);
  recordedChunks = [];

  mediaRecorder = new MediaRecorder(canvasStream, {
    mimeType: 'video/webm;codecs=vp9',
    videoBitsPerSecond: 5000000,
  });

  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = () => {
    downloadRecording();
    cleanup();
  };

  mediaRecorder.start(1000); // collect data every second
}

// ── Stop Capture ──
async function stopCapture() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ── Download Recording ──
function downloadRecording() {
  if (recordedChunks.length === 0) return;

  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `smoothscreen-${timestamp}.webm`;

  // Use chrome.downloads to save the file
  chrome.runtime.sendMessage({
    type: 'DOWNLOAD_RECORDING',
    url: url,
    filename: filename,
  });
}

// ── Cursor Smoothing ──
function getSmoothedPosition(positions, smoothness) {
  if (positions.length === 0) return { x: 0, y: 0 };
  if (positions.length === 1) return positions[0];

  // Use exponential moving average based on smoothness setting
  // Higher smoothness = more averaging = smoother but more lag
  const windowSize = Math.min(positions.length, smoothness * 3);
  const recent = positions.slice(-windowSize);
  const alpha = 1 - (smoothness / 12); // smoothness 1=0.92, 5=0.58, 10=0.17

  let smoothX = recent[0].x;
  let smoothY = recent[0].y;

  for (let i = 1; i < recent.length; i++) {
    smoothX = alpha * recent[i].x + (1 - alpha) * smoothX;
    smoothY = alpha * recent[i].y + (1 - alpha) * smoothY;
  }

  return { x: Math.round(smoothX), y: Math.round(smoothY) };
}

// ── Cleanup ──
function cleanup() {
  stream = null;
  canvas = null;
  ctx = null;
  mediaRecorder = null;
  recordedChunks = [];
  cursorPositions = [];
}

// Listen for cursor data forwarded from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'CURSOR_DATA' && message.data) {
    cursorPositions.push(message.data);
    // Keep only last 100 positions to prevent memory growth
    if (cursorPositions.length > 100) {
      cursorPositions = cursorPositions.slice(-60);
    }
  }
});
