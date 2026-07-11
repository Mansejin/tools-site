import fs from "fs";

const skills = {
  "영상 편집": { level: "top", detail: "모든 분야의 영상편집 가능, 내러티브 편집에 특색." },
  "현장 연출": { level: "high", detail: "현장 통솔 및 영상 연출 능숙히 가능" },
  "트랜드 분석": { level: "medium", detail: "최근 트랜드에 민감하게 반응하여 기획에 자연스럽게 적용 가능" },
  "유튜브 채널 관리": { level: "high", detail: "사내 채널 관리 및 개인 채널 운영 경험이 있어 기본적인 업로드 뿐만 아니라 데이터 분석 등의 채널 관리까지 가능" },
  "문제해결 능력": { level: "high", detail: "돌발 상황 발생 시 빠른 대안 구상과 임기응변 대응 가능" },
  "커뮤니케이션": { level: "high", detail: "내외부 파트너 협업 외부 업체 핸들링" },
  "AI 활용 능력": { level: "high", detail: "GPT 등 AI 툴을 능숙하게 다루며, 생성형 AI를 기획·제작 워크플로에 적극 활용합니다." },
  "스케줄링": { level: "high", detail: "계획적인 업무 수행은 기본" },
  "Premiere Pro": { level: "top", detail: "주 사용툴" },
  "After Effect": { level: "high", detail: "모션 그래픽, 텍스트 효과 제작 가능, 간단한 콤포지트 합성 및 VFX 합성 가능" },
  Photoshop: { level: "medium", detail: "대부분의 사진 보정 및 합성 가능" },
  illustrator: { level: "medium", detail: "영상 작업을 위한 대부분의 기능 사용 가능" },
};

