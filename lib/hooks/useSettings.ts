'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMyProfile, updateProfile, type Profile } from '@/lib/profile'
import { showToast } from '@/components/ui/Toast'

export function useSettings() {
  const [settings, setSettings] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null) // field being saved

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true)
        const profile = await getMyProfile()
        console.log('[useSettings] Loaded profile:', profile)
        setSettings(profile)
        // If no profile, create a default one
        if (!profile) {
          console.warn('[useSettings] No profile found, sections may not render')
        }
      } catch (err) {
        console.error('[useSettings] Failed to load:', err)
        showToast('Failed to load settings', 'error')
        setSettings(null)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()

    // Listen for rota-saved events to refresh settings (shift_pattern may have been auto-updated)
    const handleRotaSaved = () => {
      console.log('[useSettings] Rota saved, refreshing settings...')
      setTimeout(() => {
        loadSettings()
      }, 500) // Small delay to ensure database update is complete
    }

    // Listen for profile-updated events
    const handleProfileUpdated = () => {
      console.log('[useSettings] Profile updated, refreshing settings...')
      setTimeout(() => {
        loadSettings()
      }, 300)
    }

    window.addEventListener('rota-saved', handleRotaSaved)
    window.addEventListener('profile-updated', handleProfileUpdated)
    
    return () => {
      window.removeEventListener('rota-saved', handleRotaSaved)
      window.removeEventListener('profile-updated', handleProfileUpdated)
    }
  }, [])

  // Save a single field
  const saveField = useCallback(async <K extends keyof Profile>(
    field: K,
    value: Profile[K],
    showSuccess = true
  ) => {
    if (!settings) return false

    // Optimistic update
    setSettings(prev => prev ? { ...prev, [field]: value } : null)
    setSaving(field)

    try {
      const success = await updateProfile({ [field]: value } as Partial<Profile>)
      
      if (success) {
        if (showSuccess) {
          showToast('Settings saved', 'success')
        }
        
        // Dispatch special events for fields that affect other parts of the app
        if (field === 'goal') {
          window.dispatchEvent(new CustomEvent('goalChanged', { 
            detail: { goal: value } 
          }))
        }

        // Units changes affect how we display weight/height across the app.
        // Use the existing profile-updated event so profile-driven hooks/pages
        // can refresh without changing any visible behavior.
        if (field === 'units') {
          window.dispatchEvent(new CustomEvent('profile-updated', { 
            detail: { units: value } 
          }))
        }
        
        return true
      } else {
        // Revert on failure
        setSettings(settings)
        showToast('Failed to save setting', 'error')
        return false
      }
    } catch (err) {
      console.error(`[useSettings] Failed to save ${field}:`, err)
      setSettings(settings)
      showToast(`Failed to save ${field}`, 'error')
      return false
    } finally {
      setSaving(null)
    }
  }, [settings])

  // Debounced save for input fields
  const saveFieldDebounced = useCallback(<K extends keyof Profile>(
    field: K,
    value: Profile[K],
    delay = 1000
  ) => {
    // Optimistic update immediately
    if (settings) {
      setSettings(prev => prev ? { ...prev, [field]: value } : null)
    }
    
    // Return cleanup function that will be called by the component
    const timeoutId = setTimeout(async () => {
      await saveField(field, value, false) // Don't show toast for debounced saves
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [saveField, settings])

  return {
    settings,
    loading,
    saving,
    saveField,
    saveFieldDebounced,
    refresh: async () => {
      setLoading(true)
      const profile = await getMyProfile()
      setSettings(profile)
      setLoading(false)
    }
  }
}

