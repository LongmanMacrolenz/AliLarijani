/*!
 * Small SVG chart helpers (no dependencies).
 * Marks: 2px lines, ≥8px markers with a 2px surface ring, hairline solid grid, text in ink tokens.
 */
(function (root) {
  "use strict";

  var C = {
    ink: "#14213D", ink2: "#4A5675", muted: "#7A849B", grid: "#E8E2D0", surface: "#FFFDF8",
    good: "#0ca30c", warning: "#fab219", serious: "#ec835a", critical: "#d03b3b",
    goodSoft: "#7cc576", neutral: "#B8BFCC", gold: "#B58A2F",
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pct(x, d) {
    var v = Math.round(x * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d);
    return (v > 0 ? "+" : "") + v + "%";
  }
  function niceStep(range, target) {
    var raw = range / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  /** Verdict presentation: label + glyph + color (glyph and label always travel with the color). */
  var VERDICT_UI = {
    true: { color: C.good, glyph: "✓" },
    mostly_true: { color: C.goodSoft, glyph: "✓" },
    mixed: { color: C.warning, glyph: "≈" },
    mostly_false: { color: C.serious, glyph: "!" },
    false: { color: C.critical, glyph: "✕" },
    unverifiable: { color: C.neutral, glyph: "?" },
  };
  var OUTCOME_UI = {
    hit: { color: C.good, glyph: "✓", label: "적중" },
    flat: { color: C.warning, glyph: "≈", label: "보합" },
    miss: { color: C.critical, glyph: "✕", label: "빗나감" },
  };

  /** Circular score gauge. */
  function ring(score, accent, size) {
    size = size || 188;
    var r = 78, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    return (
      '<svg class="ring" viewBox="0 0 188 188" width="' + size + '" height="' + size + '" role="img" aria-label="신뢰 점수 ' + score.toFixed(1) + '점">' +
      '<circle cx="94" cy="94" r="' + r + '" fill="none" stroke="#EFE8D4" stroke-width="12"/>' +
      '<circle class="ring-arc" cx="94" cy="94" r="' + r + '" fill="none" stroke="' + accent + '" stroke-width="12" stroke-linecap="round" ' +
      'stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 94 94)" style="--c:' + c.toFixed(1) + '"/>' +
      '<text x="94" y="104" text-anchor="middle" class="ring-num">' + score.toFixed(1) + "</text>" +
      '<text x="94" y="130" text-anchor="middle" class="ring-sub">/ 100</text></svg>'
    );
  }

  /** Stacked verdict distribution with 2px surface gaps. */
  function verdictBar(counts, labels) {
    var order = ["true", "mostly_true", "mixed", "mostly_false", "false", "unverifiable"];
    var total = order.reduce(function (s, k) { return s + (counts[k] || 0); }, 0) || 1;
    var x = 0, W = 100, segs = "";
    order.forEach(function (k) {
      var n = counts[k] || 0;
      if (!n) return;
      var w = (n / total) * W;
      segs += '<rect x="' + x.toFixed(2) + '" y="0" width="' + Math.max(0, w - 0.35).toFixed(2) + '" height="14" rx="3" fill="' + VERDICT_UI[k].color +
        '" data-tip="' + esc(labels[k] + " " + n + "건 (" + Math.round((n / total) * 100) + "%)") + '"/>';
      x += w;
    });
    var legend = order.filter(function (k) { return counts[k]; }).map(function (k) {
      return '<li><span class="dot" style="background:' + VERDICT_UI[k].color + '"></span>' + labels[k] + ' <b>' + counts[k] + "</b></li>";
    }).join("");
    return '<svg class="vbar" viewBox="0 0 100 14" preserveAspectRatio="none" role="img" aria-label="판정 분포">' + segs + "</svg>" +
      '<ul class="legend">' + legend + "</ul>";
  }

  /**
   * Cumulative % change since the statement, with the evaluation point called out.
   * `ev` is engine.evaluateForecast(...) output, `f` the claim.forecast.
   */
  function forecastChart(f, ev) {
    var W = 560, H = 210, L = 60, R = 18, T = 16, B = 34;
    var pts = [{ day: 0, change: 0 }].concat(f.path, [f.now]).sort(function (a, b) { return a.day - b.day; });
    var maxDay = pts[pts.length - 1].day;
    if (f.horizonDays && f.horizonDays > maxDay) maxDay = f.horizonDays;
    var ys = pts.map(function (p) { return p.change; }).concat([0]);
    var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
    var step = niceStep(Math.max(hi - lo, 2), 4);
    // pad half a step beyond the data so the extremes (and their labels) never sit on the frame
    lo = Math.floor((lo - step * 0.4) / step) * step; hi = Math.ceil((hi + step * 0.4) / step) * step;
    if (lo === hi) hi = lo + step;
    function X(d) { return L + (d / maxDay) * (W - L - R); }
    function Y(v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); }

    var grid = "", t;
    for (t = lo; t <= hi + 1e-9; t += step) {
      grid += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '" stroke="' + (Math.abs(t) < 1e-9 ? "#C9C1A8" : C.grid) + '" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (Y(t) + 4).toFixed(1) + '" text-anchor="end" class="ax">' + (t > 0 ? "+" : "") + Math.round(t * 10) / 10 + "%</text>";
    }
    var days = [0, Math.round(maxDay / 2), maxDay];
    var xt = days.map(function (d, i) {
      return '<text x="' + X(d).toFixed(1) + '" y="' + (H - 10) + '" text-anchor="' + (i === 0 ? "start" : i === 2 ? "end" : "middle") + '" class="ax">' + (d === 0 ? "발언 시점" : d + "일 후") + "</text>";
    }).join("");

    // the half-plane where the call is "right" gets a faint wash
    var up = f.direction === "up";
    var zeroY = Y(0);
    var wash = '<rect x="' + L + '" width="' + (W - L - R) + '" y="' + (up ? T : zeroY).toFixed(1) + '" height="' + (up ? zeroY - T : H - B - zeroY).toFixed(1) + '" fill="' + C.good + '" fill-opacity=".07"/>';

    var line = pts.map(function (p, i) { return (i ? "L" : "M") + X(p.day).toFixed(1) + " " + Y(p.change).toFixed(1); }).join("");

    var hz = "";
    if (ev.mode === "horizon") {
      hz = '<line x1="' + X(ev.endDay).toFixed(1) + '" x2="' + X(ev.endDay).toFixed(1) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="' + C.gold + '" stroke-width="1.5"/>' +
        '<text x="' + (X(ev.endDay) - 6).toFixed(1) + '" y="' + (T + 11) + '" text-anchor="end" class="ax gold">제시 기간 ' + ev.endDay + "일</text>";
    } else if (ev.mode === "pending") {
      hz = '<text x="' + (L + 8) + '" y="' + (T + 14) + '" class="ax gold">제시 기간 ' + f.horizonDays + "일 미도래 → 현재 기준(진행 중)</text>";
    } else {
      hz = '<text x="' + (L + 8) + '" y="' + (T + 14) + '" class="ax gold">기간 미제시 → 현재 기준</text>';
    }

    var out = OUTCOME_UI[ev.outcome];
    var dots = pts.slice(1).map(function (p) {
      var tip = p.day + "일 후 " + pct(p.change) + (p.day === ev.endDay ? " · 평가 시점" : "");
      return '<g data-tip="' + esc(tip) + '"><circle cx="' + X(p.day).toFixed(1) + '" cy="' + Y(p.change).toFixed(1) + '" r="14" fill="transparent"/>' +
        '<circle cx="' + X(p.day).toFixed(1) + '" cy="' + Y(p.change).toFixed(1) + '" r="4" fill="' + C.ink + '" stroke="' + C.surface + '" stroke-width="2"/></g>';
    }).join("");
    var ex = X(ev.endDay), ey = Y(ev.endChange);
    var mark = '<g data-tip="' + esc("평가 시점 " + ev.endDay + "일 후 " + pct(ev.endChange) + " · " + out.label) + '">' +
      '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="14" fill="transparent"/>' +
      '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="7" fill="' + out.color + '" stroke="' + C.surface + '" stroke-width="2"/></g>';
    var labelRight = ex > W * 0.7;
    var labY = ey - 12 < T + 12 ? ey + 22 : ey - 12; // above the dot unless it is near the top edge
    var lab = '<text x="' + (labelRight ? ex - 12 : ex + 12).toFixed(1) + '" y="' + labY.toFixed(1) + '" text-anchor="' + (labelRight ? "end" : "start") + '" class="endlab">' + pct(ev.endChange) + "</text>";

    return '<svg class="fchart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(f.asset + " 발언 이후 누적 등락률") + '">' +
      grid + wash + hz + '<path d="' + line + '" fill="none" stroke="' + C.ink + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + mark + lab + xt + "</svg>";
  }

  /** Single shared tooltip driven by [data-tip] (mouse + keyboard-free touch via pointer events). */
  function bindTips(scope) {
    var tip = document.getElementById("fm-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.id = "fm-tip"; tip.className = "tip"; tip.setAttribute("role", "tooltip");
      document.body.appendChild(tip);
    }
    function show(e) {
      var el = e.target.closest && e.target.closest("[data-tip]");
      if (!el) return hide();
      tip.textContent = el.getAttribute("data-tip");
      tip.style.opacity = 1;
      var x = e.clientX + 14, y = e.clientY - 38;
      tip.style.left = Math.min(x, window.innerWidth - tip.offsetWidth - 8) + "px";
      tip.style.top = Math.max(8, y) + "px";
    }
    function hide() { tip.style.opacity = 0; }
    scope.addEventListener("pointermove", show);
    scope.addEventListener("pointerleave", hide);
    scope.addEventListener("pointerdown", show);
  }

  root.FMCharts = { ring: ring, verdictBar: verdictBar, forecastChart: forecastChart, bindTips: bindTips, pct: pct, esc: esc, VERDICT_UI: VERDICT_UI, OUTCOME_UI: OUTCOME_UI, COLORS: C };
})(typeof self !== "undefined" ? self : this);
