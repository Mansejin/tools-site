// CGV IMAX 명당 2연석 필터. 입력: 예매 가능 좌석. 출력: 점수순 페어.
// 중앙 블록 2연석 우선. 사블(4연속)이어도 명당 통로면 그 중 2석을 고른다.

export const THEATERS = {
  yongsan: {
    name: '용산아이파크몰 IMAX',
    code: '0013',
    sweetRows: ['G', 'H', 'I', 'J'],
    goodRows: ['F', 'K'],
    okRows: ['E', 'L'],
    // ponytail: 고정 배치. 실좌석맵 스크랩되면 교체
    layout: {
      rows: 'ABCDEFGHIJKLMNOP',
      sideL: [1, 2],
      left: [5, 14],
      center: [16, 29],
      right: [31, 40],
      sideR: [43, 44],
    },
  },
  yeongdeungpo: {
    name: '영등포 IMAX',
    code: '0002',
    sweetRows: ['H', 'I'],
    goodRows: ['F', 'G', 'J'],
    okRows: ['E', 'K'],
    layout: {
      rows: 'ABCDEFGHIJKLMNO',
      sideL: [1, 3],
      left: [5, 8],
      center: [10, 18],
      right: [20, 23],
      sideR: [25, 27],
    },
  },
}

const ROW_INDEX = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function parseSeat(id) {
  const m = String(id).trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!m) throw new Error(`bad seat: ${id}`)
  return { id: `${m[1]}${Number(m[2])}`, row: m[1], num: Number(m[2]) }
}

function rowRank(row, theater) {
  if (theater.sweetRows.includes(row)) return 3
  if (theater.goodRows.includes(row)) return 2
  if (theater.okRows.includes(row)) return 1
  return 0
}

function bandOf(num, layout) {
  for (const name of ['sideL', 'left', 'center', 'right', 'sideR']) {
    const [a, b] = layout[name]
    if (num >= a && num <= b) return name
  }
  return null
}

function isAisle(num, layout) {
  for (const name of ['left', 'center', 'right']) {
    const [a, b] = layout[name]
    if (num === a || num === b) return true
  }
  return false
}

function nearInnerAisle(num, layout) {
  const [, leftInner] = layout.left
  const [rightInner] = layout.right
  return (num >= leftInner - 1 && num <= leftInner) || (num >= rightInner && num <= rightInner + 1)
}

function centerMid(layout) {
  return (layout.center[0] + layout.center[1]) / 2
}

function sweetMidRow(theater) {
  const rows = theater.sweetRows
  return ROW_INDEX.indexOf(rows[Math.floor((rows.length - 1) / 2)])
}

export function scoreSeat(seat, theater) {
  const { row, num } = seat
  const rank = rowRank(row, theater)
  if (!rank) return null

  const band = bandOf(num, theater.layout)
  if (!band || band === 'sideL' || band === 'sideR') return null

  const aisle = isAisle(num, theater.layout)
  // 옆블록은 중앙 맞닿은 통로 2석만 (사블 명당 통로)
  if (band !== 'center' && !nearInnerAisle(num, theater.layout)) return null

  const colDist = Math.abs(num - centerMid(theater.layout))
  const rowDist = Math.abs(ROW_INDEX.indexOf(row) - sweetMidRow(theater))
  const score =
    rank * 100 -
    colDist * 4 -
    rowDist * 6 +
    (band === 'center' ? 20 : 0) +
    (aisle ? 12 : 0)

  return { ...seat, score, rank, band, aisle }
}

export function rankPairs(availableIds, theater, need = 2) {
  const scored = availableIds
    .map(parseSeat)
    .map((s) => scoreSeat(s, theater))
    .filter(Boolean)
    .sort((a, b) => a.row.localeCompare(b.row) || a.num - b.num)

  const byRow = new Map()
  for (const s of scored) {
    if (!byRow.has(s.row)) byRow.set(s.row, [])
    byRow.get(s.row).push(s)
  }

  const pairs = []
  for (const seats of byRow.values()) {
    for (let i = 0; i <= seats.length - need; i++) {
      const window = seats.slice(i, i + need)
      if (window.some((s, k) => k && s.num !== window[k - 1].num + 1)) continue
      const score = window.reduce((n, s) => n + s.score, 0) / need
      const aisle = window.some((s) => s.aisle)
      const band = window.every((s) => s.band === 'center') ? 'center' : window[0].band
      pairs.push({
        seats: window.map((s) => s.id),
        score,
        band,
        aisle,
      })
    }
  }

  return pairs.sort((a, b) => b.score - a.score || a.seats[0].localeCompare(b.seats[0]))
}

export function pickPair(availableIds, theater, need = 2) {
  return rankPairs(availableIds, theater, need)[0] ?? null
}

export function hallSeats(theater, taken = []) {
  const takenSet = new Set(taken.map((id) => parseSeat(id).id))
  const out = []
  for (const row of theater.layout.rows) {
    for (const name of ['sideL', 'left', 'center', 'right', 'sideR']) {
      const [a, b] = theater.layout[name]
      for (let n = a; n <= b; n++) {
        const id = `${row}${n}`
        if (!takenSet.has(id)) out.push(id)
      }
    }
  }
  return out
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

function selfCheck() {
  const t = THEATERS.yongsan
  const empty = pickPair(hallSeats(t), t)
  assert(empty && empty.seats[0].startsWith('H') && empty.band === 'center', `empty hall: ${JSON.stringify(empty)}`)
  assert(!empty.seats.includes('H15'), 'gap seat')

  const noH22 = pickPair(hallSeats(t, ['H22', 'H23']), t)
  assert(noH22 && noH22.band === 'center', `fallback center: ${JSON.stringify(noH22)}`)

  const four = pickPair(['H16', 'H17', 'H18', 'H19'], t)
  assert(four && four.seats.join() === 'H18,H19' && four.band === 'center', `sabl center-2: ${JSON.stringify(four)}`)

  const farOnly = pickPair(['H1', 'H2', 'A22', 'A23', 'P22', 'P23'], t)
  assert(farOnly === null, `rejected far/front/back: ${JSON.stringify(farOnly)}`)

  const sideAisle = pickPair(['H13', 'H14', 'H31', 'H32'], t)
  assert(sideAisle && sideAisle.aisle && sideAisle.seats.includes('H14'), `명당 통로: ${JSON.stringify(sideAisle)}`)

  console.log('ok', empty.seats.join('-'), 'sabl', four.seats.join('-'), '통로', sideAisle.seats.join('-'))
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv[1]?.endsWith('seats.mjs')) {
  const [, , theaterId, takenCsv] = process.argv
  if (!theaterId) selfCheck()
  else {
    const theater = THEATERS[theaterId]
    if (!theater) {
      console.error('theaters:', Object.keys(THEATERS).join(', '))
      process.exit(1)
    }
    const taken = takenCsv ? takenCsv.split(',').filter(Boolean) : []
    const top = rankPairs(hallSeats(theater, taken), theater).slice(0, 10)
    for (const p of top) {
      console.log(`${p.seats.join('-')}\t${p.score.toFixed(1)}\t${p.band}${p.aisle ? ' aisle' : ''}`)
    }
    if (!top.length) console.log('none')
  }
}
