const MS_MIN = 60_000
const NAP_AFTER_MAIN_GAP_MS = 15 * 60 * 1000
const MIN_PRE_NIGHT_NAP_MS = 20 * 60 * 1000
const PRE_NIGHT_NAP_DURATION_MS = 90 * 60 * 1000

type MsInterval = { lo: number; hi: number }

function mergeMsIntervals(blocks: MsInterval[]): MsInterval[] {
  const sorted = blocks.filter((b) => b.lo < b.hi).sort((a, b) => a.lo - b.lo)
  const out: MsInterval[] = []
  for (const b of sorted) {
    const last = out[out.length - 1]
    if (!last || b.lo > last.hi) out.push({ ...b })
    else last.hi = Math.max(last.hi, b.hi)
  }
  return out
}

function subtractMsInterval(range: MsInterval, blocks: MsInterval[]): MsInterval[] {
  let cur: MsInterval[] = [range]
  for (const b of blocks) {
    const next: MsInterval[] = []
    for (const p of cur) {
      if (b.hi <= p.lo || b.lo >= p.hi) {
        next.push(p)
        continue
      }
      if (b.lo > p.lo) next.push({ lo: p.lo, hi: Math.min(b.lo, p.hi) })
      if (b.hi < p.hi) next.push({ lo: Math.max(b.hi, p.lo), hi: p.hi })
    }
    cur = next.filter((q) => q.hi - q.lo > 0)
  }
  return cur
}

/**
 * When the standard pre-night nap placement finds no slot, find a short nap before a night shift
 * for day→night transitions. Prefers a segment after main sleep when one exists.
 */
export function resolveForcedDayToNightPreNightNapWindow(params: {
  nightStartMs: number
  afterShiftHome: number
  logStartMs: number
  logEndMs: number
  mainStartMs: number | null
  mainEndMs: number | null
}): { startMs: number; endMs: number } | null {
  const { nightStartMs, afterShiftHome, logStartMs, logEndMs, mainStartMs, mainEndMs } = params
  const blocks: MsInterval[] = []
  if (Number.isFinite(logStartMs) && Number.isFinite(logEndMs) && logEndMs > logStartMs) {
    blocks.push({ lo: logStartMs, hi: logEndMs })
  }
  if (
    mainStartMs != null &&
    mainEndMs != null &&
    Number.isFinite(mainStartMs) &&
    Number.isFinite(mainEndMs) &&
    mainEndMs > mainStartMs
  ) {
    blocks.push({ lo: mainStartMs, hi: mainEndMs + NAP_AFTER_MAIN_GAP_MS })
  }
  const merged = mergeMsIntervals(blocks)
  const tFloor = Math.max(afterShiftHome, logEndMs)
  const mainBlockEnd =
    mainEndMs != null && Number.isFinite(mainEndMs) ? mainEndMs + NAP_AFTER_MAIN_GAP_MS : null

  const wakeBuffersMs = [90, 75, 60, 45, 30, 25, 20].map((m) => m * MS_MIN)

  const pickFromWakeBuffers = (preferAfterMain: boolean): { startMs: number; endMs: number } | null => {
    for (const wakeBuf of wakeBuffersMs) {
      const latestNapEnd = nightStartMs - wakeBuf
      if (!(latestNapEnd > tFloor)) continue
      const bigEnough = subtractMsInterval({ lo: tFloor, hi: latestNapEnd }, merged).filter(
        (g) => g.hi - g.lo >= MIN_PRE_NIGHT_NAP_MS,
      )
      if (bigEnough.length === 0) continue
      let pool = bigEnough
      if (preferAfterMain && mainBlockEnd != null) {
        const afterMain = bigEnough.filter((g) => g.hi > mainBlockEnd)
        if (afterMain.length === 0) continue
        pool = afterMain
      }
      pool.sort((a, b) => {
        if (b.hi !== a.hi) return b.hi - a.hi
        const wb = b.hi - b.lo
        const wa = a.hi - a.lo
        if (wb !== wa) return wb - wa
        return 0
      })
      const seg = pool[0]
      const width = seg.hi - seg.lo
      const dur = Math.min(PRE_NIGHT_NAP_DURATION_MS, width)
      const endMs = seg.hi
      const startMs = endMs - dur
      if (startMs >= seg.lo && endMs <= nightStartMs && endMs - startMs >= MIN_PRE_NIGHT_NAP_MS) {
        return { startMs, endMs }
      }
    }
    return null
  }

  return pickFromWakeBuffers(true) ?? pickFromWakeBuffers(false)
}
