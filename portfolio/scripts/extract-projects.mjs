const BASE = "https://mansjin.notion.site";

const DB = {
  campaign: {
    dbId: "337e0073-6ed5-48ce-a827-c82bc21130c9",
    viewId: "e7ed418c-3083-4aef-9ddf-8ffc20250812",
    items: [
      ["로지텍G X 젠지", "/G-X-26976275e300807fae74c670a09a4eed", "26976275-e300-807f-ae74-c670a09a4eed"],
      ["라이프먼트(스타트업) 광고 제작", "/1af76275e30080e0a1a2ddf9ac86f23c", "1af76275-e300-80e0-a1a2-ddf9ac86f23c"],
      ["로지텍G + 담원 기아", "/G-31376275e30080f393dfd46eb4b3b387", "31376275-e300-80f3-93df-d46eb4b3b387"],
      ["로지텍G + 조유리 TVC", "/G-TVC-cf8ec0f875a143ad9891c58884386e6c", "cf8ec0f8-75a1-43ad-9891-c58884386e6c"],
      ["2022 Q1 지누스X피크닉 캠페인", "/2022-Q1-X-bbb24ab9f31845628cd271cdf22519cb", "bbb24ab9-f318-4562-8cd2-71cdf22519cb"],
      ["2022 Q2 지누스 캠페인", "/2022-Q2-31a941f980664f888fa2ae8d23c210cd", "31a941f9-8066-4f88-8fa2-ae8d23c210cd"],
      ["2023 Q2 지누스 캠페인 글로벌 베스트 셀러", "/2023-Q2-3642dc05edc14157b02502bd7d5929a1", "3642dc05-edc1-4157-b025-02bd7d5929a1"],
    ],
  },
  viral: {
    items: [
      ["로지텍 프로게이머스 픽스 젠지", "/26976275e3008017bb11e7be4fe5f023", "26976275-e300-8017-bb11-e7be4fe5f023"],
      ["한국타이어 기안도 전시 스케치", "/701a14a444cd4861bce401bd672e8ac0", "701a14a4-44cd-4861-bce4-01bd672e8ac0"],
      ["한국타이어 하이퍼 컬렉션 전시 스케치", "/44145b03f38b4b9a89353690c0efc249", "44145b03-f38b-4b9a-8935-3690c0efc249"],
      ["23년 로지텍 + 디플러스 기아 바이럴", "/23-714ff92f90304c1daa50fd78f45b4136", "714ff92f-9030-4c1d-aa50-fd78f45b4136"],
      ["22년 로지텍 + 담원 기아 바이럴", "/22-7f225b5004b247f9bf8c42c55e1a7531", "7f225b50-04b2-47f9-bf8c-42c55e1a7531"],
      ["(숏폼) 로지텍 헤드셋 웹캠 바이럴", "/e2b1112458534d78b546819d0e544c85", "e2b11124-5853-4d78-b546-819d0e544c85"],
      ["로지텍G + T1 (페이커) 바이럴", "/G-T1-952414e8bfd5411e9a9aa8a680e73df1", "952414e8-bfd5-411e-9a9a-a8a680e73df1"],
      ["MX MASTER 3 기업 바이럴", "/MX-MASTER-3-b18db4a44e6c4aaabf45598be3b8634a", "b18db4a4-4e6c-4aaab-f455-98be3b8634a"],
      ["로지텍G + KT 바이럴 콘텐츠", "/G-KT-aa506321e65c4edd920a2bece7a21436", "aa506321-e65c-4edd-920a-2bece7a21436"],
      ["로지텍 프로게이머스 픽 KT", "/KT-fda30b33948b495a9ce56f8692fb6448", "fda30b33-948b-495a-9ce5-6f8692fb6448"],
      ["스위스 관광청 기업 바이럴", "/def0ecd913684ebbbc106f78f5cd6c43", "def0ecd9-1368-4ebb-bc10-6f78f5cd6c43"],
    ],
  },
  personal: {
    items: [
      ["(영화) '혐의' 졸업작품", "/8feee8a459f74364a17db9c2f5b6f022", "8feee8a4-59f7-4364-a17d-b9c2f5b6f022"],
      ["(모작) 오징어게임 타이틀 모션그래픽", "/2b01b302be5742a694c127d2eb53eb6e", "2b01b302-be57-42a6-94c1-27d2eb53eb6e"],
    ],
  },
  youtube: {
    items: [
      ["코인 유튜브 #1", "/81d656c1cca9457480ab271606374ea5", "81d656c1-cca9-4574-80ab-271606374ea5"],
      ["코인 유튜브 #2", "/93a40a32d76d4be5a00e1e4f9d8237cc", "93a40a32-d76d-4be5-a00e-1e4f9d8237cc"],
      ["코인 유튜브 #3", "/eab583f44e264a37853e1d09783c37f2", "eab583f4-4e26-4a37-853e-1d09783c37f2"],
      ["KFN 국방홍보원 극비문서 전쟁의 실마리", "/KFN-26976275e30080d0b548db9b3b589824", "26976275-e300-80d0-b548-db9b3b589824"],
    ],
  },
};

async function loadPage(pageId) {
  const res = await fetch(`${BASE}/api/v3/loadPageChunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pageId,
      limit: 100,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false,
    }),
  });
  return res.json();
}

function plainText(prop) {
  if (!prop) return "";
  return prop.map((seg) => seg[0]).join("");
}

function extractFromRecordMap(data) {
  const json = JSON.stringify(data);
  const yt =
    json.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/)?.[1] ||
    json.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1] ||
    json.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/)?.[1];

  let contrib = "";
  const blocks = data.recordMap?.block || {};
  for (const b of Object.values(blocks)) {
    const v = b.value?.value || b.value;
    if (!v?.properties) continue;
    for (const val of Object.values(v.properties)) {
      const text = plainText(val);
      if (text.includes("기획") || text.includes("기여")) contrib = text;
    }
  }

  return {
    youtube: yt ? `https://www.youtube.com/watch?v=${yt}` : "",
    contrib,
  };
}

function yearFromTitle(title) {
  const m = title.match(/^(20\d{2})/);
  return m ? m[1] : "";
}

function clientFromTitle(title) {
  if (title.includes("로지텍")) return "Logitech G";
  if (title.includes("지누스")) return "Zinus";
  if (title.includes("한국타이어")) return "한국타이어";
  if (title.includes("라이프먼트")) return "라이프먼트";
  if (title.includes("스위스")) return "스위스 관광청";
  if (title.includes("KFN") || title.includes("국방")) return "국방홍보원";
  return "";
}

const result = {};

for (const [cat, { items }] of Object.entries(DB)) {
  result[cat] = [];
  for (const [title, , pageId] of items) {
    const data = await loadPage(pageId);
    const { youtube, contrib } = extractFromRecordMap(data);
    result[cat].push({
      title,
      client: clientFromTitle(title),
      year: yearFromTitle(title),
      url: youtube,
      note: contrib,
    });
    await new Promise((r) => setTimeout(r, 200));
  }
}

console.log(JSON.stringify(result, null, 2));
