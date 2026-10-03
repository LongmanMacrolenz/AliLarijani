/*
 * 가상 샘플 데이터 — 실제 인물·계정·수치와 무관합니다.
 * 프로토타입의 전체 흐름(점수 → 등급 → 인증서 → 유료 보고서)을 보여주기 위한 용도이며,
 * 실제 서비스에서는 계정 연동(OAuth)으로 수집한 게시글 → 발언 추출 → 기관 데이터 대조 결과가 이 형식으로 들어옵니다.
 *
 * claim 형식
 *   공통   : id, platform, daysAgo(발언 후 경과일), topic(bill|ruling|economy|politics), text, cited(출처 인용 여부)
 *   fact   : verdict(true|mostly_true|mixed|mostly_false|false|unverifiable), src(기관 id), ref(근거 문서), note
 *   forecast: forecast{asset, direction, horizonDays?, path[{day,change}], now{day,change}}
 *            · horizonDays 있음 → 그 기간 시점으로 평가 / 없음 → 현재 기준 평가
 *   correction(선택): 발언자가 스스로 정정한 기록
 */
(function () {
  "use strict";

  var AS_OF = "2026-09-30";

  function addDays(iso, d) {
    var t = new Date(iso + "T00:00:00Z");
    t.setUTCDate(t.getUTCDate() + d);
    return t.toISOString().slice(0, 10);
  }
  function dateOf(daysAgo) {
    return addDays(AS_OF, -daysAgo);
  }

  /** fact(id, platform, daysAgo, topic, text, verdict, src, ref, note, opts) */
  function fact(id, platform, daysAgo, topic, text, verdict, src, ref, note, o) {
    o = o || {};
    var c = {
      id: id, kind: "fact", platform: platform, daysAgo: daysAgo, date: dateOf(daysAgo),
      topic: topic, text: text, verdict: verdict, src: src, ref: ref, note: note,
      cited: o.cited !== undefined ? o.cited : true,
    };
    if (o.fix) c.correction = { daysAgo: o.fix[0], date: dateOf(o.fix[0]), text: o.fix[1] };
    return c;
  }

  /** forecast(id, platform, daysAgo, text, asset, direction, horizonDays|null, path[[day,%]], nowChange, src, opts) */
  function forecast(id, platform, daysAgo, text, asset, direction, horizonDays, path, nowChange, src, o) {
    o = o || {};
    var c = {
      id: id, kind: "forecast", platform: platform, daysAgo: daysAgo, date: dateOf(daysAgo),
      topic: "economy", text: text, src: src, cited: false,
      forecast: {
        asset: asset, direction: direction, horizonDays: horizonDays,
        path: path.map(function (p) { return { day: p[0], change: p[1] }; }),
        now: { day: daysAgo, change: nowChange },
      },
    };
    if (o.fix) c.correction = { daysAgo: o.fix[0], date: dateOf(o.fix[0]), text: o.fix[1] };
    return c;
  }

  var accounts = [
    /* ───────────────── S : 최우수 ───────────────── */
    {
      id: "sample-gold",
      name: "샘플 A",
      role: "경제 평론가 (가상)",
      handles: { threads: "@sample_econ_a", x: "@sample_econ_a", instagram: "@sample_econ_a" },
      postsScanned: 2184,
      claims: [
        fact("a01", "threads", 410, "economy", "지난해 연간 소비자물가 상승률은 2%대 초반에 머물렀다.", "true", "kostat", "소비자물가동향", "통계청 공표치와 일치"),
        fact("a02", "x", 380, "economy", "한국은행은 이번 회의에서 기준금리를 동결했다.", "true", "bok", "금융통화위원회 통화정책방향", "결정문상 동결"),
        fact("a03", "threads", 350, "bill", "○○법 개정안은 아직 상임위 심사 단계여서 본회의 표결 전이다.", "true", "assembly", "의안 처리현황", "의안정보시스템상 상임위 계류"),
        fact("a04", "x", 330, "ruling", "대법원은 해당 사건에서 원심 판결을 파기환송했다.", "true", "scourt", "선고 판결문", "주문과 일치"),
        fact("a05", "instagram", 300, "economy", "수출은 석 달 연속 전년 동월 대비 증가했다.", "mostly_true", "motie", "수출입동향 보도자료", "증가는 맞으나 한 달은 보합 수준"),
        fact("a06", "threads", 285, "politics", "해당 선거의 최종 투표율은 직전 선거보다 낮았다.", "true", "nec", "선거통계시스템", "투표율 비교 일치"),
        fact("a07", "x", 260, "bill", "개정 ○○법은 공포 후 6개월이 지난 날부터 시행된다.", "true", "moleg", "법률 부칙", "부칙 시행일 조항과 일치"),
        fact("a08", "threads", 240, "ruling", "헌재는 해당 조항에 대해 헌법불합치 결정을 내렸다.", "true", "ccourt", "결정문", "주문과 일치"),
        fact("a09", "x", 215, "economy", "올해 정부 총지출 증가율은 전년보다 낮게 편성됐다.", "mostly_true", "moef", "예산안 보도자료", "방향은 맞으나 수치를 반올림해 표기"),
        fact("a10", "threads", 200, "economy", "가계부채 증가세가 둔화됐다는 한은 발표가 나왔다.", "true", "bok", "금융안정보고서", "보고서 서술과 일치"),
        fact("a11", "threads", 180, "politics", "이번 국정감사 대상 기관 수는 지난해보다 늘었다.", "true", "assembly", "국정감사 계획서", "대상 기관 수 증가"),
        fact("a12", "x", 160, "bill", "해당 법안은 재적 과반 찬성으로 본회의를 통과했다.", "true", "assembly", "본회의 표결 결과", "표결 결과와 일치"),
        fact("a13", "threads", 140, "ruling", "공정위 과징금 처분은 법원에서 일부 취소됐다.", "mostly_true", "scourt", "선고 판결문", "일부 취소 맞음, 취소 범위는 더 좁음"),
        fact("a14", "x", 120, "economy", "실업률은 직전 분기 대비 소폭 상승했다.", "true", "kostat", "경제활동인구조사", "수치 일치"),
        fact("a15", "instagram", 100, "economy", "지난달 경상수지는 흑자를 기록했다.", "true", "bok", "국제수지 잠정치", "흑자 확인"),
        fact("a16", "threads", 80, "politics", "선관위 등록 후보자 수는 직전 선거보다 크게 늘었다.", "mixed", "nec", "후보자 등록 현황", "증가는 맞으나 '크게'는 과장"),
        fact("a17", "x", 60, "bill", "조세특례제한법 개정안은 이미 시행 중이다.", "true", "moleg", "시행일 정보", "시행일 경과 확인"),
        fact("a18", "threads", 40, "ruling", "대법원 전원합의체는 기존 판례를 변경했다.", "true", "scourt", "전원합의체 판결", "판례 변경 확인"),
        fact("a19", "x", 25, "economy", "외환보유액은 전월보다 증가했다.", "true", "bok", "외환보유액 통계", "증가 확인"),
        fact("a20", "threads", 10, "economy", "부동산 거래량은 전월 대비 증가했다.", "true", "reb", "부동산 거래현황", "증가 확인"),
        forecast("a21", "x", 320, "코스피는 앞으로 3개월 안에 오를 것이다.", "KOSPI", "up", 90,
          [[14, 1.8], [30, 3.9], [60, 6.4], [90, 8.9], [180, 10.2]], 11.5, "krx"),
        forecast("a22", "threads", 250, "원/달러 환율은 연내 내려갈 것이다.", "원/달러 환율", "down", null,
          [[30, -1.4], [90, -3.0], [150, -4.8]], -6.1, "bok"),
        forecast("a23", "x", 190, "6개월 안에 서울 아파트 매매가격은 오른다.", "서울 아파트 매매가격지수", "up", 180,
          [[30, 0.9], [90, 2.6], [180, 5.4]], 5.6, "reb"),
        forecast("a24", "threads", 130, "코스닥은 당분간 조정을 받을 것이다.", "KOSDAQ", "down", null,
          [[14, -2.2], [30, -4.5], [60, -6.9], [100, -8.0]], -9.1, "krx"),
        forecast("a25", "x", 70, "한 달 안에 원/달러 환율이 오를 것이다.", "원/달러 환율", "up", 30,
          [[7, 0.9], [14, 1.9], [30, 3.4]], 3.1, "bok"),
      ],
    },

    /* ───────────────── A : 높은 신뢰 ───────────────── */
    {
      id: "sample-silver",
      name: "샘플 B",
      role: "시사 칼럼니스트 (가상)",
      handles: { threads: "@sample_column_b", x: "@sample_column_b" },
      postsScanned: 1346,
      claims: [
        fact("b01", "threads", 300, "politics", "해당 의원의 법안 발의 건수는 이번 회기 최다이다.", "true", "assembly", "의원 발의 현황", "발의 건수 최다 확인", { cited: true }),
        fact("b02", "x", 280, "bill", "○○법 개정안이 국회 본회의를 통과했다.", "true", "assembly", "본회의 의결 결과", "의결 확인", { cited: true }),
        fact("b03", "threads", 260, "ruling", "대법원 판결로 해당 처분은 전부 무효가 됐다.", "mostly_false", "scourt", "선고 판결문", "일부 취소에 그침", { cited: false, fix: [255, "일부 취소가 맞습니다. 정정합니다."] }),
        fact("b04", "facebook", 240, "economy", "실질임금은 두 해 연속 하락했다.", "mostly_true", "kostat", "사업체노동력조사", "하락 맞음, 한 해는 보합에 가까움", { cited: true }),
        fact("b05", "x", 220, "economy", "정부는 올해 재정적자 폭을 줄이겠다고 발표했다.", "true", "moef", "재정운용 계획", "발표 내용 일치", { cited: true }),
        fact("b06", "threads", 200, "politics", "여론조사 지지율 1위 후보는 A이다.", "true", "nec", "여론조사 심의 결과", "조사 결과와 일치", { cited: true }),
        fact("b07", "x", 170, "bill", "새 법은 내년 1월부터 전면 시행된다.", "true", "moleg", "법률 부칙", "시행일 일치", { cited: true }),
        fact("b08", "threads", 150, "ruling", "헌재는 해당 법률을 합헌으로 결정했다.", "true", "ccourt", "결정문", "주문 일치", { cited: true }),
        fact("b09", "facebook", 130, "economy", "한국은행은 기준금리를 두 차례 연속 인하했다.", "mostly_true", "bok", "통화정책방향", "인하는 한 차례, 한 번은 동결이나 완화 기조는 일치", { cited: true, fix: [125, "한 차례 인하·한 차례 동결이 맞습니다."] }),
        fact("b10", "x", 100, "economy", "물가 상승률이 석 달 연속 둔화됐다.", "true", "kostat", "소비자물가동향", "수치 일치", { cited: true }),
        fact("b11", "threads", 70, "politics", "상임위 출석률은 지난 국회보다 높아졌다.", "unverifiable", "assembly", "공식 집계 없음", "비교 가능한 공식 통계 없음", { cited: false }),
        fact("b12", "x", 35, "bill", "해당 법안은 임기 만료로 폐기됐다.", "true", "assembly", "의안 처리현황", "폐기 확인", { cited: true }),
        forecast("b13", "x", 270, "코스피는 앞으로 오를 것이다.", "KOSPI", "up", null,
          [[30, 1.6], [90, 4.8], [150, 7.4]], 9.6, "krx"),
        forecast("b14", "threads", 210, "환율은 3개월 안에 급등할 것이다.", "원/달러 환율", "up", 90,
          [[30, -0.8], [60, -1.9], [90, -2.6]], -1.2, "bok", { fix: [200, "예측이 빗나갔습니다. 환율 하락을 놓쳤습니다."] }),
        forecast("b15", "x", 140, "코스닥은 두 달 안에 하락할 것이다.", "KOSDAQ", "down", 60,
          [[14, -1.0], [30, -3.2], [60, -5.6]], -4.1, "krx"),
        forecast("b16", "threads", 90, "서울 아파트값은 오를 것이다.", "서울 아파트 매매가격지수", "up", null,
          [[30, 1.2], [60, 2.9]], 4.6, "reb"),
      ],
    },

    /* ───────────────── B : 양호 ───────────────── */
    {
      id: "sample-bronze",
      name: "샘플 C",
      role: "정치 논객 (가상)",
      handles: { threads: "@sample_politics_c", facebook: "@sample.politics.c", x: "@sample_politics_c" },
      postsScanned: 3012,
      claims: [
        fact("c01", "facebook", 330, "politics", "이번 개각에서 교체된 장관은 모두 세 명이다.", "true", "moef", "인사 발표 자료", "인원 수 일치", { cited: true }),
        fact("c02", "x", 300, "bill", "해당 법안은 여야 합의로 통과됐다.", "mixed", "assembly", "본회의 표결 결과", "합의 처리 아님, 표결로 통과했으나 다수 찬성", { cited: true }),
        fact("c03", "threads", 280, "ruling", "대법원은 해당 판결에서 정부 손을 들어줬다.", "mostly_true", "scourt", "선고 판결문", "일부 쟁점만 정부 승", { cited: true }),
        fact("c04", "facebook", 250, "economy", "올해 성장률 전망은 하향 조정됐다.", "true", "intl", "경제전망 보고서", "하향 조정 확인", { cited: true }),
        fact("c05", "x", 220, "bill", "해당 법안은 상임위 문턱도 못 넘었다.", "false", "assembly", "의안 처리현황", "이미 본회의 통과", { cited: false, fix: [215, "본회의 통과를 확인했습니다. 잘못 썼습니다."] }),
        fact("c06", "threads", 190, "politics", "국회의 올해 본회의 개최 횟수는 역대 최저다.", "mostly_true", "assembly", "본회의 회의록", "최저 수준에 근접", { cited: true }),
        fact("c07", "facebook", 160, "ruling", "헌재는 해당 조항을 위헌으로 선언했다.", "true", "ccourt", "결정문", "주문 일치", { cited: true }),
        fact("c08", "x", 130, "economy", "물가 상승률은 정부 목표치를 넘어섰다.", "mostly_true", "kostat", "소비자물가동향", "넘었으나 근소한 차이", { cited: true }),
        fact("c09", "threads", 100, "economy", "국가부채가 처음으로 GDP를 넘어섰다.", "mixed", "moef", "국가채무 통계", "GDP 대비 비율 과장", { cited: false }),
        fact("c10", "x", 75, "politics", "선관위는 해당 후보의 등록을 거부했다.", "unverifiable", "nec", "공식 발표 없음", "근거 공문 확인 불가", { cited: false }),
        fact("c11", "facebook", 45, "bill", "개정 ○○법은 이미 시행 중이다.", "true", "moleg", "시행일 정보", "시행일 경과", { cited: true }),
        forecast("c12", "x", 260, "코스피는 오를 것이다.", "KOSPI", "up", null,
          [[30, 0.8], [90, 2.4], [150, 1.6]], 3.6, "krx"),
        forecast("c13", "threads", 200, "원/달러 환율은 석 달 안에 내릴 것이다.", "원/달러 환율", "down", 90,
          [[30, -0.4], [60, -1.1], [90, -2.9]], -2.2, "bok"),
        forecast("c14", "facebook", 140, "서울 아파트값은 반년 안에 내릴 것이다.", "서울 아파트 매매가격지수", "down", 180,
          [[30, 0.6], [90, 1.4]], 1.9, "reb", { fix: [100, "예측과 달리 상승했습니다. 정정합니다."] }),
        forecast("c15", "x", 80, "코스닥은 한 달 내 상승할 것이다.", "KOSDAQ", "up", 30,
          [[7, 0.5], [14, 1.1], [30, 2.6]], 3.0, "krx"),
      ],
    },

    /* ───────────────── D : 신뢰 낮음 ───────────────── */
    {
      id: "sample-caution",
      name: "샘플 D",
      role: "투자 인플루언서 (가상)",
      handles: { instagram: "@sample_invest_d", threads: "@sample_invest_d" },
      postsScanned: 1879,
      claims: [
        fact("d01", "instagram", 320, "economy", "한국은행이 곧 기준금리를 급격히 올린다고 확정 발표했다.", "false", "bok", "통화정책방향", "그런 발표는 없었음", { cited: false }),
        fact("d02", "threads", 290, "bill", "주식 양도세 폐지법이 이미 통과됐다.", "false", "assembly", "의안 처리현황", "발의 단계에 머묾", { cited: false }),
        fact("d03", "instagram", 260, "ruling", "대법원이 해당 투자사의 손을 들어줬다.", "mixed", "scourt", "선고 판결문", "하급심 결과와 혼동", { cited: false }),
        fact("d04", "threads", 230, "economy", "올해 실업률이 역대 최고를 기록했다.", "false", "kostat", "경제활동인구조사", "최고치 아님", { cited: false }),
        fact("d05", "instagram", 200, "economy", "정부가 전 국민 투자지원금 지급을 발표했다.", "mostly_false", "moef", "정책 보도자료", "검토 단계일 뿐 발표 아님", { cited: false }),
        fact("d06", "threads", 170, "politics", "선관위가 해당 정당의 등록을 취소했다.", "false", "nec", "정당 등록 현황", "취소 사실 없음", { cited: false }),
        fact("d07", "instagram", 140, "economy", "국내 소비자물가는 3개월째 하락했다.", "mostly_true", "kostat", "소비자물가동향", "두 달 하락·한 달 상승, 큰 흐름은 일치", { cited: false }),
        fact("d08", "threads", 110, "bill", "개정안은 내일부터 바로 시행된다.", "mostly_false", "moleg", "법률 부칙", "공포 6개월 뒤 시행", { cited: false }),
        fact("d09", "instagram", 70, "economy", "한은 발표상 가계부채는 사상 최대로 급감했다.", "false", "bok", "금융안정보고서", "급감이 아니라 증가세 둔화", { cited: false }),
        fact("d15", "threads", 50, "economy", "이번 달 금융통화위원회는 기준금리를 동결했다.", "true", "bok", "통화정책방향", "결정문상 동결", { cited: false }),
        fact("d16", "instagram", 30, "ruling", "헌재는 해당 사건을 각하했다.", "true", "ccourt", "결정문", "주문 일치", { cited: true }),
        forecast("d10", "instagram", 300, "코스피는 한 달 안에 폭락한다.", "KOSPI", "down", 30,
          [[7, 1.3], [14, 2.1], [30, 3.4]], 9.2, "krx"),
        forecast("d11", "threads", 250, "원/달러 환율은 연말까지 급등한다.", "원/달러 환율", "up", null,
          [[30, -0.9], [90, -2.6], [150, -3.8]], -4.9, "bok"),
        forecast("d12", "instagram", 190, "서울 아파트값은 두 달 내 폭락한다.", "서울 아파트 매매가격지수", "down", 60,
          [[14, 0.4], [30, 0.9], [60, 1.8]], 3.2, "reb"),
        forecast("d13", "threads", 120, "코스닥은 반드시 오른다.", "KOSDAQ", "up", null,
          [[14, -1.4], [30, -3.0], [90, -5.7]], -6.4, "krx"),
        forecast("d14", "instagram", 60, "한 달 안에 코스피가 오른다.", "KOSPI", "up", 30,
          [[7, 0.2], [14, -0.5], [30, 0.4]], 1.3, "krx"),
      ],
    },
  ];

  accounts.forEach(function (a) {
    a.sample = true;
    a.asOf = AS_OF;
    a.platforms = Object.keys(a.handles);
  });

  window.FM_DATA = { asOf: AS_OF, accounts: accounts };
})();
