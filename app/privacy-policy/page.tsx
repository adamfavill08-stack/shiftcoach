import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Shift Coach',
  description: 'Shift Coach Privacy Policy',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 dark:from-slate-950 via-blue-50/30 dark:via-slate-900 to-slate-50 dark:to-slate-950 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="relative overflow-hidden bg-white/90 dark:bg-slate-900/45 backdrop-blur-xl rounded-2xl border border-white/90 dark:border-slate-700/40 shadow-lg dark:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(59,130,246,0.1)] p-8">
          {/* Premium gradient overlay */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/70 dark:from-slate-900/60 via-transparent to-transparent" />
          
          {/* Subtle colored glow hints - dark mode only */}
          <div className="pointer-events-none absolute -inset-1 opacity-0 dark:opacity-100 bg-gradient-to-br from-blue-500/8 via-indigo-500/6 to-purple-500/8 blur-xl transition-opacity duration-300" />
          
          {/* Inner ring for premium feel */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl ring-[0.5px] ring-white/10 dark:ring-slate-600/30" />
          
          <div className="relative z-10">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">Privacy Policy</h1>
            
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Last updated: {new Date().toLocaleDateString()}
              </p>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">1. Introduction</h2>
              <p>
                Shift Coach ("we", "our", or "us") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you use our mobile application and services.
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
                <li>Activity and step data (including from Google Fit if connected)</li>
                <li>Mood and focus ratings</li>
                <li>Nutrition preferences and goals</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Messages and interactions with our AI coach</li>
              </ul>
              <p className="mt-4">
                <strong>Health Data:</strong> With your explicit permission, we may collect health data from connected services such as Google Fit or Apple Health, including steps, sleep data, and activity metrics.
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
                <li>Provide AI-powered coaching and recommendations</li>
                <li>Send important service updates and notifications</li>
                <li>Improve our services and develop new features</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">4. Third-Party Services</h2>
              <p>We use the following third-party services to operate our app:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase:</strong> Database and authentication services. Your data is stored securely on Supabase's servers.</li>
                <li><strong>Stripe:</strong> Payment processing. Payment information is handled directly by Stripe and never stored on our servers.</li>
                <li><strong>Google Fit:</strong> Health data integration (optional). We only access data you explicitly authorize.</li>
                <li><strong>OpenAI:</strong> AI coaching features. Your messages and context may be processed by OpenAI to provide personalized coaching.</li>
                <li><strong>Resend:</strong> Email delivery service for notifications and account-related emails.</li>
              </ul>
              <p className="mt-4">
                These services have their own privacy policies. We encourage you to review them. We only share data necessary for these services to function.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your 
                personal information, including encryption in transit and at rest. However, no 
                method of transmission over the Internet is 100% secure.
              </p>
              <p className="mt-2">
                Your data is stored on secure servers provided by Supabase, which implements 
                industry-standard security measures. Payment information is processed securely 
                through Stripe and never stored on our servers.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as 
                needed to provide services. If you delete your account, we will delete or 
                anonymize your personal information within 30 days, except where we are required 
                to retain it for legal purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">7. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your 
                country of residence. These countries may have data protection laws that differ 
                from those in your country. We ensure appropriate safeguards are in place to 
                protect your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">8. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Export your data (available in Settings)</li>
                <li>Delete your account and data</li>
                <li>Correct inaccurate information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">9. Cookies and Tracking</h2>
              <p>
                We use essential cookies and similar technologies to provide our service, 
                authenticate users, and maintain your session. We do not use cookies for 
                advertising or tracking purposes beyond what is necessary for the app to function.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">10. Children's Privacy</h2>
              <p>
                Our service is not intended for children under 13 years of age. We do not 
                knowingly collect personal information from children under 13. If you believe 
                we have collected information from a child under 13, please contact us 
                immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any 
                material changes by posting the new policy on this page and updating the "Last 
                updated" date. Your continued use of the service after changes constitutes 
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your rights, 
                please contact us at:
                <br />
                <a href="mailto:shift-coach@outlook.com" className="text-blue-600 dark:text-blue-400 hover:underline">
                  shift-coach@outlook.com
                </a>
              </p>
            </section>
          </div>
          </div>
        </div>
      </div>
    </main>
  )
}
