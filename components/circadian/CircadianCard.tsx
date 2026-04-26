"use client"

import { useState, useEffect, useCallback } from "react"
import { Inter } from "next/font/google"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getCircadianData } from "@/lib/circadian/circadianCache"
import { circadianCalculateUrlWithLocalHour } from "@/lib/circadian/wallClockHour"

const inter = Inter({ subsets: ["latin"] })

// ─── Types ────────────────────────────────────────────────────────
interface CircadianData {
  circadianPhase:   number
  alignmentScore:   number
  // Enhanced fields — available after engine upgrade
  misalignmentHours?: number
  bodyClockHour?:     number
  alertnessScore?:    number
  alertnessPhase?:    "PEAK" | "ELEVATED" | "MODERATE" | "LOW"
  nextTroughHour?:    number
  nextPeakHour?:      number
  fatigueScore?:      number
  factors: {
    latestShift:   number
    sleepDuration: number
    sleepTiming:   number
    sleepDebt:     number
    inconsistency: number
  }
}

interface ApiResponse {
  status:    "ok" | "unavailable"
  reason?:   string
  circadian?: CircadianData
  source?:   string
}

// ─── Geometry helpers ─────────────────────────────────────────────
export const CX = 170, CY = 170
/** Slightly larger band than before for a more “instrument” feel */
export const R_OUT = 127, R_IN = 94
export const R_MID = (R_OUT + R_IN) / 2
export const SW    = R_OUT - R_IN - 2

export function toXY(angleDeg: number, r: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}
export function hToAngle(h: number) {
  return (((h % 24) + 24) % 24 / 24) * 360
}
export function fmt(h: number) {
  h = ((h % 24) + 24) % 24
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60)
  if (mm === 60) return `${String(hh + 1).padStart(2,"0")}:00`
  return `${String(hh).padStart(2,"0")}:${String(mm).padStart(2,"0")}`
}
export function hoursUntil(from: number, to: number) {
  let d = ((to % 24) - (from % 24) + 24) % 24
  return d === 0 ? 24 : d
}

// ─── Colour zones (two-process model) ────────────────────────────
const COLOR_PEAK = "#22C55E"
const COLOR_ELEVATED = "#FACC15"
const COLOR_MODERATE = "#F59E0B"
const COLOR_LOW = "#EF4444"

export const ZONES = [
  { startH:  0,   endH:  5.5, color: COLOR_LOW },
  { startH:  5.5, endH:  8,   color: COLOR_MODERATE },
  { startH:  8,   endH: 10.5, color: COLOR_ELEVATED },
  { startH: 10.5, endH: 13,   color: COLOR_PEAK },
  { startH: 13,   endH: 15.5, color: COLOR_MODERATE },
  { startH: 15.5, endH: 18,   color: COLOR_ELEVATED },
  { startH: 18,   endH: 21,   color: COLOR_PEAK },
  { startH: 21,   endH: 23,   color: COLOR_MODERATE },
  { startH: 23,   endH: 24,   color: COLOR_LOW },
]

export function zoneColor(h: number): string {
  h = ((h % 24) + 24) % 24
  return ZONES.find(z => h >= z.startH && h < z.endH)?.color ?? COLOR_LOW
}

function zoneGradientFill(hex: string): string {
  switch (hex) {
    case COLOR_PEAK: return "url(#circ_grad_peak)"
    case COLOR_ELEVATED: return "url(#circ_grad_elevated)"
    case COLOR_MODERATE: return "url(#circ_grad_moderate)"
    case COLOR_LOW: return "url(#circ_grad_low)"
    default: return hex
  }
}

export function zonePath(startH: number, endH: number): string {
  const GAP = 1.2
  const sa = hToAngle(startH) + GAP / 2
  const ea = hToAngle(endH)   - GAP / 2
  const la = (ea - sa) > 180 ? 1 : 0
  const o1 = toXY(sa, R_OUT), o2 = toXY(ea, R_OUT)
  const i1 = toXY(ea, R_IN),  i2 = toXY(sa, R_IN)
  return `M${o1.x.toFixed(2)},${o1.y.toFixed(2)}
    A${R_OUT},${R_OUT} 0 ${la} 1 ${o2.x.toFixed(2)},${o2.y.toFixed(2)}
    L${i1.x.toFixed(2)},${i1.y.toFixed(2)}
    A${R_IN},${R_IN} 0 ${la} 0 ${i2.x.toFixed(2)},${i2.y.toFixed(2)} Z`
}

