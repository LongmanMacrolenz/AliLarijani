// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("../assets/js/engine.js");

const fc = (over) =>
  Object.assign(
    {
      asset: "KOSPI",
      direction: "up",
      horizonDays: null,
      path: [{ day: 30, change: 2 }, { day: 90, change: 6 }],
      now: { day: 200, change: -4 }, // rallied, then gave it all back
    },
    over
  );

test("기간 미제시 → 현재 기준으로 평가한다", () => {
  const r = E.evaluateForecast(fc());
  assert.equal(r.mode, "now");
  assert.equal(r.endDay, 200);
  assert.equal(r.endChange, -4);
  assert.equal(r.outcome, "miss"); // 현재 기준으로는 빗나감
});

test("기간 제시 → 그 시점 기준으로 평가한다 (이후 되돌림은 무관)", () => {
  const r = E.evaluateForecast(fc({ horizonDays: 90 }));
  assert.equal(r.mode, "horizon");
  assert.equal(r.endDay, 90);
  assert.equal(r.endChange, 6);
  assert.equal(r.outcome, "hit");
});

test("기간이 지정 시점 사이면 선형 보간한다", () => {
  const r = E.evaluateForecast(fc({ horizonDays: 60 })); // 30일 +2, 90일 +6 → 60일 +4
  assert.equal(r.endChange, 4);
});

test("기간이 아직 도래하지 않았으면 pending(현재 기준, 가중 0.5)", () => {
  const r = E.evaluateForecast(fc({ horizonDays: 365 }));
  assert.equal(r.mode, "pending");
  assert.equal(r.endDay, 200);
  assert.equal(r.weight, 0.5);
});

test("하락 예측은 부호가 뒤집힌다", () => {
  const r = E.evaluateForecast(fc({ direction: "down", horizonDays: 90 }));
  assert.equal(r.signedChange, -6);
  assert.equal(r.outcome, "miss");
});

test("폭이 클수록, 추이가 일관될수록 점수가 높다", () => {
  const strong = E.evaluateForecast(fc({ path: [{ day: 30, change: 5 }, { day: 90, change: 12 }], now: { day: 90, change: 12 } }));
  const weak = E.evaluateForecast(fc({ path: [{ day: 30, change: -1 }, { day: 90, change: 1 }], now: { day: 90, change: 1.5 } }));
  assert.ok(strong.score > weak.score);
  assert.ok(strong.trendShare === 1 && weak.trendShare < 1);
});

test("등급 경계값", () => {
  assert.equal(E.gradeFor(90).id, "S");
  assert.equal(E.gradeFor(89.9).id, "A");
  assert.equal(E.gradeFor(80).id, "A");
  assert.equal(E.gradeFor(70).id, "B");
  assert.equal(E.gradeFor(55).id, "C");
  assert.equal(E.gradeFor(54.9).id, "D");
});

const mkFact = (id, verdict, extra) =>
  Object.assign({ id, kind: "fact", topic: "economy", verdict, cited: true }, extra);

test("표본이 MIN_CLAIMS 미만이면 등급을 보류한다", () => {
  const claims = Array.from({ length: 7 }, (_, i) => mkFact("f" + i, "true"));
  const r = E.evaluate({ id: "t", asOf: "2026-01-01", claims });
  assert.equal(r.status, "insufficient");
  assert.equal(r.grade, undefined);
});

test("작은 표본은 중간값(50)쪽으로 수축한다", () => {
  const claims = Array.from({ length: 8 }, (_, i) => mkFact("f" + i, "true"));
  const r = E.evaluate({ id: "t", asOf: "2026-01-01", claims });
  assert.equal(r.raw, 100);
  assert.ok(r.score < 100 && r.score > 85);
  const big = E.evaluate({ id: "t", asOf: "2026-01-01", claims: Array.from({ length: 80 }, (_, i) => mkFact("f" + i, "true")) });
  assert.ok(big.score > r.score);
});

test("검증 불가 발언은 점수에서 빠지고 coverage에만 반영된다", () => {
  const claims = Array.from({ length: 8 }, (_, i) => mkFact("f" + i, "true")).concat([mkFact("u", "unverifiable")]);
  const r = E.evaluate({ id: "t", asOf: "2026-01-01", claims });
  assert.equal(r.n, 8);
  assert.equal(r.totalClaims, 9);
  assert.ok(Math.abs(r.coverage - 8 / 9) < 1e-9);
});

test("예측이 없으면 가중치를 나머지 지표에 재배분한다", () => {
  const claims = Array.from({ length: 8 }, (_, i) => mkFact("f" + i, "true"));
  const r = E.evaluate({ id: "t", asOf: "2026-01-01", claims });
  assert.equal(r.components.forecast, undefined);
  const sum = Object.values(r.components).reduce((s, c) => s + c.weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});

test("틀린 발언을 정정하면 정정 지표가 오른다", () => {
  const base = Array.from({ length: 8 }, (_, i) => mkFact("f" + i, "true"));
  const bad = mkFact("bad", "false");
  const fixed = mkFact("bad", "false", { correction: { text: "정정" } });
  const a = E.evaluate({ id: "t", asOf: "2026-01-01", claims: base.concat([bad]) });
  const b = E.evaluate({ id: "t", asOf: "2026-01-01", claims: base.concat([fixed]) });
  assert.equal(a.components.correction.score, 0);
  assert.equal(b.components.correction.score, 1);
  assert.ok(b.score > a.score);
});

test("법안·판결 발언은 가중치가 더 크다", () => {
  const mk = (topic) => {
    const claims = Array.from({ length: 8 }, (_, i) => mkFact("f" + i, "true")).concat([mkFact("x", "false", { topic })]);
    return E.evaluate({ id: "t", asOf: "2026-01-01", claims }).components.fact.score;
  };
  assert.ok(mk("bill") < mk("economy")); // 법안 오류가 더 크게 감점
});

test("인증서는 70점 이상에서만 발급된다", () => {
  const good = E.evaluate({ id: "g", asOf: "2026-01-01", claims: Array.from({ length: 30 }, (_, i) => mkFact("f" + i, "true")) });
  const bad = E.evaluate({ id: "b", asOf: "2026-01-01", claims: Array.from({ length: 30 }, (_, i) => mkFact("f" + i, "false")) });
  assert.equal(good.certified, true);
  assert.equal(bad.certified, false);
});

test("발급번호는 입력이 같으면 같고, 다르면 달라진다", () => {
  const a = E.certificateNumber("acct", 88.1, "2026-09-30");
  assert.equal(a, E.certificateNumber("acct", 88.1, "2026-09-30"));
  assert.notEqual(a, E.certificateNumber("acct", 88.2, "2026-09-30"));
  assert.match(a, /^FM-2026-[0-9A-Z]{4}-[0-9A-Z]{3}$/);
});

test("샘플 계정 4종이 의도한 등급으로 평가된다", () => {
  global.window = {};
  delete require.cache[require.resolve("../assets/js/data.js")];
  require("../assets/js/data.js");
  const by = Object.fromEntries(global.window.FM_DATA.accounts.map((a) => [a.id, E.evaluate(a)]));
  assert.equal(by["sample-gold"].grade.id, "S");
  assert.equal(by["sample-silver"].grade.id, "A");
  assert.equal(by["sample-bronze"].grade.id, "B");
  assert.equal(by["sample-caution"].grade.id, "D");
  assert.equal(by["sample-caution"].certified, false);
});
