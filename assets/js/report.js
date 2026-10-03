/* report.html — paid-report guide (locked) and the full sample report (unlocked) */
(function () {
  "use strict";
  var FM = window.FM, CH = window.FMCharts, E = FM.engine, esc = CH.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  $$("[data-brand]").forEach(function (a) { a.insertAdjacentHTML("afterbegin", FM.brandMark()); });

  var q = new URLSearchParams(location.search);
  var id = q.get("a");
  if (!FM.account(id)) id = "sample-silver";
  var unlocked = q.get("sample") === "1";
  var a = FM.account(id), r = FM.result(id);
  $("#dlg-sample-link").href = "report.html?a=" + id + "&sample=1";
  FM.wireCheckoutDialog();

  var ACCENT = { gold: "#C9A24B", silver: "#8793A3", bronze: "#B9733A", slate: "#76829A" };
  var PLAT = FM.cfg.platforms, AUTH = FM.cfg.authorities;
  var handles = Object.keys(a.handles).map(function (p) { return PLAT[p].name + " " + a.handles[p]; }).join(" · ");
  var plan = FM.cfg.plans.filter(function (p) { return p.id === "report"; })[0];

  /* ───────── header (shared) ───────── */
  function head() {
    return '<section class="rep-hero"><div class="container">' +
      '<div class="crumbs"><a href="index.html#r=' + id + '">← 무료 진단 결과</a> / 상세 분석 보고서' + (unlocked ? " (샘플)" : "") + "</div>" +
      "<h1>" + (unlocked ? "상세 분석 보고서 샘플" : "점수의 이유를, 발언 하나하나까지.") + "</h1>" +
      "<p>" + (unlocked
        ? "결제 후 받게 되는 보고서와 같은 구성입니다. 가상 계정 데이터로 만든 예시입니다."
        : "무료 진단은 점수와 등급까지. 상세 분석 보고서는 어떤 발언이 점수를 올리고 깎았는지, 경제 발언이 이후 어떻게 움직였는지 기관 출처와 함께 보여드립니다.") + "</p>" +
      '<div class="rep-id"><span class="mini-medal ' + FM.gradeClass(r) + '">' + esc(r.grade.id) + "</span>" +
      '<div class="nm">' + esc(a.name) + "<small>" + esc(a.role) + " · " + esc(handles) + "</small></div>" +
      '<div class="sc"><b>' + r.score.toFixed(1) + "</b><small>" + esc(r.grade.name) + " · " + FM.fmtDate(a.asOf) + " 기준</small></div></div>" +
      "</div></section>";
  }

  /* ───────── locked (paid guide) ───────── */
  var INCLUDES = [
    ["01", "발언별 팩트체크 로그", "발언마다 판정(사실~거짓)과 근거 기관·문서를 표기합니다. 한국은행·통계청·국회·법원 등 공식 발표만 사용합니다."],
    ["02", "경제 발언 상승·하락 추이", "'오른다/내린다' 발언 이후의 누적 등락률 차트. 기간을 말했으면 그 시점, 아니면 현재 기준으로 평가합니다."],
    ["03", "법안·판결·경제·정치 주제별 정확도", "어느 분야에서 신뢰를 얻고 잃었는지 한눈에 봅니다. 법안·판결 발언은 가중 반영합니다."],
    ["04", "정정 이력과 개선 포인트", "틀린 발언을 정정했는지, 출처를 밝혔는지. 점수를 올리는 가장 빠른 방법을 알려드립니다."],
    ["05", "공식 인증서 (검증번호 포함)", "고해상도 PDF/PNG 인증서. 발급번호로 평가 결과를 확인할 수 있습니다."],
  ];

  function ghostBars(n) {
    var w = [86, 64, 78, 52, 70, 44];
    return Array.apply(null, Array(n)).map(function (_, i) {
      return '<div class="ghost-row"><i></i><u style="--w:' + w[i % w.length] + '%"></u></div>';
    }).join("");
  }

  function lockedPage() {
    var feats = plan.features.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
    return head() +
      '<div class="container rep-wrap">' +
      '<div class="pay"><div><div class="section-head" style="margin-bottom:22px"><div class="eyebrow">보고서에 담기는 내용</div><h2 style="font-size:28px">5가지를 한 번에 확인합니다</h2></div>' +
      '<ul class="incl">' + INCLUDES.map(function (x) { return '<li><span class="ic">' + x[0] + "</span><div><b>" + esc(x[1]) + "</b><span>" + esc(x[2]) + "</span></div></li>"; }).join("") + "</ul></div>" +
      '<aside class="buy"><div class="lock-tag">상세 분석 보고서</div><div class="price">' + esc(plan.price) + "<small> " + esc(plan.unit) + "</small></div>" +
      '<div style="font-size:13.5px;color:var(--ink-2)">' + esc(a.name) + " 계정 · 평가 기준일 " + FM.fmtDate(a.asOf) + "</div><ul>" + feats + "</ul>" +
      '<button class="btn btn-gold" id="buy" type="button">결제하고 전체 보고서 보기</button>' +
      '<a class="btn btn-line" href="report.html?a=' + id + '&sample=1">샘플 보고서 먼저 보기</a>' +
      '<p class="fine">※ 프로토타입: 결제는 아직 연결되어 있지 않습니다. 요금은 가안입니다.</p></aside></div>' +

      '<div class="rep-sec" style="margin-top:56px"><h2>무료 vs 상세 보고서</h2><p class="desc">무료 진단으로 결과를 확인하고, 이유가 궁금하면 보고서를 열어보세요.</p>' +
      '<div class="card table-wrap"><table class="compare"><thead><tr><th></th><th>무료 진단</th><th>상세 보고서</th></tr></thead><tbody>' +
      [["신뢰 점수 · 등급", 1, 1], ["기본 인증서 (PNG)", 1, 1], ["지표별 점수와 가중치", 0, 1], ["발언별 팩트체크 로그 (기관 출처)", 0, 1], ["경제 발언 상승·하락 추이 차트", 0, 1], ["주제별(법안·판결·경제·정치) 정확도", 0, 1], ["정정 이력 · 개선 포인트", 0, 1], ["검증번호가 있는 공식 인증서", 0, 1]].map(function (x) {
        return "<tr><td>" + x[0] + '</td><td class="' + (x[1] ? "y" : "n") + '">' + (x[1] ? "✓" : "—") + '</td><td class="y">✓</td></tr>';
      }).join("") + "</tbody></table></div></div>" +

      '<div class="rep-sec"><h2>보고서 미리보기</h2><p class="desc">실제 내용은 결제 후 열립니다. 아래는 구성만 보여주는 흐린 화면이에요.</p>' +
      '<div class="two">' +
      '<div class="card lockwrap"><span class="lock-tag lockpill">🔒 유료</span><div class="ghost" aria-hidden="true"><b>지표별 점수</b>' + ghostBars(4) + "</div></div>" +
      '<div class="card lockwrap"><span class="lock-tag lockpill">🔒 유료</span><div class="ghost" aria-hidden="true"><b>주제별 정확도</b>' + ghostBars(4) + "</div></div>" +
      '<div class="card lockwrap" style="grid-column:1/-1"><span class="lock-tag lockpill">🔒 유료</span><div class="ghost" aria-hidden="true"><b>발언별 팩트체크 로그</b>' + ghostBars(6) + "</div></div></div></div>" +

      '<div class="rep-sec" id="plans"><h2>요금제</h2><div class="plans" id="plans-grid" style="margin-top:16px"></div></div>' +
      "</div>";
  }

  /* ───────── unlocked (sample report) ───────── */
  var COMP_META = {
    fact: ["팩트 정확도", "사실 주장 vs 기관 발표"],
    forecast: ["전망 적중·추이", "발언 이후 등락의 폭과 흐름"],
    correction: ["정정·책임성", "틀린 발언을 정정했는가"],
    sourcing: ["출처 명시", "공식 출처를 밝혔는가"],
  };
  var VLAB = {}; Object.keys(E.VERDICTS).forEach(function (k) { VLAB[k] = E.VERDICTS[k].label; });

  function vbadge(k) {
    var u = CH.VERDICT_UI[k];
    return '<span class="vb"><i style="background:' + u.color + '">' + u.glyph + "</i>" + esc(VLAB[k]) + "</span>";
  }
  function obadge(o, pending) {
    var u = CH.OUTCOME_UI[o];
    return '<span class="vb"><i style="background:' + u.color + '">' + u.glyph + "</i>" + u.label + (pending ? " <small style=\"font-weight:500;color:var(--muted)\">(진행 중)</small>" : "") + "</span>";
  }
  function ymd(iso) { return iso.slice(2).replace(/-/g, "."); }

  function summarySec() {
    var rows = ["fact", "forecast", "correction", "sourcing"].filter(function (k) { return r.components[k]; }).map(function (k) {
      var c = r.components[k];
      return '<div class="mrow"><div class="mlab">' + COMP_META[k][0] + "<small>" + COMP_META[k][1] + "</small></div>" +
        '<div class="mtrack"><div class="mfill" style="width:' + c.points + '%"></div></div>' +
        '<div class="mval">' + c.points.toFixed(1) + "<small>가중 " + Math.round(c.weight * 100) + "%</small></div></div>";
    }).join("");
    return '<div class="rep-sec"><h2><span class="no">01</span> 점수 구성</h2><p class="desc">네 지표를 가중 합산한 뒤, 표본이 적을수록 중간값(50점)쪽으로 보정해 최종 점수를 냅니다. 원점수 ' +
      r.raw.toFixed(1) + " → 최종 " + r.score.toFixed(1) + "점.</p>" +
      '<div class="two"><div class="card pad"><b style="font-size:15px">지표별 점수 (100점 만점)</b>' + rows + "</div>" +
      '<div class="card pad"><b style="font-size:15px">사실 주장 판정 분포</b><div style="margin-top:14px">' + CH.verdictBar(r.verdictCounts, VLAB) + "</div>" +
      '<div style="margin-top:20px;font-size:14px;color:var(--ink-2)">경제 전망 <b style="color:var(--ink)">' + (r.forecastCounts.hit + r.forecastCounts.flat + r.forecastCounts.miss) + "건</b> — " +
      "적중 " + r.forecastCounts.hit + " · 보합 " + r.forecastCounts.flat + " · 빗나감 " + r.forecastCounts.miss + "</div></div></div></div>";
  }

  function topicSec() {
    var rows = Object.keys(E.TOPICS).map(function (t) {
      var b = r.byTopic[t];
      if (!b.n) return "";
      var pts = Math.round(b.score * 100);
      return '<div class="mrow"><div class="mlab">' + E.TOPICS[t] + "<small>검증 발언 " + b.n + "건" + (t === "bill" || t === "ruling" ? " · 가중 1.3배" : "") + "</small></div>" +
        '<div class="mtrack"><div class="mfill" style="width:' + pts + '%"></div></div><div class="mval">' + pts + "</div></div>";
    }).join("");
    return '<div class="rep-sec"><h2><span class="no">02</span> 주제별 정확도</h2><p class="desc">법안·판결 발언을 중심으로, 어느 분야에서 신뢰를 얻고 잃었는지 보여줍니다.</p><div class="card pad">' + rows + "</div></div>";
  }

  function forecastSec() {
    var fcs = r.claims.filter(function (e) { return e.claim.kind === "forecast"; });
    if (!fcs.length) return "";
    var cards = fcs.map(function (e) {
      var f = e.claim.forecast, ev = e.forecast;
      var rule = ev.mode === "horizon" ? "제시 기간 " + f.horizonDays + "일 시점 기준" : ev.mode === "pending" ? "제시 기간 " + f.horizonDays + "일 미도래 · 현재 기준(반영 50%)" : "기간 미제시 · 현재 기준";
      var pts = [{ day: 0, change: 0 }].concat(f.path, [f.now]);
      return '<article class="card fc"><div class="fc-head"><b>"' + esc(e.claim.text) + '"</b>' + obadge(ev.outcome, ev.mode === "pending") + "</div>" +
        '<div class="fc-meta"><span class="dir">' + (f.direction === "up" ? "▲ 상승 전망" : "▼ 하락 전망") + "</span>" + esc(f.asset) + " · " + ymd(e.claim.date) + " · " + esc(PLAT[e.claim.platform].name) + "</div>" +
        CH.forecastChart(f, ev) +
        '<div style="font-size:13.5px;color:var(--ink-2);margin-top:4px">' + esc(rule) + " → 평가 시점 <b>" + CH.pct(ev.endChange) + "</b> (전망 방향 기준 " + CH.pct(ev.signedChange) + "), 방향 일치 비율 " + Math.round(ev.trendShare * 100) + "%</div>" +
        '<details><summary>표로 보기</summary><table><thead><tr><th>경과일</th><th>누적 등락률</th></tr></thead><tbody>' +
        pts.map(function (p) { return "<tr><td>" + p.day + "일</td><td>" + CH.pct(p.change) + "</td></tr>"; }).join("") + "</tbody></table>" +
        '<div style="color:var(--muted);margin-top:6px">시세 출처: ' + esc(AUTH[e.claim.src].name) + "</div></details></article>";
    }).join("");
    return '<div class="rep-sec"><h2><span class="no">03</span> 경제 발언의 상승·하락 추이</h2>' +
      '<p class="desc">발언 이후 실제 시세가 어떻게 움직였는지 보여줍니다. 초록 음영은 발언이 맞는 쪽, 금색 선은 제시한 기간입니다. 기간을 말하지 않은 발언은 현재 기준으로 평가합니다.</p>' +
      '<div class="fc-grid">' + cards + "</div></div>";
  }

  var logFilter = "all";
  function logRows() {
    return logRowsRaw() || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:28px">' +
      (logFilter === "wrong" ? "틀린 것으로 판정된 발언이 없습니다." : "해당하는 발언이 없습니다.") + "</td></tr>";
  }
  function logRowsRaw() {
    return r.claims.filter(function (e) {
      if (logFilter === "all") return true;
      if (logFilter === "wrong") return e.wrong;
      return e.claim.topic === logFilter;
    }).sort(function (x, y) { return x.claim.daysAgo - y.claim.daysAgo; }).map(function (e) {
      var c = e.claim, src = AUTH[c.src];
      var judge, note;
      if (c.kind === "forecast") {
        judge = obadge(e.forecast.outcome, e.forecast.mode === "pending");
        note = (c.forecast.direction === "up" ? "▲ " : "▼ ") + c.forecast.asset + " · " +
          (e.forecast.mode === "horizon" ? c.forecast.horizonDays + "일 시점 " : e.forecast.mode === "pending" ? "제시 기간 미도래, 현재 기준 " : "현재 기준 ") + CH.pct(e.forecast.endChange);
      } else { judge = vbadge(c.verdict); note = c.note; }
      return "<tr><td style=\"white-space:nowrap\">" + ymd(c.date) + '<br><span class="tag">' + esc(PLAT[c.platform].name) + "</span></td>" +
        '<td><span class="tag ' + c.topic + '">' + E.TOPICS[c.topic] + "</span></td>" +
        '<td class="txt">' + esc(c.text) + '<span class="note">' + esc(note) + "</span>" +
        (c.correction ? '<span class="fix">✓ 정정함 (' + ymd(c.correction.date) + ') — ' + esc(c.correction.text) + "</span>" : "") + "</td>" +
        "<td>" + judge + "</td>" +
        '<td class="src">' + esc(src.name) + "<small>" + esc(c.kind === "forecast" ? "시세 데이터" : c.ref) + (c.cited ? " · 출처 명시" : "") + "</small></td></tr>";
    }).join("");
  }
  function logSec() {
    var f = [["all", "전체"], ["bill", "법안"], ["ruling", "판결"], ["economy", "경제"], ["politics", "정치"], ["wrong", "틀린 발언만"]];
    return '<div class="rep-sec"><h2><span class="no">04</span> 발언별 팩트체크 로그</h2><p class="desc">모든 판정은 아래 표의 기관 발표를 근거로 합니다.</p>' +
      '<div class="filters" role="group" aria-label="로그 필터">' + f.map(function (x) { return '<button type="button" class="fchip" data-f="' + x[0] + '" aria-pressed="' + (x[0] === "all") + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      '<div class="card table-wrap"><table class="log"><thead><tr><th>날짜</th><th>주제</th><th>발언 · 판정 근거</th><th>판정</th><th>근거 기관 · 문서</th></tr></thead><tbody id="log-body">' + logRows() + "</tbody></table></div></div>";
  }

  function adviceSec() {
    var wrong = r.claims.filter(function (e) { return e.wrong; });
    var unfixed = wrong.filter(function (e) { return !e.corrected; });
    var facts = r.claims.filter(function (e) { return e.claim.kind !== "forecast" && e.verifiable; });
    var uncited = facts.filter(function (e) { return !e.claim.cited; });
    var topics = Object.keys(E.TOPICS).filter(function (t) { return r.byTopic[t].n >= 2; }).sort(function (x, y) { return r.byTopic[x].score - r.byTopic[y].score; });
    var tips = [];
    if (unfixed.length) {
      var gain = (E.WEIGHTS.correction / Object.keys(r.components).reduce(function (s, k) { return s + E.WEIGHTS[k]; }, 0)) * 100 * (unfixed.length / wrong.length);
      tips.push("틀린 발언 " + wrong.length + "건 중 <b>" + unfixed.length + "건이 정정되지 않았습니다.</b> 정정하면 정정·책임성 지표가 올라 최대 약 " + gain.toFixed(0) + "점(원점수 기준) 개선됩니다.");
    }
    if (uncited.length) tips.push("출처를 밝히지 않은 사실 주장이 <b>" + uncited.length + "건</b> 있습니다. 한국은행·통계청·국회 등 공식 링크를 함께 적어 주세요.");
    if (topics.length && r.byTopic[topics[0]].score < 0.75) tips.push("<b>" + E.TOPICS[topics[0]] + "</b> 분야 정확도가 가장 낮습니다(" + Math.round(r.byTopic[topics[0]].score * 100) + "점). 이 분야의 발언은 게시 전에 기관 발표를 한 번 더 확인하세요.");
    if (r.forecastCounts.miss) tips.push("빗나간 전망이 <b>" + r.forecastCounts.miss + "건</b> 있습니다. 전망에는 기간을 함께 밝히면 '현재 기준' 평가의 변동성을 줄일 수 있습니다.");
    if (!tips.length) tips.push("뚜렷한 감점 요인이 없습니다. 지금처럼 출처를 밝히고 기간을 명시하는 습관을 유지하세요.");
    var fixes = wrong.filter(function (e) { return e.corrected; });
    return '<div class="rep-sec"><h2><span class="no">05</span> 정정 이력과 개선 포인트</h2><div class="two">' +
      '<div class="card pad"><b style="font-size:15px">점수를 올리는 방법</b><ul style="margin:12px 0 0;padding-left:20px;display:grid;gap:10px;font-size:14.5px;color:var(--ink-2)">' + tips.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul></div>" +
      '<div class="card pad"><b style="font-size:15px">정정 이력</b>' + (fixes.length
        ? '<ul style="margin:12px 0 0;padding:0;list-style:none;display:grid;gap:10px;font-size:14px">' + fixes.map(function (e) { return '<li><span class="fix" style="color:var(--good-text);font-weight:700">✓ ' + ymd(e.claim.correction.date) + "</span> " + esc(e.claim.correction.text) + '<br><span style="color:var(--muted);font-size:13px">원 발언: ' + esc(e.claim.text) + "</span></li>"; }).join("") + "</ul>"
        : '<p style="color:var(--muted);font-size:14px;margin:12px 0 0">기록된 정정이 없습니다.</p>') + "</div></div></div>";
  }

  function methodSec() {
    return '<div class="rep-sec"><h2><span class="no">06</span> 평가 방법과 한계</h2><div class="card pad" style="font-size:14.5px;color:var(--ink-2)"><ul style="margin:0;padding-left:20px;display:grid;gap:8px">' +
      "<li><b>대상</b>: 계정 소유자가 연동에 동의한 Threads·Instagram·X·Facebook 게시물 중 검증 가능한 정치·경제 주장과 시장 전망. 의견·감상은 제외.</li>" +
      "<li><b>기준</b>: 한국은행, 통계청, 기획재정부, 국회 의안정보시스템, 법제처, 대법원, 헌법재판소, 선관위 등 공신력 있는 기관의 공식 발표만 사용.</li>" +
      "<li><b>경제 전망</b>: 기간을 제시했으면 그 시점의 누적 등락으로, 제시하지 않았으면 현재 기준으로 평가. 제시 기간이 아직 도래하지 않았다면 반영 비중 50%. 점수 = 0.65×말한 방향으로의 등락 폭(5% 기준 포화) + 0.35×관측 시점 중 방향이 맞은 비율.</li>" +
      "<li><b>보정</b>: 검증 가능한 발언이 " + r.minClaims + "건 미만이면 등급 보류. 표본이 적을수록 50점쪽으로 수축(가상 관측치 " + E.CONST.SHRINK_K + "건).</li>" +
      "<li><b>한계</b>: 단일 지표 등락은 외부 요인의 영향을 받으며, 점수는 투자 판단의 근거가 아닙니다. 검증 불가 발언(" + r.verdictCounts.unverifiable + "건)은 점수에서 제외되었습니다.</li></ul></div></div>";
  }

  function certSec() {
    return '<div class="rep-sec"><h2><span class="no">07</span> 인증서</h2><p class="desc">' + (r.certified ? "발급번호 " + esc(r.certificateNo) + " · 이미지/PDF로 저장해 프로필이나 이력서에 사용하세요." : "인증 기준(70점)에 미달하여 평가서로 발급됩니다.") + "</p>" +
      '<div class="card pad"><div class="cert-frame">' + FM.certSvg(a, r) + '</div><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">' +
      '<button class="btn btn-navy btn-sm" id="r-png" type="button">PNG로 저장</button><button class="btn btn-line btn-sm" id="r-print" type="button">인쇄 / PDF로 저장</button></div></div></div>';
  }

  function unlockedPage() {
    return head() + '<div class="container rep-wrap">' +
      '<div class="notice info" style="margin-bottom:30px">이 화면은 <b>가상 계정</b>으로 만든 샘플 보고서입니다. 결제 시 계정의 실제 분석 결과가 같은 구성으로 제공됩니다. <a href="report.html?a=' + id + '">← 유료 안내로 돌아가기</a></div>' +
      summarySec() + topicSec() + forecastSec() + logSec() + adviceSec() + methodSec() + certSec() + "</div>";
  }

  /* ───────── boot ───────── */
  var main = $("#main");
  main.innerHTML = unlocked ? unlockedPage() : lockedPage();

  if (unlocked) {
    CH.bindTips(main);
    $$(".fchip").forEach(function (b) {
      b.addEventListener("click", function () {
        logFilter = b.dataset.f;
        $$(".fchip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        $("#log-body").innerHTML = logRows();
      });
    });
    $("#r-png").addEventListener("click", function () { FM.downloadPng(a, r); });
    $("#r-print").addEventListener("click", function () { FM.printCert(a, r); });
  } else {
    $("#buy").addEventListener("click", function () { FM.openCheckout(id); });
    $("#plans-grid").innerHTML = FM.cfg.plans.map(function (p) {
      var hot = p.id === "report";
      return '<article class="card plan' + (hot ? " hot" : "") + '">' + (p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "") +
        "<h3>" + esc(p.name) + '</h3><div class="price">' + esc(p.price) + "<small>" + esc(p.unit) + "</small></div><ul>" +
        p.features.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" +
        (p.id === "free" ? '<a class="btn btn-navy" href="index.html#diagnose">' + esc(p.cta) + "</a>" : '<button class="btn ' + (hot ? "btn-gold" : "btn-line") + '" type="button" data-buy>' + esc(p.cta) + "</button>") + "</article>";
    }).join("");
    $$("[data-buy]").forEach(function (b) { b.addEventListener("click", function () { FM.openCheckout(id); }); });
  }
  if (location.hash) {
    var t = document.getElementById(location.hash.slice(1));
    if (t) t.scrollIntoView();
  }
})();
