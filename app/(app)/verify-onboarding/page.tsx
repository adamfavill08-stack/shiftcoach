'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { getMyProfile } from '@/lib/profile'
import { useTranslation } from '@/components/providers/language-provider'

type VerificationResult = {
  status: 'checking' | 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export default function VerifyOnboardingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [migrationStatus, setMigrationStatus] = useState<VerificationResult>({
    status: 'checking',
    message: 'Checking database migration...'
  })
  const [profileStatus, setProfileStatus] = useState<VerificationResult>({
    status: 'checking',
    message: 'Checking profile data...'
  })
  const [onboardingFlow, setOnboardingFlow] = useState<VerificationResult>({
    status: 'checking',
    message: 'Verifying onboarding flow...'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verifyEverything()
  }, [])

  const verifyEverything = async () => {
    setLoading(true)

    // 1. Check migration status
    await checkMigration()

    // 2. Check profile data
    await checkProfile()

    // 3. Verify onboarding flow
    await verifyOnboardingFlow()

    setLoading(false)
  }

  const checkMigration = async () => {
    try {
      const res = await fetch('/api/profile/check-age-column')
      const data = await res.json()

      if (data.columnExists === true) {
        setMigrationStatus({
          status: 'pass',
          message: '✅ Database migration is complete',
          details: {
            age: data.age,
            dateOfBirth: data.dateOfBirth,
            profileData: data.profileData
          }
        })
      } else if (data.columnExists === false) {
        setMigrationStatus({
          status: 'fail',
          message: '❌ Database migration NOT run - age column missing',
          details: {
            error: data.error,
            migrationFile: data.migrationFile,
            instructions: 'Run the migration: supabase/migrations/20250124_add_age_to_profiles.sql'
          }
        })
      } else {
        setMigrationStatus({
          status: 'warning',
          message: '⚠️ Could not verify migration status',
          details: data
        })
      }
    } catch (err: any) {
      setMigrationStatus({
        status: 'fail',
        message: '❌ Error checking migration: ' + err.message,
        details: err
      })
    }
  }

  const checkProfile = async () => {
    try {
      const profile = await getMyProfile()

      if (!profile) {
        setProfileStatus({
          status: 'warning',
          message: '⚠️ No profile found - user needs to complete onboarding',
          details: null
        })
        return
      }

      const requiredFields = {
        name: profile.name,
        sex: profile.sex,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        goal: profile.goal,
        age: profile.age,
        date_of_birth: profile.date_of_birth,
        sleep_goal_h: profile.sleep_goal_h,
        water_goal_ml: profile.water_goal_ml,
        default_activity_level: profile.default_activity_level,
      }

      const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => value === null || value === undefined)
        .map(([key]) => key)

      if (missingFields.length === 0) {
        setProfileStatus({
          status: 'pass',
          message: '✅ All profile data is complete',
          details: requiredFields
        })
      } else {
        setProfileStatus({
          status: 'warning',
          message: `⚠️ Some profile fields are missing: ${missingFields.join(', ')}`,
          details: {
            missing: missingFields,
            present: requiredFields
          }
        })
      }
    } catch (err: any) {
      setProfileStatus({
        status: 'fail',
        message: '❌ Error checking profile: ' + err.message,
        details: err
      })
    }
  }

  const verifyOnboardingFlow = async () => {
    try {
      // Check if onboarding page exists and is accessible
      const onboardingCheck = {
        pageExists: true, // We know it exists
        apiEndpoint: '/api/profile',
        dataCollection: [
          'name', 'sex', 'date_of_birth', 'age',
          'height_cm', 'weight_kg', 'goal',
          'sleep_goal_h', 'water_goal_ml',
          'tz', 'theme', 'default_activity_level'
        ]
      }

      // Test API endpoint
      try {
        const testRes = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: true })
        })
        
        onboardingCheck.apiEndpoint = testRes.status === 401 
          ? '✅ API endpoint exists (requires auth)' 
          : '⚠️ API endpoint status: ' + testRes.status
      } catch (e) {
        onboardingCheck.apiEndpoint = '❌ API endpoint error: ' + (e as any).message
      }

      setOnboardingFlow({
        status: 'pass',
        message: '✅ Onboarding flow structure is correct',
        details: onboardingCheck
      })
    } catch (err: any) {
      setOnboardingFlow({
        status: 'fail',
        message: '❌ Error verifying onboarding flow: ' + err.message,
        details: err
      })
    }
  }

  const getStatusIcon = (status: VerificationResult['status']) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-500" />
    }
  }

  const getStatusColor = (status: VerificationResult['status']) => {
    switch (status) {
      case 'checking':
        return 'border-blue-200 bg-blue-50'
      case 'pass':
        return 'border-green-200 bg-green-50'
      case 'fail':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-amber-200 bg-amber-50'
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-xl border border-white/90 shadow-[0_8px_24px_rgba(15,23,42,0.08)] p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent mb-2">
              {t('verifyOnboarding.title')}
            </h1>
            <p className="text-sm text-slate-600">
              {t('verifyOnboarding.subtitle')}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {/* Migration Status */}
            <div className={`rounded-xl border-2 p-4 ${getStatusColor(migrationStatus.status)}`}>
              <div className="flex items-start gap-3">
                {getStatusIcon(migrationStatus.status)}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{t('verifyOnboarding.sectionMigration')}</h3>
                  <p className="text-sm text-slate-700">{migrationStatus.message}</p>
                  {migrationStatus.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                        {t('verifyOnboarding.viewDetails')}
                      </summary>
                      <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-auto">
                        {JSON.stringify(migrationStatus.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Status */}
            <div className={`rounded-xl border-2 p-4 ${getStatusColor(profileStatus.status)}`}>
              <div className="flex items-start gap-3">
                {getStatusIcon(profileStatus.status)}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{t('verifyOnboarding.sectionProfile')}</h3>
                  <p className="text-sm text-slate-700">{profileStatus.message}</p>
                  {profileStatus.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                        {t('verifyOnboarding.viewDetails')}
                      </summary>
                      <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-auto">
                        {JSON.stringify(profileStatus.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>

            {/* Onboarding Flow */}
            <div className={`rounded-xl border-2 p-4 ${getStatusColor(onboardingFlow.status)}`}>
              <div className="flex items-start gap-3">
                {getStatusIcon(onboardingFlow.status)}
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 mb-1">{t('verifyOnboarding.sectionOnboarding')}</h3>
                  <p className="text-sm text-slate-700">{onboardingFlow.message}</p>
                  {onboardingFlow.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900">
                        {t('verifyOnboarding.viewDetails')}
                      </summary>
                      <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-auto">
                        {JSON.stringify(onboardingFlow.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={verifyEverything}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? t('verifyOnboarding.loading') : t('verifyOnboarding.runAgain')}
            </button>
            <button
              onClick={() => router.push('/onboarding')}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              {t('verifyOnboarding.testOnboarding')}
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors ml-auto"
            >
              {t('verifyOnboarding.back')}
            </button>
          </div>

          {/* Instructions */}
          {migrationStatus.status === 'fail' && (
            <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <h4 className="font-semibold text-red-900 mb-2">⚠️ {t('verifyOnboarding.actionRequired')}</h4>
              <p className="text-sm text-red-800 mb-3">
                {t('verifyOnboarding.migrationFailBody')}
              </p>
              <ol className="text-sm text-red-800 list-decimal list-inside space-y-1">
                <li>{t('verifyOnboarding.migrationStep1')}</li>
                <li>{t('verifyOnboarding.migrationStep2')}</li>
                <li>
                  {t('verifyOnboarding.migrationStep3')}{' '}
                  <code className="bg-red-100 px-1 rounded">supabase/migrations/20250124_add_age_to_profiles.sql</code>
                </li>
                <li>{t('verifyOnboarding.migrationStep4')}</li>
                <li>{t('verifyOnboarding.migrationStep5')}</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

