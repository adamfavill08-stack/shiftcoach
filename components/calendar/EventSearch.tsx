'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, X, Calendar, Filter, Loader2 } from 'lucide-react'
import { Event } from '@/lib/models/calendar/Event'
import { EventType } from '@/lib/models/calendar/EventType'
import { format } from 'date-fns'
import { getEventTypes } from '@/lib/helpers/calendar/EventsHelper'

interface EventSearchProps {
  onEventClick?: (event: Event) => void
  onClose?: () => void
}

interface SearchFilters {
  query: string
  eventTypeId?: number
  fromDate?: Date
  toDate?: Date
  includeCompleted: boolean
}

export function EventSearch({ onEventClick, onClose }: EventSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    includeCompleted: false,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [results, setResults] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)
  const [eventTypes, setEventTypes] = useState<EventType[]>([])

  useEffect(() => {
    loadEventTypes()
  }, [])

  useEffect(() => {
    if (filters.query.trim() || filters.eventTypeId || filters.fromDate || filters.toDate) {
      performSearch()
    } else {
      setResults([])
    }
  }, [filters])

  async function loadEventTypes() {
    const types = await getEventTypes()
    setEventTypes(types)
  }

  const performSearch = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (filters.query.trim()) {
        params.append('search', filters.query.trim())
      }
      
      if (filters.eventTypeId) {
        params.append('eventType', filters.eventTypeId.toString())
      }
      
      const now = Math.floor(Date.now() / 1000)
      const fromTS = filters.fromDate
        ? Math.floor(new Date(filters.fromDate.getFullYear(), filters.fromDate.getMonth(), filters.fromDate.getDate()).getTime() / 1000)
        : now - 86400 * 365 // 1 year ago
      const toTS = filters.toDate
        ? Math.floor(new Date(filters.toDate.getFullYear(), filters.toDate.getMonth(), filters.toDate.getDate(), 23, 59, 59).getTime() / 1000)
        : now + 86400 * 365 // 1 year from now
      
      params.append('fromTS', fromTS.toString())
      params.append('toTS', toTS.toString())

      const response = await fetch(`/api/calendar/events?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      let events = data.events || []

      // Filter out completed tasks if needed
      if (!filters.includeCompleted) {
        events = events.filter((e: Event) => {
          // Filter out completed tasks
          if (e.type === 1 && (e.flags & 8) !== 0) {
            return false
          }
          return true
        })
      }

      // Sort by start time
      events.sort((a: Event, b: Event) => a.startTS - b.startTS)

      setResults(events)
    } catch (err: any) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [filters])

  function handleQueryChange(value: string) {
    setSearchQuery(value)
    setFilters(prev => ({ ...prev, query: value }))
  }

  function handleFilterChange(updates: Partial<SearchFilters>) {
    setFilters(prev => ({ ...prev, ...updates }))
  }

  function clearFilters() {
    setSearchQuery('')
    setFilters({
      query: '',
      includeCompleted: false,
    })
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Search Bar */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search events, tasks, locations..."
            className="w-full pl-12 pr-12 py-3 rounded-2xl bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:focus:ring-sky-400/50 transition"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={clearFilters}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-600 dark:hover:text-slate-300 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition"
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filters.eventTypeId || filters.fromDate || filters.toDate || !filters.includeCompleted) && (
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
          )}
        </button>
        {results.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 space-y-3">
          {/* Event Type Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
              Event Type
            </label>
            <select
              value={filters.eventTypeId || ''}
              onChange={(e) => handleFilterChange({ eventTypeId: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
            >
              <option value="">All Types</option>
              {eventTypes
                .filter((type) => type.id != null)
                .map((type) => (
                  <option key={type.id} value={type.id!}>
                    {type.title}
                  </option>
                ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                From Date
              </label>
              <input
                type="date"
                value={filters.fromDate ? format(filters.fromDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleFilterChange({ fromDate: e.target.value ? new Date(e.target.value) : undefined })}
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                To Date
              </label>
              <input
                type="date"
                value={filters.toDate ? format(filters.toDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => handleFilterChange({ toDate: e.target.value ? new Date(e.target.value) : undefined })}
                className="w-full rounded-lg px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/40 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400/50 dark:focus:ring-sky-500/50"
              />
            </div>
          </div>

          {/* Include Completed */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="includeCompleted"
              checked={filters.includeCompleted}
              onChange={(e) => handleFilterChange({ includeCompleted: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-sky-600 dark:text-sky-500 focus:ring-sky-500"
            />
            <label htmlFor="includeCompleted" className="text-xs text-slate-600 dark:text-slate-400">
              Include completed tasks
            </label>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-slate-400 dark:text-slate-500 animate-spin" />
        </div>
      ) : results.length === 0 && (filters.query.trim() || filters.eventTypeId || filters.fromDate || filters.toDate) ? (
        <div className="rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/40 p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">No events found</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {results.map((event) => {
            const eventDate = new Date(event.startTS * 1000)
            const eventType = eventTypes.find(t => t.id === event.eventType)
            
            return (
              <button
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="w-full text-left p-3 rounded-xl bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/40 hover:bg-white/90 dark:hover:bg-slate-800/70 hover:border-slate-300/60 dark:hover:border-slate-600/60 transition"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 h-2 w-2 rounded-full mt-2"
                    style={{ backgroundColor: eventType?.color ? `#${eventType.color.toString(16).padStart(6, '0')}` : '#64748B' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {event.title}
                    </p>
                    {event.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {format(eventDate, 'MMM d, yyyy')}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                          <span>•</span>
                          {event.location}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

