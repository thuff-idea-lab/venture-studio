/**
 * Cursor smoother — applies exponential moving average or Bezier interpolation
 * to raw cursor position data for silky-smooth cursor animations.
 */

/**
 * Smooths a stream of cursor positions using exponential moving average.
 * @param {Array<{x: number, y: number}>} positions - Raw cursor positions (newest last)
 * @param {number} smoothness - 1 (minimal smoothing) to 10 (maximum smoothing)
 * @returns {{x: number, y: number}} Smoothed position
 */
function smoothCursorEMA(positions, smoothness = 5) {
  if (positions.length === 0) return { x: 0, y: 0 };
  if (positions.length === 1) return { ...positions[0] };

  // alpha: lower = smoother; smoothness 1 → alpha 0.9, smoothness 10 → alpha 0.15
  const alpha = Math.max(0.1, 1 - (smoothness * 0.085));
  const windowSize = Math.min(positions.length, Math.max(5, smoothness * 4));
  const recent = positions.slice(-windowSize);

  let x = recent[0].x;
  let y = recent[0].y;

  for (let i = 1; i < recent.length; i++) {
    x = alpha * recent[i].x + (1 - alpha) * x;
    y = alpha * recent[i].y + (1 - alpha) * y;
  }

  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Generates interpolated points between two positions using cubic easing.
 * Useful for rendering smooth cursor trails.
 * @param {{x: number, y: number}} from
 * @param {{x: number, y: number}} to
 * @param {number} steps - Number of intermediate points
 * @returns {Array<{x: number, y: number}>}
 */
function interpolatePositions(from, to, steps = 5) {
  const points = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    // Cubic ease-out
    const ease = 1 - Math.pow(1 - t, 3);
    points.push({
      x: Math.round(from.x + (to.x - from.x) * ease),
      y: Math.round(from.y + (to.y - from.y) * ease),
    });
  }
  return points;
}

/**
 * Manages a cursor position buffer with automatic pruning.
 */
class CursorBuffer {
  constructor(maxSize = 120) {
    this.positions = [];
    this.maxSize = maxSize;
  }

  push(pos) {
    this.positions.push(pos);
    if (this.positions.length > this.maxSize) {
      this.positions = this.positions.slice(-Math.floor(this.maxSize * 0.75));
    }
  }

  getSmoothed(smoothness) {
    return smoothCursorEMA(this.positions, smoothness);
  }

  getLatest() {
    return this.positions.length > 0 ? this.positions[this.positions.length - 1] : null;
  }

  clear() {
    this.positions = [];
  }

  get length() {
    return this.positions.length;
  }
}

export { smoothCursorEMA, interpolatePositions, CursorBuffer };
