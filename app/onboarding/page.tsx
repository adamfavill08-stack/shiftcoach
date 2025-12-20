'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  // Local state for kg input to allow free typing
  const [kgInputValue, setKgInputValue] = useState<string>('')
  
  // Sync kgInputValue with weight_kg only when switching TO kg unit
  const prevWeightUnitRef = useRef(weightUnit)
  useEffect(() => {
    if (weightUnit === 'kg' && prevWeightUnitRef.current !== 'kg') {
      // User just switched to kg, initialize the input value
      if (weight_kg !== '' && weight_kg !== null) {
        setKgInputValue(String(weight_kg))
      } else {
        setKgInputValue('')
      }
    }
    prevWeightUnitRef.current = weightUnit
  }, [weightUnit, weight_kg])

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
      // Extract error message from response
      let errorMessage = `Failed to save profile (${response.status})`
      
      if (data) {
        if (data.error) {
          errorMessage = data.error
        } else if (data.message) {
          errorMessage = data.message
        } else if (data.details) {
          errorMessage = typeof data.details === 'string' ? data.details : JSON.stringify(data.details)
        } else if (data.hint) {
          errorMessage = data.hint
        }
      }
      
      // Log for debugging (but don't let it break the UI)
      try {
        console.error('[onboarding] Save failed')
        console.error('[onboarding] Response status:', response.status)
        console.error('[onboarding] Response data:', data)
      } catch (e) {
        // Ignore console errors
      }
      
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
      <main className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="text-slate-500 dark:text-slate-400">Loading…</div>
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Premium Glass-on-Paper Card Container */}
        <div className="relative overflow-hidden rounded-3xl bg-white/75 dark:bg-slate-900/45 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/40 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_14px_40px_-18px_rgba(0,0,0,0.14)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)]">
          {/* Highlight overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
          
          {/* Inner glow */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-white/40 dark:bg-slate-800/20 opacity-30" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="pt-8 pb-6 px-6 text-center border-b border-slate-200/50 dark:border-slate-700/40">
              <h1 className="text-[22px] font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-1.5">Welcome to ShiftCoach</h1>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">Let's set up your profile</p>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pt-6 pb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">Step {step} of {totalSteps}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200/60 dark:bg-slate-800/50 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out bg-slate-900 dark:bg-slate-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Form Content */}
            <div className="px-6 pb-6">
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name</label>
                    <input
                      className="w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border border-slate-200/60 dark:border-slate-700/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60 transition-all text-sm"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2.5">Gender</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['male', 'female', 'other'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSex(option)}
                          className={`py-3 px-4 rounded-2xl border font-medium text-sm transition-all ${
                            sex === option
                              ? 'border-slate-300/50 dark:border-slate-600/50 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100'
                              : 'border-slate-200/40 dark:border-slate-700/40 bg-slate-50/40 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-200/60 dark:hover:border-slate-600/60 hover:bg-white/70 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          {option === 'male' ? 'Male' : option === 'female' ? 'Female' : 'Other'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Date of Birth <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
                    </label>
                    <input
                      className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm ${
                        fieldErrors.dateOfBirth 
                          ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                          : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.dateOfBirth}</p>
                    )}
                    {!fieldErrors.dateOfBirth && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">You must be at least 13 years old</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Age <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
                    </label>
                    <input
                      className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                        fieldErrors.age 
                          ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                          : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.age}</p>
                    )}
                    {!fieldErrors.age && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Must be between 13 and 120</p>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2.5">Measurement Units</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['metric', 'imperial'] as const).map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => setUnits(unit)}
                          className={`py-3 px-4 rounded-2xl border font-medium text-sm transition-all ${
                            units === unit
                              ? 'border-slate-300/50 dark:border-slate-600/50 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100'
                              : 'border-slate-200/40 dark:border-slate-700/40 bg-slate-50/40 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-200/60 dark:hover:border-slate-600/60 hover:bg-white/70 dark:hover:bg-slate-800/50'
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
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Height (cm)</label>
                        <input
                          className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                            fieldErrors.height_cm 
                              ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                              : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.height_cm}</p>
                        )}
                        {!fieldErrors.height_cm && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Enter your height in centimeters</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Weight</label>
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
                                  setKgInputValue(weight_kg === '' ? '' : String(weight_kg))
                                } else if (unit === 'lb') {
                                  setStoneInput('')
                                  setPoundsInput('')
                                } else {
                                  setWeightLb('')
                                }
                              }}
                              className={`flex-1 py-2 px-3 text-sm font-medium rounded-2xl border transition-all ${
                                weightUnit === unit
                                  ? 'border-slate-300/50 dark:border-slate-600/50 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100'
                                  : 'border-slate-200/40 dark:border-slate-700/40 bg-slate-50/40 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-200/60 dark:hover:border-slate-600/60 hover:bg-white/70 dark:hover:bg-slate-800/50'
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
                              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Stone</label>
                              <input
                                className={`w-full rounded-2xl px-3 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                  fieldErrors.weight 
                                    ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                    : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Pounds</label>
                              <input
                                className={`w-full rounded-2xl px-3 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                  fieldErrors.weight 
                                    ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                    : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                              className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                fieldErrors.weight 
                                  ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                  : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                              key={`kg-input-${weightUnit}`}
                              className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                fieldErrors.weight 
                                  ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                  : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
                              }`}
                              type="number"
                              placeholder="70"
                              value={kgInputValue}
                              min={30}
                              max={300}
                              step={0.1}
                              autoComplete="off"
                              onChange={(e) => {
                                const value = e.target.value
                                // Always update the input value immediately
                                setKgInputValue(value)
                                setFieldErrors(prev => ({ ...prev, weight: '' }))
                                
                                if (value === '' || value === '.') {
                                  setWeight_kg('')
                                  return
                                }
                                
                                // Parse and update weight_kg for validation
                                const kg = parseFloat(value)
                                if (!isNaN(kg) && isFinite(kg)) {
                                  setWeight_kg(kg)
                                  if (kg < 30 || kg > 300) {
                                    setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                // Validate on blur
                                const value = e.target.value
                                const kg = parseFloat(value)
                                if (!isNaN(kg) && (kg < 30 || kg > 300)) {
                                  setFieldErrors(prev => ({ ...prev, weight: 'Weight must be between 30kg and 300kg' }))
                                }
                              }}
                            />
                          </>
                        )}
                        {fieldErrors.weight && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.weight}</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Height</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Feet</label>
                            <input
                              className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                fieldErrors.height 
                                  ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                  : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Inches</label>
                            <input
                              className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                fieldErrors.height 
                                  ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                  : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.height}</p>
                        )}
                        {!fieldErrors.height && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Enter your height in feet and inches</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">Weight</label>
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
                                  setKgInputValue(weight_kg === '' ? '' : String(weight_kg))
                                } else if (unit === 'lb') {
                                  setStoneInput('')
                                  setPoundsInput('')
                                } else {
                                  setWeightLb('')
                                }
                              }}
                              className={`flex-1 py-2 px-3 text-sm font-medium rounded-2xl border transition-all ${
                                weightUnit === unit
                                  ? 'border-slate-300/50 dark:border-slate-600/50 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100'
                                  : 'border-slate-200/40 dark:border-slate-700/40 bg-slate-50/40 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-200/60 dark:hover:border-slate-600/60 hover:bg-white/70 dark:hover:bg-slate-800/50'
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
                              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Stone</label>
                              <input
                                className={`w-full rounded-2xl px-3 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                  fieldErrors.weight 
                                    ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                    : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Pounds</label>
                              <input
                                className={`w-full rounded-2xl px-3 py-2.5 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                  fieldErrors.weight 
                                    ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                    : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                              className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                fieldErrors.weight 
                                  ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                  : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                              className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                                fieldErrors.weight 
                                  ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                                  : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.weight}</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2.5">Goal</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['lose', 'maintain', 'gain'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setGoal(option)}
                          className={`py-3 px-4 rounded-2xl border font-medium text-sm transition-all ${
                            goal === option
                              ? 'border-slate-300/50 dark:border-slate-600/50 bg-slate-100/60 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100'
                              : 'border-slate-200/40 dark:border-slate-700/40 bg-slate-50/40 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300 hover:border-slate-200/60 dark:hover:border-slate-600/60 hover:bg-white/70 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          {option === 'lose' ? 'Lose' : option === 'maintain' ? 'Maintain' : 'Gain'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sleep Goal (hours)</label>
                    <input
                      className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                        fieldErrors.sleep_goal_h 
                          ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                          : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.sleep_goal_h}</p>
                    )}
                    {!fieldErrors.sleep_goal_h && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Recommended: 7-9 hours for adults</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Water Goal (L)</label>
                    <input
                      className={`w-full rounded-2xl px-4 py-3 bg-white/70 dark:bg-slate-800/50 backdrop-blur border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all text-sm tabular-nums ${
                        fieldErrors.water_goal_ml 
                          ? 'border-red-300/60 dark:border-red-700/40 focus:ring-red-400/50 dark:focus:ring-red-500/50 focus:border-red-300/60 dark:focus:border-red-700/40' 
                          : 'border-slate-200/60 dark:border-slate-700/40 focus:ring-slate-400/50 dark:focus:ring-slate-500/50 focus:border-slate-300/60 dark:focus:border-slate-600/60'
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
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1.5">{fieldErrors.water_goal_ml}</p>
                    )}
                    {!fieldErrors.water_goal_ml && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Recommended: 2.0–3.0L per day based on scientific guidelines</p>
                    )}
                  </div>
                  {err && (
                    <div className="p-4 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/40">
                      <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">{err}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-3 mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/40">
                {step > 1 ? (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-slate-800/50 backdrop-blur text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-white/90 dark:hover:bg-slate-800/70 transition-all"
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
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-[0_10px_26px_-14px_rgba(0,0,0,0.35)] dark:shadow-[0_10px_26px_-14px_rgba(255,255,255,0.1)] hover:opacity-95 transition-all ml-auto"
                  >
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={busy}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold shadow-[0_10px_26px_-14px_rgba(0,0,0,0.35)] dark:shadow-[0_10px_26px_-14px_rgba(255,255,255,0.1)] hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                  >
                    {busy ? 'Saving…' : 'Complete Setup'}
                    {!busy && <ChevronRight className="w-4 h-4" />}
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
