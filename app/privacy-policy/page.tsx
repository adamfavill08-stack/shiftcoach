import type { Metadata } from 'next'
import { LegalDocumentChrome } from '@/components/legal/LegalDocumentChrome'

export const metadata: Metadata = {
  title: 'Privacy Policy - Shift Coach',
  description: 'Shift Coach Privacy Policy',
}

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentChrome variant="privacy">
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">1. Introduction</h2>
              <p>
                Shift Coach ("we", "our", or "us") is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, disclose, and safeguard your information
                when you use our mobile application and services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">2. Information We Collect</h2>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account information (email address, password)</li>
                <li>Profile information (name, age, height, weight, goals, activity level)</li>
                <li>Shift schedule and work patterns</li>
                <li>Sleep logs and patterns</li>
                <li>Step, sleep, and heart-rate data from Health Connect on Android or Apple Health on iOS, when you connect those services</li>
                <li>Mood and focus ratings</li>
                <li>Nutrition preferences and goals</li>
                <li>Subscription and purchase metadata (processed via RevenueCat and Google Play)</li>
              </ul>
              <p className="mt-4">
                <strong>Health Data:</strong> With your explicit permission, we may collect health-related
                data you choose to connect, including from Apple Health on iPhone and from{' '}
                <strong>Google Health Connect</strong> on Android.
              </p>
              <p className="mt-3">
                <strong>Google Health Connect (Android):</strong> Shift Coach requests access only to{' '}
                <strong>read</strong> your <strong>steps</strong>, <strong>sleep</strong>, and{' '}
                <strong>heart rate</strong> through Health Connect. Access is <strong>read-only</strong>,{' '}
                <strong>user-initiated</strong> when you tap Connect in the app, and you can{' '}
                <strong>revoke</strong> it at any time in Android Settings → Health Connect → App permissions.
                We do <strong>not</strong> use Health Connect data for advertising and we do <strong>not</strong>{' '}
                sell Health Connect data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide personalized health and wellness recommendations</li>
                <li>Calculate shift-adjusted calories and meal timing</li>
                <li>Track your sleep patterns and recovery</li>
                <li>Generate insights and progress reports</li>
                <li>Process payments and manage subscriptions</li>
                <li>
                  Generate optional AI-assisted wording or insights in parts of the app (for example
                  sleep-related summaries or suggestions), only where that feature is used
                </li>
                <li>Send important service updates and notifications</li>
                <li>Improve our services and develop new features</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">4. Third-Party Services</h2>
              <p>We use the following third-party services to operate our app:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase:</strong> Database and authentication services. Your data is stored securely on Supabase&apos;s servers.</li>
                <li><strong>RevenueCat + Google Play:</strong> Subscription validation and billing infrastructure. Payment instruments are handled by Google Play and are not stored on our servers.</li>
                <li><strong>Health Connect / Apple Health:</strong> Optional health data integration. We only access data you explicitly authorize.</li>
                <li>
                  <strong>OpenAI:</strong> Some screens may send limited, relevant context (such as
                  sleep or wellness-related data you already store in Shift Coach) to OpenAI&apos;s APIs
                  to generate text or suggestions shown in the app. We do <strong>not</strong> operate an
                  in-app AI chat that collects ongoing conversation threads between you and a coach bot.
                </li>
                <li><strong>Resend:</strong> Email delivery service for notifications and account-related emails.</li>
              </ul>
              <p className="mt-4">
                These services have their own privacy policies. We encourage you to review them. We only
                share data necessary for these services to function.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal
                information, including encryption in transit and at rest. However, no method of
                transmission over the Internet is 100% secure.
              </p>
              <p className="mt-2">
                Your data is stored on secure servers provided by Supabase, which implements
                industry-standard security measures. Subscription billing is handled by Google Play
                through RevenueCat integration, and payment instruments are never stored on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to
                provide services. If you delete your account, we will delete or anonymize your personal
                information within 30 days, except where we are required to retain it for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">7. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country
                of residence. These countries may have data protection laws that differ from those in your
                country. We ensure appropriate safeguards are in place to protect your data.
              </p>
            </section>

            <section id="delete-specific-data">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">8. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Export your data (available in Settings)</li>
                <li>Delete your account and data</li>
                <li>Correct inaccurate information</li>
              </ul>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
                Deleting some of your data (without closing your account)
              </h3>
              <p className="mb-2">
                <strong>Shift Coach</strong> lets you remove individual health and activity records inside
                the app where supported—for example, you can delete specific sleep logs from your sleep
                history. Other data types can be updated or cleared from their respective screens as the
                app provides.
              </p>
              <p className="mb-2">
                If you want broader deletion of certain categories while keeping your account, email us at{' '}
                <a href="mailto:shift-coach@outlook.com" className="text-blue-600 hover:underline">
                  shift-coach@outlook.com
                </a>{' '}
                from your account email and describe what should be removed. We will confirm and process
                requests in line with our retention rules (see Data Retention above); we may keep minimal
                records where the law requires.
              </p>
              <p className="mt-3">
                <strong>Delete your entire account and associated data:</strong>
                <br />
                <a href="/account/delete" className="text-blue-600 hover:underline">Signed-in account deletion</a>
                {' '}|{' '}
                <a href="/account/delete-request" className="text-blue-600 hover:underline">
                  Web deletion request (if you cannot sign in)
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">9. Cookies and Tracking</h2>
              <p>
                We use essential cookies and similar technologies to provide our service, authenticate
                users, and maintain your session. We do not use cookies for advertising or tracking
                purposes beyond what is necessary for the app to function.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">10. Children&apos;s Privacy</h2>
              <p>
                Our service is not intended for children under 13 years of age. We do not knowingly
                collect personal information from children under 13. If you believe we have collected
                information from a child under 13, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material
                changes by posting the new policy on this page and updating the &quot;Last updated&quot;
                date. Your continued use of the service after changes constitutes acceptance of the
                updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your rights, please
                contact us at:
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
