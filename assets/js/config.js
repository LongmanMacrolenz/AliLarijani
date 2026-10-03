/*
 * 사이트 설정 — 브랜드명, 가격, 결제 연결, 팩트체크 기준 기관.
 * 이름·가격은 모두 가안입니다. 이 파일만 고치면 전체 화면에 반영됩니다.
 */
window.FM_CONFIG = {
  brand: {
    name: "팩트마크",
    en: "FACTMARK",
    tagline: "SNS 발언 신뢰도 인증",
  },

  // 결제 페이지 URL (예: 토스페이먼츠/스티비 결제 링크). 비워두면 '결제 준비 중' 안내가 열립니다.
  checkoutUrl: "",

  // 유료 상세 보고서 가격(가안). 실제 값은 시장 검증 후 확정하세요.
  plans: [
    {
      id: "free",
      name: "무료 진단",
      price: "0원",
      unit: "",
      features: ["신뢰 점수 (100점 만점)", "신뢰 등급 (S~D)", "기본 인증서 PNG 저장", "검증 발언 수·표본 신뢰도"],
      cta: "무료로 진단하기",
      href: "index.html#diagnose",
    },
    {
      id: "report",
      name: "상세 분석 보고서",
      price: "9,900원",
      unit: "/ 1회",
      badge: "가장 많이 선택",
      features: [
        "발언별 팩트체크 로그 (기관 출처 표기)",
        "경제 발언 상승·하락 추이 차트",
        "법안·판결·경제·정치 주제별 정확도",
        "정정 이력 · 출처 인용률",
        "검증번호가 새겨진 공식 인증서 (PDF)",
      ],
      cta: "상세 보고서 받기",
      href: "report.html",
    },
    {
      id: "monitor",
      name: "월간 모니터링",
      price: "29,000원",
      unit: "/ 월",
      features: ["상세 보고서 전체 포함", "매월 재평가 · 등급 변동 알림", "인증서 최신 상태 유지", "공개 검증 페이지 배지"],
      cta: "모니터링 문의",
      href: "report.html#plans",
    },
  ],

  // 팩트체크는 아래 '공신력 있는 기관 발표'만 근거로 삼습니다.
  authorities: {
    bok: { name: "한국은행", kind: "통화·금융" },
    kostat: { name: "통계청(국가데이터처)", kind: "통계" },
    moef: { name: "기획재정부", kind: "재정·세제" },
    motie: { name: "산업통상자원부", kind: "수출입·산업" },
    reb: { name: "한국부동산원", kind: "부동산" },
    krx: { name: "한국거래소", kind: "시세" },
    fsc: { name: "금융위원회·금융감독원", kind: "금융" },
    ftc: { name: "공정거래위원회", kind: "경쟁·공정" },
    assembly: { name: "국회 의안정보시스템", kind: "법안" },
    moleg: { name: "법제처 국가법령정보센터", kind: "법령" },
    scourt: { name: "대법원 종합법률정보", kind: "판결" },
    ccourt: { name: "헌법재판소", kind: "결정" },
    nec: { name: "중앙선거관리위원회", kind: "선거" },
    intl: { name: "IMF·OECD·세계은행", kind: "국제기구" },
  },

  platforms: {
    threads: { name: "Threads", short: "Th" },
    instagram: { name: "Instagram", short: "Ig" },
    x: { name: "X", short: "X" },
    facebook: { name: "Facebook", short: "Fb" },
  },
};
