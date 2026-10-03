/* Shared helpers for index.html and report.html */
(function (root) {
  "use strict";
  var CFG = root.FM_CONFIG, DATA = root.FM_DATA, E = root.FMEngine, CERT = root.FMCert;

  var results = {};
  DATA.accounts.forEach(function (a) { results[a.id] = E.evaluate(a); });

  function account(id) {
    return DATA.accounts.filter(function (a) { return a.id === id; })[0] || null;
  }
  function result(id) { return results[id] || null; }

  function certSvg(a, r, flat) {
    return CERT.build({
      flat: !!flat,
      name: a.name, role: a.role, handles: a.handles,
      score: r.score, grade: r.grade, certified: r.certified,
      certificateNo: r.certificateNo, asOf: a.asOf, n: r.n, confidence: r.confidence,
      sample: !!a.sample,
    });
  }

  var toastTimer;
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("on"); }, 2600);
  }

  function downloadPng(a, r) {
    toast("인증서 이미지를 만드는 중…");
    CERT.toPng(certSvg(a, r, true), 1.5).then(function (blob) {
      var url = URL.createObjectURL(blob), el = document.createElement("a");
      el.href = url; el.download = "factmark-" + r.certificateNo + ".png";
      document.body.appendChild(el); el.click(); el.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      toast("PNG로 저장했어요");
    }).catch(function () { toast("이미지 저장에 실패했어요. 인쇄/PDF를 이용해 주세요."); });
  }

  function printCert(a, r) {
    var host = document.getElementById("print-root");
    if (!host) { host = document.createElement("div"); host.id = "print-root"; document.body.appendChild(host); }
    host.innerHTML = certSvg(a, r, true);
    document.body.classList.add("printing-cert");
    var done = function () {
      document.body.classList.remove("printing-cert"); host.innerHTML = "";
      window.removeEventListener("afterprint", done);
    };
    window.addEventListener("afterprint", done);
    window.print();
  }

  function copyShare(id) {
    var url = location.origin + location.pathname.replace(/[^/]*$/, "") + "index.html#r=" + id;
    var ok = function () { toast("공유 링크를 복사했어요"); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { prompt("링크를 복사하세요", url); });
    else prompt("링크를 복사하세요", url);
  }

  function openCheckout(id) {
    if (CFG.checkoutUrl) {
      var u = CFG.checkoutUrl + (CFG.checkoutUrl.indexOf("?") < 0 ? "?" : "&") + "account=" + encodeURIComponent(id || "");
      window.open(u, "_blank", "noopener");
      return;
    }
    var d = document.getElementById("dlg-checkout");
    if (d && d.showModal) d.showModal();
    else toast("결제 연동 준비 중인 프로토타입입니다.");
  }

  function wireCheckoutDialog() {
    var d = document.getElementById("dlg-checkout");
    if (!d) return;
    d.addEventListener("click", function (e) { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
  }

  function brandMark() {
    return '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6E7B0"/><stop offset=".5" stop-color="#E2BC63"/><stop offset="1" stop-color="#B58A2F"/></linearGradient></defs>' +
      '<path d="M16 2 28 6.5v8.6c0 7.2-4.9 12.2-12 14.9C8.9 27.3 4 22.3 4 15.1V6.5z" fill="#14213D" stroke="url(#bm)" stroke-width="1.6"/>' +
      '<path d="m10.5 16 4 4 7.5-8.5" fill="none" stroke="url(#bm)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function gradeClass(r) {
    return r && r.status === "ok" ? "medal-" + r.grade.tier : "medal-slate";
  }

  function fmtDate(iso) { return iso.replace(/-/g, ". "); }

  root.FM = {
    cfg: CFG, data: DATA, engine: E, account: account, result: result, certSvg: certSvg,
    toast: toast, downloadPng: downloadPng, printCert: printCert, copyShare: copyShare,
    openCheckout: openCheckout, wireCheckoutDialog: wireCheckoutDialog,
    brandMark: brandMark, gradeClass: gradeClass, fmtDate: fmtDate,
  };
})(window);
