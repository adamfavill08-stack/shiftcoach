'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, mlToFloz, flozToMl } from '@/lib/units'

export default function OnboardingPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | undefined>()

  // Form state
  const [name, setName] = useState('')
  const [sex, setSex] = useState<'male' | 'female' | 'other'>('other')
  const [height_cm, setHeight_cm] = useState<number | ''>('')
  const [weight_kg, setWeight_kg] = useState<number | ''>('')
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain')
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric')
  const [sleep_goal_h, setSleep_goal_h] = useState<number>(7.5)
  const [water_goal_ml, setWater_goal_ml] = useState<number>(2500)

  // Imperial UI state
  const [heightFt, setHeightFt] = useState<number | ''>('')
  const [heightIn, setHeightIn] = useState<number | ''>('')
  const [weightLb, setWeightLb] = useState<number | ''>('')
  const [waterOz, setWaterOz] = useState<number | ''>('')

  const submit = async () => {
    if (!user) return

    setBusy(true)
    setErr(undefined)

    const profile = {
      user_id: user.id,
      name: name || undefined,
      sex,
      height_cm: height_cm || null,
      weight_kg: weight_kg || null,
      goal,
      units,
      sleep_goal_h,
      water_goal_ml,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      theme: 'system',
    }

    const { error } = await supabase.from('profiles').upsert(profile)

    if (error) {
      setErr(error.message)
      setBusy(false)
      return
    }

    router.replace('/dashboard')
  }

  if (!user) {
    return <div className="p-6">Loading…</div>
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome to Shift Coach</h1>
      <p className="text-slate-600 dark:text-slate-400 text-sm">Let's set up your profile</p>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sex</label>
            <select
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              value={sex}
              onChange={(e) => setSex(e.target.value as 'male' | 'female' | 'other')}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full rounded-xl py-2 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Units</label>
            <select
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              value={units}
              onChange={(e) => setUnits(e.target.value as 'metric' | 'imperial')}
            >
              <option value="metric">Metric (cm, kg)</option>
              <option value="imperial">Imperial (ft/in, lbs)</option>
            </select>
          </div>
          {units === 'metric' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Height (cm)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  type="number"
                  placeholder="175"
                  value={height_cm}
                  onChange={(e) => setHeight_cm(e.target.value ? parseInt(e.target.value) : '')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (kg)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  type="number"
                  placeholder="70"
                  value={weight_kg}
                  onChange={(e) => setWeight_kg(e.target.value ? parseFloat(e.target.value) : '')}
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Height (ft)</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    type="number"
                    placeholder="5"
                    value={heightFt}
                    onChange={(e) => {
                      const ft = e.target.value ? parseInt(e.target.value) : ''
                      setHeightFt(ft)
                      if (ft !== '' && heightIn !== '') setHeight_cm(feetInchesToCm(Number(ft), Number(heightIn)))
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Height (in)</label>
                  <input
                    className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    type="number"
                    placeholder="10"
                    value={heightIn}
                    onChange={(e) => {
                      const inches = e.target.value ? parseInt(e.target.value) : ''
                      setHeightIn(inches)
                      if (heightFt !== '' && inches !== '') setHeight_cm(feetInchesToCm(Number(heightFt), Number(inches)))
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weight (lb)</label>
                <input
                  className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                  type="number"
                  placeholder="154"
                  value={weightLb}
                  onChange={(e) => {
                    const lb = e.target.value ? parseFloat(e.target.value) : ''
                    setWeightLb(lb)
                    if (lb !== '') setWeight_kg(lbToKg(lb))
                  }}
                />
              </div>
            </>
          )}
          <button
            onClick={() => setStep(3)}
            className="w-full rounded-xl py-2 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600"
          >
            Continue
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Goal</label>
            <select
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              value={goal}
              onChange={(e) => setGoal(e.target.value as 'lose' | 'maintain' | 'gain')}
            >
              <option value="lose">Lose weight</option>
              <option value="maintain">Maintain weight</option>
              <option value="gain">Gain weight</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sleep goal (hours)</label>
            <input
              className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              type="number"
              step="0.5"
              min="4"
              max="12"
              value={sleep_goal_h}
              onChange={(e) => setSleep_goal_h(parseFloat(e.target.value))}
            />
          </div>
          {units === 'metric' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Water goal (ml)</label>
              <input
                className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                type="number"
                step="100"
                min="1000"
                max="5000"
                value={water_goal_ml}
                onChange={(e) => setWater_goal_ml(parseInt(e.target.value))}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Water goal (fl oz)</label>
              <input
                className="w-full border rounded-xl px-3 py-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                type="number"
                step="1"
                min="34"
                max="169"
                value={waterOz || mlToFloz(water_goal_ml)}
                onChange={(e) => {
                  const oz = e.target.value ? parseFloat(e.target.value) : ''
                  setWaterOz(oz)
                  if (oz !== '') setWater_goal_ml(flozToMl(oz))
                }}
              />
            </div>
          )}
          {err && <p className="text-red-600 dark:text-red-400 text-sm">{err}</p>}
          <button
            onClick={submit}
            disabled={busy}
            className="w-full rounded-xl py-2 font-semibold text-white bg-gradient-to-r from-orange-500 to-purple-600 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Complete Setup'}
          </button>
        </div>
      )}
    </main>
  )
}

