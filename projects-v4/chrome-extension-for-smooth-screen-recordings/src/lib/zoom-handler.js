/**
 * Zoom handler — computes dynamic zoom transforms based on cursor focus area.
 * Used by the offscreen compositing pipeline to apply natural zoom effects.
 */

/**
 * Computes a zoom viewport centered on a focus point with smooth transitions.
 * @param {Object} params
 * @param {number} params.focusX - Focus X coordinate
 * @param {number} params.focusY - Focus Y coordinate
 * @param {number} params.canvasWidth - Full canvas width
 * @param {number} params.canvasHeight - Full canvas height
 * @param {number} params.zoomLevel - Zoom percentage (100 = no zoom, 200 = 2x)
 * @param {Object} params.previousViewport - Previous viewport for smooth transition
 * @param {number} params.transitionSpeed - 0–1, how fast to transition (0.05 = slow, 0.3 = fast)
 * @returns {Object} { x, y, width, height } source rectangle to draw from
 */
function computeZoomViewport({
  focusX,
  focusY,
  canvasWidth,
  canvasHeight,
  zoomLevel,
  previousViewport = null,
  transitionSpeed = 0.08,
}) {
  const scale = 100 / zoomLevel;
  const viewW = canvasWidth * scale;
  const viewH = canvasHeight * scale;

  // Center viewport on focus point, clamped to canvas bounds
  let targetX = focusX - viewW / 2;
  let targetY = focusY - viewH / 2;
  targetX = Math.max(0, Math.min(targetX, canvasWidth - viewW));
  targetY = Math.max(0, Math.min(targetY, canvasHeight - viewH));

  const target = { x: targetX, y: targetY, width: viewW, height: viewH };

  // Smooth transition from previous viewport
  if (previousViewport) {
    return {
      x: lerp(previousViewport.x, target.x, transitionSpeed),
      y: lerp(previousViewport.y, target.y, transitionSpeed),
      width: lerp(previousViewport.width, target.width, transitionSpeed),
      height: lerp(previousViewport.height, target.height, transitionSpeed),
    };
  }

  return target;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Determines if zoom should be active based on cursor activity.
 * Zoom activates when the cursor has been relatively still in one area.
 * @param {Array} cursorHistory - Recent cursor positions with timestamps
 * @param {number} stillThreshold - Max movement pixels to consider "still"
 * @param {number} stillDuration - Ms of stillness before zoom activates
 * @returns {boolean}
 */
function shouldZoom(cursorHistory, stillThreshold = 50, stillDuration = 800) {
  if (cursorHistory.length < 2) return false;

  const now = cursorHistory[cursorHistory.length - 1].timestamp;
  const recentStart = now - stillDuration;
  const recent = cursorHistory.filter((p) => p.timestamp >= recentStart);

  if (recent.length < 2) return false;

  const first = recent[0];
  const maxDrift = recent.reduce((max, p) => {
    const dist = Math.sqrt((p.x - first.x) ** 2 + (p.y - first.y) ** 2);
    return Math.max(max, dist);
  }, 0);

  return maxDrift <= stillThreshold;
}

export { computeZoomViewport, shouldZoom, lerp };
