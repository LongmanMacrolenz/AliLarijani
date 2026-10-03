/* index.html — landing page + free diagnosis funnel */
(function () {
  "use strict";
  var FM = window.FM, CH = window.FMCharts, E = FM.engine, esc = CH.esc;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var selected = {}; // platform -> true
  var busy = false;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───── static sections ───── */
  $$("[data-brand]").forEach(function (a) { a.insertAdjacentHTML("afterbegin", FM.brandMark()); });

  function renderHero() {
    var a = FM.account("sample-gold"), r = FM.result(a.id);
    $("#hero-cert").innerHTML = FM.certSvg(a, r);
  }

  function renderPlatformChips() {
    var host = $("#plat-chips");
    Object.keys(FM.cfg.platforms).forEach(function (k) {
      selected[k] = true;
      var p = FM.cfg.platforms[k];
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.setAttribute("aria-pressed", "true"); b.dataset.p = k;
      b.innerHTML = '<span class="g">' + esc(p.short) + "</span>" + esc(p.name);
      b.addEventListener("click", function () {
        selected[k] = !selected[k];
        b.setAttribute("aria-pressed", String(selected[k]));
      });
      host.appendChild(b);
    });
  }

  function renderSamplePicks() {
    $("#sample-picks").innerHTML = FM.data.accounts.map(function (a) {
      var r = FM.result(a.id);
      return '<button type="button" class="pick" data-id="' + a.id + '">' +
        '<span class="mini-medal ' + FM.gradeClass(r) + '">' + esc(r.grade.id) + "</span>" +
        '<span><span class="pk-name">' + esc(a.name) + '</span><br><span class="pk-role">' + esc(a.role) + "</span></span>" +
        '<span class="pk-go">' + r.score.toFixed(1) + "점 →</span></button>";
    }).join("");
    $$("#sample-picks .pick").forEach(function (b) {
      b.addEventListener("click", function () { run(b.dataset.id); });
    });
  }

  function renderMethod() {
    $("#auth-row").innerHTML = Object.keys(FM.cfg.authorities).map(function (k) {
      var a = FM.cfg.authorities[k];
      return '<span class="auth">' + esc(a.name) + "<small>" + esc(a.kind) + "</small></span>";
    }).join("");

    var W = E.WEIGHTS, cols = ["#14213d", "#2f4a85", "#b58a2f", "#7a849b"];
    var items = [
      ["fact", "팩트 정확도", "법안·판결·경제·정치 사실 주장이 기관 발표와 얼마나 일치하는가 (법안·판결 1.3배)"],
      ["forecast", "전망 적중·추이", "발언 이후 실제 등락의 폭과 흐름이 말한 방향과 맞았는가"],
      ["correction", "정정·책임성", "틀린 발언을 스스로 정정했는가"],
      ["sourcing", "출처 명시", "공식 출처를 밝히고 말했는가"],
    ];
    $("#wbar").innerHTML = items.map(function (it, i) {
      return '<div style="flex:' + W[it[0]] * 100 + ";background:" + cols[i] + '">' + Math.round(W[it[0]] * 100) + "%</div>";
    }).join("");
    $("#wlist").innerHTML = items.map(function (it, i) {
      return '<li><span class="dot" style="background:' + cols[i] + '"></span><span><b>' + it[1] + "</b> — " + it[2] + "</span></li>";
    }).join("");

    // Same forecast, two period rules. Rallied, then gave it all back.
    var base = { asset: "KOSPI", direction: "up", path: [{ day: 30, change: 3 }, { day: 60, change: 6 }, { day: 90, change: 8 }, { day: 150, change: 4 }, { day: 220, change: -3 }], now: { day: 260, change: -5 } };
    var withP = Object.assign({}, base, { horizonDays: 90 }), noP = Object.assign({}, base, { horizonDays: null });
    var e1 = E.evaluateForecast(withP), e2 = E.evaluateForecast(noP);
    $("#rule-pair").innerHTML =
      '<div class="rule"><h4><i>기간 제시</i> "3개월 안에 코스피가 오른다"</h4><p>→ 말한 기간(90일) 시점의 등락으로 평가합니다. 이후 되돌림은 보지 않습니다.</p>' + CH.forecastChart(withP, e1) + "</div>" +
      '<div class="rule"><h4><i>기간 미제시</i> "코스피가 오른다"</h4><p>→ 기간 약속이 없으므로 <b>현재 기준</b>으로 평가합니다. 같은 시세라도 결과가 달라집니다.</p>' + CH.forecastChart(noP, e2) + "</div>";
    CH.bindTips($("#rule-pair"));

    $("#glist").innerHTML = E.GRADES.map(function (g) {
      var range = g.id === "S" ? "90점 이상" : g.id === "D" ? "55점 미만" : g.min + "점 이상";
      return '<div class="card gitem"><span class="mini-medal medal-' + g.tier + '">' + g.id + "</span><b>" + esc(g.name) + "</b><small>" + range + "</small><p>" + esc(g.blurb) + "</p></div>";
    }).join("");
  }

  function renderSamples() {
    $("#samples-grid").innerHTML = FM.data.accounts.map(function (a) {
      var r = FM.result(a.id);
      return '<button type="button" class="card scard" data-id="' + a.id + '" aria-label="' + esc(a.name) + ' 진단 결과 열기">' +
        '<div class="cert-frame">' + FM.certSvg(a, r) + "</div>" +
        '<div class="cap"><span class="mini-medal ' + FM.gradeClass(r) + '">' + esc(r.grade.id) + "</span><div><b>" + esc(a.name) + " · " + r.score.toFixed(1) + "점</b><span>" +
        esc(r.grade.name) + (r.certified ? " · 인증서" : " · 평가서 (인증 기준 미달)") + '</span></div><span class="go">결과 열기 →</span></div></button>';
    }).join("");
    $$("#samples-grid .scard").forEach(function (b) {
      b.addEventListener("click", function () { run(b.dataset.id, { scroll: true }); });
    });
  }

  function renderPlans() {
    $("#plans-grid").innerHTML = FM.cfg.plans.map(function (p) {
      var hot = p.id === "report";
      return '<article class="card plan' + (hot ? " hot" : "") + '">' + (p.badge ? '<span class="badge">' + esc(p.badge) + "</span>" : "") +
        "<h3>" + esc(p.name) + '</h3><div class="price">' + esc(p.price) + "<small>" + esc(p.unit) + "</small></div><ul>" +
        p.features.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>" +
        '<a class="btn ' + (hot ? "btn-gold" : p.id === "free" ? "btn-navy" : "btn-line") + '" href="' + esc(p.href) + '">' + esc(p.cta) + "</a></article>";
    }).join("");
  }

  /* ───── funnel ───── */
  function setStep(n) {
    $$("#steps li").forEach(function (li) { li.classList.toggle("on", +li.dataset.s === n); });
    $("#stage-form").hidden = n !== 1;
    $("#stage-progress").hidden = n !== 2;
    $("#stage-result").hidden = n !== 3;
  }

  function norm(h) { return String(h || "").trim().replace(/^@+/, "").toLowerCase(); }

  function findByHandle(h) {
    var q = norm(h);
    if (!q) return null;
    return FM.data.accounts.filter(function (a) {
      return Object.keys(a.handles).some(function (p) { return norm(a.handles[p]) === q; });
    })[0] || null;
  }

  function showMsg(html, kind) {
    var m = $("#form-msg");
    m.className = "notice " + (kind || "warn"); m.innerHTML = html; m.hidden = false;
  }

  function onSubmit(ev) {
    ev.preventDefault();
    $("#form-msg").hidden = true;
    var raw = $("#handle").value;
    if (!norm(raw)) return showMsg("계정 아이디를 입력해 주세요. 아래 샘플 계정으로 먼저 체험할 수도 있어요.");
    if (!Object.keys(selected).some(function (k) { return selected[k]; })) return showMsg("분석할 플랫폼을 하나 이상 선택해 주세요.");
    if (!$("#consent").checked) return showMsg("본인 계정이거나 소유자 동의를 받았음을 확인해 주세요.");
    var acct = findByHandle(raw);
    if (!acct) {
      return showMsg("<b>" + esc(raw.trim()) + "</b> 계정은 아직 분석할 수 없어요. 이 프로토타입은 <b>가상 샘플 계정</b>만 분석합니다. 실제 계정 분석은 플랫폼 로그인(OAuth) 연동이 열리면 제공됩니다. 오른쪽의 샘플 계정으로 전체 흐름을 체험해 보세요.", "warn");
    }
    run(acct.id);
  }

  var STEPS = ["게시글 불러오기", "정치·경제 발언 추출", "공신력 기관 발표와 대조", "발언 이후 시세 추이 계산", "점수·등급 산정"];

  function run(id, opts) {
    opts = opts || {};
    if (busy) return;
    var a = FM.account(id), r = FM.result(id);
    if (!a) return;
    busy = true;
    $("#form-msg").hidden = true;
    $("#progress-for").textContent = a.name + " · " + Object.keys(a.handles).map(function (p) { return a.handles[p]; }).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).join(" / ");
    var list = $("#progress-list");
    list.innerHTML = STEPS.map(function (s, i) {
      return '<li data-i="' + i + '"><span class="ck">✓</span><span>' + s + (i === 0 ? " · " + a.postsScanned.toLocaleString("ko-KR") + "건" : i === 1 ? " · " + r.totalClaims + "건" : "") + "</span></li>";
    }).join("");
    setStep(2);
    $("#diagnose").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });

    var delay = reduceMotion ? 0 : 420, i = 0;
    function tick() {
      $$("#progress-list li").forEach(function (li, k) {
        li.classList.toggle("done", k < i); li.classList.toggle("now", k === i);
      });
      $("#bar").style.width = Math.min(100, (i / STEPS.length) * 100) + "%";
      if (i >= STEPS.length) {
        busy = false; showResult(id); return;
      }
      i++; setTimeout(tick, delay);
    }
    tick();
  }

  function ghostRows(n, cls) {
    var w = [86, 64, 78, 52, 70, 44];
    return Array.apply(null, Array(n)).map(function (_, i) {
      return '<div class="ghost-row ' + (cls || "") + '"><i></i><u style="--w:' + w[i % w.length] + '%"></u></div>';
    }).join("");
  }

  function showResult(id) {
    var a = FM.account(id), r = FM.result(id), host = $("#stage-result");
    var accents = { gold: "#B58A2F", silver: "#56647D", bronze: "#A9672F", slate: "#56647D" };
    var conf = { high: "높음", medium: "보통", low: "낮음" }[r.confidence];
    var handles = Object.keys(a.handles).map(function (p) { return FM.cfg.platforms[p].name + " " + a.handles[p]; }).join(" · ");

    host.innerHTML =
      '<div class="result">' +
        '<div class="result-score">' + CH.ring(r.score, accents[r.grade.tier]) +
          '<div class="grade-line"><span class="mini-medal ' + FM.gradeClass(r) + '">' + esc(r.grade.id) + "</span><div style=\"text-align:left\"><b>" + esc(r.grade.name) + "</b><span>" + (r.certified ? "인증 기준 충족" : "인증 기준(70점) 미달") + "</span></div></div></div>" +
        "<div>" +
          '<span class="verdict-line ' + (r.certified ? "ok" : "no") + '">' + (r.certified ? "✓ 인증서가 발급되었어요" : "• 평가서로 발급되었어요") + "</span>" +
          '<h3 style="font-family:var(--serif);font-size:26px;margin:0 0 2px">' + esc(a.name) + ' <small style="font-family:var(--sans);font-size:14px;color:var(--muted);font-weight:400">' + esc(a.role) + "</small></h3>" +
          '<div style="font-size:13.5px;color:var(--muted)">' + esc(handles) + "</div>" +
          '<p class="result-sub">' + esc(r.grade.blurb) + "</p>" +
          '<dl class="result-meta">' +
            '<div class="stat"><dt>검증된 발언</dt><dd>' + r.n + '<small>건</small></dd></div>' +
            '<div class="stat"><dt>분석한 게시글</dt><dd>' + a.postsScanned.toLocaleString("ko-KR") + '<small>건</small></dd></div>' +
            '<div class="stat"><dt>표본 신뢰도</dt><dd>' + conf + "</dd></div>" +
          "</dl>" +
          '<p style="font-size:12.5px;color:var(--muted);margin:10px 0 0">평가 기준일 ' + FM.fmtDate(a.asOf) + " · 경제 전망은 기간 제시 시 그 시점, 미제시 시 현재 기준 · <b>샘플 데이터</b></p>" +
        "</div>" +
      "</div>" +

      '<div class="cert-block"><div class="cert-frame" id="cert-live">' + FM.certSvg(a, r) + "</div>" +
        '<div class="cert-actions"><h3>' + (r.certified ? "나의 신뢰 인증서" : "신뢰 평가서") + "</h3>" +
        "<p>" + (r.certified ? "프로필이나 게시물에 공유할 수 있는 기본 인증서예요. 검증번호가 새겨진 공식본(PDF)은 유료 보고서에 포함됩니다." : "인증 기준에는 못 미쳤지만 현재 평가 결과를 기록한 문서예요. 상세 보고서에서 개선 포인트를 확인하세요.") + "</p>" +
        '<button class="btn btn-navy" id="btn-png" type="button">PNG로 저장</button>' +
        '<button class="btn btn-line" id="btn-print" type="button">인쇄 / PDF로 저장</button>' +
        '<button class="btn btn-line" id="btn-share" type="button">공유 링크 복사</button></div></div>' +

      '<section class="teaser" aria-label="유료 상세 분석 보고서 미리보기">' +
        '<div class="teaser-head"><span class="lock-tag">🔒 유료</span><h3>상세 분석 보고서</h3><span style="font-size:13.5px;color:var(--muted)">점수의 이유를 모두 보여드립니다</span></div>' +
        '<div class="teaser-body"><div class="ghost" aria-hidden="true"><b style="font-size:13px">지표별 점수</b>' + ghostRows(4) + "</div>" +
        '<div class="ghost" aria-hidden="true"><b style="font-size:13px">발언별 팩트체크 로그</b>' + ghostRows(5, "log") + "</div>" +
        '<div class="teaser-lock"><div class="box"><div class="lock-ico" aria-hidden="true">🔒</div><h4>' +
          (r.certified ? "높은 점수를 만든 발언을 확인하세요" : "무엇이 점수를 깎았는지 확인하세요") + "</h4>" +
          "<p>발언별 팩트체크(기관 출처 표기) · 경제 발언 상승·하락 추이 · 법안/판결/경제/정치별 정확도 · 정정 이력 · 공식 인증서 PDF</p>" +
          '<a class="btn btn-gold" href="report.html?a=' + a.id + '">상세 보고서 안내 보기 · 9,900원</a></div></div></div>' +
      "</section>" +
      '<div style="text-align:center;margin-top:22px"><button class="btn btn-line btn-sm" id="btn-again" type="button">← 다른 계정 진단하기</button></div>';

    setStep(3);
    $("#btn-png").addEventListener("click", function () { FM.downloadPng(a, r); });
    $("#btn-print").addEventListener("click", function () { FM.printCert(a, r); });
    $("#btn-share").addEventListener("click", function () { FM.copyShare(a.id); });
    $("#btn-again").addEventListener("click", reset);
    history.replaceState(null, "", "#r=" + a.id);
    $("#diagnose").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function reset() {
    history.replaceState(null, "", location.pathname);
    $("#bar").style.width = "0";
    setStep(1);
    $("#diagnose").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  /* ───── boot ───── */
  renderHero();
  renderPlatformChips();
  renderSamplePicks();
  renderMethod();
  renderSamples();
  renderPlans();
  FM.wireCheckoutDialog();
  $("#form").addEventListener("submit", onSubmit);

  var m = /^#r=([\w-]+)$/.exec(location.hash);
  if (m && FM.account(m[1])) {
    showResult(m[1]);
  }
})();
