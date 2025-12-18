'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, mlToFloz, flozToMl } from '@/lib/units'
import { DEV_USER_ID } from '@/lib/dev-user'
import { ChevronRight, ChevronLeft } from 'lucide-react'

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | undefined>()

  // In development, allow viewing the page even without auth (for testing)
  const isDev = process.env.NODE_ENV !== 'production'
  
  // Redirect to sign-in if not authenticated (after loading completes)
  // Skip redirect in dev mode for testing
  useEffect(() => {
    if (!loading && !user && !isDev) {
      router.replace('/auth/sign-in')
    }
  }, [loading, user, router, isDev])

  // Form state
  const [name, setName] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('other')
  const [dateOfBirth, setDateOfBirth] = useState<string>('')
  const [age, setAge] = useState<number | ''>('')
  const [height_cm, setHeight_cm] = useState<number | ''>('')
  const [weight_kg, setWeight_kg] = useState<number | ''>('')
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain')
  const [units, setUnits] = useState<'metric' | 'imperial'>('imperial')
  const [sleep_goal_h, setSleep_goal_h] = useState<number>(7.5)
  const [water_goal_ml, setWater_goal_ml] = useState<number>(2500)

  // Field-level errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Imperial UI state
  const [heightFt, setHeightFt] = useState<number | ''>('')
  const [heightIn, setHeightIn] = useState<number | ''>('')
  const [weightLb, setWeightLb] = useState<number | ''>('')
  const [waterOz, setWaterOz] = useState<number | ''>('')
  
  // Weight unit selection (kg, lb, st+lb) - default to stone + pounds for UK-style users
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb' | 'st+lb'>('st+lb')
  const [stoneInput, setStoneInput] = useState<number | ''>('')
  const [poundsInput, setPoundsInput] = useState<number | ''>('')

  // For dev mode without user, use a valid UUID from dev-user.ts
  // In production or with a real user, use the actual user
  const mockUser = isDev && !user 
    ? { id: process.env.NEXT_PUBLIC_DEV_USER_ID || DEV_USER_ID } as { id: string }
    : user

  // Validation functions
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Name is optional, no validation needed
    
    // Age validation
    if (age !== '' && (typeof age !== 'number' || age < 13 || age > 120)) {
      errors.age = 'Age must be between 13 and 120'
    }
    
    // Date of birth validation
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth)
      const today = new Date()
      const ageFromDob = today.getFullYear() - dob.getFullYear()
      const monthDiff = today.getMonth() - dob.getMonth()
      const calculatedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) 
        ? ageFromDob - 1 
        : ageFromDob
      
      if (calculatedAge < 13) {
        errors.dateOfBirth = 'You must be at least 13 years old'
      }
      
      // Check if age matches DOB (if both provided)
      if (age !== '' && typeof age === 'number') {
        if (Math.abs(calculatedAge - age) > 1) {
          errors.age = `Age doesn't match date of birth (should be around ${calculatedAge})`
        }
      }
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Height validation
    if (units === 'metric') {
      if (height_cm === '' || (typeof height_cm === 'number' && (height_cm < 100 || height_cm > 250))) {
        errors.height_cm = 'Height must be between 100cm and 250cm'
      }
    } else {
      if (heightFt === '' || heightIn === '') {
        errors.height = 'Please enter both feet and inches'
      } else {
        const totalInches = Number(heightFt) * 12 + Number(heightIn)
        if (totalInches < 39 || totalInches > 98) {
          errors.height = 'Height must be between 3ft 3in and 8ft 2in'
        }
      }
    }
    
    // Weight validation
    if (weight_kg === '' || (typeof weight_kg === 'number' && (weight_kg < 30 || weight_kg > 300))) {
      errors.weight = 'Weight must be between 30kg and 300kg (66-660 lbs)'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Sleep goal validation
    if (sleep_goal_h < 4 || sleep_goal_h > 12) {
      errors.sleep_goal_h = 'Sleep goal must be between 4 and 12 hours'
    }
    
    // Water goal validation
    if (water_goal_ml < 1000 || water_goal_ml > 5000) {
      errors.water_goal_ml = 'Water goal must be between 1000ml and 5000ml'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNextStep = () => {
    setFieldErrors({})
    
    if (step === 1 && !validateStep1()) {
      return
    }
    if (step === 2 && !validateStep2()) {
      return
    }
    
    setStep(step + 1)
  }

  const submit = async () => {
    if (!mockUser) return

    // Final validation
    if (!validateStep3()) {
      return
    }

    setBusy(true)
    setErr(undefined)
    setFieldErrors({})

    const profile = {
      name: name || null,
      sex: sex || null, // sex can be 'male', 'female', 'other', or null
      date_of_birth: dateOfBirth || null,
      age: (typeof age === 'number' && age > 0) ? age : (age === '' ? null : age),
      height_cm: (typeof height_cm === 'number' && height_cm > 0) ? height_cm : null,
      weight_kg: (typeof weight_kg === 'number' && weight_kg > 0) ? weight_kg : null,
      goal: goal || null, // goal can be 'lose', 'maintain', 'gain', or null
      units: units || null,
      sleep_goal_h: sleep_goal_h || null,
      water_goal_ml: water_goal_ml || null,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      theme: 'system',
      default_activity_level: 'medium', // Default activity level
    }
    
    console.log('[onboarding] Profile data being sent:', {
      sex: profile.sex,
      goal: profile.goal,
      weight_kg: profile.weight_kg,
      height_cm: profile.height_cm,
      age: profile.age,
    })

    console.log('[onboarding] Submitting profile:', JSON.stringify(profile, null, 2))
    console.log('[onboarding] Age value:', age, 'Type:', typeof age)

    // Use API route to handle RLS properly
    let response: Response
    let data: any
    
    try {
      response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profile),
      })

      // Try to parse JSON, but handle cases where response might not be JSON
      const text = await response.text()
      try {
        data = text ? JSON.parse(text) : {}
      } catch (parseError) {
        console.error('[onboarding] Failed to parse response as JSON:', text)
        data = { error: text || 'Unknown error', rawResponse: text }
      }
    } catch (fetchError: any) {
      console.error('[onboarding] Fetch error:', fetchError)
      setErr(fetchError.message || 'Network error. Please check your connection.')
      setBusy(false)
      return
    }

    if (!response.ok) {
      console.error('[onboarding] Save failed')
      console.error('[onboarding] Response status:', response.status)
      console.error('[onboarding] Response statusText:', response.statusText)
      console.error('[onboarding] Response data:', data)
      console.error('[onboarding] Full error object:', JSON.stringify(data, null, 2))
      console.error('[onboarding] Profile data sent:', JSON.stringify(profile, null, 2))
      
      const errorMessage = data?.error || data?.message || data?.details || `Server error (${response.status})`
      setErr(errorMessage)
      setBusy(false)
      return
    }

    console.log('[onboarding] Profile saved successfully:', data)
    console.log('[onboarding] Saved profile data:', {
      sex: data.profile?.sex,
      goal: data.profile?.goal,
      weight_kg: data.profile?.weight_kg,
      height_cm: data.profile?.height_cm,
      age: data.profile?.age,
    })

    // Store the saved profile data in sessionStorage so profile page can use it immediately
    if (typeof window !== 'undefined') {
      if (data.profile) {
        sessionStorage.setItem('onboardingProfileData', JSON.stringify(data.profile))
        console.log('[onboarding] Stored profile in sessionStorage')
      }
      // Set flag to show welcome page
      sessionStorage.setItem('fromOnboarding', 'true')
      console.log('[onboarding] Set fromOnboarding flag, redirecting to welcome page...')
      
      // Dispatch event to refresh profile data (in case profile page is already open)
      if (data.profile) {
        window.dispatchEvent(new CustomEvent('profile-updated', { detail: data.profile }))
        console.log('[onboarding] Dispatched profile-updated event')
      }
    }

    // Small delay to ensure sessionStorage is set, then redirect
    setTimeout(() => {
      console.log('[onboarding] Redirecting to /welcome')
      router.replace('/welcome')
    }, 100)
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="text-slate-500">Loading…</div>
      </main>
    )
  }

  // In dev mode, allow viewing without user (for testing)
  // In production, redirect if no user
  if (!user && !isDev) {
    return null
  }

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Premium White Card Container */}
        <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg">
          {/* Premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 to-white/85" />
          
          {/* Subtle inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/50" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="pt-8 pb-6 px-6 text-center border-b border-slate-100">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">Welcome to ShiftCoach</h1>
              <p className="text-sm text-slate-500">Let's set up your profile</p>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">Step {step} of {totalSteps}</span>
                <span className="text-xs font-medium text-slate-500">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ 
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #0ea5e9 0%, #6366f1 100%)',
                    boxShadow: '0 2px 8px rgba(14,165,233,0.4), inset 0 1px 0 rgba(255,255,255,0.3)'
                  }}
                >
                  {/* Shine effect */}
                  <div 
                    className="absolute inset-0 opacity-40"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                      animation: 'shimmer 2.5s ease-in-out infinite'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="px-6 pb-6">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Name</label>
                    <input
                      className="w-full border rounded-xl px-4 py-3 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Gender</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['male', 'female', 'other'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSex(option)}
                          className={`py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all ${
                            sex === option
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option === 'male' ? 'Male' : option === 'female' ? 'Female' : 'Other'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Date of Birth <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.dateOfBirth 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => {
                        setDateOfBirth(e.target.value)
                        setFieldErrors(prev => ({ ...prev, dateOfBirth: '' }))
                        // Auto-calculate age if DOB provided
                        if (e.target.value) {
                          const dob = new Date(e.target.value)
                          const today = new Date()
                          let calculatedAge = today.getFullYear() - dob.getFullYear()
                          const monthDiff = today.getMonth() - dob.getMonth()
                          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
                            calculatedAge--
                          }
                          if (calculatedAge >= 13 && calculatedAge <= 120) {
                            setAge(calculatedAge)
                          }
                        }
                      }}
                      max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
                      min={new Date(new Date().setFullYear(new Date().getFullYear() - 120)).toISOString().split('T')[0]}
                    />
                    {fieldErrors.dateOfBirth && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.dateOfBirth}</p>
                    )}
                    {!fieldErrors.dateOfBirth && (
                      <p className="text-xs text-slate-500 mt-1">You must be at least 13 years old</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">
                      Age <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <input
                      className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.age 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      type="number"
                      value={age}
                      onChange={(e) => {
                        const value = e.target.value
                        setFieldErrors(prev => ({ ...prev, age: '' }))
                        if (value === '') {
                          setAge('')
                        } else {
                          const num = parseInt(value, 10)
                          if (!isNaN(num)) {
                            if (num >= 13 && num <= 120) {
                              setAge(num)
                            } else if (num < 13) {
                              setFieldErrors(prev => ({ ...prev, age: 'Age must be at least 13' }))
                            } else {
                              setFieldErrors(prev => ({ ...prev, age: 'Age must be 120 or less' }))
                            }
                          }
                        }
                      }}
                      placeholder="Enter your age"
                      min={13}
                      max={120}
                    />
                    {fieldErrors.age && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.age}</p>
                    )}
                    {!fieldErrors.age && (
                      <p className="text-xs text-slate-500 mt-1">Must be between 13 and 120</p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Measurement Units</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['metric', 'imperial'] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setUnits(unit)}
                          className={`py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all ${
                            units === unit
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {unit === 'metric' ? 'Metric (cm, kg)' : 'Imperial (ft/in)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {units === 'metric' ? (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Height (cm)</label>
                        <input
                          className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                            fieldErrors.height_cm 
                              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                              : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                          }`}
                          type="number"
                          placeholder="175"
                          value={height_cm}
                          onChange={(e) => {
                            setFieldErrors(prev => ({ ...prev, height_cm: '' }))
                            const value = e.target.value
                            if (value === '') {
                              setHeight_cm('')
                              return
                            }
                            const num = parseInt(value, 10)
                            if (isNaN(num)) {
                              setHeight_cm('')
                              return
                            }
                            setHeight_cm(num)
                            if (num < 100 || num > 250) {
                              setFieldErrors(prev => ({ ...prev, height_cm: 'Height must be between 100cm and 250cm' }))
                            }
                          }}
                          min={100}
                          max={250}
                          step={1}
                        />
                        {fieldErrors.height_cm && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.height_cm}</p>
                        )}
                        {!fieldErrors.height_cm && (
                          <p className="text-xs text-slate-500 mt-1">Enter your height in centimeters</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Weight</label>
                        {/* Weight Unit Selector */}
                        <div className="flex gap-2 mb-3">
                          {(['kg', 'lb', 'st+lb'] as const).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => {
                                setWeightUnit(unit)
                                setFieldErrors(prev => ({ ...prev, weight: '' }))
                                if (unit === 'kg') {
                                  setWeightLb('')
                                  setStoneInput('')
                                  setPoundsInput('')
                                } else if (unit === 'lb') {
                                  setStoneInput('')
                                  setPoundsInput('')
                                } else {
                                  setWeightLb('')
                                }
                              }}
                              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-all ${
                                weightUnit === unit
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {unit === 'st+lb' ? 'st+lb' : unit.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        
                        {/* Weight Input Fields */}
                        {weightUnit === 'st+lb' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Stone</label>
                              <input
                                className={`w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                  fieldErrors.weight 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                                }`}
                                type="number"
                                placeholder="10"
                                value={stoneInput}
                                min={0}
                                max={30}
                                onChange={(e) => {
                                  setFieldErrors(prev => ({ ...prev, weight: '' }))
                                  const stone = e.target.value ? parseInt(e.target.value) : ''
                                  setStoneInput(stone)
                                  if (stone !== '' && poundsInput !== '') {
                                    const totalPounds = (Number(stone) * 14) + Number(poundsInput)
                                    const kg = lbToKg(totalPounds)
                                    if (kg >= 30 && kg <= 300) {
                                      setWeight_kg(kg)
                                    } else {
                                      setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                    }
                                  } else if (stone === '' || poundsInput === '') {
                                    setWeight_kg('')
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Pounds</label>
                              <input
                                className={`w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                  fieldErrors.weight 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                                }`}
                                type="number"
                                placeholder="5"
                                value={poundsInput}
                                min={0}
                                max={13}
                                onChange={(e) => {
                                  setFieldErrors(prev => ({ ...prev, weight: '' }))
                                  const pounds = e.target.value ? parseInt(e.target.value) : ''
                                  setPoundsInput(pounds)
                                  if (stoneInput !== '' && pounds !== '') {
                                    const totalPounds = (Number(stoneInput) * 14) + Number(pounds)
                                    const kg = lbToKg(totalPounds)
                                    if (kg >= 30 && kg <= 300) {
                                      setWeight_kg(kg)
                                    } else {
                                      setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                    }
                                  } else if (stoneInput === '' || pounds === '') {
                                    setWeight_kg('')
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ) : weightUnit === 'lb' ? (
                          <>
                            <input
                              className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.weight 
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                              }`}
                              type="number"
                              placeholder="154"
                              value={weightLb}
                              min={66}
                              max={660}
                              step={0.1}
                              onChange={(e) => {
                                setFieldErrors(prev => ({ ...prev, weight: '' }))
                                const lb = e.target.value ? parseFloat(e.target.value) : ''
                                setWeightLb(lb)
                                if (lb !== '') {
                                  const kg = lbToKg(lb)
                                  if (kg >= 30 && kg <= 300) {
                                    setWeight_kg(kg)
                                  } else {
                                    setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 66lbs and 660lbs' }))
                                  }
                                } else {
                                  setWeight_kg('')
                                }
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <input
                              className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.weight 
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                              }`}
                              type="number"
                              placeholder="70"
                              value={weight_kg}
                              min={30}
                              max={300}
                              step={0.1}
                              onChange={(e) => {
                                setFieldErrors(prev => ({ ...prev, weight: '' }))
                                const value = e.target.value
                                if (value === '') {
                                  setWeight_kg('')
                                  return
                                }
                                const kg = parseFloat(value)
                                if (isNaN(kg)) {
                                  setWeight_kg('')
                                  return
                                }
                                setWeight_kg(kg)
                                if (kg < 30 || kg > 300) {
                                  setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                }
                              }}
                            />
                          </>
                        )}
                        {fieldErrors.weight && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.weight}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Height</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Feet</label>
                            <input
                              className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.height 
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                              }`}
                              type="number"
                              placeholder="5"
                              value={heightFt}
                              min={3}
                              max={8}
                              onChange={(e) => {
                                setFieldErrors(prev => ({ ...prev, height: '' }))
                                const ft = e.target.value ? parseInt(e.target.value) : ''
                                setHeightFt(ft)
                                if (ft !== '' && heightIn !== '') {
                                  const totalInches = Number(ft) * 12 + Number(heightIn)
                                  if (totalInches >= 39 && totalInches <= 98) {
                                    setHeight_cm(feetInchesToCm(Number(ft), Number(heightIn)))
                                  } else {
                                    setFieldErrors(prev => ({ ...prev, height: 'Height must be between 3ft 3in and 8ft 2in' }))
                                  }
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 mb-1">Inches</label>
                            <input
                              className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.height 
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                              }`}
                              type="number"
                              placeholder="10"
                              value={heightIn}
                              min={0}
                              max={11}
                              onChange={(e) => {
                                setFieldErrors(prev => ({ ...prev, height: '' }))
                                const inches = e.target.value ? parseInt(e.target.value) : ''
                                setHeightIn(inches)
                                if (heightFt !== '' && inches !== '') {
                                  const totalInches = Number(heightFt) * 12 + Number(inches)
                                  if (totalInches >= 39 && totalInches <= 98) {
                                    setHeight_cm(feetInchesToCm(Number(heightFt), Number(inches)))
                                  } else {
                                    setFieldErrors(prev => ({ ...prev, height: 'Height must be between 3ft 3in and 8ft 2in' }))
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                        {fieldErrors.height && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.height}</p>
                        )}
                        {!fieldErrors.height && (
                          <p className="text-xs text-slate-500 mt-1">Enter your height in feet and inches</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-2">Weight</label>
                        {/* Weight Unit Selector */}
                        <div className="flex gap-2 mb-3">
                          {(['kg', 'lb', 'st+lb'] as const).map((unit) => (
                            <button
                              key={unit}
                              type="button"
                              onClick={() => {
                                setWeightUnit(unit)
                                setFieldErrors(prev => ({ ...prev, weight: '' }))
                                if (unit === 'kg') {
                                  setWeightLb('')
                                  setStoneInput('')
                                  setPoundsInput('')
                                } else if (unit === 'lb') {
                                  setStoneInput('')
                                  setPoundsInput('')
                                } else {
                                  setWeightLb('')
                                }
                              }}
                              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg border-2 transition-all ${
                                weightUnit === unit
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              {unit === 'st+lb' ? 'st+lb' : unit.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        
                        {/* Weight Input Fields */}
                        {weightUnit === 'st+lb' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Stone</label>
                              <input
                                className={`w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                  fieldErrors.weight 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                                }`}
                                type="number"
                                placeholder="10"
                                value={stoneInput}
                                min={0}
                                max={30}
                                onChange={(e) => {
                                  setFieldErrors(prev => ({ ...prev, weight: '' }))
                                  const stone = e.target.value ? parseInt(e.target.value) : ''
                                  setStoneInput(stone)
                                  if (stone !== '' && poundsInput !== '') {
                                    const totalPounds = (Number(stone) * 14) + Number(poundsInput)
                                    const kg = lbToKg(totalPounds)
                                    if (kg >= 30 && kg <= 300) {
                                      setWeight_kg(kg)
                                    } else {
                                      setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                    }
                                  } else if (stone === '' || poundsInput === '') {
                                    setWeight_kg('')
                                  }
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-600 mb-1">Pounds</label>
                              <input
                                className={`w-full border rounded-xl px-3 py-2.5 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                  fieldErrors.weight 
                                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                    : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                                }`}
                                type="number"
                                placeholder="5"
                                value={poundsInput}
                                min={0}
                                max={13}
                                onChange={(e) => {
                                  setFieldErrors(prev => ({ ...prev, weight: '' }))
                                  const pounds = e.target.value ? parseInt(e.target.value) : ''
                                  setPoundsInput(pounds)
                                  if (stoneInput !== '' && pounds !== '') {
                                    const totalPounds = (Number(stoneInput) * 14) + Number(pounds)
                                    const kg = lbToKg(totalPounds)
                                    if (kg >= 30 && kg <= 300) {
                                      setWeight_kg(kg)
                                    } else {
                                      setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                    }
                                  } else if (stoneInput === '' || pounds === '') {
                                    setWeight_kg('')
                                  }
                                }}
                              />
                            </div>
                          </div>
                        ) : weightUnit === 'lb' ? (
                          <>
                            <input
                              className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.weight 
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                              }`}
                              type="number"
                              placeholder="154"
                              value={weightLb}
                              min={66}
                              max={660}
                              step={0.1}
                              onChange={(e) => {
                                setFieldErrors(prev => ({ ...prev, weight: '' }))
                                const lb = e.target.value ? parseFloat(e.target.value) : ''
                                setWeightLb(lb)
                                if (lb !== '') {
                                  const kg = lbToKg(lb)
                                  if (kg >= 30 && kg <= 300) {
                                    setWeight_kg(kg)
                                  } else {
                                    setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 66lbs and 660lbs' }))
                                  }
                                } else {
                                  setWeight_kg('')
                                }
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <input
                              className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                fieldErrors.weight 
                                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                                  : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                              }`}
                              type="number"
                              placeholder="70"
                              value={weight_kg}
                              min={30}
                              max={300}
                              step={0.1}
                              onChange={(e) => {
                                setFieldErrors(prev => ({ ...prev, weight: '' }))
                                const value = e.target.value
                                if (value === '') {
                                  setWeight_kg('')
                                } else {
                                  const kg = parseFloat(value)
                                  if (!isNaN(kg)) {
                                    if (kg >= 30 && kg <= 300) {
                                      setWeight_kg(kg)
                                    } else {
                                      setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                    }
                                  }
                                }
                              }}
                            />
                          </>
                        )}
                        {fieldErrors.weight && (
                          <p className="text-xs text-red-600 mt-1">{fieldErrors.weight}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Goal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['lose', 'maintain', 'gain'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setGoal(option)}
                          className={`py-3 px-4 rounded-xl border-2 font-medium text-sm transition-all ${
                            goal === option
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {option === 'lose' ? 'Lose' : option === 'maintain' ? 'Maintain' : 'Gain'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Sleep Goal (hours)</label>
                    <input
                      className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.sleep_goal_h 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      type="number"
                      step="0.5"
                      min="4"
                      max="12"
                      value={sleep_goal_h}
                      onChange={(e) => {
                        setFieldErrors(prev => ({ ...prev, sleep_goal_h: '' }))
                        const value = parseFloat(e.target.value)
                        if (!isNaN(value)) {
                          if (value >= 4 && value <= 12) {
                            setSleep_goal_h(value)
                          } else {
                            setFieldErrors(prev => ({ ...prev, sleep_goal_h: 'Sleep goal must be between 4 and 12 hours' }))
                          }
                        }
                      }}
                    />
                    {fieldErrors.sleep_goal_h && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.sleep_goal_h}</p>
                    )}
                    {!fieldErrors.sleep_goal_h && (
                      <p className="text-xs text-slate-500 mt-1">Recommended: 7-9 hours for adults</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Water Goal (L)</label>
                    <input
                      className={`w-full border rounded-xl px-4 py-3 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.water_goal_ml 
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                          : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                      }`}
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={(water_goal_ml / 1000).toFixed(1)}
                      onChange={(e) => {
                        setFieldErrors(prev => ({ ...prev, water_goal_ml: '' }))
                        const value = e.target.value
                        if (value === '') {
                          setWater_goal_ml(0)
                          return
                        }
                        const litres = parseFloat(value)
                        if (!isNaN(litres)) {
                          const ml = litres * 1000
                          if (ml >= 1000 && ml <= 5000) {
                            setWater_goal_ml(ml)
                          } else {
                            setWater_goal_ml(ml)
                            setFieldErrors(prev => ({ ...prev, water_goal_ml: 'Water goal must be between 1.0L and 5.0L' }))
                          }
                        }
                      }}
                    />
                    {fieldErrors.water_goal_ml && (
                      <p className="text-xs text-red-600 mt-1">{fieldErrors.water_goal_ml}</p>
                    )}
                    {!fieldErrors.water_goal_ml && (
                      <p className="text-xs text-slate-500 mt-1">Recommended: 2.0–3.0L per day based on scientific guidelines</p>
                    )}
                  </div>
                  {err && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                      <p className="text-sm text-red-700">{err}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 mt-6 pt-6 border-t border-slate-100">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}
                {step < totalSteps ? (
                  <button
                    onClick={handleNextStep}
                    className="group relative flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden ml-auto"
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                      boxShadow: `
                        0 4px 16px rgba(14,165,233,0.3),
                        0 2px 6px rgba(99,102,241,0.2),
                        inset 0 1px 0 rgba(255,255,255,0.25),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = `
                        0 8px 24px rgba(14,165,233,0.4),
                        0 4px 12px rgba(99,102,241,0.3),
                        inset 0 1px 0 rgba(255,255,255,0.35),
                        inset 0 -1px 0 rgba(0,0,0,0.1),
                        0 0 0 1px rgba(255,255,255,0.1)
                      `
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `
                        0 4px 16px rgba(14,165,233,0.3),
                        0 2px 6px rgba(99,102,241,0.2),
                        inset 0 1px 0 rgba(255,255,255,0.25),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `
                    }}
                  >
                    {/* Premium shine effect */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 60%)',
                      }}
                    />
                    <span className="relative z-10">Continue</span>
                    <ChevronRight className="w-4 h-4 relative z-10" />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={busy}
                    className="group relative flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-white transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ml-auto"
                    style={{
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
                      boxShadow: `
                        0 4px 16px rgba(14,165,233,0.3),
                        0 2px 6px rgba(99,102,241,0.2),
                        inset 0 1px 0 rgba(255,255,255,0.25),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `,
                    }}
                    onMouseEnter={(e) => {
                      if (!busy) {
                        e.currentTarget.style.boxShadow = `
                          0 8px 24px rgba(14,165,233,0.4),
                          0 4px 12px rgba(99,102,241,0.3),
                          inset 0 1px 0 rgba(255,255,255,0.35),
                          inset 0 -1px 0 rgba(0,0,0,0.1),
                          0 0 0 1px rgba(255,255,255,0.1)
                        `
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = `
                        0 4px 16px rgba(14,165,233,0.3),
                        0 2px 6px rgba(99,102,241,0.2),
                        inset 0 1px 0 rgba(255,255,255,0.25),
                        inset 0 -1px 0 rgba(0,0,0,0.1)
                      `
                    }}
                  >
                    {/* Premium shine effect */}
                    <div 
                      className="absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), transparent 60%)',
                      }}
                    />
                    <span className="relative z-10">{busy ? 'Saving…' : 'Complete Setup'}</span>
                    {!busy && <ChevronRight className="w-4 h-4 relative z-10" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