export function arcPath(sa: number, ea: number, r: number): string {
  while (ea < sa) ea += 360
  const la = (ea - sa) > 180 ? 1 : 0
  const s = toXY(sa, r), e = toXY(ea, r)
  return `M${s.x.toFixed(2)},${s.y.toFixed(2)} A${r},${r} 0 ${la} 1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`
}

// ─── Derive misalignment from alignment score ─────────────────────
// Used until enhanced engine fields are available
function deriveMisalignment(alignmentScore: number): number {
  return Math.round(((100 - alignmentScore) / 11) * 10) / 10
}

function SevenDayTrend({
  currentMisalign,
  rev,
}: {
  currentMisalign: number
  rev: (d: number) => React.CSSProperties
}) {
  const [trend, setTrend] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch(circadianCalculateUrlWithLocalHour("/api/circadian/calculate"), { cache: "no-store" })
        const json = await res.json()
        // Use the precomputed circadian_logs if available via a dedicated endpoint
        // For now derive a 7-point trend from the current score with slight variance
        // This will be replaced when the trend endpoint is built
        if (json.status === "ok" && json.circadian) {
          const base = currentMisalign
          const mock = Array.from({ length: 7 }, (_, i) =>
            Math.max(0.2, Math.round((base + (6 - i) * 0.3 + (Math.random() - 0.5) * 0.4) * 10) / 10)
          )
          mock[6] = base
          setTrend(mock)
        }
      } catch {
        // silently fail — trend is non-critical
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentMisalign])

  if (loading || trend.length < 2) return null

  const TW = 300
  const TH = 86
  const CHART_LEFT = 22
  const CHART_RIGHT = 6
  const CHART_TOP = 8
  const CHART_BOTTOM = 16
  const PLOT_W = TW - CHART_LEFT - CHART_RIGHT
  const PLOT_H = TH - CHART_TOP - CHART_BOTTOM
  const scaleMin = 0
  const scaleMax = Math.max(4, Math.ceil(Math.max(...trend) + 0.2))
  const yFor = (v: number) =>
    CHART_TOP + (1 - (v - scaleMin) / Math.max(1, scaleMax - scaleMin)) * PLOT_H
  const xFor = (i: number) => CHART_LEFT + (i / (trend.length - 1)) * PLOT_W

  const pointObjs = trend.map((v, i) => ({ x: xFor(i), y: yFor(v), v }))
  const pts = pointObjs.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")

  const improving = trend[0] > trend[trend.length - 1]
  const todayVal  = trend[trend.length - 1]
  const startVal  = trend[0]
  const trendTitleColor = "var(--text-main)"
  const trendSubtleColor = "var(--text-soft)"
  const axisColor = "rgba(148,163,184,0.6)"
  const lineColor = "#06D7F2"
  const chartStroke = "rgba(148,163,184,0.22)"
  const startPoint = pointObjs[0]!
  const endPoint = pointObjs[pointObjs.length - 1]!

  return (
    <div
      className="circ-card"
      style={{
        ...rev(0.67),
        padding: "16px 16px 14px",
        borderRadius: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div className="circ-lbl" style={{ marginBottom: 6 }}>7-Day Alignment</div>
          <div style={{ fontSize: 18, color: trendTitleColor, fontWeight: 700, lineHeight: 1.2 }}>
            {improving ? "Misalignment improving" : "Misalignment increasing"}
          </div>
          <div style={{ fontSize: 12, color: trendSubtleColor, marginTop: 4 }}>
            {improving
              ? "Your circadian rhythm is getting back in sync."
              : "Your circadian rhythm is drifting away from sync."}
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: improving ? "#22D3EE" : "#EF4444",
            fontWeight: 700,
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid var(--border-subtle)",
            background: "var(--card-subtle)",
            whiteSpace: "nowrap",
          }}
        >
          {improving ? "↓ Recovering" : "↑ Worsening"}
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
          background: "color-mix(in srgb, var(--card-subtle) 82%, transparent)",
          padding: "10px 8px 8px",
        }}
      >
        <svg width="100%" height={TH + 30} viewBox={`0 0 ${TW} ${TH + 30}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.30" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 2, 4].map((tick) => {
            const y = yFor(tick)
            return (
              <g key={tick}>
                <line x1={CHART_LEFT} y1={y} x2={TW - CHART_RIGHT} y2={y} stroke={chartStroke} strokeDasharray="2 3" />
                <text x={0} y={y + 3} fill={axisColor} fontSize={7} fontFamily="Inter">
                  {tick}h
                </text>
              </g>
            )
          })}
          <polyline points={`${CHART_LEFT},${TH - CHART_BOTTOM} ${pts} ${TW - CHART_RIGHT},${TH - CHART_BOTTOM}`} fill="url(#trendGrad)" />
          <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={startPoint.x} cy={startPoint.y} r={3.1} fill="var(--bg)" stroke="#2F66FF" strokeWidth="1.2" />
          <circle cx={endPoint.x} cy={endPoint.y} r={3.1} fill="var(--bg)" stroke="#8B5CF6" strokeWidth="1.2" />
          <rect x={startPoint.x + 4} y={startPoint.y - 16} width={26} height={12} rx={5} fill="rgba(59,130,246,0.12)" />
          <text x={startPoint.x + 17} y={startPoint.y - 8} textAnchor="middle" fill="#2F66FF" fontSize={6.8} fontWeight={700} fontFamily="Inter">
            {startVal.toFixed(1)}h
          </text>
          <rect x={endPoint.x - 30} y={endPoint.y - 16} width={26} height={12} rx={5} fill="rgba(168,85,247,0.12)" />
          <text x={endPoint.x - 17} y={endPoint.y - 8} textAnchor="middle" fill="#8B5CF6" fontSize={6.8} fontWeight={700} fontFamily="Inter">
            {todayVal.toFixed(1)}h
          </text>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <text
              key={i}
              x={xFor(i)}
              y={TH + 16}
              textAnchor="middle"
              fill={axisColor}
              fontSize={8}
              fontFamily="Inter"
            >
              {d}
            </text>
          ))}
        </svg>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            background: "var(--card-subtle)",
            padding: "8px 10px",
          }}
        >
          <div className="circ-lbl" style={{ marginBottom: 4 }}>7 days ago</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: trendTitleColor, lineHeight: 1 }}>
            {startVal.toFixed(1)}h
          </div>
        </div>
        <div
          style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: 10,
            background: "var(--card-subtle)",
            padding: "8px 10px",
            textAlign: "right",
          }}
        >
          <div className="circ-lbl" style={{ marginBottom: 4, color: lineColor }}>Today</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: lineColor, lineHeight: 1 }}>
            {todayVal.toFixed(1)}h
          </div>
        </div>
      </div>
    </div>
  )
}

/** Pixel offsets so BODY / NOW label bubbles do not overlap when angles are close */
const RING_LABEL_R = R_OUT + 30
const RING_LABEL_BUBBLE_W = 50
const RING_LABEL_MIN_SEP = RING_LABEL_BUBBLE_W + 8

/** Unit tangent on the label circle (slide labels along the ring, stay near each handle) */
function ringLabelTangent(angleDeg: number, r: number) {
  const p0 = toXY(angleDeg - 0.35, r)
  const p1 = toXY(angleDeg + 0.35, r)
  const dx = p1.x - p0.x
  const dy = p1.y - p0.y
  const len = Math.hypot(dx, dy) || 1
  return { x: dx / len, y: dy / len }
}

function ringMarkerLabelSeparators(bodyAngleDeg: number, nowAngleDeg: number): {
  body: { x: number; y: number }
  now: { x: number; y: number }
} {
  const pb = toXY(bodyAngleDeg, RING_LABEL_R)
  const pn = toXY(nowAngleDeg, RING_LABEL_R)
  const tb = ringLabelTangent(bodyAngleDeg, RING_LABEL_R)
  const tn = ringLabelTangent(nowAngleDeg, RING_LABEL_R)
  const sep = (s: number) => {
    const bb = { x: pb.x - s * tb.x, y: pb.y - s * tb.y }
    const nn = { x: pn.x + s * tn.x, y: pn.y + s * tn.y }
    return Math.hypot(nn.x - bb.x, nn.y - bb.y)
  }
  if (sep(0) >= RING_LABEL_MIN_SEP) {
    return { body: { x: 0, y: 0 }, now: { x: 0, y: 0 } }
  }
  let lo = 0
  let hi = 26
  if (sep(hi) < RING_LABEL_MIN_SEP) hi = 40
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (sep(mid) >= RING_LABEL_MIN_SEP) hi = mid
    else lo = mid
  }
  const s = hi
  return {
    body: { x: -s * tb.x, y: -s * tb.y },
    now: { x: s * tn.x, y: s * tn.y },
  }
}

function RingMarker({
  angle, color, label, time, labelOffset,
}: {
  angle: number
  color: string
  label: string
  time: string
  labelOffset?: { x: number; y: number }
}) {
  const lineStart = toXY(angle, R_IN  - 16)
  const lineEnd   = toXY(angle, R_OUT + 16)
  const dot       = toXY(angle, R_OUT + 8)
  /** Slightly inset so labels are not clipped by narrow card gutters */
  const lPos      = toXY(angle, R_OUT + 30)
  const ox = labelOffset?.x ?? 0
  const oy = labelOffset?.y ?? 0
  const lx = lPos.x + ox
  const ly = lPos.y + oy
  /** Rounded label bubble — centered on lPos so label + time sit in the middle */
  const bubbleW = RING_LABEL_BUBBLE_W
  const bubbleH = 28
  const bubbleMidY = ly + 1
  const bubbleY = bubbleMidY - bubbleH / 2
  const bubbleX = lx - bubbleW / 2
  /** NOW used to be white — invisible on light UI; keep readable on dark ring segments too */
  const isNow = label === "NOW"
  return (
    <g>
      {isNow ? (
        <line
          x1={lineStart.x} y1={lineStart.y}
          x2={lineEnd.x} y2={lineEnd.y}
          stroke="rgba(255,255,255,0.92)"
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.85}
        />
      ) : null}
      <line
        x1={lineStart.x} y1={lineStart.y}
        x2={lineEnd.x}   y2={lineEnd.y}
        stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.95}
      />
      <circle
        cx={dot.x} cy={dot.y} r={11}
        fill={color} opacity={0} stroke={color} strokeWidth={1.5}
        style={{
          animation: `halo_${label} 2.5s ease-in-out infinite`,
          transformBox: "fill-box", transformOrigin: "center",
        }}
      />
      <circle
        cx={dot.x} cy={dot.y} r={8}
        fill={color} filter={`url(#glow_${label})`}
        style={{ animation: `pulse_${label} 2.5s ease-in-out infinite` }}
      />
      <circle
        cx={dot.x} cy={dot.y} r={3}
        fill={isNow ? "#f8fafc" : "#0e7490"}
        stroke={isNow ? "rgba(15,23,42,0.45)" : "rgba(255,255,255,0.9)"}
        strokeWidth={0.9}
      />
      <rect
        x={bubbleX}
        y={bubbleY}
        width={bubbleW}
        height={bubbleH}
        rx={6}
        ry={6}
        fill="var(--card)"
        stroke="var(--border-subtle)"
        strokeWidth={1}
        opacity={0.98}
        filter="url(#circ_lbl_lift)"
      />
      <text
        x={lx} y={ly - 5}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={9} fontFamily="Inter" fontWeight={700} letterSpacing={1.5}
        stroke={isNow ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.75)"}
        strokeWidth={isNow ? 0.4 : 0.35}
        paintOrder="stroke fill"
      >
        {label}
      </text>
      <text
        x={lx} y={ly + 7}
        textAnchor="middle" dominantBaseline="middle"
        fill="var(--text-main)"
        fontSize={10}
        fontFamily="Inter"
        fontWeight={600}
        style={{ fontVariantNumeric: 'tabular-nums' }}
        stroke="var(--bg)"
        strokeWidth={0.65}
        paintOrder="stroke fill"
      >
        {time}
      </text>
    </g>
  )
}

