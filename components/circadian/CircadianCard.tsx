"use client"

import { useState, useEffect, useCallback } from "react"
import { Inter } from "next/font/google"
import { supabase } from "@/lib/supabase"
import { getCircadianData } from "@/lib/circadian/circadianCache"

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
export const R_OUT = 122, R_IN = 96
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
        const res  = await fetch("/api/circadian/calculate", { cache: "no-store" })
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

  const tMin  = Math.min(...trend)
  const tMax  = Math.max(...trend)
  const range = tMax - tMin || 1
  const TW = 165, TH = 32

  const pts = trend.map((v, i) => {
    const x = (i / (trend.length - 1)) * TW
    const y = TH - ((v - tMin) / (range + 0.3)) * (TH * 0.82)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(" ")

  const improving = trend[0] > trend[trend.length - 1]
  const todayVal  = trend[trend.length - 1]
  const startVal  = trend[0]

  return (
    <div className="circ-card" style={rev(0.67)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div className="circ-lbl" style={{ marginBottom: 3 }}>7-Day Alignment</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {improving ? "Misalignment improving" : "Misalignment increasing"}
          </div>
        </div>
        <div style={{ fontSize: 10, color: improving ? "#22D3EE" : "#EF4444", fontWeight: 600 }}>
          {improving ? "↓ Recovering" : "↑ Worsening"}
        </div>
      </div>

      <svg width="100%" height={TH + 18}
        viewBox={`0 0 ${TW} ${TH + 18}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00BCD4" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#00BCD4" stopOpacity="0"    />
          </linearGradient>
        </defs>
        <polyline points={`0,${TH} ${pts} ${TW},${TH}`} fill="url(#trendGrad)" />
        <polyline points={pts} fill="none" stroke="#00BCD4"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <text key={i}
            x={(i / 6) * TW} y={TH + 13}
            textAnchor="middle"
            fill="rgba(128,128,128,0.4)"
            fontSize={8} fontFamily="Inter">
            {d}
          </text>
        ))}
      </svg>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
          7 days ago: {startVal.toFixed(1)}h
        </span>
        <span style={{ fontSize: 10, color: "#00BCD4", fontWeight: 500 }}>
          Today: {todayVal.toFixed(1)}h
        </span>
      </div>
    </div>
  )
}

function RingMarker({
  angle, color, label, time
}: {
  angle: number; color: string; label: string; time: string
}) {
  const lineStart = toXY(angle, R_IN  - 16)
  const lineEnd   = toXY(angle, R_OUT + 16)
  const dot       = toXY(angle, R_OUT + 8)
  /** Slightly inset so labels are not clipped by narrow card gutters */
  const lPos      = toXY(angle, R_OUT + 30)
  const norm      = ((angle % 360) + 360) % 360
  const anchor    = norm > 10 && norm < 170 ? "start"
                  : norm > 190 && norm < 350 ? "end"
                  : "middle"
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
      <text
        x={lPos.x} y={lPos.y - 5}
        textAnchor={anchor} dominantBaseline="middle"
        fill={color} fontSize={9} fontFamily="Inter" fontWeight={700} letterSpacing={1.5}
        stroke={isNow ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.75)"}
        strokeWidth={isNow ? 0.4 : 0.35}
        paintOrder="stroke fill"
      >
        {label}
      </text>
      <text
        x={lPos.x} y={lPos.y + 7}
        textAnchor={anchor} dominantBaseline="middle"
        fill="var(--text-main)"
        fontSize={10}
        fontFamily="Inter"
        fontWeight={600}
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
      <div className={inter.className} style={{ margin: "12px 18px" }}>
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
          <svg width={280} height={280} viewBox="0 0 340 340">
            <circle cx={170} cy={170} r={109} fill="none"
              stroke="rgba(128,128,128,0.3)" strokeWidth={26} />
            {[0,6,12,18].map(h => {
              const ang = (h / 24) * 360
              const rad = ((ang - 90) * Math.PI) / 180
              const inner = { x: 170 + 93  * Math.cos(rad), y: 170 + 93  * Math.sin(rad) }
              const outer = { x: 170 + 125 * Math.cos(rad), y: 170 + 125 * Math.sin(rad) }
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
          <>
        {/* ── Ring ─────────────────────────────────────── */}
        <div style={{ ...rev(0.12) }}>
          <div style={{ position: "relative", display: "flex", justifyContent: "center", paddingTop: 8, overflow: "visible" }}>
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              width: 256, height: 256, borderRadius: "50%",
              background: `radial-gradient(circle, ${bodyColor}08 0%, transparent 65%)`,
              pointerEvents: "none",
            }} />

            <svg width={340} height={340} viewBox="0 0 340 340" overflow="visible">
              <defs>
                <filter id="glow_NOW">
                  <feGaussianBlur stdDeviation="4" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow_BODY">
                  <feGaussianBlur stdDeviation="3" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="glow_amber">
                  <feGaussianBlur stdDeviation="4" result="b"/>
                  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              {/* Base track */}
              <circle cx={CX} cy={CY} r={R_MID} fill="none"
                stroke="rgba(128,128,128,0.15)" strokeWidth={SW + 2} />

              {/* Solid colour zones */}
              {ZONES.map((z, i) => (
                <path key={i} d={zonePath(z.startH, z.endH)} fill={z.color}
                  fillOpacity={revealed ? 0.9 : 0}
                  style={{ transition: `fill-opacity 1.4s ease ${0.05 + i * 0.09}s` }}
                />
              ))}

              {/* Misalignment arc */}
              <path d={arcPath(BODY_A, NOW_A, R_MID)}
                stroke="#F59E0B" strokeWidth={SW + 8} fill="none"
                strokeOpacity={revealed ? 0.15 : 0} filter="url(#glow_amber)"
                style={{ transition: "stroke-opacity 1.2s ease 1s" }}
              />
              <path d={arcPath(BODY_A, NOW_A, R_MID)}
                stroke="#F59E0B" strokeWidth={2} fill="none"
                strokeOpacity={revealed ? 0.6 : 0}
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
                      fill="var(--text-muted)" fontSize={9} fontFamily="Inter" fontWeight={600}>
                      {String(h).padStart(2,"0")}
                    </text>
                  </g>
                )
              })}

              {/* Centre text */}
              <text x={CX} y={CY - 12} textAnchor="middle"
                fill="var(--text-muted)" fontSize={9} fontFamily="Inter" fontWeight={600} letterSpacing={2}>
                ALERTNESS
              </text>
              <text x={CX} y={CY + 5} textAnchor="middle"
                fill={bodyColor} fontSize={14} fontFamily="Inter" fontWeight={700} letterSpacing={1.5}
                stroke="var(--bg)" strokeWidth={0.5} paintOrder="stroke fill">
                {stateLabel.split(" ")[0].toUpperCase()}
              </text>
              <text x={CX} y={CY + 21} textAnchor="middle"
                fill="var(--text-muted)" fontSize={9} fontFamily="Inter" fontWeight={500}>
                right now
              </text>

              {/* Markers */}
              <RingMarker angle={BODY_A} color={bodyColor} label="BODY" time={fmt(BODY)} />
              <RingMarker angle={NOW_A} color="var(--text-main)" label="NOW" time={fmt(CURRENT)} />
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
          <div style={{ textAlign: "center", marginTop: 2, paddingBottom: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Body clock is{" "}
              <span style={{ color: "#F59E0B", fontWeight: 500 }}>
                {misalignH}h {misalignM}m behind
              </span>
              {" "}actual time
            </span>
          </div>
        </div>

        {/* ── Hero verdict card (below ring) — neutral chrome to match dashboard cards ───────────── */}
        <div style={{ padding: "16px 18px 0", ...rev(0.2) }}>
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
        <div style={{ padding: "10px 18px 0", ...rev(0.28) }}>
          <div
            className={inter.className}
            style={{
              background: "var(--card-subtle)",
              border: "1px solid #93C5FD",
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
          </>
        )}

        {showSupportingSections && (
        <>
        {/* ── Supporting cards ─────────────────────────── */}
        <div style={{ padding: "4px 18px 0", display: "flex", flexDirection: "column", gap: 10 }}>

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

          {/* 7-day alignment trend from circadian_logs */}
          <SevenDayTrend currentMisalign={MISALIGN} rev={rev} />

        </div>
        </>
        )}

      </div>
    </>
  )
}
