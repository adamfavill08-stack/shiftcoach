'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { clearHealthConnectNativeAuth } from '@/lib/native/clearHealthConnectNativeAuth'
import { getMyProfile, updateProfile, type Profile } from '@/lib/profile'
import { ChevronLeft, ChevronRight, User, Target, Scale, Ruler, Calendar, Mail, Key } from 'lucide-react'
import { showToast } from '@/components/ui/Toast'
import { cmToFeetInches, feetInchesToCm } from '@/lib/units'
import { useTranslation } from '@/components/providers/language-provider'
import { useSubscriptionAccess } from '@/lib/hooks/useSubscriptionAccess'
import { canUseFeature } from '@/lib/subscription/features'
import { UpgradeCard } from '@/components/subscription/UpgradeCard'
import { SubscriptionPlanSection } from '../components/SubscriptionPlanSection'

/** Parse YYYY-MM-DD in the user's local calendar (avoids UTC midnight shifts from `new Date('YYYY-MM-DD')`). */
function parseYmdLocal(ymd: string): Date | null {
  const m = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const d = Number(m[3])
  const dt = new Date(y, mo, d)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null
  return dt
}

function ProfileLoadingFallback() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="rounded-3xl bg-white px-6 py-5">
          <div className="animate-pulse text-sm text-slate-500">{t('settings.profile.loading')}</div>
        </div>
      </div>
    </main>
  )
}