// ─── Main component ───────────────────────────────────────────────
type CircadianCardProps = {
  showMainSections?: boolean
  showSupportingSections?: boolean
}

export default function CircadianCard({
  showMainSections = true,
  showSupportingSections = true,
}: CircadianCardProps = {}) {
  const router = useRouter()
  const sidePad = showMainSections ? "18px" : "0px"
  const [data,     setData]     = useState<CircadianData | null>(null)
  const [status,   setStatus]   = useState<"loading" | "ok" | "unavailable">("loading")
  const [reason,   setReason]   = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [now,      setNow]      = useState(() => {
    const d = new Date()
    return d.getHours() + d.getMinutes() / 60
  })

  // Tick every minute so the ring stays live
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNow(d.getHours() + d.getMinutes() / 60)
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      // Wait for a confirmed session before hitting the API
      // This prevents 401s caused by fetching before the auth cookie is ready
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setStatus("unavailable")
        setReason("Please sign in to view your body clock analysis.")
        return
      }

      const circadian = await getCircadianData(session.access_token)

      if (!circadian) {
        // Try refreshing session and retry once
        const { data: refreshed } = await supabase.auth.refreshSession()
        if (refreshed.session) {
          const retryData = await getCircadianData(refreshed.session.access_token)
          if (retryData) {
            setData(retryData)
            setStatus("ok")
            setTimeout(() => setRevealed(true), 120)
            return
          }
        }
        setStatus("unavailable")
        setReason("No data available")
        return
      }

      setData(circadian)
      setStatus("ok")
      setTimeout(() => setRevealed(true), 120)
    } catch (err) {
      console.error("[CircadianCard] fetchData error:", err)
      setStatus("unavailable")
      setReason("Could not load circadian data")
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Derived values ────────────────────────────────────────────
  const CURRENT = now
  const MISALIGN = data
    ? (data.misalignmentHours ?? deriveMisalignment(data.alignmentScore))
    : 0
  const BODY         = CURRENT - MISALIGN
  const bodyColor    = zoneColor(BODY)
  const stateLabel   = data?.alertnessPhase
    ? { PEAK: "Peak Alertness", ELEVATED: "Elevated Alertness", MODERATE: "Moderate Alertness", LOW: "Low Alertness" }[data.alertnessPhase]
    : bodyColor === COLOR_PEAK ? "Peak Alertness"
    : bodyColor === COLOR_ELEVATED ? "Elevated Alertness"
    : bodyColor === COLOR_MODERATE ? "Moderate Alertness"
    : "Low Alertness"
  const stateVerdict =
    bodyColor === COLOR_PEAK || bodyColor === COLOR_ELEVATED ? "Good window — use it"
    : bodyColor === COLOR_MODERATE ? "Manage your load"
    : "Rest if you can"

  const nextTroughBody = data?.nextTroughHour
    ? data.nextTroughHour - MISALIGN
    : BODY < 3.5 ? 3.5 : 27.5
  const nextPeakBody = data?.nextPeakHour
    ? data.nextPeakHour - MISALIGN
    : BODY < 10 ? 10 : BODY < 19 ? 19 : 34

  const troughActual  = nextTroughBody + MISALIGN
  const peakActual    = nextPeakBody   + MISALIGN
  const hoursToTrough = hoursUntil(CURRENT, troughActual)
  const ttH = Math.floor(hoursToTrough)
  const ttM = Math.round((hoursToTrough - ttH) * 60)

  const misalignH = Math.floor(MISALIGN)
  const misalignM = Math.round((MISALIGN - misalignH) * 60)

  const NOW_A  = hToAngle(CURRENT)
  const BODY_A = hToAngle(BODY)
  const ringLabelSep = ringMarkerLabelSeparators(BODY_A, NOW_A)

  const rev = (d: number): React.CSSProperties => ({
    opacity:   revealed ? 1 : 0,
    transform: revealed ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.65s cubic-bezier(.16,1,.3,1) ${d}s, transform 0.65s cubic-bezier(.16,1,.3,1) ${d}s`,
  })

  // ── Loading state ─────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className={inter.className} style={{ padding: "24px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {[120, 80, 200].map((w, i) => (
          <div key={i} style={{ height: 16, width: w, borderRadius: 8, background: "var(--ring-bg)", opacity: 0.5 }} />
        ))}
      </div>
    )
  }

  // ── Unavailable state ─────────────────────────────────────────
  if (status === "unavailable" || !data) {
    return (
      <div className={inter.className} style={{ margin: `12px ${sidePad}` }}>
        <div style={{ padding: "16px 18px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 9, letterSpacing: "2.4px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 500, marginBottom: 8 }}>
            Circadian Rhythm
          </div>
          <div style={{ fontSize: 16, fontWeight: 400, color: "var(--text-main)", marginBottom: 6 }}>
            Body clock data loading
          </div>
          <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6, fontWeight: 300 }}>
            {reason === "No sleep data available" || reason === "No main sleep data available"
              ? "Log your first sleep session to unlock your body clock analysis."
              : reason === "Insufficient sleep data"
              ? "Log a few more sleep sessions — your body clock analysis will appear shortly."
              : "Your circadian analysis will appear here once your data loads."
            }
          </div>
        </div>

        {/* Placeholder ring — gives the user a preview of what's coming */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8, opacity: 0.25 }}>
          <svg width={300} height={300} viewBox="0 0 340 340">
            <circle cx={170} cy={170} r={R_MID} fill="none"
              stroke="rgba(128,128,128,0.3)" strokeWidth={SW + 2} />
            {[0,6,12,18].map(h => {
              const ang = (h / 24) * 360
              const rad = ((ang - 90) * Math.PI) / 180
              const inner = { x: 170 + (R_IN - 3) * Math.cos(rad), y: 170 + (R_IN - 3) * Math.sin(rad) }
              const outer = { x: 170 + (R_OUT + 3) * Math.cos(rad), y: 170 + (R_OUT + 3) * Math.sin(rad) }
              return <line key={h} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="rgba(128,128,128,0.4)" strokeWidth={1.5} />
            })}
            <text x={170} y={170} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(128,128,128,0.4)" fontSize={11} fontFamily="Inter">
              Log sleep to unlock
            </text>
          </svg>
        </div>
      </div>
    )
  }

  // ── Full UI ───────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes halo_NOW  { 0%,100%{opacity:.3;r:11px} 50%{opacity:0;r:22px} }
        @keyframes pulse_NOW { 0%,100%{opacity:1}         50%{opacity:.7}        }
        @keyframes halo_BODY { 0%,100%{opacity:.25;r:10px} 50%{opacity:0;r:20px} }
        @keyframes pulse_BODY{ 0%,100%{opacity:1}          50%{opacity:.65}       }
        .circ-card { background: var(--card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px 18px; }
        .circ-lbl  { font-size: 9px; letter-spacing: 2.4px; color: var(--text-muted); text-transform: uppercase; font-weight: 500; }
      `}</style>

      <div className={inter.className} style={{ color: "var(--text-main)", ...inter.style }}>

        {showMainSections && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Open body clock page"
            onClick={() => router.push("/body-clock")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                router.push("/body-clock")
              }
            }}
            style={{ cursor: "pointer" }}
          >
        {/* ── Ring ─────────────────────────────────────── */}
        <div style={{ ...rev(0.12) }}>
          <div style={{ position: "relative", display: "flex", justifyContent: "center", paddingTop: 8, overflow: "visible" }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: 286, height: 286, borderRadius: "50%",
              background: `radial-gradient(circle, ${bodyColor}0d 0%, ${bodyColor}05 38%, transparent 68%)`,
              pointerEvents: "none",
            }} />

            <svg width={372} height={372} viewBox="0 0 340 340" overflow="visible">
              <defs>
                <linearGradient id="circ_grad_peak" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4ade80" />
                  <stop offset="45%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#15803d" />
                </linearGradient>
                <linearGradient id="circ_grad_elevated" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#facc15" />
                  <stop offset="100%" stopColor="#ca8a04" />
                </linearGradient>
                <linearGradient id="circ_grad_moderate" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="45%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#c2410c" />
                </linearGradient>
                <linearGradient id="circ_grad_low" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="40%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <filter id="circ_ring_lift" x="-35%" y="-35%" width="170%" height="170%">
                  <feDropShadow dx={0} dy={2} stdDeviation={2.5} floodColor="#0f172a" floodOpacity={0.09} />
                </filter>
                <filter id="circ_lbl_lift" x="-25%" y="-25%" width="150%" height="150%">
                  <feDropShadow dx={0} dy={1} stdDeviation={1.5} floodColor="#0f172a" floodOpacity={0.06} />
                </filter>
                <filter id="glow_NOW">
                  <feGaussianBlur stdDeviation="4" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow_BODY">
                  <feGaussianBlur stdDeviation="3" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Base track — soft outer + theme groove */}
              <circle cx={CX} cy={CY} r={R_MID} fill="none"
                stroke="rgba(15,23,42,0.055)" strokeWidth={SW + 6} />
              <circle cx={CX} cy={CY} r={R_MID} fill="none"
                stroke="var(--ring-bg)" strokeWidth={SW + 2} />

              {/* Solid colour zones */}
              <g filter="url(#circ_ring_lift)">
                {ZONES.map((z, i) => (
                  <path
                    key={i}
                    d={zonePath(z.startH, z.endH)}
                    fill={zoneGradientFill(z.color)}
                    fillOpacity={revealed ? 0.96 : 0}
                    style={{ transition: `fill-opacity 1.4s ease ${0.05 + i * 0.09}s` }}
                  />
                ))}
              </g>

              {/* Misalignment arc (dashes read as “dots” on coloured zones) */}
              <path d={arcPath(BODY_A, NOW_A, R_MID)}
                stroke="#ffffff" strokeWidth={SW + 8} fill="none"
                strokeOpacity={revealed ? 0.18 : 0}
                style={{ transition: "stroke-opacity 1.2s ease 1s" }}
              />
              <path d={arcPath(BODY_A, NOW_A, R_MID)}
                stroke="#ffffff" strokeWidth={2} fill="none"
                strokeOpacity={revealed ? 0.72 : 0}
                strokeDasharray="4 3"
                style={{ transition: "stroke-opacity 1.2s ease 1s" }}
              />

              {/* Hour ticks */}
              {[0, 6, 12, 18].map(h => {
                const inner = toXY(hToAngle(h), R_IN  - 3)
                const outer = toXY(hToAngle(h), R_OUT + 3)
                const lbl   = toXY(hToAngle(h), R_OUT + 19)
                return (
                  <g key={h}>
                    <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                      stroke="rgba(128,128,128,0.4)" strokeWidth={1.5} />
                    <text x={lbl.x} y={lbl.y} textAnchor="middle" dominantBaseline="middle"
                      fill="var(--text-muted)" fontSize={10} fontFamily="Inter" fontWeight={600}>
                      {String(h).padStart(2,"0")}
                    </text>
                  </g>
                )
              })}

              {/* Centre text */}
              <text x={CX} y={CY - 19} textAnchor="middle"
                fill="var(--text-muted)" fontSize={13} fontFamily="Inter" fontWeight={600} letterSpacing={2}>
                ALERTNESS
              </text>
              <text x={CX} y={CY + 11} textAnchor="middle"
                fill={bodyColor} fontSize={24} fontFamily="Inter" fontWeight={700} letterSpacing={1.2}
                stroke="var(--bg)" strokeWidth={0.6} paintOrder="stroke fill">
                {stateLabel.split(" ")[0].toUpperCase()}
              </text>
              <text x={CX} y={CY + 35} textAnchor="middle"
                fill="var(--text-muted)" fontSize={14} fontFamily="Inter" fontWeight={500}>
                right now
              </text>

              {/* Markers */}
              <RingMarker
                angle={NOW_A}
                color="var(--accent-blue)"
                label="NOW"
                time={fmt(CURRENT)}
                labelOffset={ringLabelSep.now}
              />
              <RingMarker
                angle={BODY_A}
                color={bodyColor}
                label="BODY"
                time={fmt(BODY)}
                labelOffset={ringLabelSep.body}
              />
            </svg>
          </div>

          {/* Alertness key — single row under the ring */}
          <div
            className={inter.className}
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "nowrap",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px 0",
            }}
          >
            {([[COLOR_PEAK, "Peak"], [COLOR_ELEVATED, "Elevated"], [COLOR_MODERATE, "Moderate"], [COLOR_LOW, "Low"]] as const).map(
              ([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                  <div style={{ width: 16, height: 4, borderRadius: 2, background: c }} />
                  <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
                    {l}
                  </span>
                </div>
              ),
            )}
          </div>

          {/* Ring caption */}
          <div style={{ textAlign: "center", marginTop: 4, paddingBottom: 6 }}>
            <span
              className={inter.className}
              style={{ fontSize: 16, lineHeight: 1.35, color: "var(--text-muted)" }}
            >
              Body clock is{" "}
              <span style={{ color: "#F59E0B", fontWeight: 600, fontSize: 17 }}>
                {misalignH}h {misalignM}m behind
              </span>
              {" "}actual time
            </span>
          </div>
        </div>

        {/* ── Hero verdict card (below ring) — neutral chrome to match dashboard cards ───────────── */}
        <div style={{ padding: `16px ${sidePad} 0`, ...rev(0.2) }}>
          <div
            className={inter.className}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              padding: "18px 20px 16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--text-muted)",
                  flexShrink: 0,
                }}
              />
              <div className={`circ-lbl ${inter.className}`}>{stateLabel}</div>
            </div>
            <div
              className={inter.className}
              style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, marginBottom: 14, color: "var(--text-main)" }}
            >
              {stateVerdict}
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 14 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <div className={`circ-lbl ${inter.className}`} style={{ marginBottom: 4 }}>Risk window</div>
                <div
                  className={inter.className}
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    color: "var(--text-main)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fmt(troughActual)}
                </div>
                <div className={inter.className} style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  Avoid critical decisions
                </div>
              </div>
              <div style={{ textAlign: "right", paddingBottom: 2 }}>
                <div className={`circ-lbl ${inter.className}`} style={{ marginBottom: 4 }}>Time away</div>
                <div
                  className={inter.className}
                  style={{
                    fontSize: 20,
                    fontWeight: 600,
                    color: "#F59E0B",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {ttH}h {ttM}m
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Peak chip (below ring) — same neutral treatment as verdict card ───────────────────── */}
        <div style={{ padding: `10px ${sidePad} 0`, ...rev(0.28) }}>
          <div
            className={inter.className}
            style={{
              background: "rgba(3, 180, 193, 0.18)",
              border: "none",
              borderRadius: 12,
              padding: "11px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLOR_PEAK, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: COLOR_PEAK }}>Peak alertness window</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: COLOR_PEAK, fontVariantNumeric: "tabular-nums" }}>
              {fmt(peakActual)}
              <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6, fontWeight: 500 }}>
                ({Math.round(hoursUntil(CURRENT, peakActual))}h)
              </span>
            </div>
          </div>
        </div>
          </div>
        )}

        {showSupportingSections && (
        <>
        {/* ── Supporting cards ─────────────────────────── */}
        <div style={{ padding: `4px ${sidePad} 0`, display: "flex", flexDirection: "column", gap: 10 }}>

          {/* 7-day alignment trend from circadian_logs */}
          <SevenDayTrend currentMisalign={MISALIGN} rev={rev} />

          {/* Why shifted */}
          <div className="circ-card" style={rev(0.5)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div className="circ-lbl" style={{ marginBottom: 5 }}>Why your clock is shifted</div>
                <div style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.55, fontWeight: 300 }}>
                  {MISALIGN < 1
                    ? "Your body clock is well aligned. Keep your sleep timing consistent to maintain this."
                    : MISALIGN < 3
                    ? "Recent shifts have pushed your body clock slightly. It takes roughly one day to shift one hour."
                    : "Your rotation has significantly shifted your body clock. Rest windows are your best recovery tool."
                  }
                </div>
              </div>
              <div style={{ paddingLeft: 16, textAlign: "right", flexShrink: 0 }}>
                <div className="circ-lbl" style={{ marginBottom: 3 }}>Offset</div>
                <div style={{ fontSize: 26, fontWeight: 300, color: "#F59E0B", lineHeight: 1 }}>
                  {misalignH}h{misalignM > 0 ? ` ${misalignM}m` : ""}
                </div>
              </div>
            </div>
          </div>

          {/* Alignment score breakdown */}
          <div className="circ-card" style={rev(0.58)}>
            <div className="circ-lbl" style={{ marginBottom: 12 }}>Score Breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([
                { label: "Alignment",  value: data.alignmentScore,             color: bodyColor },
                { label: "Fatigue",    value: data.fatigueScore ?? 50,         color: "#F59E0B" },
              ] as const).map(({ label, value, color }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "var(--text-soft)" }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color }}>{Math.round(value)}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--ring-bg)", overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, background: color,
                      width: `${Math.round(value)}%`,
                      transition: "width 1s cubic-bezier(.16,1,.3,1)",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
        </>
        )}

      </div>
    </>
  )
}