const projects = {
  campaign: [
    { title: "23년 로지텍 + 디플러스 기아 바이럴", client: "Logitech G", year: "2023", url: "https://www.youtube.com/watch?v=ZgE8bJN8aik" },
    { title: "로지텍G + T1 (페이커) 바이럴", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=HqWoQGU23zI" },
    { title: "로지텍G X 젠지", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=jXkpSnyv-5s", note: "기획-제작 100%, 연출 100%, 후반작업 80%" },
    { title: "라이프먼트(스타트업) 광고 제작", client: "라이프먼트", year: "", url: "https://www.youtube.com/watch?v=by4hsAuHcIA", note: "기획, 연출, 편집 총괄 (기여도 100%)" },
    { title: "로지텍G + 담원 기아", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=ZgE8bJN8aik" },
    { title: "로지텍G + 조유리 TVC", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=QdXLuu8sQZ4" },
    { title: "2022 Q1 지누스X피크닉 캠페인", client: "Zinus", year: "2022", url: "https://www.youtube.com/watch?v=lWc9VOI51Ys" },
    { title: "2022 Q2 지누스 캠페인", client: "Zinus", year: "2022", url: "https://www.youtube.com/watch?v=kH1G1o2GBTA" },
    { title: "2023 Q2 지누스 캠페인 글로벌 베스트 셀러", client: "Zinus", year: "2023", url: "https://www.youtube.com/watch?v=FEAcbnA8DLo" },
  ],
  viral: [
    { title: "로지텍 프로게이머스 픽스 젠지", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=cNs0Oz1KK7g" },
    { title: "한국타이어 기안도 전시 스케치", client: "한국타이어", year: "", url: "https://www.youtube.com/watch?v=KDV2dm1bVlY" },
    { title: "한국타이어 하이퍼 컬렉션 전시 스케치", client: "한국타이어", year: "", url: "https://www.youtube.com/watch?v=PG6SoTdV14w" },
    { title: "22년 로지텍 + 담원 기아 바이럴", client: "Logitech G", year: "2022", url: "https://www.youtube.com/watch?v=SEPeWMUgns0" },
    { title: "(숏폼) 로지텍 헤드셋 웹캠 바이럴", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=-sfl51qJQYg" },
    { title: "MX MASTER 3 기업 바이럴", client: "Logitech", year: "", url: "" },
    { title: "로지텍G + KT 바이럴 콘텐츠", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=XhL9ea1huj8" },
    { title: "로지텍 프로게이머스 픽 KT", client: "Logitech G", year: "", url: "https://www.youtube.com/watch?v=JmJKzsTWVMY" },
    { title: "스위스 관광청 기업 바이럴", client: "스위스 관광청", year: "", url: "https://www.youtube.com/watch?v=lJWNvwgtpA4" },
  ],
  personal: [
    { title: "(영화) '혐의' 졸업작품", client: "", year: "", url: "https://www.youtube.com/watch?v=tip_mQQHF60" },
    { title: "(모작) 오징어게임 타이틀 모션그래픽", client: "", year: "", url: "https://www.youtube.com/watch?v=AGu4kQuizV4" },
  ],
  youtube: [
    { title: "스위치가 없다고? 로지텍G에서 작정하고 만든 괴물 마우스 출시! | PRO X2 SUPERSTRIKE", client: "디디딧", year: "", url: "https://www.youtube.com/watch?v=qVh-8rNKNig" },
    { title: "추우세요? 일단 들어와 | 가성비 있는 겨울 난방템 BEST 6 추천!", client: "디디딧", year: "", url: "https://www.youtube.com/watch?v=C1f40WY25pk" },
    { title: "원터치로 집에서 라떼까지! 전자동 커피머신 [필립스 바리스티나]", client: "디디딧", year: "", url: "https://www.youtube.com/watch?v=vgIZEqwvu9w" },
    { title: "코인 유튜브", client: "", year: "", url: "https://www.youtube.com/watch?v=aUWTGA4smm4" },
    { title: "코인 유튜브", client: "", year: "", url: "https://www.youtube.com/watch?v=7lkAOq6qoCY" },
    { title: "코인 유튜브", client: "", year: "", url: "https://www.youtube.com/watch?v=mgSVgatQrXc" },
    { title: "KFN 국방홍보원 극비문서 전쟁의 실마리", client: "국방홍보원", year: "", url: "https://www.youtube.com/watch?v=YYUYg59pp_Q" },
  ],
};

const portfolio = JSON.parse(fs.readFileSync("portfolio/data/portfolio.json", "utf8"));

portfolio.profile.resumeUrl =
  "https://drive.google.com/file/d/1fEBLsWi6lwOUOWBcKOYjSnQpRw2JB1K0/view?usp=sharing";

portfolio.skills.categories = [
  {
    id: "hard",
    label: "Hard Skills",
    items: ["영상 편집", "현장 연출", "트랜드 분석", "유튜브 채널 관리"].map((name) => ({
      name,
      level: skills[name].level,
      detail: skills[name].detail,
    })),
  },
  {
    id: "soft",
    label: "Soft Skills",
    items: ["문제해결 능력", "커뮤니케이션", "AI 활용 능력", "스케줄링"].map((name) => ({
      name,
      level: skills[name].level,
      detail: skills[name].detail,
    })),
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { name: "Premiere Pro", ...skills["Premiere Pro"] },
      { name: "After Effects", level: skills["After Effect"].level, detail: skills["After Effect"].detail },
      { name: "Photoshop", ...skills.Photoshop },
      { name: "Illustrator", level: skills.illustrator.level, detail: skills.illustrator.detail },
    ],
  },
];

portfolio.projects.categories = [
  { id: "campaign", label: "캠페인 광고", items: projects.campaign },
  { id: "viral", label: "바이럴 광고", items: projects.viral },
  { id: "youtube", label: "유튜브", items: projects.youtube },
  { id: "personal", label: "개인 작품", items: projects.personal },
];

fs.writeFileSync("portfolio/data/portfolio.json", JSON.stringify(portfolio, null, 2) + "\n");
console.log("Updated portfolio.json");