function ProfilePageContent() {
  const { t } = useTranslation()
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
  const [showNameModal, setShowNameModal] = useState(false)
  
  // Input states for modals
  const [nameInput, setNameInput] = useState('')
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
  const [heightEntryMode, setHeightEntryMode] = useState<'cm' | 'ft_in'>('cm')
  const [heightFtInput, setHeightFtInput] = useState('')
  const [heightInInput, setHeightInInput] = useState('')
  const [profilePageTab, setProfilePageTab] = useState<'about' | 'billing'>('about')
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [hasCompletedFirstSetup, setHasCompletedFirstSetup] = useState(false)
  const [busy, setBusy] = useState(false)
  const { isLoading: subscriptionLoading, isPro, plan } = useSubscriptionAccess()
  const hasCalorieProfileAccess = canUseFeature('calorie_profile_settings', { isPro, plan })

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
  const profileSetupDoneKey = profile?.user_id ? `profileSetupCompleted:${profile.user_id}` : null

  // Helper function to calculate age from date of birth
  const calculateAge = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth) return null
    try {
      const trimmed = dateOfBirth.trim()
      const birthDate =
        /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? parseYmdLocal(trimmed) : new Date(dateOfBirth)
      // Check if date is valid
      if (!birthDate || isNaN(birthDate.getTime())) {
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

  useEffect(() => {
    if (typeof window === 'undefined' || !profileSetupDoneKey) return
    const stored = localStorage.getItem(profileSetupDoneKey)
    setHasCompletedFirstSetup(stored === '1')
  }, [profileSetupDoneKey])

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      setAccountEmail(data.user?.email ?? null)
    })
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
      await clearHealthConnectNativeAuth()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        showToast(t('settings.dataPrivacy.toast.logoutFailed'), 'error')
        setIsLoggingOut(false)
      } else {
        router.push('/auth/sign-in')
        router.refresh()
      }
    } catch (err) {
      console.error('Logout error:', err)
      showToast(t('settings.dataPrivacy.toast.logoutFailed'), 'error')
      setIsLoggingOut(false)
    }
  }

  const handleReturnToDashboard = async () => {
    if (busy || !isProfileFullyComplete || !profileSetupDoneKey) return

    setBusy(true)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(profileSetupDoneKey, '1')
      }
      setHasCompletedFirstSetup(true)
      router.push('/dashboard')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="rounded-3xl bg-white px-6 py-5">
            <div className="animate-pulse text-sm text-slate-500">{t('settings.profile.loading')}</div>
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
              <p className="text-sm text-slate-600 mb-4">{t('settings.profile.emptyMessage')}</p>
              <button
                onClick={async () => {
                  console.log('[ProfilePage] Starting profile setup from empty state')
                  setLoading(true)
                  try {
                    const { data: authData, error: authErr } = await supabase.auth.getUser()
                    if (authErr || !authData?.user) {
                      console.error('[ProfilePage] Could not read auth user for setup:', authErr)
                      setLoading(false)
                      return
                    }

                    // Explicitly ensure a profile row exists for this user, then load it.
                    const { error: ensureErr } = await supabase
                      .from('profiles')
                      .upsert({ user_id: authData.user.id }, { onConflict: 'user_id' })

                    if (ensureErr) {
                      console.error('[ProfilePage] Failed to ensure profile row:', ensureErr)
                    }

                    const data = await getMyProfile()
                    console.log('[ProfilePage] Start setup result:', data)
                    if (data) {
                      setProfile(data)
                      setUserName(data.name)
                      setAvatarUrl(data.avatar_url || null)
                    }
                  } catch (err) {
                    console.error('[ProfilePage] Unexpected start setup error:', err)
                  }
                  setLoading(false)
                }}
                className="px-6 py-3 rounded-full bg-slate-900 text-white font-semibold shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] hover:opacity-95 transition-colors"
              >
                Start profile setup
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
                {t('settings.profile.refreshProfile')}
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!subscriptionLoading && !hasCalorieProfileAccess) {
    return (
      <main className="min-h-screen bg-slate-100">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="mb-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-700 shadow-[0_4px_16px_-10px_rgba(15,23,42,0.25)]"
              aria-label={t('settings.backAria')}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          </div>
          <UpgradeCard
            title="Calorie profile is a Pro feature"
            description="Upgrade to set your profile and unlock adjusted calories, next meal window, and shift lag insights."
          />
        </div>
      </main>
    )
  }

  // Convert weight to display format based on selected unit
  const getDisplayWeight = (weightKg: number | null, unit: 'kg' | 'lb' | 'st+lb'): string => {
    if (!weightKg) return '—'

    if (unit === 'kg') {
      return `${Math.round(weightKg)} ${t('settings.profile.unit.kg')}`
    }
    if (unit === 'lb') {
      return `${Math.round(weightKg * 2.20462)} ${t('settings.profile.unit.lb')}`
    }
    const totalPounds = weightKg * 2.20462
    const stone = Math.floor(totalPounds / 14)
    const pounds = Math.round(totalPounds % 14)
    return `${stone} ${t('settings.profile.unit.st')} ${pounds} ${t('settings.profile.unit.lb')}`
  }

  // Calculate display values - ensure we handle null/undefined correctly
  const displayWeight = profile?.weight_kg != null
    ? getDisplayWeight(profile.weight_kg, weightUnit)
    : '—'

  const displayHeight = profile?.height_cm != null
    ? profile?.units === 'imperial'
      ? (() => {
          const { ft, inches } = cmToFeetInches(profile.height_cm!)
          return `${ft} ${t('settings.profile.unit.ft')} ${inches} ${t('settings.profile.unit.in')}`
        })()
      : `${Math.round(profile.height_cm)} ${t('settings.profile.unit.cm')}`
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

  const displayNameForCard = profile?.name?.trim() || userName?.trim() || null

  const isProfileFullyComplete = Boolean(
    profile?.name?.trim() &&
      profile?.sex &&
      profile?.goal &&
      typeof profile?.weight_kg === 'number' &&
      profile.weight_kg > 0 &&
      typeof profile?.height_cm === 'number' &&
      profile.height_cm > 0 &&
      (Boolean(profile?.date_of_birth) || (typeof profile?.age === 'number' && profile.age > 0))
  )
  const isFirstTimeProfileSetup = !hasCompletedFirstSetup

  const goalLabel =
    profile.goal === 'lose'
      ? t('settings.profile.goal.lose')
      : profile.goal === 'gain'
        ? t('settings.profile.goal.gain')
        : profile.goal === 'maintain'
          ? t('settings.profile.goal.maintain')
          : '—'

  const genderLabel =
    profile.sex === 'male'
      ? t('settings.profile.gender.male')
      : profile.sex === 'female'
        ? t('settings.profile.gender.female')
        : '—'

  const weightUnitChipLabel = (u: 'kg' | 'lb' | 'st+lb') =>
    u === 'st+lb'
      ? t('settings.profile.weightUnitChip.stLb')
      : u === 'kg'
        ? t('settings.profile.weightUnitChip.kg')
        : t('settings.profile.weightUnitChip.lb')

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
      showToast(t('settings.profile.toast.goalUpdated'), 'success')
    } else {
      showToast(t('settings.profile.toast.goalFailed'), 'error')
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
      alert(t('settings.profile.alert.weightRange'))
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
      showToast(t('settings.profile.toast.weightUpdated'), 'success')
    } else {
      showToast(t('settings.profile.toast.weightFailed'), 'error')
    }
    
    setSaving(null)
    setShowWeightModal(false)
    setWeightInput('')
    setStoneInput('')
    setPoundsInput('')
  }

  const switchHeightEntryMode = (mode: 'cm' | 'ft_in') => {
    if (mode === heightEntryMode) return
    if (mode === 'ft_in' && heightEntryMode === 'cm') {
      const cm = parseFloat(heightInput)
      if (!Number.isNaN(cm) && cm >= 100 && cm <= 250) {
        const { ft, inches } = cmToFeetInches(cm)
        setHeightFtInput(String(ft))
        setHeightInInput(String(inches))
      }
    }
    if (mode === 'cm' && heightEntryMode === 'ft_in') {
      const ft = parseInt(heightFtInput.trim(), 10)
      const inchRaw =
        heightInInput.trim() === '' ? 0 : parseFloat(heightInInput.trim().replace(',', '.'))
      if (!Number.isNaN(ft) && !Number.isNaN(inchRaw) && inchRaw >= 0 && inchRaw < 12) {
        const cm = feetInchesToCm(ft, inchRaw)
        if (cm >= 100 && cm <= 250) setHeightInput(String(cm))
      }
    }
    setHeightEntryMode(mode)
  }

  const handleSaveHeight = async () => {
    if (!profile) return
    setSaving('height')
    let numValue: number

    if (heightEntryMode === 'cm') {
      numValue = parseFloat(heightInput)
      if (Number.isNaN(numValue) || numValue < 100 || numValue > 250) {
        alert(t('settings.profile.alert.heightRange'))
        setSaving(null)
        return
      }
    } else {
      const ft = parseInt(heightFtInput.trim(), 10)
      const inchRaw = heightInInput.trim() === '' ? 0 : parseFloat(heightInInput.trim().replace(',', '.'))
      if (
        Number.isNaN(ft) ||
        Number.isNaN(inchRaw) ||
        inchRaw < 0 ||
        inchRaw >= 12
      ) {
        alert(t('settings.profile.alert.heightFtIn'))
        setSaving(null)
        return
      }
      numValue = feetInchesToCm(ft, inchRaw)
      if (numValue < 100 || numValue > 250) {
        alert(t('settings.profile.alert.heightFtIn'))
        setSaving(null)
        return
      }
    }

    const success = await updateProfile({ height_cm: numValue })
    if (success) {
      await refreshProfile()
      // Dispatch events to trigger recalculation of calories and macros
      // Height affects BMR, which affects all calorie and macro calculations
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { height_cm: numValue } }))
      window.dispatchEvent(new CustomEvent('heightChanged', { detail: { height_cm: numValue } }))
      showToast(t('settings.profile.toast.heightUpdated'), 'success')
    } else {
      showToast(t('settings.profile.toast.heightFailed'), 'error')
    }
    
    setSaving(null)
    setShowHeightModal(false)
    setHeightInput('')
  }

  const handleSaveDOB = async () => {
    if (!profile) return
    setSaving('dob')

    if (!dobInput || dobInput.trim() === '') {
      alert(t('settings.profile.alert.dobRequired'))
      setSaving(null)
      return
    }

    // Validate date format (YYYY-MM-DD)
    const dobRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dobRegex.test(dobInput.trim())) {
      alert(t('settings.profile.alert.dobFormat'))
      setSaving(null)
      return
    }

    const dobLocal = parseYmdLocal(dobInput.trim())
    if (!dobLocal) {
      alert(t('settings.profile.alert.dobFormat'))
      setSaving(null)
      return
    }

    // Validate date is not in the future (local calendar day)
    const todayMid = new Date()
    todayMid.setHours(0, 0, 0, 0)
    const dobMid = new Date(dobLocal.getFullYear(), dobLocal.getMonth(), dobLocal.getDate())
    if (dobMid > todayMid) {
      alert(t('settings.profile.alert.dobFuture'))
      setSaving(null)
      return
    }

    // Validate age is reasonable (13-120 years)
    const age = calculateAge(dobInput.trim())
    if (age === null || age < 13 || age > 120) {
      alert(t('settings.profile.alert.dobAgeRange'))
      setSaving(null)
      return
    }

    const success = await updateProfile({ date_of_birth: dobInput.trim(), age })
    if (success) {
      await refreshProfile()
      // Dispatch events to trigger recalculation (age affects sleep calculations)
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { date_of_birth: dobInput.trim(), age } }))
      showToast(t('settings.profile.toast.dobUpdated', { age }), 'success')
    } else {
      showToast(t('settings.profile.toast.dobFailed'), 'error')
    }
    
    setSaving(null)
    setShowAgeModal(false)
    setDobInput('')
  }

  const handleSaveName = async () => {
    if (!profile) return
    const trimmed = nameInput.trim()
    if (!trimmed) {
      alert(t('settings.profile.alert.nameRequired'))
      return
    }
    setSaving('name')
    const success = await updateProfile({ name: trimmed })
    if (success) {
      await refreshProfile()
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { name: trimmed } }))
      showToast(t('settings.profile.toast.nameUpdated'), 'success')
    } else {
      showToast(t('settings.profile.toast.nameFailed'), 'error')
    }
    setSaving(null)
    setShowNameModal(false)
  }

  const handleSaveGender = async (sex: 'male' | 'female') => {
    if (!profile) return
    setSaving('gender')
    const success = await updateProfile({ sex })
    if (success) {
      await refreshProfile()
      // Dispatch profile-updated event - gender affects BMR calculation
      window.dispatchEvent(new CustomEvent('profile-updated', { detail: { sex } }))
      window.dispatchEvent(new CustomEvent('genderChanged', { detail: { sex } }))
      showToast(t('settings.profile.toast.genderUpdated'), 'success')
    } else {
      showToast(t('settings.profile.toast.genderFailed'), 'error')
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
              <div className="overflow-hidden rounded-3xl bg-white pb-6 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.12)]">
                <div className="h-1.5 w-full shrink-0 bg-[#05afc5]" aria-hidden />
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <button
                    onClick={() => router.back()}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {t('settings.profile.back')}
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
                    title={t('settings.profile.refreshTitle')}
                  >
                    {t('settings.profile.refresh')}
                  </button>
                </div>
                <h1 className="px-5 text-[18px] font-semibold tracking-tight text-slate-900">
                  {t('settings.profile.title')}
                </h1>

                <div className="mt-4 px-5" role="tablist" aria-label="Profile">
                  <div className="flex gap-1 rounded-[14px] bg-slate-100 p-1.5">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profilePageTab === 'about'}
                      onClick={() => setProfilePageTab('about')}
                      className={`flex-1 rounded-[10px] py-3 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors sm:text-[11px] ${
                        profilePageTab === 'about'
                          ? 'bg-[#05afc5] text-white shadow-sm'
                          : 'bg-transparent text-[#05afc5] hover:bg-white/80'
                      }`}
                    >
                      {t('settings.profile.tabAbout')}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={profilePageTab === 'billing'}
                      onClick={() => setProfilePageTab('billing')}
                      className={`flex-1 rounded-[10px] py-3 text-[10px] font-bold uppercase tracking-[0.1em] transition-colors sm:text-[11px] ${
                        profilePageTab === 'billing'
                          ? 'bg-[#05afc5] text-white shadow-sm'
                          : 'bg-transparent text-[#05afc5] hover:bg-white/80'
                      }`}
                    >
                      {t('settings.profile.tabAccountBilling')}
                    </button>
                  </div>
                </div>

                {profilePageTab === 'about' ? (
                  <>
                {/* Identity Block — tap to set display name */}
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(profile?.name ?? userName ?? '')
                    setShowNameModal(true)
                  }}
                  className="mt-4 mx-5 flex w-[calc(100%-2.5rem)] items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-left hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-emerald-400 grid place-items-center text-white font-semibold flex-shrink-0">
                      {getInitials(displayNameForCard || t('settings.profile.fallbackUser'))}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {getFirstName(displayNameForCard) || t('settings.profile.fallbackUser')}
                      </p>
                      <p className="text-xs text-slate-500">{t('settings.profile.subtitle')}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" strokeWidth={2} />
                </button>

                {/* Quick stats row */}
                <div className="mt-3 mx-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{t('settings.profile.statWeight')}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{displayWeight}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{t('settings.profile.statHeight')}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{displayHeight}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{t('settings.profile.statAge')}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
                      {displayAge !== '—' ? t('settings.profile.ageYr', { age: displayAge }) : '—'}
                    </p>
                  </div>
                </div>

                <p className="mt-5 px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#05afc5]">
                  {t('settings.profile.sectionPersonalGoals')}
                </p>

                {/* Cards */}
                <div className="mt-2 space-y-2 px-5">
                  {/* Gender */}
                  <button
                    onClick={() => setShowGenderModal(true)}
                    className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] dark:border-[var(--border-subtle)] dark:bg-[var(--card)] dark:shadow-none dark:hover:border-sky-500/35 dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.35)]"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-gradient-to-br from-sky-500 to-emerald-400 shadow-sm">
                        <User className="h-4 w-4 text-white" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-slate-900 dark:text-[var(--text-main)]">
                        {t('settings.profile.rowGender')}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-[var(--text-main)]">
                        {genderLabel}
                      </p>
                      <ChevronRight
                        className="h-4 w-4 text-slate-300 transition group-hover:text-sky-400 dark:text-slate-500 dark:group-hover:text-sky-400"
                        strokeWidth={2}
                      />
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
                      <p className="text-sm font-medium text-slate-900">{t('settings.profile.rowGoal')}</p>
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
                      <p className="text-sm font-medium text-slate-900">{t('settings.profile.rowBodyWeight')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">{displayWeight}</p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition" strokeWidth={2} />
                    </div>
                  </button>

                  {/* Height */}
                  <button
                    onClick={() => {
                      if (profile?.height_cm) {
                        setHeightInput(Math.round(profile.height_cm).toString())
                        const { ft, inches } = cmToFeetInches(profile.height_cm)
                        setHeightFtInput(String(ft))
                        setHeightInInput(String(inches))
                      } else {
                        setHeightInput('')
                        setHeightFtInput('')
                        setHeightInInput('')
                      }
                      setHeightEntryMode(profile?.units === 'imperial' ? 'ft_in' : 'cm')
                      setShowHeightModal(true)
                    }}
                    className="group flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.08)] hover:border-sky-100 hover:shadow-[0_4px_12px_rgba(15,23,42,0.12)] transition-colors w-full"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-500 grid place-items-center flex-shrink-0 shadow-sm">
                        <Ruler className="h-4 w-4 text-white" strokeWidth={2} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">{t('settings.profile.rowHeight')}</p>
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
                      <p className="text-sm font-medium text-slate-900">{t('settings.profile.rowAgeDob')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-semibold text-slate-900 tabular-nums">
                        {profile?.age !== null && profile?.age !== undefined && typeof profile.age === 'number' && profile.age > 0
                          ? t('settings.profile.ageYears', { age: profile.age })
                          : '—'}
                      </p>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-sky-400 transition" strokeWidth={2} />
                    </div>
                  </button>
                </div>

                {/* Actions */}
                <div className="px-5">
                  <button
                    onClick={isFirstTimeProfileSetup ? handleReturnToDashboard : handleLogout}
                    disabled={
                      isFirstTimeProfileSetup
                        ? busy || !isProfileFullyComplete
                        : isLoggingOut
                    }
                    className="mt-5 w-full rounded-full px-5 py-3 bg-slate-900 text-white text-sm font-semibold shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFirstTimeProfileSetup
                      ? busy
                        ? t('settings.profile.saving')
                        : t('settings.profile.returnToDashboard')
                      : isLoggingOut
                        ? t('settings.dataPrivacy.loggingOut')
                        : t('settings.dataPrivacy.logOut')}
                  </button>
                  {isFirstTimeProfileSetup && !isProfileFullyComplete && (
                    <p className="mt-2 text-center text-xs text-slate-500">
                      {t('settings.profile.completeAllFieldsFirst')}
                    </p>
                  )}
                </div>
                  </>
                ) : (
                  <div className="mt-6 space-y-1 pb-1">
                    {accountEmail ? (
                      <>
                        <p className="px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#05afc5]">
                          {t('settings.profile.sectionBillingAccount')}
                        </p>
                        <div className="mt-2 space-y-2 px-5">
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                            <span className="flex shrink-0 items-center">
                              <span className="sr-only">{t('settings.profile.signedInAs')}</span>
                              <Mail
                                className="h-5 w-5 text-[#05afc5]"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                            </span>
                            <span className="max-w-[58%] truncate text-right text-sm font-semibold text-slate-900">
                              {accountEmail}
                            </span>
                          </div>
                          <Link
                            href="/auth/update-password"
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.08)] transition-colors hover:border-slate-200 active:bg-slate-50/80"
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <Key
                                className="h-5 w-5 shrink-0 text-[#05afc5]"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                              <span className="text-sm font-medium text-slate-900">
                                {t('settings.profile.changePassword')}
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} aria-hidden />
                          </Link>
                        </div>
                      </>
                    ) : null}

                    <p
                      className={`px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#05afc5] ${accountEmail ? 'mt-6' : 'mt-5'}`}
                    >
                      {t('settings.profile.sectionBillingSubscription')}
                    </p>
                    <div className="mt-2 px-5">
                      <SubscriptionPlanSection embedInline />
                    </div>
                    <div className="mt-3 flex justify-center px-5">
                      <Link
                        href={`/upgrade?returnTo=${encodeURIComponent('/settings/profile')}`}
                        className="inline-flex items-center justify-center rounded-full bg-[#05afc5] px-7 py-3 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0499b0] active:bg-[#0489a0]"
                      >
                        {t('settings.profile.manageSubscription')}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="mt-6 border-t border-slate-100 px-5 pt-4 text-center">
                  <Link
                    href="/account/delete"
                    className="text-[11px] text-slate-500 underline underline-offset-2 decoration-slate-400 hover:text-slate-700 hover:decoration-slate-600"
                  >
                    {t('account.delete.title')}
                  </Link>
                </div>
              </div>
            </div>
          </main>

        {/* Display name modal */}
        {showNameModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-1">{t('settings.profile.modalDisplayName')}</h4>
              <p className="text-xs text-slate-500 mb-4">{t('settings.profile.modalDisplayNameHint')}</p>
              <input
                id="profile-display-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t('settings.profile.namePlaceholder')}
                autoComplete="name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500"
              />
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNameModal(false)
                    setNameInput('')
                  }}
                  disabled={saving === 'name'}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  {t('settings.profile.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving === 'name' || !nameInput.trim()}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                >
                  {saving === 'name' ? t('settings.profile.saving') : t('settings.profile.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gender Modal */}
        {showGenderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 dark:bg-black/60">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] dark:border-[var(--border-subtle)] dark:bg-[var(--card)] dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.65)]">
              <h4 className="mb-4 text-lg font-semibold text-slate-900 dark:text-[var(--text-main)]">
                {t('settings.profile.modalSelectGender')}
              </h4>
              <div className="space-y-2">
                {(['male', 'female'] as const).map((sex) => (
                  <button
                    key={sex}
                    type="button"
                    onClick={() => handleSaveGender(sex)}
                    disabled={saving === 'gender'}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      profile?.sex === sex
                        ? 'border-sky-500 bg-sky-50 text-slate-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-[var(--text-main)]'
                        : 'border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-[var(--border-subtle)] dark:text-[var(--text-main)] dark:hover:bg-slate-800/70'
                    } ${saving === 'gender' ? 'cursor-wait opacity-50' : ''}`}
                  >
                    {sex === 'male' ? t('settings.profile.gender.male') : t('settings.profile.gender.female')}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowGenderModal(false)}
                disabled={saving === 'gender'}
                className="mt-4 w-full py-2.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-50 dark:text-[var(--text-soft)] dark:hover:text-[var(--text-main)]"
              >
                {t('settings.profile.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Goal Modal */}
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">{t('settings.profile.modalSelectGoal')}</h4>
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
                      {goal === 'lose'
                        ? t('settings.profile.goal.lose')
                        : goal === 'gain'
                          ? t('settings.profile.goal.gain')
                          : t('settings.profile.goal.maintain')}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowGoalModal(false)}
                  disabled={saving === 'goal'}
                className="mt-4 w-full py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 disabled:opacity-50 transition-colors"
                >
                  {t('settings.profile.cancel')}
                </button>
            </div>
          </div>
        )}

        {/* Weight Modal */}
        {showWeightModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">{t('settings.profile.modalBodyWeight')}</h4>

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
                        {weightUnitChipLabel(unit)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Fields */}
                {weightUnit === 'st+lb' ? (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t('settings.profile.labelStone')}</label>
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
                      <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t('settings.profile.labelPounds')}</label>
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
                      placeholder={t('settings.profile.weightPlaceholder', {
                        unit: weightUnitChipLabel(weightUnit),
                      })}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      autoFocus
                    />
                    <span className="text-sm font-semibold text-slate-600">{weightUnitChipLabel(weightUnit)}</span>
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
                    {t('settings.profile.cancel')}
                  </button>
                  <button
                    onClick={handleSaveWeight}
                    disabled={
                      saving === 'weight' || 
                      (weightUnit === 'st+lb' ? (!stoneInput && !poundsInput) : !weightInput)
                    }
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                  >
                    {saving === 'weight' ? t('settings.profile.saving') : t('settings.profile.save')}
                  </button>
                </div>
            </div>
          </div>
        )}

        {/* Height Modal */}
        {showHeightModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-4">{t('settings.profile.modalHeight')}</h4>
              <div className="flex rounded-xl border border-slate-200 p-0.5 mb-4 bg-slate-50">
                <button
                  type="button"
                  onClick={() => switchHeightEntryMode('cm')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    heightEntryMode === 'cm'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('settings.profile.heightEntryCm')}
                </button>
                <button
                  type="button"
                  onClick={() => switchHeightEntryMode('ft_in')}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                    heightEntryMode === 'ft_in'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t('settings.profile.heightEntryFtIn')}
                </button>
              </div>
              {heightEntryMode === 'cm' ? (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    placeholder={t('settings.profile.heightPlaceholder')}
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                    autoFocus
                    min={100}
                    max={250}
                  />
                  <span className="text-sm font-semibold text-slate-600 shrink-0">{t('settings.profile.cm')}</span>
                </div>
              ) : (
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      {t('settings.profile.heightFeetLabel')}
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={heightFtInput}
                      onChange={(e) => setHeightFtInput(e.target.value)}
                      placeholder={t('settings.profile.heightFeetPlaceholder')}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                      min={0}
                      max={9}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                      {t('settings.profile.heightInchesLabel')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={heightInInput}
                        onChange={(e) => setHeightInInput(e.target.value)}
                        placeholder={t('settings.profile.heightInchesPlaceholder')}
                        className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all bg-white text-slate-900 placeholder:text-slate-400"
                        min={0}
                        max={11.9}
                      />
                      <span className="text-sm font-semibold text-slate-600 shrink-0">{t('settings.profile.unit.in')}</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowHeightModal(false)
                    setHeightInput('')
                    setHeightFtInput('')
                    setHeightInInput('')
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  {t('settings.profile.cancel')}
                </button>
                <button
                  onClick={handleSaveHeight}
                  disabled={
                    saving === 'height' ||
                    (heightEntryMode === 'cm' ? !heightInput : !heightFtInput.trim())
                  }
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                >
                  {saving === 'height' ? t('settings.profile.saving') : t('settings.profile.save')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Age / Date of Birth Modal */}
        {showAgeModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl bg-white border border-slate-200 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] p-6 w-full max-w-sm">
              <h4 className="text-lg font-semibold text-slate-900 mb-2">{t('settings.profile.modalDobTitle')}</h4>
              <p className="text-xs text-slate-600 mb-4">
                  {t('settings.profile.modalDobHint')}
                </p>
                <div className="mb-4">
                  <label className="text-xs font-semibold text-slate-600 mb-1.5 block">{t('settings.profile.modalDobLabel')}</label>
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
                      {t('settings.profile.agePreview', { age: calculateAge(dobInput) as number })}
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
                    {t('settings.profile.cancel')}
                  </button>
                  <button
                    onClick={handleSaveDOB}
                    disabled={saving === 'dob' || !dobInput}
                    className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_10px_26px_-14px_rgba(15,23,42,0.6)] transition-all"
                  >
                    {saving === 'dob' ? t('settings.profile.saving') : t('settings.profile.save')}
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
    <Suspense fallback={<ProfileLoadingFallback />}>
      <ProfilePageContent />
    </Suspense>
  )
}

