"use client"

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getMyProfile } from "@/lib/profile"
import { authedFetch } from "@/lib/supabase/authedFetch"
import { mapOnboardingRotationToPatternSlots } from "@/lib/rota/mapOnboardingRotationToPatternSlots"
import { notifyRotaUpdated } from "@/lib/shift-agent/shiftAgent"
import { OnboardingSignInDetailsPanel } from "@/components/onboarding/OnboardingSignInDetailsPanel"

type WorkerType = "fixed" | "rotating" | "variable" | "oncall"
type ShiftType = "off" | "day" | "night"
type VariableShiftType = "morning" | "afternoon" | "night"
type AnyShiftType = ShiftType | VariableShiftType
type WeekendExtension = "yes" | "no" | "varies"
interface ShiftTime { start: string; end: string }
interface ShiftTimes { day: ShiftTime; night: ShiftTime }
interface VariableShiftTimes { morning: ShiftTime; afternoon: ShiftTime; night: ShiftTime }

const ONBOARDING_DRAFT_STORAGE_KEY = "shiftcoach.onboardingDraft.v1"

/** Persisted when the user leaves mid-wizard without a session; restored after sign-in. */
interface OnboardingDraftStored {
  /** v1: `screenReady` was the ALL SET index only. v2: gate screen inserted before it; `screenReady` is the ALL SET index. v3: adds commute draft fields. */
  v: 1 | 2 | 3
  workerType: WorkerType
  cycleLen: number
  rotation: ShiftType[]
  times: ShiftTimes
  varTimes: VariableShiftTimes
  postSleep: string
  varT: { morning: boolean; afternoon: boolean; night: boolean }
  todayPos: number | string | null
  wkndExt: WeekendExtension | null
  customLen: string
  screenReady: number
  commuteToWork?: { minutes: string; method: string }
  commuteFromWork?: { minutes: string; method: string }
}

const SS: Record<ShiftType, { label: string; short: string; icon: string; bg: string; color: string; border: string }> = {
  off: { label: "OFF", short: "OFF", icon: "—", bg: "var(--card-subtle)", color: "var(--text-muted)", border: "var(--border-subtle)" },
  day: { label: "DAY", short: "DAY", icon: "☀", bg: "rgba(0,188,212,0.15)", color: "#00BCD4", border: "rgba(0,188,212,0.4)" },
  night: { label: "NIGHT", short: "NGT", icon: "◑", bg: "rgba(239,68,68,0.15)", color: "#EF4444", border: "rgba(239,68,68,0.4)" },
}

const VAR_SS: Record<VariableShiftType, { label: string; short: string; icon: string; bg: string; color: string; border: string }> = {
  morning: { label: "MORNING", short: "MOR", icon: "🌅", bg: "rgba(0,188,212,0.15)", color: "#00BCD4", border: "rgba(0,188,212,0.4)" },
  afternoon: { label: "AFTERNOON", short: "AFT", icon: "☀", bg: "rgba(245,158,11,0.15)", color: "#F59E0B", border: "rgba(245,158,11,0.4)" },
  night: { label: "NIGHT", short: "NGT", icon: "◑", bg: "rgba(239,68,68,0.15)", color: "#EF4444", border: "rgba(239,68,68,0.4)" },
}

const CYCLE_ORDER: ShiftType[] = ["off", "day", "night"]

const WORKER_TYPES = [
  { id: "fixed" as const, icon: "⟳", title: "Fixed Rotation", desc: "4on 4off, 3×3, continental…" },
  { id: "rotating" as const, icon: "⇄", title: "Rotating Shifts", desc: "Mornings, afternoons, nights cycle" },
  { id: "variable" as const, icon: "∿", title: "Variable / Agency", desc: "Different every week" },
  { id: "oncall" as const, icon: "◎", title: "On-Call", desc: "Respond at unpredictable times" },
]

const TRANSITION_RISK: Record<string, { level: "low" | "moderate" | "critical"; label: string; body: string }> = {
  "day-night": { level: "moderate", label: "Day → Night transition", body: "Going from days to nights in the same block. Your body clock will need time to adjust — your first night carries elevated risk." },
  "night-day": { level: "moderate", label: "Night → Day transition", body: "Coming off nights back to days. Sleep debt from the night block may carry into your first day shift." },
}

const RISK_COLOR = { low: "#00BCD4", moderate: "#F59E0B", critical: "#EF4444" }
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function shiftDur(s: string, e: string): number {
  const [sh, sm] = s.split(":").map(Number)
  const [eh, em] = e.split(":").map(Number)
  let m = (eh * 60 + em) - (sh * 60 + sm)
  if (m <= 0) m += 1440
  return m / 60
}
function findTransitions(rot: ShiftType[]) {
  const out: { from: number; to: number; key: string; risk: typeof TRANSITION_RISK[string] }[] = []
  for (let i = 0; i < rot.length; i++) {
    const a = rot[i]
    const b = rot[(i + 1) % rot.length]
    if (a !== "off" && b !== "off" && a !== b) {
      const key = a + "-" + b
      if (TRANSITION_RISK[key]) out.push({ from: i, to: (i + 1) % rot.length, key, risk: TRANSITION_RISK[key] })
    }
  }
  return out
}
function maxConsecutiveWork(rot: ShiftType[]): number {
  let max = 0
  let cur = 0
  const doubled = [...rot, ...rot]
  for (const r of doubled) {
    if (r !== "off") {
      cur++
      max = Math.max(max, cur)
    } else {
      cur = 0
    }
  }
  return Math.min(max, rot.length)
}

/** True for agency/variable slot types. Note: `night` is included — gate with `isVar` when choosing varTimes vs times for fixed day/night. */
function isVariableShiftType(value: AnyShiftType): value is VariableShiftType {
  return value === "morning" || value === "afternoon" || value === "night"
}

const LBL: React.CSSProperties = {
  fontSize: 9, letterSpacing: "2.4px", color: "var(--text-muted)",
  textTransform: "uppercase", fontWeight: 500,
}

