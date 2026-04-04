'use client'

import { useEffect, useState, Suspense, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { getMyProfile, updateProfile, type Profile } from '@/lib/profile'
import { ChevronLeft, ChevronRight, User, Target, Scale, Ruler, Calendar } from 'lucide-react'
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
  const [showAgeModal, setShowAgeModal] = useState(false)
  
  // Input states for modals
  const [weightInput, setWeightInput] = useState('')
  const [dobInput, setDobInput] = useState('')
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
      router.replace('/settings/profile', { scroll: false })
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
      <main className="min-h-screen bg-slate-100">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="rounded-3xl bg-white px-6 py-5">
            <div className="animate-pulse text-sm text-slate-500">Loading profile...</div>
          </div>
        </div>
      </main>
    )
  }

  // If no profile after loading, show error message
  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="rounded-3xl bg-white px-6 py-5">
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-4">No profile found. Please complete onboarding.</p>
              <button
                onClick={() => router.push('/onboarding')}
                className="px-6 py-3 rounded-full bg-slate-900 text-white font-semibold shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] hover:opacity-95 transition-colors"
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
                className="mt-3 px-6 py-3 rounded-full bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
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

  const displayAge =
    profile?.age !== null && profile?.age !== undefined && typeof profile.age === 'number' && profile.age > 0
      ? `${profile.age}`
      : profile?.date_of_birth
      ? (() => {
          const age = calculateAge(profile.date_of_birth)
          return age !== null ? `${age}` : '—'
        })()
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

  const handleSaveDOB = async () => {
    if (!profile) return
    setSaving('dob')
    
    if (!dobInput || dobInput.trim() === '') {
      alert('Please enter a date of birth.')
      setSaving(null)
      return
    }
    
    // Validate date format (YYYY-MM-DD)
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dobRegex.test(dobInput)) {
      alert('Please enter a valid date in YYYY-MM-DD format.')
      setSaving(null)
      return
    }
    
    // Validate date is not in the future
    const dob = new Date(dobInput)
    const today = new Date()
    if (dob > today) {
      alert('Date of birth cannot be in the future.')
      setSaving(null)
      return
    }
    
    // Validate age is reasonable (13-120 years)
    const age = calculateAge(dobInput)
    if (age === null || age < 13 || age > 120) {
      alert('Please enter a date of birth that corresponds to an age between 13 and 120 years.')
      setSaving(null)
      return
    }
    
    // Update date_of_birth (API will calculate age automatically)
    const success = await updateProfile({ date_of_birth: dobInput })
    if (success) {
      await refreshProfile()
      // Dispatch events to trigger recalculation (age affects sleep calculations)
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { date_of_birth: dobInput, age } }))
      showToast(`Date of birth updated. Age: ${age} years.`, 'success')
    } else {
      showToast('Failed to update date of birth', 'error')
    }
    
    setSaving(null)
    setShowAgeModal(false)
    setDobInput('')
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
        <>
          <main className="min-h-screen bg-slate-100 pb-8">
            <div className="mx-auto max-w-md px-4 py-6">
              <div className="rounded-3xl bg-white pb-6">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <button
                    onClick={() => router.back()}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Back
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
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                    title="Refresh profile data"
                  >
                    Refresh
                  </button>
                </div>
                <h1 className="px-5 text-[18px] font-semibold tracking-tight text-slate-900">
                  Profile
                </h1>

                {/* Identity Block */}
                <div className="mt-4 mx-5 flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400 grid place-items-center text-white font-semibold flex-shrink-0">
                    {getInitials(userName || 'User')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{getFirstName(userName) || 'User'}</p>
                    <p className="text-xs text-slate-500">ShiftCoach profile</p>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="mt-3 mx-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Weight</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{displayWeight}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Height</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{displayHeight}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Age</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
                      {displayAge !== '—' ? `${displayAge} yr` : '—'}
                    </p>
                  </div>
                </div>

                {/* Cards */}
                <div className="mt-4 space-y-2 px-5">
                  {/* Gender */}
                  <button
                    onClick={() => setShowGenderModal(true)}
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-emerald-400 grid place-items-center flex-shrink-0 shadow-sm">
                        <User className="h-4 w-4 text-white" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Gender</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{genderLabel}</p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition" strokeWidth={2} />
                    </div>
                  </button>

                  {/* Goal */}
                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-sky-500 grid place-items-center flex-shrink-0 shadow-sm">
                        <Target className="h-4 w-4 text-white" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Goal</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{goalLabel}</p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition" strokeWidth={2} />
                    </div>
                  </button>

                  {/* Body Weight */}
                  <button
                    onClick={() => {
                      if (profile?.weight_kg) {
                        if (weightUnit === 'kg') {
                          setWeightInput(Math.round(profile.weight_kg).toString())
                        } else if (weightUnit === 'lb') {
                          setWeightInput(Math.round(profile.weight_kg * 2.20462).toString())
                        } else {
                          const totalPounds = profile.weight_kg * 2.20462
                          const stone = Math.floor(totalPounds / 14)
                          const pounds = Math.round(totalPounds % 14)
                          setStoneInput(stone.toString())
                          setPoundsInput(pounds.toString())
                        }
                      }
                      setShowWeightModal(true)
                    }}
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 grid place-items-center flex-shrink-0 shadow-sm">
                        <Scale className="h-4 w-4 text-white" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Body Weight</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{displayWeight}</p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition" strokeWidth={2} />
                    </div>
                  </button>

                  {/* Height */}
                  <button
                    onClick={() => {
                      setHeightInput(profile?.height_cm ? Math.round(profile.height_cm).toString() : '')
                      setShowHeightModal(true)
                    }}
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 grid place-items-center flex-shrink-0 shadow-sm">
                        <Ruler className="h-4 w-4 text-white" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Height</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{displayHeight}</p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition" strokeWidth={2} />
                    </div>
                  </button>

                  {/* Age / Date of Birth */}
                  <button
                    onClick={() => {
                      if (profile?.date_of_birth) {
                        const dobStr = profile.date_of_birth
                        if (dobStr.includes('T')) {
                          const [datePart] = dobStr.split('T')
                          setDobInput(datePart)
                        } else if (dobStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          setDobInput(dobStr)
                        } else {
                          const dob = new Date(dobStr)
                          if (!isNaN(dob.getTime())) {
                            const year = dob.getFullYear()
                            const month = String(dob.getMonth() + 1).padStart(2, '0')
                            const day = String(dob.getDate()).padStart(2, '0')
                            setDobInput(`${year}-${month}-${day}`)
                          } else {
                            setDobInput('')
                          }
                        }
                      } else {
                        setDobInput('')
                      }
                      setShowAgeModal(true)
                    }}
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-violet-500 grid place-items-center flex-shrink-0 shadow-sm">
                        <Calendar className="h-4 w-4 text-white" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Age / Date of Birth</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">
                        {profile?.age !== null && profile?.age !== undefined && typeof profile.age === 'number' && profile.age > 0
                          ? `${profile.age} years`
                          : '—'}
                      </p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition" strokeWidth={2} />
                    </div>
                  </button>
                </div>

                {/* Actions */}
                <div className="px-5">
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="mt-5 w-full rounded-full px-5 py-3 bg-slate-900 text-white text-sm font-semibold shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoggingOut ? 'Logging out...' : 'Log out'}
                  </button>

                  <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                    <p className="text-[10px] font-semibold tracking-[0.22em] text-slate-400 mb-1">
                      SHIFTCOACH
                    </p>
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      A coaching app only and does not replace medical advice. Please speak to a healthcare
                      professional about any health concerns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </main>

        {/* Gender Modal */}
        {showGenderModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Select gender</h4>
                <div className="space-y-2">
                  {(['male', 'female', 'other'] as const).map((sex) => (
                    <button
                      key={sex}
                      onClick={() => handleSaveGender(sex)}
                      disabled={saving === 'gender'}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                        profile?.sex === sex
                          ? 'border-sky-500 bg-sky-50 text-slate-900'
                          : 'border-slate-200 text-slate-900 hover:bg-slate-50'
                      } ${saving === 'gender' ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : 'Other'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowGenderModal(false)}
                  disabled={saving === 'gender'}
                className="mt-4 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50 transition-colors"
                >
                  Cancel
              </button>
            </div>
          </div>
        )}

        {/* Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Select goal</h4>
                <div className="space-y-2">
                  {(['lose', 'maintain', 'gain'] as const).map((goal) => (
                    <button
                      key={goal}
                      onClick={() => handleSaveGoal(goal)}
                      disabled={saving === 'goal'}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                        profile?.goal === goal
                          ? 'border-emerald-500 bg-emerald-50 text-slate-900'
                          : 'border-slate-200 text-slate-900 hover:bg-slate-50'
                      } ${saving === 'goal' ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {goal === 'lose' ? 'Lose' : goal === 'gain' ? 'Gain' : 'Maintain'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowGoalModal(false)}
                  disabled={saving === 'goal'}
                className="mt-4 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
            </div>
          </div>
        )}

        {/* Weight Modal */}
        {showWeightModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Body weight</h4>

                {/* Unit Selector */}
                <div className="mb-4">
                  <div className="flex gap-2">
                    {(['kg', 'lb', 'st+lb'] as const).map((unit) => (
                      <button
                        key={unit}
                        onClick={() => {
                          setWeightUnit(unit)
                          localStorage.setItem('weightUnit', unit)
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
                        className={`flex-1 py-2.5 px-3 text-sm font-semibold rounded-xl border transition-colors ${
                          weightUnit === unit
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
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
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
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
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
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
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveWeight}
                    disabled={
                      saving === 'weight' || 
                      (weightUnit === 'st+lb' ? (!stoneInput && !poundsInput) : !weightInput)
                    }
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                  >
                    {saving === 'weight' ? 'Saving...' : 'Save'}
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Height Modal */}
        {showHeightModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">Height</h4>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    placeholder="Height in cm"
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
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
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveHeight}
                    disabled={saving === 'height' || !heightInput}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                  >
                    {saving === 'height' ? 'Saving...' : 'Save'}
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Age / Date of Birth Modal */}
        {showAgeModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Date of birth</h4>
              <p className="text-xs text-slate-600 mb-4">
                  Age will be calculated automatically from your date of birth.
                </p>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Date of birth</label>
                  <input
                    type="date"
                    value={dobInput}
                    onChange={(e) => setDobInput(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} // Can't be in the future
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>
                {dobInput && calculateAge(dobInput) !== null && (
                  <div className="mb-4 p-3 rounded-xl bg-sky-50 border border-sky-100">
                    <p className="text-sm text-sky-800">
                      Age: <span className="font-semibold">{calculateAge(dobInput)} years</span>
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowAgeModal(false)
                      setDobInput('')
                    }}
                    className="flex-1 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDOB}
                    disabled={saving === 'dob' || !dobInput}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                  >
                    {saving === 'dob' ? 'Saving...' : 'Save'}
                  </button>
                </div>
            </div>
          </div>
        )}

        </>
      )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-slate-100">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="rounded-3xl bg-white px-6 py-5">
            <div className="animate-pulse text-sm text-slate-500">Loading profile...</div>
          </div>
        </div>
      </main>
    }>
      <ProfilePageContent />
    </Suspense>
  )
}

