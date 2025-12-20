import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Shift Coach',
  description: 'Shift Coach Terms of Service',
}

export default function TermsOfServicePage() {
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">Terms of Service</h1>
            
            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Last updated: {new Date().toLocaleDateString()}
              </p>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Shift Coach, you accept and agree to be bound by the 
                terms and provision of this agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">2. Use License</h2>
              <p>
                Permission is granted to temporarily use Shift Coach for personal, 
                non-commercial purposes. This license does not include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Modifying or copying the materials</li>
                <li>Using the materials for commercial purposes</li>
                <li>Attempting to reverse engineer any software</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">3. Medical Disclaimer</h2>
              <p>
                <strong>Important:</strong> Shift Coach is a health and wellness coaching tool, 
                not a medical device or service. The information provided is for educational 
                and informational purposes only and is not intended as medical advice.
              </p>
              <p>
                Always consult with a qualified healthcare provider before making decisions 
                about your health, especially if you have medical conditions, are pregnant, 
                or are taking medications.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">4. User Responsibilities</h2>
              <p>You agree to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide accurate information</li>
                <li>Use the service in compliance with applicable laws</li>
                <li>Not share your account credentials</li>
                <li>Notify us of any unauthorized access</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">5. Limitation of Liability</h2>
              <p>
                Shift Coach shall not be liable for any indirect, incidental, special, 
                consequential, or punitive damages resulting from your use of the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">6. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of 
                the service after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">7. Subscriptions and Payments</h2>
              <p>
                Shift Coach offers subscription plans for access to premium features. By 
                subscribing, you agree to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Pay the subscription fee at the time of purchase</li>
                <li>Automatic renewal unless cancelled before the renewal date</li>
                <li>Payment processing through Stripe</li>
                <li>All fees are non-refundable except as required by law</li>
              </ul>
              <p className="mt-4">
                You may cancel your subscription at any time through the app settings. 
                Cancellation takes effect at the end of your current billing period.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">8. Service Availability</h2>
              <p>
                We strive to provide continuous service but do not guarantee uninterrupted 
                access. We reserve the right to modify, suspend, or discontinue the service 
                at any time with or without notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">9. Refund Policy</h2>
              <p>
                Subscription fees are generally non-refundable. However, if you experience 
                technical issues that prevent you from using the service, please contact us 
                within 7 days of purchase for a refund consideration.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">10. Contact Information</h2>
              <p>
                For questions about these Terms of Service, contact us at:
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
