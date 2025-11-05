'use client'

import { useSleepHistory } from '@/lib/hooks/useSleepHistory'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EditSleepModal } from '@/components/sleep/EditSleepModal'

function formatTime(ts: string) {
  const d = new Date(ts)
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(date: string | null, fallbackTs: string) {
  if (date) {
    return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
    })
  }
  return new Date(fallbackTs).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export default function SleepHistoryPage() {
  const { items, loading, setItems, refetch } = useSleepHistory()
  const [editing, setEditing] = useState<any | null>(null)
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sleep log?')) return

    try {
      const res = await fetch(`/api/sleep/log/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        console.error('Failed to delete:', data.error)
        alert('Failed to delete sleep log. Please try again.')
        return
      }

      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete sleep log. Please try again.')
    }
  }

  const handleUpdated = (updatedEntry: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updatedEntry.id ? updatedEntry : item))
    )
    setEditing(null)
  }

  return (
    <main
      style={{
        backgroundImage: 'radial-gradient(circle at top, var(--bg-soft), var(--bg))',
      }}
    >
      <div className="max-w-[430px] mx-auto min-h-screen px-4 pb-8 pt-4 flex flex-col gap-4">
        {/* Header */}
        <header className="flex items-center justify-between mb-1">
          <Link
            href="/sleep"
            className="p-2 rounded-full backdrop-blur-xl border transition-all"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card-subtle)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--card)'
            }}
            aria-label="Back to sleep page"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-main)' }}>Sleep History</h1>
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>All your logged sleeps & naps</p>
          </div>
          <div className="w-8" />
        </header>

        {/* Content */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your sleep logs…</p>
          </div>
        ) : items.length === 0 ? (
          <section
            className="rounded-3xl backdrop-blur-2xl border px-5 py-8 text-center"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-soft)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--text-soft)' }}>
              No sleep logs yet. Log your first sleep on the main Sleep page.
            </p>
          </section>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((entry) => (
              <section
                key={entry.id}
                className="rounded-3xl backdrop-blur-2xl border px-4 py-3 flex items-center justify-between gap-3 transition-all duration-200 hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--border-subtle)',
                  boxShadow: 'var(--shadow-soft)',
                }}
              >
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(entry.date, entry.start_ts)}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>
                    {formatTime(entry.start_ts)} – {formatTime(entry.end_ts)}
                  </span>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-soft)' }}>
                    <span>{(entry.sleep_hours ?? 0).toFixed(1)} h</span>
                    <span>·</span>
                    <span>Quality {entry.quality ?? '-'}</span>
                    <span>·</span>
                    <span>{entry.naps === 0 ? 'Sleep' : `Nap (${entry.naps})`}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    className="text-xs font-medium underline px-2 py-1 rounded transition-colors"
                    style={{ color: 'var(--accent-blue)' }}
                    onClick={() => setEditing(entry)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs font-medium px-2 py-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => handleDelete(entry.id)}
                  >
                    Delete
                  </button>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <EditSleepModal
            entry={editing}
            onClose={() => setEditing(null)}
            onUpdated={handleUpdated}
          />
        )}
      </div>
    </main>
  )
}

