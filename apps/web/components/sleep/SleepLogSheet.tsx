"use client"

import { useState, useEffect } from "react"

type Props = {
  type: "sleep" | "nap" | null
  onClose: () => void
  onSaved: () => void
}

export default function SleepLogSheet({ type, onClose, onSaved }: Props) {
  const [start, setStart] = useState<string>("")
  const [end, setEnd] = useState<string>("")
  const [quality, setQuality] = useState<"Excellent"|"Good"|"Fair"|"Poor">("Good")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  
  // Set default times when component opens
  useEffect(() => {
    if (type && !start && !end) {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(22, 0, 0, 0) // 10 PM yesterday
      
      const pad = (n: number) => String(n).padStart(2, '0')
      const formatLocal = (d: Date) => {
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
      
      setStart(formatLocal(yesterday))
      setEnd(formatLocal(now))
    }
  }, [type, start, end])
  
  if (!type) return null

  async function handleSave() {
    if (!start || !end) {
      alert("Please provide both start and end times")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/sleep/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type, 
          startAt: new Date(start).toISOString(), 
          endAt: new Date(end).toISOString(), 
          quality, 
          notes: notes || null 
        }),
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to save sleep" }))
        alert(error.error || "Failed to save sleep")
        return
      }
      
      onSaved()
      onClose()
    } catch (e) {
      console.error("[SleepLogSheet] save error:", e)
      alert("Failed to save sleep")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white p-5 shadow-2xl">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-4" />
        <div className="text-lg font-semibold mb-2">{type === "sleep" ? "Log sleep" : "Log nap"}</div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600">
              Start
              <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)}
                     className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm text-slate-600">
              End
              <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)}
                     className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" />
            </label>
          </div>

          <label className="text-sm text-slate-600">
            Quality
            <select value={quality} onChange={e => setQuality(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
              <option>Excellent</option><option>Good</option><option>Fair</option><option>Poor</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            Notes (optional)
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2" rows={2}/>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700">Cancel</button>
            <button onClick={handleSave} disabled={saving}
                    className="px-4 py-2 rounded-xl text-white bg-blue-600 disabled:opacity-60">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

