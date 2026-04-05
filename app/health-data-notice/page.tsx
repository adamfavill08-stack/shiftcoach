import type { Metadata } from 'next'
import { LegalDocumentChrome } from '@/components/legal/LegalDocumentChrome'

export const metadata: Metadata = {
  title: 'Health Data Notice - Shift Coach',
  description: 'Shift Coach Health Data Notice',
}

export default function HealthDataNoticePage() {
  return (
    <LegalDocumentChrome variant="health">
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Health Information We Collect
              </h2>
              <p>
                Shift Coach collects health-related information to provide personalized wellness
                recommendations. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Body measurements (height, weight, age)</li>
                <li>Sleep patterns and duration</li>
                <li>Activity levels and step counts</li>
                <li>Mood and focus ratings</li>
                <li>Shift schedules and work patterns</li>
                <li>Nutrition goals and preferences</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                How We Use Health Data
              </h2>
              <p>We use your health data to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Calculate personalized calorie and macro targets</li>
                <li>Provide shift-aware meal timing recommendations</li>
                <li>Track sleep quality and recovery</li>
                <li>Generate insights about your health patterns</li>
                <li>Improve our coaching algorithms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Data Security
              </h2>
              <p>
                Your health data is encrypted in transit and at rest. We use industry-standard security
                measures to protect your information. However, no system is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Third-Party Health Services
              </h2>
              <p>With your explicit permission, we integrate with the following health services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Google Fit:</strong> We access your step count and activity data to provide
                  personalized recommendations. You can disconnect Google Fit at any time in settings.
                </li>
                <li>
                  <strong>Apple Health:</strong> On iOS devices, we may access health data you authorize,
                  including steps and sleep data.
                </li>
              </ul>
              <p className="mt-4">
                These services have their own privacy policies. We only access data you explicitly
                authorize and use it solely to provide our services. You can revoke access at any time
                through your device settings or our app settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Your Rights
              </h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your health data at any time</li>
                <li>Export your health data (available in Settings)</li>
                <li>Delete your health data by deleting your account</li>
                <li>Correct inaccurate health information</li>
                <li>Opt out of data sharing with third parties</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Medical Disclaimer
              </h2>
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg">
                <p className="text-red-900 dark:text-red-200 font-semibold mb-2">
                  This app is not a medical device and does not provide medical advice.
                </p>
                <p className="text-red-800 dark:text-red-300 text-sm">
                  Always consult with a qualified healthcare provider before making health decisions,
                  especially if you have medical conditions, are pregnant, or are taking medications.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Data Sharing
              </h2>
              <p>
                We do not sell your health data. We may share aggregated, anonymized health data for
                research and service improvement purposes, but this data cannot be used to identify you.
              </p>
              <p className="mt-2">
                Your health data is stored securely on Supabase servers and is encrypted in transit and
                at rest. We use industry-standard security measures to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Contact Us
              </h2>
              <p>
                For questions about how we handle your health data, contact us at:
                <br />
                <a href="mailto:shift-coach@outlook.com" className="text-blue-600 hover:underline">
                  shift-coach@outlook.com
                </a>
              </p>
            </section>
      </div>
    </LegalDocumentChrome>
  )
}
