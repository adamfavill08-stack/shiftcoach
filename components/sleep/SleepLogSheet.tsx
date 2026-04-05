"use client"

import { useState, useEffect } from "react"
import { notifySleepLogsUpdated } from "@/lib/circadian/circadianAgent"
import { useTranslation } from "@/components/providers/language-provider"

type Props = {
  type: "sleep" | "nap" | null
  onClose: () => void
  onSaved: () => void
}

export default function SleepLogSheet({ type, onClose, onSaved }: Props) {
  const { t } = useTranslation()
  const [start, setStart] = useState<string>("")
  const [end, setEnd] = useState<string>("")
  const [quality, setQuality] = useState<"Excellent" | "Good" | "Fair" | "Poor">("Good")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (type && !start && !end) {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(22, 0, 0, 0)

      const pad = (n: number) => String(n).padStart(2, "0")
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
      alert(t("sleepLog.errStartEndTimes"))
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
          notes: notes || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: t("sleepLog.errSave") }))
        alert(error.error || t("sleepLog.errSave"))
        return
      }

      notifySleepLogsUpdated()

      onSaved()
      onClose()
    } catch (e) {
      console.error("[SleepLogSheet] save error:", e)
      alert(t("sleepLog.errSave"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white p-5 shadow-2xl">
        <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200 mb-4" />
        <div className="text-lg font-semibold mb-2">
          {type === "sleep" ? t("sleepLog.title") : t("sleepLog.logNap")}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-600">
              {t("sleepLog.startShort")}
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="text-sm text-slate-600">
              {t("sleepLog.endShort")}
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>

          <label className="text-sm text-slate-600">
            {t("sleepLog.qualityShort")}
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as "Excellent" | "Good" | "Fair" | "Poor")}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            >
              <option value="Excellent">{t("sleepQuality.excellent")}</option>
              <option value="Good">{t("sleepQuality.good")}</option>
              <option value="Fair">{t("sleepQuality.fair")}</option>
              <option value="Poor">{t("sleepQuality.poor")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-600">
            {t("sleepLog.notesOptional")}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              rows={2}
              placeholder={t("sleepLog.notesPlaceholder")}
            />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700">
              {t("sleepForm.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-white bg-blue-600 disabled:opacity-60"
            >
              {saving ? t("sleepForm.saving") : t("sleepForm.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