function TimeUnit({ value, label, onUp, onDown }: {
  value: number; label: string; onUp: () => void; onDown: () => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <button type="button" onClick={onUp} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", padding: "4px 14px" }}>▲</button>
      <div style={{ fontSize: 36, fontWeight: 300, lineHeight: 1, minWidth: 48, textAlign: "center" }}>
        {String(value).padStart(2, "0")}
      </div>
      <button type="button" onClick={onDown} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", padding: "4px 14px" }}>▼</button>
      <div style={{ fontSize: 8, letterSpacing: "1.5px", color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  )
}

function TimePicker({ value, onChange, label, caption }: {
  value: string; onChange: (v: string) => void; label: string; caption?: string
}) {
  const [hh, mm] = value.split(":").map(Number)
  const sH = (d: number) => onChange(String(((hh + d) + 24) % 24).padStart(2, "0") + ":" + String(mm).padStart(2, "0"))
  const sM = (d: number) => onChange(String(hh).padStart(2, "0") + ":" + String(((mm + d) + 60) % 60).padStart(2, "0"))
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, letterSpacing: "2px", color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ background: "var(--card-subtle)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <TimeUnit value={hh} label="HR" onUp={() => sH(1)} onDown={() => sH(-1)} />
        <div style={{ fontSize: 28, color: "var(--text-muted)", marginBottom: 10, padding: "0 4px" }}>:</div>
        <TimeUnit value={mm} label="MIN" onUp={() => sM(15)} onDown={() => sM(-15)} />
      </div>
      {caption && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 5, textAlign: "center" }}>{caption}</div>
      )}
    </div>
  )
}

function Block({ type, index, size, onTap, isToday }: {
  type: ShiftType; index: number; size: number; onTap?: (i: number) => void; isToday?: boolean
}) {
  const s = SS[type]
  const [tapped, setTapped] = useState(false)
  const go = () => {
    if (!onTap) return
    setTapped(true)
    setTimeout(() => setTapped(false), 160)
    onTap(index)
  }
  return (
    <div onClick={go} style={{
      width: size, height: size * 1.28,
      background: s.bg,
      border: (isToday ? "2.5" : "1.5") + "px solid " + s.border,
      borderRadius: 10,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      cursor: onTap ? "pointer" : "default",
      userSelect: "none",
      transform: tapped ? "scale(0.88)" : isToday ? "scale(1.06)" : "scale(1)",
      transition: "transform 0.15s ease, box-shadow 0.18s ease",
      position: "relative",
      boxShadow: isToday ? "0 0 18px " + s.color + "50" : "none",
    }}>
      <div style={{ fontSize: 6, color: "var(--text-muted)", letterSpacing: "0.8px", marginBottom: 2 }}>D{index + 1}</div>
      <div style={{ fontSize: size > 55 ? 15 : 11, marginBottom: 2 }}>{s.icon}</div>
      <div style={{ fontSize: size > 55 ? 7 : 6, color: s.color, letterSpacing: "0.5px", fontWeight: 700, textAlign: "center", lineHeight: 1.1 }}>
        {type === "off" ? "—" : s.short}
      </div>
      {isToday && (
        <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: s.color, borderRadius: 5, padding: "2px 7px", fontSize: 7, fontWeight: 700, color: type === "night" ? "#fff" : "#000", whiteSpace: "nowrap" }}>
          TODAY
        </div>
      )}
    </div>
  )
}

