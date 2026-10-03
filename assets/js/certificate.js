/*!
 * FACTMARK certificate renderer — pure SVG (no external assets) so it can be
 * shown inline, exported to PNG, or printed to PDF with identical output.
 *
 *   FMCert.build({ name, role, handles, score, grade, certified, certificateNo, asOf, n, confidence, sample, flat })
 *     -> SVG markup string (viewBox 1600 x 1131, A4 landscape)
 *        flat: true omits the paper-grain filter (used for exports — grain makes PNGs ~10x larger)
 *   FMCert.toPng(svg, scale) -> Promise<Blob>
 */
(function (root) {
  "use strict";

  var W = 1600, H = 1131;
  var SERIF = "'Noto Serif KR','Nanum Myeongjo','AppleMyungjo','Batang','Source Han Serif K',Georgia,serif";
  var LATIN = "'Cormorant Garamond','Playfair Display','Times New Roman',Georgia,serif";
  var SANS = "'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic','Nanum Gothic',sans-serif";
  var NAVY = "#14213D", INK2 = "#4A5675", MUTED = "#7A849B";

  // Metal themes per grade tier: gradient stops + accent line color + deep ink for text on metal
  var METALS = {
    gold:   { stops: ["#FBEFC0", "#E2BC63", "#B98A2E", "#F2DC8E", "#9C7120"], accent: "#B58A2F", deep: "#5E4410", name: "GOLD" },
    silver: { stops: ["#FAFBFC", "#CDD4DD", "#8F9AA8", "#EEF1F5", "#7A8696"], accent: "#8793A3", deep: "#3E4857", name: "SILVER" },
    bronze: { stops: ["#F6D6B4", "#D6925A", "#9C5D2C", "#EDBE90", "#7E4821"], accent: "#A9672F", deep: "#52290F", name: "BRONZE" },
    slate:  { stops: ["#EEF1F6", "#B6BECC", "#7F8A9D", "#DDE2EB", "#6B778C"], accent: "#76829A", deep: "#2F394C", name: "ASSESSED" },
  };

  var uid = 0;
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function f1(x) { return Math.round(x * 10) / 10; }

  /* ----- geometry: a rounded rectangle you can walk along, with outward normals ----- */
  function roundedRect(x, y, w, h, r) {
    var segs = [], L = 0, PI = Math.PI;
    function line(x0, y0, x1, y1, nx, ny) {
      var len = Math.hypot(x1 - x0, y1 - y0);
      segs.push({ t: 0, x0: x0, y0: y0, x1: x1, y1: y1, nx: nx, ny: ny, len: len, s0: L }); L += len;
    }
    function arc(cx, cy, a0, a1) {
      var len = r * Math.abs(a1 - a0);
      segs.push({ t: 1, cx: cx, cy: cy, a0: a0, a1: a1, len: len, s0: L }); L += len;
    }
    line(x + r, y, x + w - r, y, 0, -1);
    arc(x + w - r, y + r, -PI / 2, 0);
    line(x + w, y + r, x + w, y + h - r, 1, 0);
    arc(x + w - r, y + h - r, 0, PI / 2);
    line(x + w - r, y + h, x + r, y + h, 0, 1);
    arc(x + r, y + h - r, PI / 2, PI);
    line(x, y + h - r, x, y + r, -1, 0);
    arc(x + r, y + r, PI, 1.5 * PI);
    function at(s) {
      s = ((s % L) + L) % L;
      for (var i = 0; i < segs.length; i++) {
        var g = segs[i];
        if (s <= g.s0 + g.len || i === segs.length - 1) {
          var u = (s - g.s0) / g.len;
          if (!g.t) return { x: g.x0 + (g.x1 - g.x0) * u, y: g.y0 + (g.y1 - g.y0) * u, nx: g.nx, ny: g.ny };
          var a = g.a0 + (g.a1 - g.a0) * u;
          return { x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a), nx: Math.cos(a), ny: Math.sin(a) };
        }
      }
    }
    return { L: L, at: at };
  }

  var guillocheCache = {};
  /** Interwoven sine bands around the frame — the "banknote" look. Geometry is tier-independent. */
  function guilloche() {
    if (guillocheCache.d) return guillocheCache.d;
    var rr = roundedRect(70, 70, W - 140, H - 140, 28), N = 760;
    function wave(freq, amp, phase) {
      var d = "";
      for (var i = 0; i <= N; i++) {
        var p = rr.at((i / N) * rr.L);
        var o = amp * Math.sin((2 * Math.PI * freq * i) / N + phase);
        d += (i ? "L" : "M") + f1(p.x + p.nx * o) + " " + f1(p.y + p.ny * o);
      }
      return d + "Z";
    }
    var out = { navy: [], metal: [] }, k;
    for (k = 0; k < 4; k++) out.navy.push(wave(70, 17, (k * Math.PI) / 2));
    for (k = 0; k < 3; k++) out.metal.push(wave(105, 9.5, (k * 2 * Math.PI) / 3));
    guillocheCache.d = out;
    return out;
  }

  /** Hypotrochoid rosette centered at 0,0 with max radius `size`. */
  function rosette(size, R, r, d, rot) {
    var turns = r / gcd(R, r), steps = 360, pts = "", max = R - r + d;
    for (var i = 0; i <= steps; i++) {
      var t = (2 * Math.PI * turns * i) / steps + rot;
      var x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      var y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      pts += (i ? "L" : "M") + f1((x / max) * size) + " " + f1((y / max) * size);
    }
    return pts + "Z";
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  function starburst(cx, cy, rOut, rIn, teeth) {
    var d = "";
    for (var i = 0; i < teeth * 2; i++) {
      var a = (Math.PI * i) / teeth - Math.PI / 2, r = i % 2 ? rIn : rOut;
      d += (i ? "L" : "M") + f1(cx + r * Math.cos(a)) + " " + f1(cy + r * Math.sin(a));
    }
    return d + "Z";
  }

  function textWidth(s, px) {
    // rough estimate: CJK / full-width ≈ 1em, latin ≈ .56em
    var w = 0;
    for (var i = 0; i < s.length; i++) w += s.charCodeAt(i) > 0x2e80 ? px : px * 0.56;
    return w;
  }

  function platformGlyph(p) {
    return { threads: "Th", instagram: "Ig", x: "X", facebook: "Fb" }[p] || "•";
  }

  /* ----- the certificate ----- */
  function build(o) {
    var id = "fm" + ++uid + "-";
    var certified = o.certified !== false;
    var tier = certified ? o.grade.tier : "slate";
    var M = METALS[tier] || METALS.slate;
    var metalGrad = function (n, vertical) {
      return '<linearGradient id="' + id + n + '" x1="0" y1="0" x2="' + (vertical ? 0 : 1) + '" y2="1">' +
        M.stops.map(function (c, i) { return '<stop offset="' + i / (M.stops.length - 1) + '" stop-color="' + c + '"/>'; }).join("") +
        "</linearGradient>";
    };
    var g = guilloche();
    var title = certified ? "SNS 발언 신뢰도 인증서" : "SNS 발언 신뢰도 평가서";
    var eng = certified ? "CERTIFICATE OF CREDIBILITY" : "CREDIBILITY ASSESSMENT";
    var statement = certified
      ? ["이 인증서는 아래 계정이 게시한 정치·경제 발언을", "공신력 있는 기관의 발표와 대조·검증한 결과임을 증명합니다."]
      : ["이 평가서는 아래 계정이 게시한 정치·경제 발언을", "공신력 있는 기관의 발표와 대조·검증한 결과를 기록합니다."];
    var score = (Math.round(o.score * 10) / 10).toFixed(1);
    var cx = W / 2;

    /* name */
    var nameSize = Math.max(40, Math.min(64, (64 * 9) / Math.max(9, textWidth(o.name, 1) + 1)));

    /* handle chips */
    var hs = Object.keys(o.handles || {}).map(function (p) { return { p: p, h: o.handles[p] }; });
    var chipW = hs.map(function (c) { return 58 + textWidth(c.h, 17) + 22; });
    var gap = 14, total = chipW.reduce(function (a, b) { return a + b; }, 0) + gap * Math.max(0, hs.length - 1);
    var x0 = cx - total / 2, chips = "";
    hs.forEach(function (c, i) {
      chips +=
        '<g transform="translate(' + f1(x0) + ' 478)">' +
        '<rect width="' + f1(chipW[i]) + '" height="36" rx="18" fill="#fff" fill-opacity=".7" stroke="' + M.accent + '" stroke-opacity=".7"/>' +
        '<circle cx="19" cy="18" r="13" fill="' + NAVY + '"/>' +
        '<text x="19" y="22.5" font-family="' + SANS + '" font-size="11.5" font-weight="700" fill="#fff" text-anchor="middle">' + platformGlyph(c.p) + "</text>" +
        '<text x="40" y="24" font-family="' + SANS + '" font-size="17" fill="' + NAVY + '">' + esc(c.h) + "</text></g>";
      x0 += chipW[i] + gap;
    });

    /* footer cells */
    var conf = { high: "높음", medium: "보통", low: "낮음" }[o.confidence] || "보통";
    var cells = [
      ["발급번호  CERTIFICATE NO.", o.certificateNo],
      ["평가 기준일  AS OF", o.asOf.replace(/-/g, ". ")],
      ["평가 방식  METHOD", "기관 발표 대조 · 시세 추이"],
      ["표본 신뢰도  CONFIDENCE", conf + " (검증 발언 " + o.n + "건)"],
    ];
    var footer = "";
    cells.forEach(function (c, i) {
      var x = 170 + 315 * i + 157.5;
      footer +=
        '<text x="' + x + '" y="934" text-anchor="middle" font-family="' + SANS + '" font-size="11.5" letter-spacing="1.4" fill="' + MUTED + '">' + esc(c[0]) + "</text>" +
        '<text x="' + x + '" y="962" text-anchor="middle" font-family="' + (i < 2 ? LATIN : SANS) + '" font-size="' + (i < 2 ? 25 : 17) + '" font-weight="' + (i < 2 ? 700 : 600) + '" fill="' + NAVY + '">' + esc(c[1]) + "</text>";
      if (i) footer += '<line x1="' + (170 + 315 * i) + '" y1="918" x2="' + (170 + 315 * i) + '" y2="972" stroke="' + M.accent + '" stroke-opacity=".35"/>';
    });

    /* seal */
    var sy = 662, ringR = 84, circ = 2 * Math.PI * ringR;
    var ringText = certified ? "CERTIFIED  ◆  FACTMARK  ◆  CREDIBILITY  ◆  VERIFIED  ◆  " : "ASSESSMENT ONLY  ◆  FACTMARK  ◆  NOT CERTIFIED  ◆  ";
    var seal =
      '<g>' +
      // ribbons — awards only; an assessment below the bar should not look like a prize
      (certified
        ? '<g stroke="' + M.accent + '" stroke-width="1.5" stroke-linejoin="round">' +
          '<path d="M742 754 L800 772 L776 896 L752 870 L722 892 Z" fill="url(#' + id + 'rib)"/>' +
          '<path d="M858 754 L800 772 L824 896 L848 870 L878 892 Z" fill="url(#' + id + 'rib)"/>' +
          "</g>" +
          '<path d="M742 754 L752 798 M858 754 L848 798" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>'
        : "") +
      // body
      '<path d="' + starburst(cx, sy, 120, 111, 44) + '" fill="url(#' + id + 'm1)" stroke="' + M.deep + '" stroke-opacity=".45" stroke-width="1.2" stroke-linejoin="round" filter="url(#' + id + 'sh)"/>' +
      '<circle cx="' + cx + '" cy="' + sy + '" r="102" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>' +
      '<circle cx="' + cx + '" cy="' + sy + '" r="98" fill="none" stroke="' + M.deep + '" stroke-opacity=".5" stroke-width="1"/>' +
      '<path id="' + id + 'rt" d="M' + (cx - ringR) + " " + sy + " a" + ringR + " " + ringR + " 0 1 1 " + 2 * ringR + " 0 a" + ringR + " " + ringR + " 0 1 1 " + -2 * ringR + ' 0" fill="none"/>' +
      '<text font-family="' + SANS + '" font-size="12.5" font-weight="700" fill="' + M.deep + '" fill-opacity=".85">' +
      '<textPath href="#' + id + 'rt" startOffset="0" textLength="' + f1(circ - 4) + '" lengthAdjust="spacing">' + esc(ringText) + "</textPath></text>" +
      '<circle cx="' + cx + '" cy="' + sy + '" r="70" fill="url(#' + id + 'm2)" stroke="' + M.deep + '" stroke-opacity=".55" stroke-width="1.5"/>' +
      '<circle cx="' + cx + '" cy="' + sy + '" r="64" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>' +
      '<text x="' + cx + '" y="' + (sy + 26) + '" text-anchor="middle" font-family="' + LATIN + '" font-size="92" font-weight="700" fill="' + NAVY + '">' + esc(o.grade.id) + "</text>" +
      '<text x="' + cx + '" y="' + (sy + 52) + '" text-anchor="middle" font-family="' + SANS + '" font-size="11" font-weight="700" letter-spacing="3.5" fill="' + M.deep + '">' + M.name + "</text>" +
      "</g>";

    /* corner ornaments */
    var corner = function (x, y, rot) {
      return '<g transform="translate(' + x + " " + y + ')">' +
        '<circle r="46" fill="#FBF6E9" stroke="' + NAVY + '" stroke-width="2"/>' +
        '<circle r="42" fill="none" stroke="' + M.accent + '" stroke-width="1"/>' +
        '<path d="' + rosette(38, 7, 3, 7, rot) + '" fill="none" stroke="' + NAVY + '" stroke-opacity=".75" stroke-width=".9"/>' +
        '<path d="' + rosette(34, 5, 3, 5, rot + 0.4) + '" fill="none" stroke="url(#' + id + 'm1)" stroke-width="1.3"/>' +
        '<circle r="6" fill="url(#' + id + 'm1)" stroke="' + M.deep + '" stroke-opacity=".5"/></g>';
    };

    var watermark = o.sample
      ? '<text x="' + cx + '" y="640" text-anchor="middle" transform="rotate(-18 ' + cx + ' 640)" font-family="' + LATIN + '" font-size="250" font-weight="700" letter-spacing="14" fill="' + NAVY + '" fill-opacity=".045">SAMPLE</text>'
      : "";
    var fine = (o.sample ? "[샘플] 가상 계정·가상 데이터로 만든 예시이며 실제 인물과 무관합니다.  " : "") +
      "본 문서는 FACTMARK 평가 엔진이 공개 게시물을 공식 기관 발표와 대조해 산출한 결과이며, 법적 효력을 갖는 공문서가 아닙니다.";

    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' +
      esc(o.name + " " + title + " — 신뢰 점수 " + score + "점, " + o.grade.id + "등급") + '">' +
      "<defs>" +
      metalGrad("m1") + metalGrad("m2", true) +
      '<linearGradient id="' + id + 'rib" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#25365F"/><stop offset="1" stop-color="#0E1830"/></linearGradient>' +
      '<radialGradient id="' + id + 'paper" cx=".5" cy=".42" r=".8"><stop offset="0" stop-color="#FFFDF6"/><stop offset=".65" stop-color="#FAF3E1"/><stop offset="1" stop-color="#F0E4C8"/></radialGradient>' +
      '<filter id="' + id + 'sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#14213D" flood-opacity=".28"/></filter>' +
      '<filter id="' + id + 'nz" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .15  0 0 0 .5 0"/></filter>' +
      "</defs>" +
      // paper
      '<rect width="' + W + '" height="' + H + '" fill="url(#' + id + 'paper)"/>' +
      (o.flat ? "" : '<rect width="' + W + '" height="' + H + '" filter="url(#' + id + 'nz)" opacity=".28"/>') +
      watermark +
      // frame
      '<rect x="22" y="22" width="' + (W - 44) + '" height="' + (H - 44) + '" rx="12" fill="none" stroke="' + NAVY + '" stroke-width="5"/>' +
      '<rect x="40" y="40" width="' + (W - 80) + '" height="' + (H - 80) + '" rx="8" fill="none" stroke="' + NAVY + '" stroke-width="1.4"/>' +
      '<g fill="none" stroke-linejoin="round">' +
      g.navy.map(function (d) { return '<path d="' + d + '" stroke="' + NAVY + '" stroke-opacity=".5" stroke-width=".9"/>'; }).join("") +
      g.metal.map(function (d) { return '<path d="' + d + '" stroke="url(#' + id + 'm1)" stroke-width="1.15"/>'; }).join("") +
      "</g>" +
      '<rect x="100" y="100" width="' + (W - 200) + '" height="' + (H - 200) + '" rx="4" fill="none" stroke="' + NAVY + '" stroke-width="1.4"/>' +
      '<rect x="108" y="108" width="' + (W - 216) + '" height="' + (H - 216) + '" rx="2" fill="none" stroke="url(#' + id + 'm1)" stroke-width="3.2"/>' +
      corner(86, 86, 0) + corner(W - 86, 86, 0.9) + corner(86, H - 86, 1.8) + corner(W - 86, H - 86, 2.7) +
      // header
      '<g transform="translate(' + (cx - 130) + ' 160)"><circle r="15" fill="' + NAVY + '"/><path d="M-6.5 .5 L-1.5 5.5 L7 -4.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g>' +
      '<text x="' + (cx + 22) + '" y="168" text-anchor="middle" font-family="' + LATIN + '" font-size="30" font-weight="700" letter-spacing="9" fill="' + NAVY + '">FACTMARK</text>' +
      '<text x="' + cx + '" y="203" text-anchor="middle" font-family="' + SANS + '" font-size="13.5" font-weight="600" letter-spacing="6.5" fill="' + M.accent + '">' + eng + "</text>" +
      '<text x="' + cx + '" y="270" text-anchor="middle" font-family="' + SERIF + '" font-size="60" font-weight="700" fill="' + NAVY + '">' + title + "</text>" +
      '<g stroke="' + M.accent + '" stroke-width="1.4"><line x1="560" y1="296" x2="768" y2="296"/><line x1="832" y1="296" x2="1040" y2="296"/></g>' +
      '<rect x="' + (cx - 6) + '" y="290" width="12" height="12" transform="rotate(45 ' + cx + " 296)" + '" fill="url(#' + id + 'm1)" stroke="' + M.deep + '" stroke-opacity=".4"/>' +
      '<text x="' + cx + '" y="338" text-anchor="middle" font-family="' + SERIF + '" font-size="19.5" fill="' + INK2 + '">' + statement[0] + "</text>" +
      '<text x="' + cx + '" y="366" text-anchor="middle" font-family="' + SERIF + '" font-size="19.5" fill="' + INK2 + '">' + statement[1] + "</text>" +
      // identity
      '<text x="' + cx + '" y="434" text-anchor="middle" font-family="' + SERIF + '" font-size="' + f1(nameSize) + '" font-weight="800" fill="' + NAVY + '">' + esc(o.name) + "</text>" +
      '<text x="' + cx + '" y="466" text-anchor="middle" font-family="' + SANS + '" font-size="19" fill="' + INK2 + '">' + esc(o.role || "") + "</text>" +
      chips +
      // score + grade + seal
      '<g text-anchor="middle">' +
      '<text x="410" y="598" font-family="' + SANS + '" font-size="14" font-weight="600" letter-spacing="4" fill="' + M.accent + '">신뢰 점수 · TRUST SCORE</text>' +
      '<text x="410" y="700" font-family="' + LATIN + '" font-size="118" font-weight="700" fill="' + NAVY + '">' + score + "</text>" +
      '<text x="410" y="742" font-family="' + SANS + '" font-size="18" fill="' + MUTED + '">/ 100점 만점</text>' +
      '<text x="1190" y="598" font-family="' + SANS + '" font-size="14" font-weight="600" letter-spacing="4" fill="' + M.accent + '">신뢰 등급 · GRADE</text>' +
      '<text x="1190" y="666" font-family="' + SERIF + '" font-size="46" font-weight="800" fill="' + NAVY + '">' + esc(o.grade.name) + "</text>" +
      '<text x="1190" y="708" font-family="' + SANS + '" font-size="16.5" fill="' + INK2 + '">' + esc(o.grade.blurb) + "</text>" +
      '<text x="1190" y="738" font-family="' + SANS + '" font-size="14" fill="' + MUTED + '">' + (certified ? "인증 기준 70점 이상 충족" : "인증 기준(70점) 미달 · 평가서로 발급") + "</text>" +
      "</g>" +
      seal +
      // footer
      '<line x1="170" y1="906" x2="1430" y2="906" stroke="' + M.accent + '" stroke-opacity=".6" stroke-width="1.2"/>' +
      footer +
      '<text x="' + cx + '" y="1002" text-anchor="middle" font-family="' + SANS + '" font-size="11.5" fill="' + MUTED + '">' + esc(fine) + "</text>" +
      "</svg>"
    );
  }

  /** Rasterise the SVG. Webfonts can't enter an SVG image, so PNG text uses installed system fonts. */
  function toPng(svg, scale) {
    scale = scale || 2;
    return new Promise(function (resolve, reject) {
      var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas");
        c.width = W * scale; c.height = H * scale;
        var ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? resolve(b) : reject(new Error("PNG 변환 실패")); }, "image/png");
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("이미지 로드 실패")); };
      img.src = url;
    });
  }

  root.FMCert = { build: build, toPng: toPng, W: W, H: H, METALS: METALS };
})(typeof self !== "undefined" ? self : this);
