/**
 * vx-file-metrics.js — VOLYNX File Metrics Utility
 *
 * Single source of truth for:
 *   - File size formatting
 *   - Size delta calculations (percentage change)
 *   - Result metadata labels
 *   - Compression effectiveness checks
 *
 * Used by: Image Suite (free + studio), Image Scaler, Converter
 */
window.VxFileMetrics = (function () {
  "use strict";

  /**
   * Format bytes to a human-readable string.
   * @param {number} bytes
   * @returns {string} e.g. "1.2 MB", "340 KB", "512 B"
   */
  function formatBytes(bytes) {
    if (bytes == null || isNaN(bytes) || bytes < 0) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  /**
   * Format dimensions.
   * @param {number} w
   * @param {number} h
   * @returns {string} e.g. "1920 × 1080"
   */
  function formatDimensions(w, h) {
    return w + " \u00d7 " + h;
  }

  /**
   * Calculate size delta between input and output.
   *
   * Returns an object with:
   *   - pct:       signed percentage (positive = smaller)
   *   - absPct:    absolute percentage as string, e.g. "34.2"
   *   - direction: 'smaller' | 'larger' | 'same'
   *   - label:     human-readable, e.g. "34.2% smaller"
   *   - saved:     bytes saved (negative if output is larger)
   *
   * @param {number} inputBytes
   * @param {number} outputBytes
   * @returns {{ pct: number, absPct: string, direction: string, label: string, saved: number }}
   */
  function calcDelta(inputBytes, outputBytes) {
    var zero = { pct: 0, absPct: "0.0", direction: "same", label: "no change", saved: 0 };

    if (!inputBytes || inputBytes <= 0 || !outputBytes || outputBytes < 0) {
      return zero;
    }

    var ratio = outputBytes / inputBytes;
    var pct = (1 - ratio) * 100; // positive = smaller, negative = larger
    var saved = inputBytes - outputBytes;

    if (Math.abs(pct) < 0.1) {
      return zero;
    }

    var absPct = Math.abs(pct).toFixed(1);

    if (pct > 0) {
      return { pct: pct, absPct: absPct, direction: "smaller", label: absPct + "% smaller", saved: saved };
    }

    return { pct: pct, absPct: absPct, direction: "larger", label: absPct + "% larger", saved: saved };
  }

  /**
   * Build a complete result metadata string.
   *
   * @param {{ width?: number, height?: number, outputBytes: number, inputBytes?: number }} opts
   * @returns {string} e.g. "1920 × 1080 · 340 KB · 34.2% smaller"
   */
  function formatResultMeta(opts) {
    var parts = [];
    if (opts.width && opts.height) {
      parts.push(formatDimensions(opts.width, opts.height));
    }
    parts.push(formatBytes(opts.outputBytes));
    if (opts.inputBytes && opts.inputBytes > 0) {
      var delta = calcDelta(opts.inputBytes, opts.outputBytes);
      parts.push(delta.label);
    }
    return parts.join(" \u00b7 ");
  }

  /**
   * Check if compression was effective (output < input).
   * @param {number} inputBytes
   * @param {number} outputBytes
   * @returns {boolean}
   */
  function isCompressionEffective(inputBytes, outputBytes) {
    return outputBytes < inputBytes;
  }

  // ── Self-test (runs once on load in dev, silent in prod) ──
  (function selfTest() {
    var pass = 0;
    var fail = 0;

    function assert(name, actual, expected) {
      if (actual === expected) { pass++; }
      else { fail++; console.warn("[VxFileMetrics FAIL] " + name + ": got " + JSON.stringify(actual) + ", expected " + JSON.stringify(expected)); }
    }

    // formatBytes
    assert("formatBytes(0)", formatBytes(0), "0 B");
    assert("formatBytes(512)", formatBytes(512), "512 B");
    assert("formatBytes(1024)", formatBytes(1024), "1.0 KB");
    assert("formatBytes(1536)", formatBytes(1536), "1.5 KB");
    assert("formatBytes(1048576)", formatBytes(1048576), "1.00 MB");

    // calcDelta: smaller output
    var d1 = calcDelta(1000, 500);
    assert("smaller: direction", d1.direction, "smaller");
    assert("smaller: absPct", d1.absPct, "50.0");
    assert("smaller: label", d1.label, "50.0% smaller");
    assert("smaller: saved", d1.saved, 500);

    // calcDelta: larger output
    var d2 = calcDelta(1000, 6031);
    assert("larger: direction", d2.direction, "larger");
    assert("larger: absPct", d2.absPct, "503.1");
    assert("larger: label", d2.label, "503.1% larger");

    // calcDelta: same size
    var d3 = calcDelta(1000, 1000);
    assert("same: direction", d3.direction, "same");
    assert("same: label", d3.label, "no change");

    // calcDelta: near-zero change
    var d4 = calcDelta(10000, 9999);
    assert("near-zero: direction", d4.direction, "same");

    // calcDelta: edge cases
    assert("zero input: direction", calcDelta(0, 100).direction, "same");
    assert("null input: direction", calcDelta(null, 100).direction, "same");

    // isCompressionEffective
    assert("effective", isCompressionEffective(1000, 500), true);
    assert("not effective", isCompressionEffective(1000, 1500), false);
    assert("equal", isCompressionEffective(1000, 1000), false);

    if (fail === 0) {
      console.log("[VxFileMetrics] " + pass + " tests passed");
    } else {
      console.error("[VxFileMetrics] " + fail + " of " + (pass + fail) + " tests FAILED");
    }
  })();

  return {
    formatBytes: formatBytes,
    formatDimensions: formatDimensions,
    calcDelta: calcDelta,
    formatResultMeta: formatResultMeta,
    isCompressionEffective: isCompressionEffective,
  };
})();
