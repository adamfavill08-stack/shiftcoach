'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useEffect } from 'react'
import { Check, ChevronLeft, Plus, X, Bell } from 'lucide-react'
import { useEventNotifications } from '@/lib/hooks/useEventNotifications'
import { requestNotificationPermission } from '@/lib/notifications/eventNotifications'
import { useTranslation } from '@/components/providers/language-provider'

type FormState = {
  startDate: string
  endDate: string
  title: string
  eventType: string
  color: string
  description: string
  allDay: boolean
  startTime: string
  endTime: string
}

export default function NewRotaEventPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const typeOptions = useMemo(
    () =>
      [
        { value: 'holiday', label: t('rota.event.type.holiday') },
        { value: 'overtime', label: t('rota.event.type.overtime') },
        { value: 'training', label: t('rota.event.type.training') },
        { value: 'personal', label: t('rota.event.type.personal') },
        { value: 'other', label: t('rota.event.type.other') },
      ] as const,
    [t],
  )

  const colorPresets = useMemo(
    () =>
      [
        { id: 'amber', label: t('rota.event.color.amber'), value: '#FCD34D' },
        { id: 'sky', label: t('rota.event.color.sky'), value: '#0EA5E9' },
        { id: 'indigo', label: t('rota.event.color.indigo'), value: '#4F46E5' },
        { id: 'violet', label: t('rota.event.color.violet'), value: '#8B5CF6' },
        { id: 'emerald', label: t('rota.event.color.emerald'), value: '#22C55E' },
        { id: 'rose', label: t('rota.event.color.rose'), value: '#F97373' },
        { id: 'slate', label: t('rota.event.color.slate'), value: '#64748B' },
      ] as const,
    [t],
  )

  const [form, setForm] = useState<FormState>({
    startDate: todayIso,
    endDate: todayIso,
    title: '',
    eventType: 'holiday',
    color: '#FCD34D',
    description: '',
    allDay: true,
    startTime: '',
    endTime: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<Array<{ type: 'before' | 'at', value: string }>>([])
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null)
  const { scheduleNotifications } = useEventNotifications()

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  // Request notification permission when user adds a notification
  const handleAddNotification = async () => {
    if (notifications.length >= 3) return

    // Request permission if not already granted
    if (notificationPermission !== 'granted') {
      const granted = await requestNotificationPermission()
      setNotificationPermission(granted ? 'granted' : 'denied')
      if (!granted) {
        setError(t('rota.event.errNotifPermission'))
        return
      }
    }

    setNotifications([...notifications, { type: 'before', value: '15' }])
  }

  const handleChange = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (saving) return

    // If event type is "other", require a custom title
    if (form.eventType === 'other' && !form.title.trim()) {
      setError(t('rota.event.errOtherTitle'))
      return
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      setError(t('rota.event.errEndDate'))
      return
    }

    setError(null)

    // Use custom title if "other", otherwise use event type label
    const eventTitle = form.eventType === 'other' 
      ? form.title.trim() 
      : (typeOptions.find(opt => opt.value === form.eventType)?.label || form.eventType)

    const payload = {
      title: eventTitle,
      description: form.description?.trim() ? form.description.trim() : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      startTime: form.allDay || !form.startTime ? undefined : form.startTime,
      endTime: form.allDay || !form.endTime ? undefined : form.endTime,
      allDay: form.allDay,
      eventType: form.eventType,
      color: form.color || undefined,
      notifications: notifications.length > 0 ? notifications : undefined,
    }

    console.log('[rota/event/new] saving event', payload)

    try {
      setSaving(true)
      const res = await fetch('/api/rota/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      let responseText: string | null = null
      let responseJson: any = null
      try {
        responseText = await res.text()
        if (responseText) {
          responseJson = JSON.parse(responseText)
        }
      } catch (err) {
        console.warn('[rota/event/new] failed to parse response', err)
      }

      if (!res.ok) {
        const message =
          (responseJson && (responseJson.error || responseJson.message)) || responseText || t('rota.event.errSave')
        console.error('[rota/event/new] save error', res.status, responseText)
        setError(typeof message === 'string' ? message : t('rota.event.errSave'))
        return
      }

      console.log('[rota/event/new] save success', responseJson)

      // Schedule browser notifications if notifications are configured
      if (notifications.length > 0 && responseJson?.events?.[0]) {
        const savedEvent = responseJson.events[0]
        const eventStart = new Date(savedEvent.start_at)
        
        // Schedule notifications
        scheduleNotifications(
          eventTitle,
          eventStart,
          notifications.map(n => ({ type: n.type, value: n.value }))
        )
      }

      // Dispatch event to refresh calendar
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('event-updated'))
      }

      router.push('/rota')
      router.refresh()
    } catch (err: any) {
      console.error('[rota/event/new] fatal error', err)
      setError(err?.message ?? t('rota.event.errUnexpected'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-slate-100">
      <div className="relative flex h-full w-full max-w-md flex-col px-4 py-5">
        <div className="flex flex-1 flex-col min-h-0">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between flex-shrink-0">
            <button
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/95 backdrop-blur-sm shadow-[0_4px_12px_rgba(15,23,42,0.08)] border border-slate-200/60 hover:bg-white transition-all hover:scale-105 active:scale-95 hover:shadow-[0_6px_16px_rgba(15,23,42,0.12)]"
              aria-label={t('rota.event.backAria')}
            >
              <ChevronLeft className="h-5 w-5 text-slate-700" strokeWidth={2.5} />
            </button>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 antialiased">{t('rota.event.title')}</h1>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-all hover:scale-105 active:scale-95 hover:shadow-[0_6px_16px_rgba(15,23,42,0.12)] disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t('rota.event.saveAria')}
            >
              <Check className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Form Card */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 p-5 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <div className="space-y-4">
              {form.eventType === 'holiday' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.startDate')}</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all"
                      value={form.startDate}
                      onChange={(e) => {
                        handleChange('startDate', e.target.value)
                        // Auto-update end date if it's before start date
                        if (new Date(e.target.value) > new Date(form.endDate)) {
                          handleChange('endDate', e.target.value)
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.endDate')}</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all"
                      value={form.endDate}
                      min={form.startDate}
                      onChange={(e) => handleChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.date')}</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all"
                    value={form.startDate}
                    onChange={(e) => {
                      handleChange('startDate', e.target.value)
                      handleChange('endDate', e.target.value)
                    }}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.eventType')}</label>
                <div className="space-y-3">
                  <select
                    className="w-full rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all"
                    value={form.eventType}
                    onChange={(e) => {
                      const nextType = e.target.value
                      handleChange('eventType', nextType)
                      // If switching away from holiday, sync end date with start date
                      if (nextType !== 'holiday' && form.endDate !== form.startDate) {
                        handleChange('endDate', form.startDate)
                      }
                      // Clear title when switching away from "other"
                      if (nextType !== 'other') {
                        handleChange('title', '')
                      }
                    }}
                  >
                    {typeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-600">{t('rota.event.colour')}</p>
                    <div className="grid grid-cols-7 gap-2">
                      {colorPresets.map((preset) => {
                        const isActive = form.color === preset.value
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleChange('color', preset.value)}
                            className={`relative h-8 w-8 rounded-full border transition-all hover:scale-105 active:scale-95 ${
                              isActive
                                ? 'border-sky-500 shadow-[0_0_0_2px_rgba(56,189,248,0.35)]'
                                : 'border-slate-200/70 shadow-[0_2px_6px_rgba(15,23,42,0.08)]'
                            }`}
                            style={{ backgroundColor: preset.value }}
                            aria-label={preset.label}
                          >
                            {isActive && (
                              <span className="absolute inset-0 rounded-full border-2 border-white/90" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                {form.eventType === 'other' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.eventName')}</label>
                    <input
                      className="w-full rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all"
                      placeholder={t('rota.event.eventNamePh')}
                      value={form.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                    />
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                <span className="text-sm font-semibold text-slate-700">{t('rota.event.allDay')}</span>
                <button
                  type="button"
                  onClick={() => handleChange('allDay', !form.allDay)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all ${
                    form.allDay ? 'bg-gradient-to-r from-sky-500 to-indigo-500' : 'bg-slate-300'
                  } shadow-sm`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all shadow-sm ${
                      form.allDay ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.startTime')}</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => handleChange('startTime', e.target.value)}
                    className="w-full rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={form.allDay}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.endTime')}</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => handleChange('endTime', e.target.value)}
                    className="w-full rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={form.allDay}
                  />
                </div>
              </div>

              {/* Notifications Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5" />
                      {t('rota.event.notifications')}
                    </label>
                    {notificationPermission === 'granted' && (
                      <span className="text-[10px] text-green-600 font-medium">{t('rota.event.notifEnabled')}</span>
                    )}
                    {notificationPermission === 'denied' && (
                      <span className="text-[10px] text-red-600 font-medium">{t('rota.event.notifBlocked')}</span>
                    )}
                  </div>
                  {notifications.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddNotification}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50 transition-colors border border-sky-200/60"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('rota.event.addNotif')}
                    </button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 px-4 py-3 text-center">
                    <p className="text-xs text-slate-500">{t('rota.event.noNotifs')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((notification, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
                      >
                        <select
                          value={notification.type}
                          onChange={(e) => {
                            const updated = [...notifications]
                            updated[index].type = e.target.value as 'before' | 'at'
                            // Set default value when switching types
                            if (updated[index].type === 'at') {
                              updated[index].value = ''
                            } else if (updated[index].type === 'before' && !updated[index].value) {
                              updated[index].value = '15'
                            }
                            setNotifications(updated)
                          }}
                          className="flex-1 rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50"
                        >
                          <option value="before">{t('rota.event.notifBefore')}</option>
                          <option value="at">{t('rota.event.notifAt')}</option>
                        </select>
                        {notification.type === 'before' && (
                          <select
                            value={notification.value}
                            onChange={(e) => {
                              const updated = [...notifications]
                              updated[index].value = e.target.value
                              setNotifications(updated)
                            }}
                            className="w-24 rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50"
                          >
                            <option value="5">{t('rota.event.notifM5')}</option>
                            <option value="15">{t('rota.event.notifM15')}</option>
                            <option value="30">{t('rota.event.notifM30')}</option>
                            <option value="60">{t('rota.event.notifM60')}</option>
                            <option value="120">{t('rota.event.notifM120')}</option>
                            <option value="1440">{t('rota.event.notifM1440')}</option>
                            <option value="10080">{t('rota.event.notifM10080')}</option>
                          </select>
                        )}
                        {notification.type === 'at' && (
                          <div className="w-24 rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 text-center">
                            {t('rota.event.notifEventStart')}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotifications(notifications.filter((_, i) => i !== index))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{t('rota.event.descOptional')}</label>
                <textarea
                  className="h-24 w-full resize-none rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-sm px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:border-sky-400/50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-all"
                  placeholder={t('rota.event.descPh')}
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-200/60 bg-red-50/90 backdrop-blur-sm px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                  <p className="text-sm font-medium text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