/** Read-only block matching `Block` visuals — for filled-in examples only. */
function StaticPatternBlock({ type, index, size = 36, fluid }: { type: ShiftType; index: number; size?: number; fluid?: boolean }) {
  const s = SS[type]
  const box: React.CSSProperties = fluid
    ? {
        width: "100%",
        minWidth: 0,
        aspectRatio: "25 / 28",
        height: "auto",
      }
    : {
        width: size,
        height: size * 1.28,
        flexShrink: 0,
      }
  const iconSize = fluid ? "clamp(8px, 3.2vw, 10px)" : size > 55 ? 15 : 11
  const labelSize = fluid ? "clamp(4px, 2.2vw, 6px)" : size > 55 ? 7 : 6
  return (
    <div
      style={{
        ...box,
        background: s.bg,
        border: "1.5px solid " + s.border,
        borderRadius: fluid ? 8 : 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontSize: fluid ? "clamp(4px, 2vw, 5px)" : 6,
          color: "var(--text-muted)",
          letterSpacing: fluid ? "0.4px" : "0.8px",
          marginBottom: fluid ? 1 : 2,
        }}
      >
        D{index + 1}
      </div>
      <div style={{ fontSize: iconSize, marginBottom: 2, lineHeight: 1 }}>{s.icon}</div>
      <div
        style={{
          fontSize: labelSize,
          color: s.color,
          letterSpacing: "0.5px",
          fontWeight: 700,
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {type === "off" ? "—" : s.short}
      </div>
    </div>
  )
}

function ExamplePatternRow({ types, startIndex }: { types: ShiftType[]; startIndex: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${types.length}, minmax(0, 1fr))`,
        gap: 3,
        width: "100%",
      }}
    >
      {types.map((type, i) => (
        <StaticPatternBlock key={`${startIndex}-${i}`} type={type} index={startIndex + i} fluid />
      ))}
    </div>
  )
}

function CycleLengthExplainerCard() {
  const cap: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: "0.06em",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    marginBottom: 6,
  }
  const eight: ShiftType[] = ["day", "day", "night", "night", "off", "off", "off", "off"]
  const sixteenA: ShiftType[] = ["day", "day", "day", "day", "off", "off", "off", "off"]
  const sixteenB: ShiftType[] = ["night", "night", "night", "night", "off", "off", "off", "off"]

  const preview: React.CSSProperties = {
    maxWidth: "min(252px, 100%)",
    marginLeft: "auto",
    marginRight: "auto",
    width: "100%",
  }

  return (
    <div
      style={{
        width: "calc(100% + 40px)",
        marginLeft: -20,
        marginRight: -20,
        boxSizing: "border-box",
        borderRadius: 12,
        padding: "10px 20px 12px",
        marginBottom: 18,
        background: "var(--card-subtle)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ ...LBL, marginBottom: 4 }}>Examples</div>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--text-soft)", fontWeight: 300, lineHeight: 1.45 }}>
        Yours should look like this when filled in — tap blocks below to match your rotation.
      </p>

      <div style={preview}>
        <div style={{ ...cap, marginTop: 0 }}>8 days · 2 day + 2 night + 4 off</div>
        <ExamplePatternRow types={eight} startIndex={0} />

        <div style={{ ...cap, marginTop: 10 }}>16 days · 4 day + 4 night + 8 off</div>
        <ExamplePatternRow types={sixteenA} startIndex={0} />
        <div style={{ marginTop: 4 }}>
          <ExamplePatternRow types={sixteenB} startIndex={8} />
        </div>
      </div>

      <p style={{ margin: "10px 0 0", fontSize: 10, color: "var(--text-muted)", fontWeight: 300, lineHeight: 1.45 }}>
        Cycle length is how many days are in the loop — count every block from D1 through the last day, off days included.
      </p>
    </div>
  )
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6, height: 6, borderRadius: 3,
          background: i === current ? "#00BCD4" : i < current ? "rgba(0,188,212,0.4)" : "var(--ring-bg)",
          transition: "all 0.3s ease",
        }} />
      ))}
    </div>
  )
}

function PBtn({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={{
      width: "100%", padding: 16,
      background: disabled ? "var(--card-subtle)" : "#00BCD4",
      color: disabled ? "var(--text-muted)" : "#000",
      border: "none", borderRadius: 14, fontSize: 14, fontWeight: 600,
      fontFamily: "Inter,sans-serif", letterSpacing: "0.4px",
      cursor: disabled ? "default" : "pointer", transition: "all 0.2s ease",
    }}>
      {children}
    </button>
  )
}

function Insight({ color, title, body }: { color: string; title: string; body: string }) {
  return (
    <div style={{ background: "var(--card-subtle)", border: "1px solid " + color + "44", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 4, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: color, marginBottom: 3 }}>{title}</div>
          <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.55, fontWeight: 300 }}>{body}</div>
        </div>
      </div>
    </div>
  )
}

function OptionCard({ selected, onClick, title, desc }: {
  selected: boolean; onClick: () => void; title: string; desc: string
}) {
  return (
    <div onClick={onClick} style={{
      background: selected ? "rgba(0,188,212,0.08)" : "var(--card-subtle)",
      border: "1px solid " + (selected ? "rgba(0,188,212,0.5)" : "var(--border-subtle)"),
      borderRadius: 12, padding: "16px 18px", cursor: "pointer", transition: "all 0.2s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{title}</div>
        {selected && (
          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#000", fontWeight: 700 }}>✓</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 300, lineHeight: 1.5 }}>{desc}</div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [screen, setScreen] = useState(0)
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workerType, setWorkerType] = useState<WorkerType | null>(null)
  const [cycleLen, setCycleLen] = useState(4)
  const [rotation, setRotation] = useState<ShiftType[]>(["off", "off", "off", "off"])
  const [times, setTimes] = useState<ShiftTimes>({ day: { start: "07:00", end: "19:00" }, night: { start: "19:00", end: "07:00" } })
  const [varTimes, setVarTimes] = useState<VariableShiftTimes>({ morning: { start: "06:00", end: "14:00" }, afternoon: { start: "14:00", end: "22:00" }, night: { start: "22:00", end: "06:00" } })
  const [postSleep, setPostSleep] = useState("07:00")
  const [varT, setVarT] = useState({ morning: false, afternoon: false, night: true })
  const [todayPos, setTodayPos] = useState<number | string | null>(null)
  const [wkndExt, setWkndExt] = useState<WeekendExtension | null>(null)
  const [customLen, setCustomLen] = useState("")
  const [commuteToWork, setCommuteToWork] = useState<{ minutes: string; method: string }>({
    minutes: "30",
    method: "drive",
  })
  const [commuteFromWork, setCommuteFromWork] = useState<{ minutes: string; method: string }>({
    minutes: "30",
    method: "drive",
  })
  /** Prevents duplicate profile/rota saves (e.g. sign-up onSuccess + skip-account effect). */
  const completingOnboardingRef = useRef(false)
  /** When on account step: null = checking session, false = show sign-up, true = already signed in. */
  const [accountStepSession, setAccountStepSession] = useState<boolean | null>(null)
  const [accountStepEmail, setAccountStepEmail] = useState<string | null>(null)

  useEffect(() => { setVisible(false); const t = setTimeout(() => setVisible(true), 80); return () => clearTimeout(t) }, [screen])
  useEffect(() => {
    if (typeof document === "undefined") return
    const savedTheme = window.localStorage.getItem("theme")
    if (savedTheme === "light") {
      document.documentElement.classList.remove("dark")
    } else if (savedTheme === "dark") {
      document.documentElement.classList.add("dark")
    }
  }, [])

  const isVar = workerType === "variable" || workerType === "oncall"
  const usedTypes: AnyShiftType[] = isVar
    ? (Object.keys(varT) as VariableShiftType[]).filter((k) => varT[k as keyof typeof varT])
    : ([...new Set(rotation.filter((r) => r !== "off"))] as ShiftType[])
  const hasNights = usedTypes.includes("night")
  const trans = findTransitions(rotation)
  const maxConsec = useMemo(() => maxConsecutiveWork(rotation), [rotation])
  const needsWknd = !isVar && maxConsec >= 5
  const worstTrans = trans
    .slice()
    .sort(
      (a, b) =>
        ({ critical: 2, moderate: 1, low: 0 }[b.risk.level] -
          { critical: 2, moderate: 1, low: 0 }[a.risk.level])
    )[0]

  const SCREEN_WKND = needsWknd ? 5 : -1
  const SCREEN_SLEEP = hasNights ? (needsWknd ? 6 : 5) : -1
  /** Review summary before account creation; guests then see sign-up. */
  const SCREEN_SUMMARY = needsWknd ? (hasNights ? 7 : 6) : (hasNights ? 6 : 5)
  const SCREEN_ACCOUNT = SCREEN_SUMMARY + 1
  const totalScreens = SCREEN_ACCOUNT + 1

  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    const raw = sessionStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)
    if (!raw) return

    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.user) return
      try {
        const d = JSON.parse(raw) as OnboardingDraftStored
        if (d.v !== 1 && d.v !== 2 && d.v !== 3) return
        sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY)
        setWorkerType(d.workerType)
        setCycleLen(d.cycleLen)
        setRotation(d.rotation)
        setTimes(d.times)
        setVarTimes(d.varTimes)
        setPostSleep(d.postSleep)
        setVarT(d.varT)
        setTodayPos(d.todayPos)
        setWkndExt(d.wkndExt)
        setCustomLen(d.customLen ?? "")
        setCommuteToWork(d.commuteToWork ?? { minutes: "30", method: "drive" })
        setCommuteFromWork(d.commuteFromWork ?? { minutes: "30", method: "drive" })
        // v1 drafts stored the old final index (ALL SET only); one gate screen was inserted after.
        const summaryScreen = d.v === 1 ? d.screenReady + 1 : d.screenReady
        setScreen(summaryScreen)
      } catch {
        sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (screen !== SCREEN_ACCOUNT) {
      setAccountStepSession(null)
      setAccountStepEmail(null)
      return
    }
    let cancelled = false
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return
      const u = session?.user
      setAccountStepSession(Boolean(u))
      setAccountStepEmail(u?.email ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [screen, SCREEN_ACCOUNT])

  const persistOnboardingDraft = (summaryScreenIndex: number) => {
    if (!workerType) return
    const draft: OnboardingDraftStored = {
      v: 3,
      workerType,
      cycleLen,
      rotation,
      times,
      varTimes,
      postSleep,
      varT,
      todayPos,
      wkndExt,
      customLen,
      screenReady: summaryScreenIndex,
      commuteToWork,
      commuteFromWork,
    }
    try {
      sessionStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    } catch {
      /* storage full or disabled */
    }
  }

  const next = () => setScreen((s) => s + 1)
  const back = () => setScreen((s) => Math.max(0, s - 1))

  const resizeCycle = (len: number) => {
    setCycleLen(len)
    setTodayPos(null)
    setRotation((p) => len > p.length ? [...p, ...(Array(len - p.length).fill("off") as ShiftType[])] : p.slice(0, len))
  }
  const tapBlock = (i: number) => setRotation((p) => {
    const n = [...p]
    n[i] = CYCLE_ORDER[(CYCLE_ORDER.indexOf(n[i]) + 1) % CYCLE_ORDER.length]
    return n
  })
  const updTime = (type: keyof ShiftTimes, field: "start" | "end", val: string) =>
    setTimes((p) => ({ ...p, [type]: { ...p[type], [field]: val } }))
  const updVarTime = (type: keyof VariableShiftTimes, field: "start" | "end", val: string) =>
    setVarTimes((p) => ({ ...p, [type]: { ...p[type], [field]: val } }))

  const bSize = cycleLen <= 4 ? 68 : cycleLen <= 7 ? 52 : cycleLen <= 9 ? 44 : 38
  /** 16-day cycles (e.g. 4 day / 4 off / 4 night / 4 off) read cleanly as two rows of eight. */
  const bRow = cycleLen <= 8 ? cycleLen : cycleLen <= 12 ? 6 : cycleLen === 16 ? 8 : 7

  const todayType: ShiftType | null = !isVar && typeof todayPos === "number" ? rotation[todayPos] : null
  const todayDesc = (() => {
    if (!todayType || todayType === "off") return "Day off"
    const t = times[todayType as keyof ShiftTimes]
    if (!t) return SS[todayType]?.label ?? "Unknown"
    return `${SS[todayType].label} ${t.start}–${t.end}`
  })()

  const rv = (d = 0): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 0.5s cubic-bezier(.16,1,.3,1) ${d}s, transform 0.5s cubic-bezier(.16,1,.3,1) ${d}s`,
  })

  const handleSubmit = async () => {
    if (completingOnboardingRef.current) return
    completingOnboardingRef.current = true
    setSaving(true)
    setError(null)
    try {
      // Use getSession first — more reliable than getUser during onboarding flow
      let { data: { session } } = await supabase.auth.getSession()

      // If no session, try refreshing once
      if (!session) {
        const { data: refreshed } = await supabase.auth.refreshSession()
        session = refreshed.session
      }

      if (!session?.user) {
        if (!workerType) {
          throw new Error("Session not found — please sign in again.")
        }
        persistOnboardingDraft(SCREEN_ACCOUNT)
        completingOnboardingRef.current = false
        setSaving(false)
        router.push("/auth/sign-up?from=onboarding")
        return
      }
      const user = session.user
      // Ensures a profiles row exists so .update() is not a silent no-op for brand-new accounts.
      await getMyProfile()
      const metaName = user.user_metadata?.name ?? user.user_metadata?.first_name
      const nameFromAuth =
        typeof metaName === "string" && metaName.trim() ? metaName.trim() : undefined
      const anchorYmd = new Date().toISOString().split("T")[0]
      const { error: err } = await supabase.from("profiles").update({
        ...(nameFromAuth ? { name: nameFromAuth } : {}),
        worker_type: workerType,
        cycle_length: cycleLen,
        rotation_pattern: rotation,
        shift_times: isVar ? varTimes : times,
        rotation_anchor_date: anchorYmd,
        rotation_anchor_day: typeof todayPos === "number" ? todayPos : null,
        weekend_extension: wkndExt,
        post_night_sleep: postSleep || null,
        shift_pattern: workerType,
        onboarding_completed: true,
      }).eq("user_id", user.id)
      if (err) throw err

      if (!isVar && typeof todayPos === "number") {
        const hasWorkDay = rotation.some((r) => r !== "off")
        if (hasWorkDay && rotation.length > 0) {
          const patternSlots = mapOnboardingRotationToPatternSlots(rotation)
          const shiftTimesPayload: Record<string, { start: string; end: string }> = {}
          if (rotation.some((r) => r === "day")) {
            shiftTimesPayload.day = { start: times.day.start, end: times.day.end }
          }
          if (rotation.some((r) => r === "night")) {
            shiftTimesPayload.night = { start: times.night.start, end: times.night.end }
          }
          const commutePayload = {
            toWork: {
              minutes: Math.min(300, Math.max(0, parseInt(commuteToWork.minutes, 10) || 0)),
              method: commuteToWork.method.trim() || "drive",
            },
            fromWork: {
              minutes: Math.min(300, Math.max(0, parseInt(commuteFromWork.minutes, 10) || 0)),
              method: commuteFromWork.method.trim() || "drive",
            },
          }
          const colorConfig = {
            morning: "#10B981",
            day: "#3B82F6",
            afternoon: "#A855F7",
            night: "#EF4444",
            off: "transparent",
          }
          const patternRes = await authedFetch("/api/rota/pattern", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shiftLength: "12h",
              patternId: "12h-custom",
              patternSlots,
              currentShiftIndex: todayPos,
              startDate: anchorYmd,
              colorConfig,
              notes: null,
            }),
          })
          if (!patternRes.ok) {
            const detail = await patternRes.text().catch(() => "")
            throw new Error(`Could not save your calendar pattern.${detail ? ` ${detail}` : ""}`)
          }
          const applyRes = await authedFetch("/api/rota/apply", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patternId: "12h-custom",
              patternSlots,
              startDate: anchorYmd,
              startCycleIndex: todayPos,
              shiftTimes: shiftTimesPayload,
              commute: commutePayload,
              endDate: null,
            }),
          })
          if (!applyRes.ok) {
            const detail = await applyRes.text().catch(() => "")
            throw new Error(`Could not apply shifts to your calendar.${detail ? ` ${detail}` : ""}`)
          }
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("rota-saved"))
            notifyRotaUpdated()
          }
        }
      }

      try {
        sessionStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      sessionStorage.setItem("fromOnboarding", "true")
      completingOnboardingRef.current = false
      router.push("/onboarding/plan")
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.")
      setSaving(false)
      completingOnboardingRef.current = false
    }
  }

  const isSignInDetails = screen === SCREEN_ACCOUNT
  const shellBg = "var(--bg)"
  const shellInnerBg = "var(--bg)"

  return (
      <div style={{ background: shellBg, width: "100%", minHeight: "100vh", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "100%",
            maxWidth: 390,
            background: shellInnerBg,
            color: "var(--text-main)",
            fontFamily: "Inter,sans-serif",
            display: "flex",
            flexDirection: "column",
            overflowX: "hidden",
            overflowY: isSignInDetails ? "hidden" : "auto",
            minHeight: "100vh",
          }}
        >

          {/* Header */}
          {!isSignInDetails && (
            <div style={{ padding: "52px 24px 0", position: "relative", display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 14, letterSpacing: screen === SCREEN_SUMMARY ? "0.06em" : "0.12em", fontWeight: 700, color: "#05afc5" }}>
                {screen === SCREEN_SUMMARY ? "Review" : "SHIFTCOACH"}
              </div>
              {screen > 0 && screen <= SCREEN_SUMMARY && (
                <button type="button" onClick={back} style={{ position: "absolute", left: 24, background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>← Back</button>
              )}
            </div>
          )}

          {screen > 0 && !isSignInDetails && (
            <div style={{ padding: "16px 24px 0" }}>
              <ProgressDots total={totalScreens} current={screen} />
            </div>
          )}

          <div style={{ flex: 1, padding: isSignInDetails ? 0 : "0 20px", display: "flex", flexDirection: "column", minHeight: 0 }}>

            {/* ══ 0: Worker type ══════════════════════════════════ */}
            {screen === 0 && (
              <div style={{ flex: 1, paddingTop: 40 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>WELCOME</div>
                  <div style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.1, marginBottom: 8 }}>How do<br />you work?</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 32 }}>This shapes everything ShiftCoach does for you.</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {WORKER_TYPES.map((wt, i) => {
                    const sel = workerType === wt.id
                    return (
                      <div key={wt.id}
                        onClick={() => { setWorkerType(wt.id); setTimeout(next, 220) }}
                        style={{ ...rv(0.04 + i * 0.06), background: sel ? "rgba(0,188,212,0.08)" : "var(--card-subtle)", border: "1px solid " + (sel ? "rgba(0,188,212,0.5)" : "var(--border-subtle)"), borderRadius: 12, padding: "15px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.2s ease" }}>
                        <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{wt.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{wt.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text-soft)", fontWeight: 300 }}>{wt.desc}</div>
                        </div>
                        {sel && (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#00BCD4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: "#000", fontWeight: 700 }}>✓</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ══ 1a: Pattern builder ═════════════════════════════ */}
            {screen === 1 && !isVar && (
              <div style={{ flex: 1, paddingTop: 28 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>YOUR ROTATION</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, marginBottom: 6 }}>Build your pattern</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 14, lineHeight: 1.5 }}>
                    Enter your full repeating cycle from day 1 through the last day — every working day and every rest day. Do not only add the shifts you work; the loop must include time off.
                  </div>
                </div>

                <CycleLengthExplainerCard />

                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 300, marginBottom: 18, lineHeight: 1.5, ...rv(0.04) }}>
                  Tap a block to cycle type: OFF (grey) is a day off — leave those days as OFF. Then set day or night for shifts.
                </div>

                <div style={{ marginBottom: 18, ...rv(0.06) }}>
                  <div style={{ ...LBL, marginBottom: 10 }}>CYCLE LENGTH (DAYS)</div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {[4, 7, 8, 9, 12, 14, 16].map((l) => (
                      <button key={l} type="button" onClick={() => resizeCycle(l)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s ease", background: cycleLen === l ? "#00BCD4" : "var(--card-subtle)", color: cycleLen === l ? "#000" : "var(--text-soft)", border: "1px solid " + (cycleLen === l ? "#00BCD4" : "var(--border-subtle)") }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="number" min={2} max={28} placeholder="Custom…"
                      value={customLen}
                      onChange={(e) => setCustomLen(e.target.value)}
                      onBlur={() => { const v = parseInt(customLen); if (v >= 2 && v <= 28) resizeCycle(v) }}
                      style={{ flex: 1, background: "var(--card-subtle)", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: "8px 12px", color: "var(--text-main)", fontSize: 12, fontFamily: "Inter,sans-serif", outline: "none" }}
                    />
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>2–28 days</span>
                  </div>
                </div>

                <div style={{ ...rv(0.1), marginBottom: 8 }}>
                  {Array.from({ length: Math.ceil(cycleLen / bRow) }).map((_, row) => (
                    <div key={row} style={{ display: "flex", gap: 5, marginBottom: 5 }}>
                      {rotation.slice(row * bRow, (row + 1) * bRow).map((type, col) => {
                        const idx = row * bRow + col
                        return <Block key={idx} type={type} index={idx} size={bSize} onTap={tapBlock} />
                      })}
                    </div>
                  ))}
                </div>

                {maxConsec >= 5 && (
                  <div style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, ...rv(0.12) }}>
                    <div style={{ fontSize: 11, color: "#F59E0B", fontWeight: 600, marginBottom: 2 }}>{maxConsec} consecutive shifts detected</div>
                    <div style={{ fontSize: 11, color: "var(--text-soft)", lineHeight: 1.5 }}>Cumulative fatigue tracking will be enabled. By day {Math.max(5, maxConsec - 1)} your risk is compounded regardless of shift type.</div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24, ...rv(0.14) }}>
                  {(["off", "day", "night"] as ShiftType[]).map((t) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: SS[t].bg, border: "1px solid " + SS[t].border }} />
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{SS[t].label}</span>
                    </div>
                  ))}
                </div>
                <PBtn onClick={next} disabled={rotation.every((r) => r === "off")}>Continue</PBtn>
              </div>
            )}

            {/* ══ 1b: Variable shift types ════════════════════════ */}
            {screen === 1 && isVar && (
              <div style={{ flex: 1, paddingTop: 28 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>SHIFT TYPES</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, marginBottom: 6 }}>What shifts do<br />you typically work?</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 28 }}>Select all that apply</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, ...rv(0.06) }}>
                  {([
                    { key: "morning" as const, label: "Morning Shifts", icon: "🌅", desc: "Early starts, finish early afternoon", ac: "#00BCD4", abg: "rgba(0,188,212,0.1)", abdr: "rgba(0,188,212,0.4)" },
                    { key: "afternoon" as const, label: "Afternoon Shifts", icon: "☀", desc: "Mid-day start, finish evening", ac: "#F59E0B", abg: "rgba(245,158,11,0.1)", abdr: "rgba(245,158,11,0.4)" },
                    { key: "night" as const, label: "Night Shifts", icon: "◑", desc: "Evening start, finish early morning", ac: "#EF4444", abg: "rgba(239,68,68,0.1)", abdr: "rgba(239,68,68,0.4)" },
                  ]).map(({ key, label, icon, desc, ac, abg, abdr }) => {
                    const on = varT[key]
                    return (
                      <div key={key} onClick={() => setVarT((p) => ({ ...p, [key]: !p[key] }))}
                        style={{ background: on ? abg : "var(--card-subtle)", border: "1px solid " + (on ? abdr : "var(--border-subtle)"), borderRadius: 12, padding: "15px 18px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.2s ease" }}>
                        <div style={{ fontSize: 22, width: 34, textAlign: "center", color: on ? ac : "var(--text-muted)" }}>{icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: on ? ac : "var(--text-main)" }}>{label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-soft)", fontWeight: 300 }}>{desc}</div>
                        </div>
                        {on && (
                          <div style={{ width: 20, height: 20, borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: "var(--text-main)", fontWeight: 700 }}>✓</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <PBtn onClick={next} disabled={Object.values(varT).every((v) => !v)}>Continue</PBtn>
              </div>
            )}

            {/* ══ 2: Shift times ══════════════════════════════════ */}
            {screen === 2 && (
              <div style={{ flex: 1, paddingTop: 28 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>YOUR HOURS</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, marginBottom: 6 }}>Set your shift times</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 24 }}>Tap the arrows to adjust</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 22, marginBottom: 28 }}>
                  {(isVar
                    ? (["morning", "afternoon", "night"] as const).filter((t) => usedTypes.includes(t))
                    : (["day", "night"] as const).filter((t) => usedTypes.includes(t))
                  ).map((type, i) => {
                    const useVarTimesRow =
                      isVar && (type === "morning" || type === "afternoon" || type === "night")
                    const s = useVarTimesRow ? VAR_SS[type] : SS[type as ShiftType]
                    const t = useVarTimesRow ? varTimes[type as keyof VariableShiftTimes] : times[type as keyof ShiftTimes]
                    return (
                      <div key={type} style={rv(0.05 + i * 0.06)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "1px", color: s.color }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{shiftDur(t.start, t.end)}h</div>
                        </div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <TimePicker value={t.start} onChange={(v) => {
                            if (useVarTimesRow) {
                              updVarTime(type as keyof VariableShiftTimes, "start", v)
                            } else {
                              updTime(type as keyof ShiftTimes, "start", v)
                            }
                          }} label="Starts" />
                          <div style={{ color: "var(--text-muted)", fontSize: 18, paddingTop: 22 }}>→</div>
                          <TimePicker value={t.end} onChange={(v) => {
                            if (useVarTimesRow) {
                              updVarTime(type as keyof VariableShiftTimes, "end", v)
                            } else {
                              updTime(type as keyof ShiftTimes, "end", v)
                            }
                          }} label="Ends" />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {!isVar && (
                  <div style={{ marginBottom: 24, ...rv(0.1) }}>
                    <div style={{ ...LBL, marginBottom: 10 }}>TRAVEL TIME</div>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", fontWeight: 300, marginBottom: 14, lineHeight: 1.45 }}>
                      How you get to and from work — same as rota setup. Saved on your calendar so you don&apos;t enter shifts twice.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {([
                        {
                          key: "to" as const,
                          title: "To work",
                          state: commuteToWork,
                          set: setCommuteToWork,
                        },
                        {
                          key: "from" as const,
                          title: "From work",
                          state: commuteFromWork,
                          set: setCommuteFromWork,
                        },
                      ]).map(({ key, title, state, set }) => {
                        const fieldStyle: React.CSSProperties = {
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid var(--border-subtle)",
                          background: "var(--card-subtle)",
                          color: "var(--text-main)",
                          fontSize: 14,
                          boxSizing: "border-box",
                        }
                        const labelStyle: React.CSSProperties = {
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginBottom: 6,
                          fontWeight: 500,
                        }
                        return (
                          <div
                            key={key}
                            style={{
                              borderRadius: 14,
                              border: "1px solid var(--border-subtle)",
                              background: "var(--card)",
                              padding: "14px 14px 16px",
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)", marginBottom: 12 }}>
                              {title}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              <div>
                                <div style={labelStyle}>Time (minutes)</div>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  min={0}
                                  max={300}
                                  value={state.minutes}
                                  onChange={(e) => set((p) => ({ ...p, minutes: e.target.value }))}
                                  style={fieldStyle}
                                  placeholder="30"
                                />
                              </div>
                              <div>
                                <div style={labelStyle}>Method</div>
                                <select
                                  value={state.method}
                                  onChange={(e) => set((p) => ({ ...p, method: e.target.value }))}
                                  style={{ ...fieldStyle, cursor: "pointer" }}
                                >
                                  <option value="walk">Walk</option>
                                  <option value="bike">Bike</option>
                                  <option value="drive">Drive</option>
                                  <option value="taxi">Taxi</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <PBtn onClick={next}>Continue</PBtn>
              </div>
            )}

            {/* ══ 3: Analysis ═════════════════════════════════════ */}
            {screen === 3 && (
              <div style={{ flex: 1, paddingTop: 28 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>{isVar ? "READY TO LEARN" : "PATTERN DETECTED"}</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, marginBottom: 6 }}>{isVar ? "ShiftCoach adapts to you" : "We understand your rotation"}</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 22 }}>Here&apos;s what we found</div>
                </div>
                {!isVar && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 18, ...rv(0.06) }}>
                    {rotation.map((type, i) => {
                      const s = SS[type]
                      return (
                        <div key={i} style={{ width: 40, height: 48, borderRadius: 8, background: s.bg, border: "1.5px solid " + s.border, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                          <div style={{ fontSize: 6, color: "var(--text-muted)", marginBottom: 1 }}>D{i + 1}</div>
                          <div style={{ fontSize: 10 }}>{s.icon}</div>
                          <div style={{ fontSize: 6, color: s.color, marginTop: 1 }}>{type === "off" ? "—" : s.short}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                  {!isVar && trans.map((t, i) => (
                    <Insight key={i} color={RISK_COLOR[t.risk.level]} title={t.risk.label} body={t.risk.body} />
                  ))}
                  {!isVar && maxConsec >= 5 && (
                    <Insight color="#F59E0B"
                      title={maxConsec + " consecutive shifts"}
                      body={"By days " + (maxConsec - 2) + "–" + maxConsec + " cumulative sleep debt compounds every shift. Your " + rotation.filter((r) => r === "off").length + " days off may not fully clear this debt."}
                    />
                  )}
                  {!isVar && (
                    <Insight color="#00BCD4"
                      title={cycleLen + "-day rotation recognised"}
                      body="ShiftCoach will project your pattern forward and alert you before high-risk windows." />
                  )}
                  {isVar && (
                    <Insight color="#00BCD4"
                      title="Learning from your first week"
                      body="We'll build your personal profile as you log shifts. By week two risk predictions will be personalised to your biology." />
                  )}
                  {hasNights && (
                    <Insight color="var(--text-muted)"
                      title="Night shift trough around 03:00 body clock time"
                      body="Your biological low point. We'll calculate your personal version as your sleep data builds." />
                  )}
                </div>
                <PBtn onClick={next}>Looks right</PBtn>
              </div>
            )}

            {/* ══ 4: Where today ══════════════════════════════════ */}
            {screen === 4 && (
              <div style={{ flex: 1, paddingTop: 28 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>ANCHOR TODAY</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, marginBottom: 6 }}>Where are you in<br />your rotation today?</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 5 }}>
                    Today is <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{DAYS[new Date().getDay()]}</span>. Tap the block that matches today.
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 24 }}>
                    This anchors your pattern to the calendar so ShiftCoach knows what&apos;s coming.
                  </div>
                </div>
                {!isVar && (
                  <div style={{ ...rv(0.06), paddingTop: 10 }}>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
                      {rotation.map((type, i) => (
                        <Block key={i} type={type} index={i} size={bSize}
                          onTap={(idx) => setTodayPos(idx)}
                          isToday={todayPos === i}
                        />
                      ))}
                    </div>
                    {typeof todayPos === "number" && (
                      <div style={{ background: "var(--card-subtle)", border: "1px solid " + SS[rotation[todayPos]].border, borderRadius: 14, padding: "14px 16px", marginBottom: 16 }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Today — Day {todayPos + 1} of {cycleLen}</div>
                        <div style={{ fontSize: 18, fontWeight: 300, color: SS[rotation[todayPos]].color }}>
                          {SS[rotation[todayPos]].label}{" "}
                          {times[rotation[todayPos] as keyof ShiftTimes]?.start}–{times[rotation[todayPos] as keyof ShiftTimes]?.end}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {isVar && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, ...rv(0.06) }}>
                    {[
                      ...usedTypes.map((type) => {
                        const s = isVariableShiftType(type) ? VAR_SS[type] : SS[type]
                        const t = isVariableShiftType(type) ? varTimes[type] : times[type as keyof ShiftTimes]
                        return { key: type, icon: s.icon, label: s.label + " (" + t.start + "–" + t.end + ")", ac: s.color, abg: s.bg, abdr: s.border }
                      }),
                      { key: "off", icon: "—", label: "Day off", ac: "var(--text-muted)", abg: "var(--card-subtle)", abdr: "var(--border-subtle)" },
                    ].map(({ key, icon, label, ac, abg, abdr }) => {
                      const sel = todayPos === key
                      return (
                        <div key={key} onClick={() => setTodayPos(key)}
                          style={{ background: sel ? abg : "var(--card-subtle)", border: "1.5px solid " + (sel ? abdr : "var(--border-subtle)"), borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.2s ease" }}>
                          <div style={{ fontSize: 18, color: sel ? ac : "var(--text-muted)", width: 24, textAlign: "center" }}>{icon}</div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: sel ? ac : "var(--text-main)", flex: 1 }}>{label}</div>
                          {sel && (
                            <div style={{ width: 20, height: 20, borderRadius: "50%", background: ac, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ fontSize: 9, color: "var(--text-main)", fontWeight: 700 }}>✓</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
                <PBtn onClick={next} disabled={todayPos === null}>Continue</PBtn>
              </div>
            )}

            {/* ══ 5: Weekend extension ════════════════════════════ */}
            {screen === SCREEN_WKND && needsWknd && (
              <div style={{ flex: 1, paddingTop: 28 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>DAYS OFF</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, marginBottom: 6 }}>When your days off<br />land on a weekend...</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 28 }}>
                    Your {cycleLen}-day cycle means your days off shift each rotation. Does your employer extend your time off when this happens?
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, ...rv(0.06) }}>
                  <OptionCard selected={wkndExt === "yes"} onClick={() => setWkndExt("yes")} title="Yes — I get the full weekend off" desc="ShiftCoach will extend your recovery period when weekends fall in your off window." />
                  <OptionCard selected={wkndExt === "no"} onClick={() => setWkndExt("no")} title="No — I follow the fixed cycle" desc="Your pattern stays consistent. ShiftCoach tracks recovery based on your standard off days." />
                  <OptionCard selected={wkndExt === "varies"} onClick={() => setWkndExt("varies")} title="It varies" desc="ShiftCoach will ask you to confirm your off period at the start of each rotation block." />
                </div>
                {wkndExt && (
                  <div style={{ background: "rgba(0,188,212,0.06)", border: "1px solid rgba(0,188,212,0.15)", borderRadius: 14, padding: "14px 16px", marginBottom: 24 }}>
                    <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6, fontWeight: 300 }}>
                      {wkndExt === "yes" && "Good. ShiftCoach will flag any residual debt going into your next block even with the extended break."}
                      {wkndExt === "no" && "Understood. ShiftCoach will track whether your debt is fully clearing between blocks — for many people on this pattern, it doesn't."}
                      {wkndExt === "varies" && "We'll prompt you at the start of each rotation so predictions stay accurate."}
                    </div>
                  </div>
                )}
                <PBtn onClick={next} disabled={!wkndExt}>Continue</PBtn>
              </div>
            )}

            {/* ══ Post-night sleep ════════════════════════════════ */}
            {screen === SCREEN_SLEEP && hasNights && (
              <div style={{ flex: 1, paddingTop: 28 }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, marginBottom: 10 }}>SLEEP ANCHOR</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.1, marginBottom: 6 }}>After a night shift,<br />when do you sleep?</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 28 }}>Roughly — you can always adjust this later.</div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, ...rv(0.06) }}>
                  <TimePicker
                    value={postSleep}
                    onChange={setPostSleep}
                    label="Usually asleep by"
                    caption={"after finishing at " + (isVar ? varTimes.night.end : times.night.end)}
                  />
                </div>
                <div style={{ background: "var(--card-subtle)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: "12px 14px", marginBottom: 28, ...rv(0.1) }}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>We use this to calculate your sleep midpoint — the core of your circadian alignment score.</div>
                </div>
                <PBtn onClick={next}>Continue</PBtn>
              </div>
            )}

            {/* ══ Ready ════════════════════════════════════════════ */}
            {screen === SCREEN_ACCOUNT && accountStepSession === true && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  background: "var(--bg)",
                  minHeight: 0,
                  overflow: "hidden",
                }}
              >
                <div style={{ padding: "calc(8px + env(safe-area-inset-top, 0px)) 20px 16px", position: "relative" }}>
                  <button
                    type="button"
                    onClick={back}
                    aria-label="Close"
                    style={{
                      position: "absolute",
                      right: 16,
                      top: 4,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 8,
                      lineHeight: 0,
                      color: "#149191",
                    }}
                  >
                    <span style={{ fontSize: 22, fontWeight: 600 }}>×</span>
                  </button>
                  <h2
                    style={{
                      textAlign: "center",
                      fontSize: 17,
                      fontWeight: 600,
                      color: "var(--text-main)",
                      margin: "12px 40px 0",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Almost there
                  </h2>
                </div>
                <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto" }}>
                  <p style={{ fontSize: 15, color: "var(--text-soft)", lineHeight: 1.55, marginTop: 8 }}>
                    You&apos;re already signed in{accountStepEmail ? (
                      <>
                        {" "}
                        as <span style={{ color: "var(--text-main)", fontWeight: 600 }}>{accountStepEmail}</span>
                      </>
                    ) : null}
                    . Continue to save your shift pattern and pick your plan.
                  </p>
                  <button
                    type="button"
                    onClick={() => void supabase.auth.signOut().then(() => {
                      setAccountStepSession(false)
                      setAccountStepEmail(null)
                    })}
                    style={{
                      marginTop: 20,
                      background: "none",
                      border: "none",
                      color: "#149191",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontFamily: "Inter,sans-serif",
                    }}
                  >
                    Use a different email
                  </button>
                </div>
                <div
                  style={{
                    padding: "12px 20px calc(12px + env(safe-area-inset-bottom, 0px))",
                    background: "var(--bg)",
                    flexShrink: 0,
                    boxShadow: "0 -4px 20px rgba(0,0,0,0.14)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#05afc5",
                      borderRadius: 9999,
                      padding: "16px 28px",
                      boxShadow: "0 8px 24px rgba(5,175,197,0.45)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={back}
                      disabled={saving}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: saving ? "default" : "pointer",
                        fontFamily: "Inter,sans-serif",
                        opacity: saving ? 0.6 : 1,
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={saving}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#fff",
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: saving ? "wait" : "pointer",
                        fontFamily: "Inter,sans-serif",
                        opacity: saving ? 0.7 : 1,
                      }}
                    >
                      {saving ? "Please wait…" : "Continue"}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {screen === SCREEN_ACCOUNT && accountStepSession === false && (
              <OnboardingSignInDetailsPanel
                persistDraft={() => persistOnboardingDraft(SCREEN_ACCOUNT)}
                onSuccess={() => void handleSubmit()}
                onBack={back}
              />
            )}
            {screen === SCREEN_ACCOUNT && accountStepSession === null && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
                <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Loading…</p>
              </div>
            )}

            {screen === SCREEN_SUMMARY && (
              <div style={{ flex: 1, paddingTop: 28, display: "flex", flexDirection: "column" }}>
                <div style={rv(0)}>
                  <div style={{ ...LBL, color: "#00BCD4", marginBottom: 10 }}>ALL SET</div>
                  <div style={{ fontSize: 34, fontWeight: 300, lineHeight: 1.1, marginBottom: 8 }}>ShiftCoach knows<br />your pattern</div>
                  <div style={{ fontSize: 13, color: "var(--text-soft)", fontWeight: 300, marginBottom: 12, lineHeight: 1.6 }}>We&apos;ll get smarter every week as we learn how your body responds to your rotation.</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 300, marginBottom: 24, lineHeight: 1.55 }}>
                    Check everything below. Use ← Back (top left) if you need to fix anything — then continue to create your account.
                  </div>
                </div>
                <div style={{ background: "var(--card-subtle)", border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 18, marginBottom: 12, ...rv(0.06) }}>
                  <div style={{ ...LBL, marginBottom: 14 }}>WHAT WE KNOW</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {([
                      { label: "Worker type", value: WORKER_TYPES.find((w) => w.id === workerType)?.title },
                      !isVar && { label: "Rotation", value: cycleLen + " days" },
                      !isVar && maxConsec >= 5 && { label: "Consecutive shifts", value: maxConsec + " on, " + rotation.filter((r) => r === "off").length + " off", color: "#F59E0B" },
                      ...usedTypes.map((t) => (
                        isVar && isVariableShiftType(t)
                          ? { label: VAR_SS[t].label, value: varTimes[t].start + " – " + varTimes[t].end, color: VAR_SS[t].color }
                          : { label: SS[t as ShiftType].label, value: times[t as keyof ShiftTimes].start + " – " + times[t as keyof ShiftTimes].end, color: SS[t as ShiftType].color }
                      )),
                      hasNights && { label: "Post-night sleep", value: "~" + postSleep },
                      !isVar && typeof todayPos === "number" && { label: "Today", value: "Day " + (todayPos + 1) + " of " + cycleLen + " — " + SS[rotation[todayPos as number]].label + " " + times[rotation[todayPos as number] as keyof ShiftTimes]?.start + "–" + times[rotation[todayPos as number] as keyof ShiftTimes]?.end },
                      needsWknd && wkndExt && { label: "Weekend extension", value: wkndExt === "yes" ? "Yes — extended" : wkndExt === "no" ? "No — fixed" : "Varies" },
                      worstTrans && { label: "Highest risk transition", value: worstTrans.risk.label, color: "#EF4444" },
                    ] as any[]).filter(Boolean).map((item, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--text-soft)" }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: item.color || "var(--text-main)" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(0,188,212,0.06)", border: "1px solid rgba(0,188,212,0.15)", borderRadius: 14, padding: "14px 16px", marginBottom: 28, ...rv(0.1) }}>
                  <div style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6, fontWeight: 300 }}>Your circadian and fatigue scores are calibrated to your pattern, not a generic 9–5 worker.</div>
                </div>
                {error && (
                  <div style={{ color: "#EF4444", fontSize: 12, textAlign: "center", marginBottom: 16 }}>{error}</div>
                )}
                <div style={{ marginTop: "auto", paddingBottom: 32, ...rv(0.14) }}>
                  <PBtn
                    onClick={() => {
                      void (async () => {
                        const { data: { session } } = await supabase.auth.getSession()
                        if (session?.user) await handleSubmit()
                        else setScreen(SCREEN_ACCOUNT)
                      })()
                    }}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Create account →"}
                  </PBtn>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
  )
}
