'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getMyProfile, updateProfile, type Profile } from '@/lib/profile'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { cmToFeetInches } from '@/lib/units'

function ProfilePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  
  // Modal states
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showHeightModal, setShowHeightModal] = useState(false)
  const [showGenderModal, setShowGenderModal] = useState(false)
  
  // Input states for modals
  const [weightInput, setWeightInput] = useState('')
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb' | 'st+lb'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weightUnit')
      if (saved === 'kg' || saved === 'lb' || saved === 'st+lb') {
        return saved
      }
    }
    return 'kg'
  })
  const [stoneInput, setStoneInput] = useState('')
  const [poundsInput, setPoundsInput] = useState('')
  const [heightInput, setHeightInput] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [busy, setBusy] = useState(false)

  // When profile loads or units change, align the weight unit with the user's
  // preference without overriding an explicit non-default choice.
  useEffect(() => {
    if (!profile || !profile.units) return
    if (profile.units === 'imperial' && weightUnit === 'kg') {
      setWeightUnit('lb')
    }
    // For metric we keep whatever the user picked (kg / lb / st+lb) so we don't
    // unexpectedly change their preferred display.
  }, [profile?.units, weightUnit])

  // Extract refresh param value (stable string, not object)
  const refreshParam = searchParams.get('refresh')

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth) return null
    try {
      const birthDate = new Date(dateOfBirth)
      // Check if date is valid
      if (isNaN(birthDate.getTime())) {
        console.warn('[calculateAge] Invalid date:', dateOfBirth)
        return null
      }
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      // Ensure age is reasonable (between 0 and 150)
      if (age < 0 || age > 150) {
        console.warn('[calculateAge] Age out of range:', age, 'for DOB:', dateOfBirth)
        return null
      }
      return age
    } catch (error) {
      console.error('[calculateAge] Error calculating age:', error, 'for DOB:', dateOfBirth)
      return null
    }
  }


  useEffect(() => {
      const loadProfile = async (retryCount = 0) => {
        try {
          setLoading(true)
          // Get user from auth
          const { data: { user }, error: authError } = await supabase.auth.getUser()
          
          if (authError && !user) {
            console.log('[ProfilePage] Trying API route fallback...')
            // Try to load profile via API route as fallback
            try {
              const res = await fetch('/api/profile')
              const data = await res.json()
              if (res.ok && data.profile) {
                console.log('[ProfilePage] Loaded profile via API fallback:', data.profile)
                setProfile(data.profile)
                setUserName(data.profile.name)
                setAvatarUrl(data.profile.avatar_url || null)
                setLoading(false)
                return
              } else {
                console.error('[ProfilePage] API fallback returned error:', data.error)
              }
            } catch (apiErr) {
              console.error('[ProfilePage] API fallback failed:', apiErr)
            }
            setLoading(false)
            return
          }
          
          if (!user) {
            console.warn('[ProfilePage] No authenticated user found')
            setLoading(false)
            return
          }

        // Check if we have onboarding data in sessionStorage (from just completing onboarding)
        if (typeof window !== 'undefined' && refreshParam) {
          const onboardingData = sessionStorage.getItem('onboardingProfileData')
          if (onboardingData) {
            try {
              const parsedData = JSON.parse(onboardingData) as Profile
              console.log('[ProfilePage] Using onboarding data from sessionStorage:', parsedData)
              setProfile(parsedData)
              setUserName(parsedData.name)
              setAvatarUrl(parsedData.avatar_url || null)
              // Clear it after using
              sessionStorage.removeItem('onboardingProfileData')
              setLoading(false)
              // Still fetch from database to ensure we have the latest
              setTimeout(() => {
                getMyProfile().then((dbData) => {
                  if (dbData) {
                    console.log('[ProfilePage] Refreshed from database:', dbData)
                    setProfile(dbData)
                    setUserName(dbData.name)
                    setAvatarUrl(dbData.avatar_url || null)
                  }
                })
              }, 500)
              return
            } catch (e) {
              console.error('[ProfilePage] Error parsing onboarding data:', e)
            }
          }
        }

        // If coming from onboarding, wait longer to ensure data is saved
        const delay = refreshParam ? 800 : 100
        await new Promise(resolve => setTimeout(resolve, delay))
        
        let profileData = await getMyProfile()
        
        // If getMyProfile returns null, try API route as fallback
        if (!profileData) {
          console.log('[ProfilePage] getMyProfile returned null, trying API route...')
          try {
            const res = await fetch('/api/profile')
            const apiData = await res.json()
            if (res.ok && apiData.profile) {
              console.log('[ProfilePage] Loaded profile via API route:', apiData.profile)
              profileData = apiData.profile
            } else {
              console.error('[ProfilePage] API route returned error:', apiData.error)
            }
          } catch (apiErr) {
            console.error('[ProfilePage] API route fetch failed:', apiErr)
          }
        }
        
        console.log('[ProfilePage] ========== PROFILE DATA LOADED ==========')
        console.log('[ProfilePage] Has profile:', !!profileData)
        console.log('[ProfilePage] Gender (sex):', profileData?.sex)
        console.log('[ProfilePage] Goal:', profileData?.goal)
        console.log('[ProfilePage] Weight (kg):', profileData?.weight_kg)
        console.log('[ProfilePage] Height (cm):', profileData?.height_cm)
        console.log('[ProfilePage] Age:', profileData?.age, 'Type:', typeof profileData?.age)
        console.log('[ProfilePage] Date of birth:', profileData?.date_of_birth)
        console.log('[ProfilePage] All keys:', profileData ? Object.keys(profileData) : [])
        console.log('[ProfilePage] Full profile object:', JSON.stringify(profileData, null, 2))
        console.log('[ProfilePage] =========================================')
        
        if (profileData) {
          console.log('[ProfilePage] Setting profile state with:', {
            sex: profileData.sex,
            goal: profileData.goal,
            weight_kg: profileData.weight_kg,
            height_cm: profileData.height_cm,
            age: profileData.age,
          })
          setProfile(profileData)
          setUserName(profileData.name)
          setAvatarUrl(profileData.avatar_url || null)
          setLoading(false)
        } else {
          // If no data and we came from onboarding, retry once
          if (refreshParam && retryCount < 2) {
            console.log(`[ProfilePage] No profile data found, retrying... (attempt ${retryCount + 1})`)
            setTimeout(() => {
              loadProfile(retryCount + 1)
            }, 1000)
          } else {
            console.warn('[ProfilePage] No profile data found')
            setLoading(false)
          }
        }
      } catch (err) {
        console.error('[ProfilePage] Error loading profile:', err)
        setLoading(false)
      }
    }

    loadProfile()

    // Check if we came from onboarding (has refresh param)
    if (refreshParam) {
      console.log('[ProfilePage] Refresh param detected, will reload profile after initial load...')
      // Remove the query param from URL immediately
      router.replace('/profile', { scroll: false })
      // Additional reload after a delay to ensure data is available
      setTimeout(() => {
        loadProfile()
      }, 1500)
    }

    // Listen for profile update events (e.g., from onboarding)
    const handleProfileUpdate = () => {
      console.log('[ProfilePage] Profile updated event received, refreshing...')
      // Add a delay to ensure database has updated
      setTimeout(() => {
        loadProfile()
      }, 500)
    }

    window.addEventListener('profile-updated', handleProfileUpdate)

    // Also check for profile updates when page becomes visible (e.g., after redirect)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[ProfilePage] Page became visible, refreshing profile...')
        setTimeout(() => {
          loadProfile()
        }, 300)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Refresh when navigating to this page (e.g., from settings)
    const handleFocus = () => {
      console.log('[ProfilePage] Window focused, refreshing profile...')
      setTimeout(() => {
        loadProfile()
      }, 200)
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [refreshParam, router])

  // Force refresh on mount - separate from main useEffect to ensure it always runs
  // This ensures profile loads when navigating from settings
  useEffect(() => {
    let mounted = true
    
    const forceRefresh = async () => {
      if (!mounted) return
      console.log('[ProfilePage] Force refreshing profile on mount...')
      setLoading(true)
      try {
        let profileData = await getMyProfile()
        
        // If getMyProfile returns null, try API route as fallback
        if (!profileData) {
          console.log('[ProfilePage] Force refresh: getMyProfile returned null, trying API route...')
          try {
            const res = await fetch('/api/profile')
            const apiData = await res.json()
            if (res.ok && apiData.profile) {
              console.log('[ProfilePage] Force refresh: Loaded via API route')
              profileData = apiData.profile
            }
          } catch (apiErr) {
            console.error('[ProfilePage] Force refresh: API route failed:', apiErr)
          }
        }
        
        if (!mounted) return
        
        if (profileData) {
          console.log('[ProfilePage] Force refresh loaded:', {
            gender: profileData.sex,
            goal: profileData.goal,
            weight: profileData.weight_kg,
            height: profileData.height_cm,
            age: profileData.age,
          })
          setProfile(profileData)
          setUserName(profileData.name)
          setAvatarUrl(profileData.avatar_url || null)
        } else {
          console.warn('[ProfilePage] Force refresh: No profile data returned after fallback')
        }
      } catch (err) {
        console.error('[ProfilePage] Force refresh error:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    // Small delay to ensure we're fully mounted, then refresh
    const timer = setTimeout(forceRefresh, 100)
    
    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [])

  const refreshProfile = async () => {
    console.log('[ProfilePage] Refreshing profile...')
    const profileData = await getMyProfile()
    if (profileData) {
      console.log('[ProfilePage] Refreshed profile data:', {
        gender: profileData.sex,
        goal: profileData.goal,
        weight: profileData.weight_kg,
        height: profileData.height_cm,
        age: profileData.age,
      })
      setProfile(profileData)
      setUserName(profileData.name)
      setAvatarUrl(profileData.avatar_url || null)
    } else {
      console.warn('[ProfilePage] No profile data found when refreshing')
    }
  }


  const handleLogout = async () => {
    if (isLoggingOut) return
    
    setIsLoggingOut(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        showToast('Failed to log out. Please try again.', 'error')
        setIsLoggingOut(false)
      } else {
        router.push('/auth/sign-in')
        router.refresh()
      }
    } catch (err) {
      console.error('Logout error:', err)
      showToast('Failed to log out. Please try again.', 'error')
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="max-w-md mx-auto px-6 py-8">
          <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-8">
            <div className="animate-pulse text-sm text-slate-500">Loading profile...</div>
          </div>
        </div>
      </main>
    )
  }

  // If no profile after loading, show error message
  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="max-w-md mx-auto px-6 py-8">
          <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-8">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-4">No profile found. Please complete onboarding.</p>
              <button
                onClick={() => router.push('/onboarding')}
                className="px-6 py-3 rounded-full bg-blue-600 text-white font-semibold shadow-lg hover:bg-blue-700 transition-colors"
              >
                Go to Onboarding
              </button>
              <button
                onClick={async () => {
                  console.log('[ProfilePage] Manual refresh clicked')
                  setLoading(true)
                  const data = await getMyProfile()
                  console.log('[ProfilePage] Manual refresh result:', data)
                  if (data) {
                    setProfile(data)
                    setUserName(data.name)
                    setAvatarUrl(data.avatar_url || null)
                  }
                  setLoading(false)
                }}
                className="mt-3 px-6 py-3 rounded-full bg-slate-200 text-slate-700 font-semibold shadow-lg hover:bg-slate-300 transition-colors"
              >
                Refresh Profile
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Convert weight to display format based on selected unit
  const getDisplayWeight = (weightKg: number | null, unit: 'kg' | 'lb' | 'st+lb'): string => {
    if (!weightKg) return '—'
    
    if (unit === 'kg') {
      return `${Math.round(weightKg)} kg`
    } else if (unit === 'lb') {
      return `${Math.round(weightKg * 2.20462)} lb`
    } else {
      // st+lb: 1 stone = 14 pounds, 1 kg = 2.20462 lb
      const totalPounds = weightKg * 2.20462
      const stone = Math.floor(totalPounds / 14)
      const pounds = Math.round(totalPounds % 14)
      return `${stone} st ${pounds} lb`
    }
  }

  // Calculate display values - ensure we handle null/undefined correctly
  const displayWeight = profile?.weight_kg != null 
    ? getDisplayWeight(profile.weight_kg, weightUnit)
    : '—'

  const displayHeight = profile?.height_cm != null
    ? profile?.units === 'imperial'
      ? (() => {
          const { ft, inches } = cmToFeetInches(profile.height_cm!)
          return `${ft} ft ${inches} in`
        })()
      : `${Math.round(profile.height_cm)} cm`
    : '—'

  const goalLabel = profile?.goal === 'lose' ? 'Lose' 
    : profile?.goal === 'gain' ? 'Gain' 
    : profile?.goal === 'maintain' ? 'Maintain'
    : '—'

  const genderLabel = profile?.sex === 'male' ? 'Male'
    : profile?.sex === 'female' ? 'Female'
    : profile?.sex === 'other' ? 'Other'
    : '—'

  // Debug: Log display values on every render to help diagnose blank display issue
  console.log('[ProfilePage] Render - Profile state:', {
    hasProfile: !!profile,
    profileSex: profile?.sex,
    profileGoal: profile?.goal,
    profileWeight: profile?.weight_kg,
    profileHeight: profile?.height_cm,
    profileAge: profile?.age,
    genderLabel,
    goalLabel,
    displayWeight,
    displayHeight,
  })

  // Handle saving updates
  const handleSaveGoal = async (goal: 'lose' | 'maintain' | 'gain') => {
    if (!profile) return
    setSaving('goal')
    const success = await updateProfile({ goal })
    if (success) {
      await refreshProfile()
      // Dispatch goalChanged event to trigger recalculation of calories and macros
      window.dispatchEvent(new CustomEvent('goalChanged', { detail: { goal } }))
      // Also dispatch profile-updated for other components
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { goal } }))
      showToast('Goal updated. Recalculating your targets...', 'success')
    } else {
      showToast('Failed to update goal', 'error')
    }
    setSaving(null)
    setShowGoalModal(false)
  }

  const handleSaveWeight = async () => {
    if (!profile) return
    setSaving('weight')
    
    let weightInKg: number | null = null
    
    if (weightUnit === 'kg') {
      const numValue = parseFloat(weightInput)
      if (!isNaN(numValue)) {
        weightInKg = numValue
      }
    } else if (weightUnit === 'lb') {
      const numValue = parseFloat(weightInput)
      if (!isNaN(numValue)) {
        weightInKg = numValue * 0.453592
      }
    } else if (weightUnit === 'st+lb') {
      const stone = parseFloat(stoneInput)
      const pounds = parseFloat(poundsInput)
      if (!isNaN(stone) && !isNaN(pounds)) {
        const totalPounds = (stone * 14) + pounds
        weightInKg = totalPounds * 0.453592
      }
    }
    
    if (weightInKg === null || isNaN(weightInKg) || weightInKg < 30 || weightInKg > 300) {
      alert('Please enter a valid weight between 30kg and 300kg.')
      setSaving(null)
      return
    }
    
    const success = await updateProfile({ weight_kg: weightInKg })
    if (success) {
      await refreshProfile()
      // Dispatch events to trigger recalculation of calories and macros
      // Weight affects BMR, which affects all calorie and macro calculations
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { weight_kg: weightInKg } }))
      window.dispatchEvent(new CustomEvent('weightChanged', { detail: { weight_kg: weightInKg } }))
      showToast('Weight updated. Recalculating your targets...', 'success')
    } else {
      showToast('Failed to update weight', 'error')
    }
    
    setSaving(null)
    setShowWeightModal(false)
    setWeightInput('')
    setStoneInput('')
    setPoundsInput('')
  }

  const handleSaveHeight = async () => {
    if (!profile) return
    setSaving('height')
    const numValue = parseFloat(heightInput)
    
    if (isNaN(numValue) || numValue < 100 || numValue > 250) {
      alert('Please enter a valid height between 100cm and 250cm.')
      setSaving(null)
      return
    }
    
    const success = await updateProfile({ height_cm: numValue })
    if (success) {
      await refreshProfile()
      // Dispatch events to trigger recalculation of calories and macros
      // Height affects BMR, which affects all calorie and macro calculations
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { height_cm: numValue } }))
      window.dispatchEvent(new CustomEvent('heightChanged', { detail: { height_cm: numValue } }))
      showToast('Height updated. Recalculating your targets...', 'success')
    } else {
      showToast('Failed to update height', 'error')
    }
    
    setSaving(null)
    setShowHeightModal(false)
    setHeightInput('')
  }


  const handleSaveGender = async (sex: 'male' | 'female' | 'other') => {
    if (!profile) return
    setSaving('gender')
    const success = await updateProfile({ sex })
    if (success) {
      await refreshProfile()
      // Dispatch profile-updated event - gender affects BMR calculation
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { sex } }))
      window.dispatchEvent(new CustomEvent('genderChanged', { detail: { sex } }))
      showToast('Gender updated. Recalculating your targets...', 'success')
    } else {
      showToast('Failed to update gender', 'error')
    }
    setSaving(null)
    setShowGenderModal(false)
  }

  // Get initials for profile picture
  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name[0].toUpperCase()
  }

  // Get first name from full name
  const getFirstName = (name: string | null) => {
    if (!name) return null
    const parts = name.trim().split(' ')
    return parts[0] || null
  }

      return (
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
          <div className="max-w-md mx-auto px-6 py-8">
            {/* Premium Card Container */}
            <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08),0_0_0_1px_rgba(255,255,255,0.5)]">
              {/* Premium gradient overlay */}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-indigo-50/20" />
              
              {/* Enhanced inner glow */}
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/60" />
              <div className="pointer-events-none absolute inset-[1px] rounded-[15px] ring-1 ring-white/30" />
              
              {/* Ambient glow effect */}
              <div className="pointer-events-none absolute -inset-1 bg-gradient-to-br from-blue-100/30 via-indigo-100/20 to-purple-100/30 blur-xl opacity-60" />
          
          <div className="relative z-10 px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-all hover:gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <button
                  onClick={async () => {
                    console.log('[ProfilePage] Manual refresh button clicked')
                    setLoading(true)
                    const data = await getMyProfile()
                    console.log('[ProfilePage] Manual refresh loaded:', data)
                    if (data) {
                      setProfile(data)
                      setUserName(data.name)
                      setAvatarUrl(data.avatar_url || null)
                    }
                    setLoading(false)
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  title="Refresh profile data"
                >
                  Refresh
                </button>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                Profile
              </h1>
              <div className="mt-2 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Name Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-sm border border-white/70 shadow-[0_4px_12px_rgba(15,23,42,0.04)] mb-8 p-5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20" />
              <div className="relative z-10">
                {/* Name */}
                <div className="text-center">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent">
                    {getFirstName(userName) || 'User'}
                  </h2>
                </div>
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-2.5 mb-8">
              {/* Gender */}
              <button
                onClick={() => setShowGenderModal(true)}
                className="group relative overflow-hidden w-full flex items-center justify-between rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm px-5 py-4 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] hover:scale-[1.01]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60 shadow-sm">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 flex-1 text-left">Gender</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{genderLabel}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>

              {/* Goal */}
              <button
                onClick={() => setShowGoalModal(true)}
                className="group relative overflow-hidden w-full flex items-center justify-between rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm px-5 py-4 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] hover:scale-[1.01]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 border border-indigo-200/60 shadow-sm">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 flex-1 text-left">Goal</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{goalLabel}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>

              {/* Body Weight */}
              <button
                onClick={() => {
                  // Initialize inputs based on current weight and selected unit
                  if (profile?.weight_kg) {
                    if (weightUnit === 'kg') {
                      setWeightInput(Math.round(profile.weight_kg).toString())
                    } else if (weightUnit === 'lb') {
                      setWeightInput(Math.round(profile.weight_kg * 2.20462).toString())
                    } else {
                      // st+lb
                      const totalPounds = profile.weight_kg * 2.20462
                      const stone = Math.floor(totalPounds / 14)
                      const pounds = Math.round(totalPounds % 14)
                      setStoneInput(stone.toString())
                      setPoundsInput(pounds.toString())
                    }
                  }
                  setShowWeightModal(true)
                }}
                className="group relative overflow-hidden w-full flex items-center justify-between rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm px-5 py-4 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] hover:scale-[1.01]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/60 shadow-sm">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 flex-1 text-left">Body Weight</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{displayWeight}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>

              {/* Height */}
              <button
                onClick={() => {
                  setHeightInput(profile?.height_cm ? Math.round(profile.height_cm).toString() : '')
                  setShowHeightModal(true)
                }}
                className="group relative overflow-hidden w-full flex items-center justify-between rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm px-5 py-4 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] hover:scale-[1.01]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200/60 shadow-sm">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 flex-1 text-left">Height</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{displayHeight}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>

              {/* Age (Read-only) */}
              <div className="relative overflow-hidden w-full flex items-center justify-between rounded-xl bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm px-5 py-4 border border-white/90 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-50/50 via-transparent to-transparent" />
                <div className="relative z-10 flex items-center gap-3 flex-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200/60 shadow-sm">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-sm font-semibold text-slate-900 flex-1 text-left">Age</span>
                  <span className="text-sm font-medium text-slate-700">
                    {profile?.age !== null && profile?.age !== undefined && typeof profile.age === 'number' && profile.age > 0
                      ? `${profile.age} years`
                      : '—'}
                  </span>
                </div>
              </div>

            </div>

            {/* Log Out Section */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-50/50 to-slate-50/30 backdrop-blur-sm border border-slate-200/50 shadow-[0_4px_12px_rgba(15,23,42,0.04)] mb-3">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent" />
              <div className="relative z-10 p-3">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-lg transition-all hover:bg-slate-100/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </div>
            </div>

            {/* Cancel Subscription Section */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-50/50 to-red-50/30 backdrop-blur-sm border border-red-200/50 shadow-[0_4px_12px_rgba(239,68,68,0.08)] mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-red-50/30 via-transparent to-transparent" />
              <div className="relative z-10 p-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 text-xs font-semibold text-red-600 hover:text-red-700 rounded-lg transition-all hover:bg-red-100/50"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="pt-6 border-t border-slate-200/50">
              <p className="text-[11px] leading-relaxed text-slate-500 text-center px-2">
                Shift Coach is a coaching tool and does not provide medical advice. For medical conditions, pregnancy or complex health issues, please check your plan with a registered professional.
              </p>
            </div>
          </div>
        </div>

        {/* Gender Modal */}
        {showGenderModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] p-6 w-full max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
              <div className="relative z-10">
                <h4 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent mb-4">Select Gender</h4>
                <div className="space-y-2">
                  {(['male', 'female', 'other'] as const).map((sex) => (
                    <button
                      key={sex}
                      onClick={() => handleSaveGender(sex)}
                      disabled={saving === 'gender'}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        profile?.sex === sex
                          ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-[0_4px_12px_rgba(59,130,246,0.15)]'
                          : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                      } ${saving === 'gender' ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        {sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : 'Other'}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowGenderModal(false)}
                  disabled={saving === 'gender'}
                  className="mt-4 w-full py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] p-6 w-full max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
              <div className="relative z-10">
                <h4 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent mb-4">Select Goal</h4>
                <div className="space-y-2">
                  {(['lose', 'maintain', 'gain'] as const).map((goal) => (
                    <button
                      key={goal}
                      onClick={() => handleSaveGoal(goal)}
                      disabled={saving === 'goal'}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        profile?.goal === goal
                          ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-[0_4px_12px_rgba(99,102,241,0.15)]'
                          : 'border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                      } ${saving === 'goal' ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <span className="text-sm font-semibold text-slate-900">
                        {goal === 'lose' ? 'Lose' : goal === 'gain' ? 'Gain' : 'Maintain'}
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowGoalModal(false)}
                  disabled={saving === 'goal'}
                  className="mt-4 w-full py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Weight Modal */}
        {showWeightModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] p-6 w-full max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
              <div className="relative z-10">
                <h4 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent mb-4">Body Weight</h4>
                
                {/* Unit Selector */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    {(['kg', 'lb', 'st+lb'] as const).map((unit) => (
                      <button
                        key={unit}
                        onClick={() => {
                          setWeightUnit(unit)
                          localStorage.setItem('weightUnit', unit)
                          // Convert current weight to new unit for display
                          if (profile?.weight_kg) {
                            if (unit === 'kg') {
                              setWeightInput(Math.round(profile.weight_kg).toString())
                              setStoneInput('')
                              setPoundsInput('')
                            } else if (unit === 'lb') {
                              setWeightInput(Math.round(profile.weight_kg * 2.20462).toString())
                              setStoneInput('')
                              setPoundsInput('')
                            } else {
                              const totalPounds = profile.weight_kg * 2.20462
                              const stone = Math.floor(totalPounds / 14)
                              const pounds = Math.round(totalPounds % 14)
                              setStoneInput(stone.toString())
                              setPoundsInput(pounds.toString())
                              setWeightInput('')
                            }
                          }
                        }}
                        className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-xl border transition-all ${
                          weightUnit === unit
                            ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.15)]'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {unit === 'st+lb' ? 'st+lb' : unit.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Fields */}
                {weightUnit === 'st+lb' ? (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Stone</label>
                      <input
                        type="number"
                        value={stoneInput}
                        onChange={(e) => setStoneInput(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900"
                        autoFocus
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Pounds</label>
                      <input
                        type="number"
                        value={poundsInput}
                        onChange={(e) => setPoundsInput(e.target.value)}
                        placeholder="0"
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="number"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      placeholder={`Weight in ${weightUnit}`}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900"
                      autoFocus
                    />
                    <span className="text-sm font-semibold text-slate-600">{weightUnit}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowWeightModal(false)
                      setWeightInput('')
                      setStoneInput('')
                      setPoundsInput('')
                    }}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWeight}
                    disabled={
                      saving === 'weight' || 
                      (weightUnit === 'st+lb' ? (!stoneInput && !poundsInput) : !weightInput)
                    }
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:shadow-[0_6px_16px_rgba(16,185,129,0.4)] transition-all"
                  >
                    {saving === 'weight' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Height Modal */}
        {showHeightModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.12)] p-6 w-full max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-b from-white/98 via-white/90 to-white/85" />
              <div className="relative z-10">
                <h4 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent mb-4">Height</h4>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    placeholder="Height in cm"
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-slate-900"
                    autoFocus
                  />
                  <span className="text-sm font-semibold text-slate-600">cm</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowHeightModal(false)
                      setHeightInput('')
                    }}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveHeight}
                    disabled={saving === 'height' || !heightInput}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.4)] transition-all"
                  >
                    {saving === 'height' ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Subscription Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl border border-red-200/50 shadow-[0_8px_24px_rgba(239,68,68,0.15)] p-6 w-full max-w-sm">
              <div className="absolute inset-0 bg-gradient-to-b from-red-50/30 via-white/90 to-white/85" />
              <div className="relative z-10">
                <h4 className="text-lg font-bold text-red-900 mb-2">Cancel Subscription</h4>
                <p className="text-sm text-slate-600 mb-2">
                  This will cancel future payments and schedule your account for deletion at the end of your current paid period.
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  You'll keep access until your subscription period ends, then your account and all data will be permanently deleted.
                </p>
                <p className="text-sm text-slate-700 font-medium mb-4">Type DELETE to confirm:</p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full px-4 py-3 border border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4 transition-all bg-white text-slate-900"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeleteConfirmText('')
                    }}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (deleteConfirmText !== 'DELETE') {
                        showToast('Please type DELETE to confirm', 'error')
                        return
                      }

                      try {
                        setBusy(true)
                        
                        // Call the cancel subscription API
                        const res = await fetch('/api/subscription/cancel', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                        })

                        const data = await res.json()
                        
                        if (!res.ok) {
                          showToast(data.error || 'Failed to cancel subscription', 'error')
                          setBusy(false)
                          return
                        }

                        // Success - show message and close modal
                        showToast(
                          data.message || 'Subscription canceled successfully',
                          'success'
                        )
                        
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                        
                        // Refresh profile to show updated status
                        await refreshProfile()
                        
                        setBusy(false)
                      } catch (err) {
                        console.error('Cancel subscription error:', err)
                        showToast('Failed to cancel subscription', 'error')
                        setBusy(false)
                      }
                    }}
                    disabled={busy}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:shadow-[0_6px_16px_rgba(239,68,68,0.4)] transition-all"
                  >
                    {busy ? 'Processing...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="max-w-md mx-auto px-6 py-8">
          <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-8">
            <div className="animate-pulse text-sm text-slate-500">Loading profile...</div>
          </div>
        </div>
      </main>
    }>
      <ProfilePageContent />
    </Suspense>
  )
}

