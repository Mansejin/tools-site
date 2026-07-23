/**
 * Download lichess-org/chess-openings (CC0) and build:
 * - src/data/openings.json  (full catalog)
 * - src/data/repertoire.json (beginner curated lines + move SANs)
 *
 * Source: https://github.com/lichess-org/chess-openings
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../src/data');
const BASE =
  'https://raw.githubusercontent.com/lichess-org/chess-openings/master';

/** Beginner repertoire (~500→1000). Exact name match preferred, then prefix. */
const REPERTOIRE_SPECS = [
  {
    id: 'italian-white',
    side: 'white',
    titleKo: '이탈리안 게임',
    titleEn: 'Italian Game',
    why: 'e4 + Bc4로 빠르게 전개·캐슬링. 초보 백 레퍼토리의 정석.',
    ideas: [
      '중앙(e4)을 잡고 나이트·비숍을 빠르게 전개',
      '킹사이드 캐슬링을 서두르기',
      'f7을 노리되, 혼자 두지 말기',
    ],
    matchNames: [
      'Italian Game: Classical Variation, Giuoco Pianissimo',
      'Italian Game: Classical Variation',
      'Italian Game: Giuoco Piano',
      'Italian Game',
    ],
    maxPly: 14,
  },
  {
    id: 'london-white',
    side: 'white',
    titleKo: '런던 시스템',
    titleEn: 'London System',
    why: '흑이 뭘 두든 비슷한 셋업. 오프닝 고민을 줄여줌.',
    ideas: [
      'd4 → Nf3 → Bf4 → e3 → c3 → Bd3 셋업',
      '킹사이드 캐슬링 후 천천히 압박',
      '이론 싸움보다 구조 이해',
    ],
    matchNames: [
      "Queen's Pawn Game: London System, with e6",
      "Queen's Pawn Game: London System",
      'London System',
      "Queen's Pawn Game: Accelerated London System",
    ],
    maxPly: 14,
  },
  {
    id: 'scandi-black',
    side: 'black',
    titleKo: '스칸디나비안 디펜스',
    titleEn: 'Scandinavian Defense',
    why: '1.e4에 바로 맞받아치는 단순 흑 디펜스. 라인이 짧음.',
    ideas: [
      '1...d5로 중앙을 즉시 도전',
      '퀸을 너무 일찍 쫓기지 않게 자리 잡기',
      '전개(나이트·비숍)와 캐슬링을 우선',
    ],
    matchNames: [
      'Scandinavian Defense: Modern Variation',
      'Scandinavian Defense: Mieses-Kotroc Variation',
      'Scandinavian Defense: Main Line',
      'Scandinavian Defense',
    ],
    maxPly: 12,
  },
  {
    id: 'caro-black',
    side: 'black',
    titleKo: '카로칸 디펜스',
    titleEn: 'Caro-Kann Defense',
    why: '탄탄한 폰 구조. 블런더가 적고 중반까지 버티기 좋음.',
    ideas: [
      'c6 → d5로 안전한 중앙 도전',
      '라이트스퀘어 비숍을 가두지 않기',
      '차분히 전개한 뒤 중반 싸움',
    ],
    matchNames: [
      'Caro-Kann Defense: Classical Variation',
      'Caro-Kann Defense: Advance Variation',
      'Caro-Kann Defense: Exchange Variation',
      'Caro-Kann Defense',
    ],
    maxPly: 14,
  },
  {
    id: 'qgd-black',
    side: 'black',
    titleKo: '퀸스 갬빗 디클라인드',
    titleEn: "Queen's Gambit Declined",
    why: '1.d4 대응의 클래식. 구조가 안정적.',
    ideas: [
      'd5로 중앙을 잡고 e6으로 지키기',
      '나이트·비숍 전개 후 캐슬링',
      'c5 또는 e5로 나중에 풀기',
    ],
    matchNames: [
      "Queen's Gambit Declined: Orthodox Defense",
      "Queen's Gambit Declined: Three Knights Variation",
      "Queen's Gambit Declined: Modern Variation",
      "Queen's Gambit Declined",
    ],
    maxPly: 14,
  },
];

function parseTsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split('\t');
  const ecoIdx = header.indexOf('eco');
  const nameIdx = header.indexOf('name');
  const pgnIdx = header.indexOf('pgn');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    if (cols.length < 3) continue;
    rows.push({
      eco: cols[ecoIdx],
      name: cols[nameIdx],
      pgn: cols[pgnIdx],
    });
  }
  return rows;
}

function pgnToSans(pgn) {
  const chess = new Chess();
  // lichess pgn is like: 1. e4 e5 2. Nf3 Nc6 3. Bc4
  const cleaned = pgn
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(' ').filter(Boolean);
  const sans = [];
  for (const tok of tokens) {
    const move = chess.move(tok, { strict: false });
    if (!move) break;
    sans.push(move.san);
  }
  return sans;
}

function scoreNameMatch(openingName, matchName) {
  if (openingName === matchName) return 100;
  if (openingName.startsWith(matchName + ':') || openingName.startsWith(matchName + ',')) return 80;
  if (openingName.includes(matchName)) return 40;
  return 0;
}

function findBestOpening(openings, matchNames, maxPly) {
  let best = null;
  let bestScore = -1;
  for (const o of openings) {
    let nameScore = 0;
    for (const matchName of matchNames) {
      nameScore = Math.max(nameScore, scoreNameMatch(o.name, matchName));
    }
    if (nameScore <= 0) continue;
    let moveCount = 0;
    try {
      moveCount = pgnToSans(o.pgn).length;
    } catch {
      continue;
    }
    if (moveCount < 4) continue;
    // Prefer strong name match, then longer useful lines (capped)
    const useful = Math.min(moveCount, maxPly);
    const score = nameScore * 1000 + useful * 10 + Math.min(moveCount, 24);
    if (score > bestScore) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

async function fetchTsv(letter) {
  const url = `${BASE}/${letter}.tsv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return parseTsv(await res.text());
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  console.log('Fetching lichess chess-openings…');
  const letters = ['a', 'b', 'c', 'd', 'e'];
  const chunks = await Promise.all(letters.map(fetchTsv));
  const openings = chunks.flat().map((o, i) => ({
    id: `${o.eco}-${i}`,
    eco: o.eco,
    name: o.name,
    pgn: o.pgn,
  }));

  const repertoire = [];
  for (const spec of REPERTOIRE_SPECS) {
    const hit = findBestOpening(openings, spec.matchNames, spec.maxPly);
    if (!hit) {
      console.warn(`⚠ No match for ${spec.id}`);
      continue;
    }
    const sans = pgnToSans(hit.pgn).slice(0, spec.maxPly);
    if (sans.length < 4) {
      console.warn(`⚠ Too short for ${spec.id}: ${hit.name}`);
      continue;
    }
    repertoire.push({
      id: spec.id,
      side: spec.side,
      titleKo: spec.titleKo,
      titleEn: spec.titleEn,
      why: spec.why,
      ideas: spec.ideas,
      eco: hit.eco,
      openingName: hit.name,
      pgn: hit.pgn,
      moves: sans,
    });
    console.log(`✓ ${spec.id} ← ${hit.eco} ${hit.name} (${sans.length} plies)`);
  }

  // Compact catalog for search (name + eco + moves) — keep under ~1.5MB
  const catalog = openings.map((o) => {
    let moves = [];
    try {
      moves = pgnToSans(o.pgn).slice(0, 16);
    } catch {
      moves = [];
    }
    return {
      eco: o.eco,
      name: o.name,
      moves,
    };
  }).filter((o) => o.moves.length > 0);

  writeFileSync(
    resolve(outDir, 'repertoire.json'),
    JSON.stringify({ version: 1, source: 'lichess-org/chess-openings', lines: repertoire }, null, 2),
  );
  writeFileSync(
    resolve(outDir, 'openings.json'),
    JSON.stringify({ version: 1, source: 'lichess-org/chess-openings', count: catalog.length, openings: catalog }),
  );

  console.log(`Wrote ${repertoire.length} repertoire lines, ${catalog.length} catalog openings → ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
