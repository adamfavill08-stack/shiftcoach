'use client'

import { useState } from 'react'
import { Users, UserPlus, X, Mail } from 'lucide-react'
import { Attendee } from '@/lib/models/calendar/Event'

interface AttendeesPickerProps {
  attendees: Attendee[]
  onChange: (attendees: Attendee[]) => void
}

// Attendee status constants (from Event.ts)
const ATTENDEE_STATUS_ACCEPTED = 0
const ATTENDEE_STATUS_DECLINED = 1
const ATTENDEE_STATUS_TENTATIVE = 2
const ATTENDEE_STATUS_NOT_RESPONDED = 3

export function AttendeesPicker({ attendees, onChange }: AttendeesPickerProps) {
  const [emailInput, setEmailInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  function handleAddAttendee() {
    if (!emailInput.trim()) {
      alert('Email is required')
      return
    }

    const newAttendee: Attendee = {
      contactId: 0, // Will be set by backend if contact exists
      name: nameInput.trim() || emailInput.trim().split('@')[0],
      email: emailInput.trim(),
      status: ATTENDEE_STATUS_NOT_RESPONDED,
      photoUri: '',
      isMe: false,
      relationship: 0,
    }

    // Check if attendee already exists
    if (attendees.some(a => a.email.toLowerCase() === newAttendee.email.toLowerCase())) {
      alert('This attendee is already added')
      return
    }

    onChange([...attendees, newAttendee])
    setEmailInput('')
    setNameInput('')
    setShowAddForm(false)
  }

  function handleRemoveAttendee(email: string) {
    onChange(attendees.filter(a => a.email !== email))
  }

  function getStatusColor(status: number): string {
    switch (status) {
      case ATTENDEE_STATUS_ACCEPTED:
        return 'bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
      case ATTENDEE_STATUS_DECLINED:
        return 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40'
      case ATTENDEE_STATUS_TENTATIVE:
        return 'bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40'
      default:
        return 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/40'
    }
  }

  function getStatusLabel(status: number): string {
    switch (status) {
      case ATTENDEE_STATUS_ACCEPTED:
        return 'Accepted'
      case ATTENDEE_STATUS_DECLINED:
        return 'Declined'
      case ATTENDEE_STATUS_TENTATIVE:
        return 'Tentative'
      default:
        return 'Pending'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <label className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Attendees
        </label>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ({attendees.length})
        </span>
      </div>

      {/* Attendees List */}
      {attendees.length > 0 && (
        <div className="space-y-2">
          {attendees.map((attendee, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {attendee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {attendee.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {attendee.email}
                      </p>
                    </div>
                  </div>
                </div>
                {attendee.status !== ATTENDEE_STATUS_NOT_RESPONDED && (
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium border ${getStatusColor(attendee.status)}`}>
                      {getStatusLabel(attendee.status)}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemoveAttendee(attendee.email)}
                className="flex-shrink-0 h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 dark:hover:text-red-400 transition"
                aria-label="Remove attendee"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Attendee Form */}
      {showAddForm ? (
        <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 space-y-2">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddAttendee()
                } else if (e.key === 'Escape') {
                  setShowAddForm(false)
                  setEmailInput('')
                  setNameInput('')
                }
              }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddAttendee()
                } else if (e.key === 'Escape') {
                  setShowAddForm(false)
                  setEmailInput('')
                  setNameInput('')
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddAttendee}
              className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-700 text-white text-sm font-medium hover:from-sky-700 hover:to-indigo-800 active:scale-95 transition"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setEmailInput('')
                setNameInput('')
              }}
              className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full p-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-sky-400 dark:hover:border-sky-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/20 transition flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Attendee</span>
        </button>
      )}
    </div>
  )
}

