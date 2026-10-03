/*!
 * FACTMARK scoring engine — reference implementation of docs/METHODOLOGY.md
 *
 * Pure functions, no DOM. Runs in the browser (window.FMEngine) and in Node
 * (module.exports) so the same rules can be unit-tested and later ported to
 * the server that issues real certificates.
 *
 * Input  : an account with extracted, fact-checked claims (see data.js)
 * Output : score (0-100), grade, per-metric breakdown, per-claim evaluation
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.FMEngine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------- Tunables (keep in sync with docs/METHODOLOGY.md) ---------- */
  var WEIGHTS = { fact: 0.45, forecast: 0.3, correction: 0.15, sourcing: 0.1 };
  var TOPIC_WEIGHT = { bill: 1.3, ruling: 1.3, economy: 1.0, politics: 1.0 };
  var FORECAST_SCALE = 5; // % move that counts as a "clear" call (tanh scale)
  var FORECAST_END_SHARE = 0.65; // magnitude of the move at the evaluation point
  var FORECAST_TREND_SHARE = 0.35; // share of checkpoints on the right side
  var PENDING_WEIGHT = 0.5; // horizon not reached yet -> half weight
  var MIN_CLAIMS = 8; // below this we withhold the grade
  var SHRINK_K = 3; // pseudo-observations pulling small samples toward PRIOR
  var PRIOR = 50;
  var CERTIFY_AT = 70; // certificate is issued from this score up

  var VERDICTS = {
    true: { score: 1.0, label: "사실" },
    mostly_true: { score: 0.8, label: "대체로 사실" },
    mixed: { score: 0.5, label: "일부 사실" },
    mostly_false: { score: 0.2, label: "대체로 거짓" },
    false: { score: 0.0, label: "거짓" },
    unverifiable: { score: null, label: "검증 불가" },
  };

  var TOPICS = {
    bill: "법안",
    ruling: "판결",
    economy: "경제",
    politics: "정치",
  };

  var GRADES = [
    { id: "S", min: 90, tier: "gold", name: "최우수 신뢰", blurb: "발언이 공식 기록과 거의 어긋나지 않습니다." },
    { id: "A", min: 80, tier: "silver", name: "높은 신뢰", blurb: "대체로 공식 기록과 일치하며 예측 이력도 양호합니다." },
    { id: "B", min: 70, tier: "bronze", name: "양호", blurb: "신뢰할 만하지만 일부 발언은 확인이 필요합니다." },
    { id: "C", min: 55, tier: "slate", name: "주의", blurb: "공식 기록과 어긋나는 발언이 눈에 띕니다." },
    { id: "D", min: 0, tier: "slate", name: "신뢰 낮음", blurb: "공식 기록과 어긋나거나 빗나간 발언이 많습니다." },
  ];

  /* ---------- helpers ---------- */
  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
  }
  function round1(x) {
    return Math.round(x * 10) / 10;
  }
  function mean(xs) {
    return xs.length ? xs.reduce(function (a, b) { return a + b; }, 0) / xs.length : null;
  }
  function wmean(pairs) {
    // pairs: [[value, weight], ...]
    var sw = 0, s = 0;
    pairs.forEach(function (p) { s += p[0] * p[1]; sw += p[1]; });
    return sw ? s / sw : null;
  }

  /** Cumulative % change at `day`, linearly interpolated (series starts at day 0 = 0%). */
  function valueAt(points, day) {
    var prev = { day: 0, change: 0 };
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (p.day === day) return p.change;
      if (p.day > day) {
        var span = p.day - prev.day;
        return prev.change + ((p.change - prev.change) * (day - prev.day)) / (span || 1);
      }
      prev = p;
    }
    return prev.change;
  }

  /**
   * Evaluate a forecast of the form "<asset> will go up/down".
   *
   * Rule from the product brief:
   *   - speaker named a period (horizonDays)  -> judge at that horizon
   *   - speaker named no period              -> judge as of now (latest point)
   *   - period named but not elapsed yet     -> "pending": judged as of now, half weight
   */
  function evaluateForecast(f) {
    var points = f.path.concat([f.now]).sort(function (a, b) { return a.day - b.day; });
    var latest = points[points.length - 1];
    var sign = f.direction === "up" ? 1 : -1;

    var mode, endDay;
    if (f.horizonDays == null) { mode = "now"; endDay = latest.day; }
    else if (f.horizonDays <= latest.day) { mode = "horizon"; endDay = f.horizonDays; }
    else { mode = "pending"; endDay = latest.day; }

    var endChange = valueAt(points, endDay);
    var signed = sign * endChange;
    var endScore = 0.5 + 0.5 * Math.tanh(signed / FORECAST_SCALE);

    var checks = points.filter(function (p) { return p.day > 0 && p.day <= endDay; });
    if (!checks.length || checks[checks.length - 1].day !== endDay) checks.push({ day: endDay, change: endChange });
    var trendShare = mean(checks.map(function (p) {
      var s = sign * p.change;
      return s > 0 ? 1 : s === 0 ? 0.5 : 0;
    }));

    var score = FORECAST_END_SHARE * endScore + FORECAST_TREND_SHARE * trendShare;
    var outcome = signed >= 1 ? "hit" : signed <= -1 ? "miss" : "flat";
    return {
      mode: mode,
      endDay: endDay,
      endChange: round1(endChange),
      signedChange: round1(signed),
      trendShare: trendShare,
      score: score,
      outcome: outcome,
      weight: mode === "pending" ? PENDING_WEIGHT : 1,
    };
  }

  function gradeFor(score) {
    for (var i = 0; i < GRADES.length; i++) if (score >= GRADES[i].min) return GRADES[i];
    return GRADES[GRADES.length - 1];
  }

  /** Deterministic certificate number (demo). Real issuance must be server-side. */
  function certificateNumber(accountId, score, asOf) {
    var str = accountId + "|" + score + "|" + asOf;
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    var code = h.toString(36).toUpperCase().padStart(7, "0").slice(-7);
    return "FM-" + asOf.slice(0, 4) + "-" + code.slice(0, 4) + "-" + code.slice(4);
  }

  /* ---------- main ---------- */
  function evaluate(account) {
    var claims = account.claims || [];
    var evaluated = claims.map(function (c) {
      var e = { claim: c, topicWeight: TOPIC_WEIGHT[c.topic] || 1 };
      if (c.kind === "forecast") {
        e.forecast = evaluateForecast(c.forecast);
        e.score = e.forecast.score;
        e.weight = e.topicWeight * e.forecast.weight;
        e.wrong = e.score < 0.4;
        e.verifiable = true;
      } else {
        var v = VERDICTS[c.verdict];
        e.verifiable = !!v && v.score !== null;
        e.score = e.verifiable ? v.score : null;
        e.weight = e.topicWeight;
        e.wrong = e.verifiable && v.score <= 0.2;
      }
      e.corrected = !!c.correction;
      return e;
    });

    var facts = evaluated.filter(function (e) { return e.claim.kind !== "forecast" && e.verifiable; });
    var fcs = evaluated.filter(function (e) { return e.claim.kind === "forecast"; });
    var scored = facts.concat(fcs);
    var n = scored.length;

    var comp = {};
    if (facts.length) {
      comp.fact = { score: wmean(facts.map(function (e) { return [e.score, e.weight]; })), n: facts.length };
      comp.sourcing = { score: mean(facts.map(function (e) { return e.claim.cited ? 1 : 0; })), n: facts.length };
    }
    if (fcs.length) {
      comp.forecast = { score: wmean(fcs.map(function (e) { return [e.score, e.weight]; })), n: fcs.length };
    }
    var wrong = scored.filter(function (e) { return e.wrong; });
    if (n) {
      comp.correction = {
        score: wrong.length ? wrong.filter(function (e) { return e.corrected; }).length / wrong.length : 1,
        n: wrong.length,
      };
    }

    var keys = Object.keys(comp);
    var totalW = keys.reduce(function (s, k) { return s + WEIGHTS[k]; }, 0);
    keys.forEach(function (k) {
      comp[k].weight = WEIGHTS[k] / totalW; // renormalised over the metrics that exist
      comp[k].points = round1(comp[k].score * 100);
    });
    var raw = keys.length ? keys.reduce(function (s, k) { return s + comp[k].score * comp[k].weight; }, 0) * 100 : 0;

    var byTopic = {};
    Object.keys(TOPICS).forEach(function (t) {
      var rows = scored.filter(function (e) { return e.claim.topic === t; });
      byTopic[t] = { n: rows.length, score: rows.length ? mean(rows.map(function (e) { return e.score; })) : null };
    });

    var verdictCounts = { true: 0, mostly_true: 0, mixed: 0, mostly_false: 0, false: 0, unverifiable: 0 };
    claims.forEach(function (c) { if (c.kind !== "forecast") verdictCounts[c.verdict] = (verdictCounts[c.verdict] || 0) + 1; });
    var forecastCounts = { hit: 0, flat: 0, miss: 0 };
    fcs.forEach(function (e) { forecastCounts[e.forecast.outcome]++; });

    var out = {
      accountId: account.id,
      asOf: account.asOf,
      n: n,
      totalClaims: claims.length,
      coverage: claims.length ? n / claims.length : 0,
      components: comp,
      byTopic: byTopic,
      verdictCounts: verdictCounts,
      forecastCounts: forecastCounts,
      claims: evaluated,
      minClaims: MIN_CLAIMS,
    };

    if (n < MIN_CLAIMS) {
      out.status = "insufficient";
      out.raw = round1(raw);
      return out;
    }

    var score = round1((n * raw + SHRINK_K * PRIOR) / (n + SHRINK_K));
    var g = gradeFor(score);
    out.status = "ok";
    out.raw = round1(raw);
    out.score = score;
    out.grade = g;
    out.certified = score >= CERTIFY_AT;
    out.confidence = n >= 30 ? "high" : n >= 15 ? "medium" : "low";
    out.certificateNo = certificateNumber(account.id, score, account.asOf);
    return out;
  }

  return {
    evaluate: evaluate,
    evaluateForecast: evaluateForecast,
    valueAt: valueAt,
    gradeFor: gradeFor,
    certificateNumber: certificateNumber,
    VERDICTS: VERDICTS,
    TOPICS: TOPICS,
    GRADES: GRADES,
    WEIGHTS: WEIGHTS,
    TOPIC_WEIGHT: TOPIC_WEIGHT,
    CONST: {
      FORECAST_SCALE: FORECAST_SCALE,
      FORECAST_END_SHARE: FORECAST_END_SHARE,
      FORECAST_TREND_SHARE: FORECAST_TREND_SHARE,
      PENDING_WEIGHT: PENDING_WEIGHT,
      MIN_CLAIMS: MIN_CLAIMS,
      SHRINK_K: SHRINK_K,
      PRIOR: PRIOR,
      CERTIFY_AT: CERTIFY_AT,
    },
  };
});
