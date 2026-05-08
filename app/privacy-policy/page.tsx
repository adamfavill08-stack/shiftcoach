import type { Metadata } from 'next'
import { LegalDocumentChrome } from '@/components/legal/LegalDocumentChrome'

export const metadata: Metadata = {
  title: 'Privacy Policy - Shift Coach',
  description: 'Shift Coach Privacy Policy',
}

/** Fixed review / publication anchor for legal text (shown in LegalDocumentChrome) */
const PRIVACY_LAST_UPDATED = 'May 2026'

export default function PrivacyPolicyPage() {
  return (
    <LegalDocumentChrome variant="privacy" lastUpdatedLabel={PRIVACY_LAST_UPDATED}>
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-700 dark:text-slate-300">
        <p className="text-sm text-slate-600 dark:text-slate-400 not-prose mb-8">
          This policy is effective as of <strong>{PRIVACY_LAST_UPDATED}</strong>. It supplements the heading
          above and applies to our website and mobile apps.
        </p>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            1. Introduction
          </h2>
          <p>
            Shift Coach (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, store, and share information when you
            use our <strong>website</strong>, <strong>mobile applications</strong>, and related services
            (together, the &quot;<strong>Services</strong>&quot;).
          </p>
          <p className="mt-3">
            If you do not agree with this policy, please do not use the Services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            2. Who we are
          </h2>
          <p>
            The data controller for personal information processed through the Services is{' '}
            <strong>Shift Coach</strong>.
          </p>
          <p className="mt-3">
            <strong>Contact:</strong>{' '}
            <a href="mailto:shift-coach@outlook.com" className="text-blue-600 hover:underline dark:text-blue-400">
              shift-coach@outlook.com
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            3. Information we collect
          </h2>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            3.1 Information you provide
          </h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Account data:</strong> email address and authentication credentials (managed through our
              authentication provider).
            </li>
            <li>
              <strong>Profile data:</strong> information you enter in your profile (for example name, age,
              heights/weights where applicable, goals, activity level, timezone, and preferences).
            </li>
            <li>
              <strong>Rota / schedule data:</strong> shifts, patterns, uploads, calendar events related to work
              schedules.
            </li>
            <li>
              <strong>Wellness logs (where available):</strong> sleep logs, hydration, caffeine, mood, and
              activity entries you record in the app.
            </li>
            <li>
              <strong>Support &amp; communications:</strong> emails or messages you send us.
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            3.2 Information collected automatically
          </h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Service usage &amp; technical data:</strong> device/browser type, app version where
              applicable, IP address, diagnostic logs essential for security and reliability, and timestamps
              of requests.
            </li>
            <li>
              <strong>Authentication / session cookies (web):</strong> essential cookies or similar storage
              needed to keep you signed in.
            </li>
          </ul>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            3.3 Health &amp; activity data from connected platforms (optional)
          </h3>
          <p>
            With your <strong>explicit permission</strong> through your device or operating system, we may read
            and sync health-related data you choose to connect.
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>
              <strong>Android (Google Health Connect):</strong> typically{' '}
              <strong>steps</strong>, <strong>sleep / session-style sleep data</strong>, and{' '}
              <strong>heart rate</strong>. Shift Coach requests <strong>read</strong> access only for categories
              you approve. Access can be revoked in Android Settings → Health Connect → App permissions. We do{' '}
              <strong>not</strong> use Health Connect data for advertising and we do <strong>not</strong> sell
              Health Connect data.
            </li>
            <li>
              <strong>iOS (Apple Health):</strong> permitted categories align with integrations you authorize
              on-device / in-app.
            </li>
          </ul>
          <p className="mt-3">
            <strong>Legacy note:</strong> Google Fit onboarding is not our primary Android path—Health Connect
            is preferred for newer integrations.
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            3.4 Subscription &amp; purchase data
          </h3>
          <p>
            If you subscribe, we process <strong>subscription status and purchase metadata</strong> through our
            subscription infrastructure (including product identifiers, renewal status, trial windows, and
            platform indicators). Payments are handled by <strong>Apple</strong> and/or <strong>Google</strong>{' '}
            (via their billing systems together with RevenueCat validation).{' '}
            <strong>We do not store your full payment card on our servers.</strong>
          </p>

          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            3.5 AI-assisted features (where used)
          </h3>
          <p>
            Some features may send <strong>limited context</strong> (for example sleep or wellness-related
            fields already stored in your account) to our AI provider to generate{' '}
            <strong>suggestions or wording</strong> shown in the app. We do <strong>not</strong> operate a
            general open-ended coaching chat intended to collect ongoing long conversation threads between you
            and a bot; processing is oriented toward specific in-app outputs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            4. How we use your information
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, operate, personalize, and secure the Services.</li>
            <li>
              Deliver shift-aware guidance—for example sleep, recovery, activity, nutrition timing, or related
              insights.
            </li>
            <li>Calculate shift-adjusted targets or meal-timing views where enabled for your subscription tier.</li>
            <li>Validate subscriptions and entitlements.</li>
            <li>Send service-related notifications and emails.</li>
            <li>Maintain, improve, and develop features (including reliability and fraud prevention).</li>
            <li>Comply with law and enforce our terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            5. Legal bases (EEA/UK users)
          </h2>
          <p>Where GDPR-style rules apply, we typically rely on:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>
              <strong>Contract:</strong> providing Services you request.
            </li>
            <li>
              <strong>Legitimate interests:</strong> security, fraud prevention, product improvement, service
              communications—balanced against your rights.
            </li>
            <li>
              <strong>Consent:</strong> where required for certain integrations or optional analytics.
            </li>
            <li>
              <strong>Legal obligation:</strong> where retention or disclosure is required.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            6. How we share information
          </h2>
          <p>We share information with service providers who process data on our behalf, including:</p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li><strong>Supabase:</strong> authentication and database hosting.</li>
            <li>
              <strong>RevenueCat:</strong> subscription status and purchase validation alongside{' '}
              <strong>Apple App Store</strong> and <strong>Google Play</strong> billing.
            </li>
            <li>
              <strong>OpenAI (or successors):</strong> limited tokens/context for AI-assisted outputs where enabled.
            </li>
            <li><strong>Resend:</strong> transactional email delivery.</li>
            <li>
              <strong>Cloud/hosting infrastructure</strong> used to run our website and APIs (for example Edge / server
              providers).
            </li>
          </ul>
          <p className="mt-4">
            We may disclose information if required by law, to protect users, or in connection with a merger or
            acquisition (with notice where required). We do <strong>not sell</strong> your personal information.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            7. International data transfers
          </h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of
            residence (including wherever our subprocessors operate). Where required, we use appropriate
            safeguards such as Standard Contractual Clauses or comparable mechanisms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            8. Data retention
          </h2>
          <p>
            We retain information while your account is active and as needed to provide Services. After account
            deletion, we aim to delete or anonymize personal information within <strong>30 days</strong>, except
            where law, security obligations, or dispute resolution requires longer retention.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            9. Data security
          </h2>
          <p>
            We implement appropriate technical and organizational measures, including encryption in transit where
            provided by our stack and protections from our vendors. No online service can be guaranteed 100%
            secure.
          </p>
        </section>

        <section id="delete-specific-data">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            10. Your rights
          </h2>
          <p>
            Depending on your location, you may have rights to access, correct, delete, export, or object to/limit
            certain processing—and to lodge a complaint with a supervisory authority. To exercise rights, email us
            from your account email; we may verify your identity before acting.
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3">
            <li>Access your personal data.</li>
            <li>Export your data where the app provides tools (for example Settings / data export).</li>
            <li>Delete your account and associated personal data.</li>
            <li>Correct inaccurate information through in-app editing where available.</li>
          </ul>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-6 mb-2">
            Deleting some of your data (without closing your account)
          </h3>
          <p className="mb-2">
            <strong>Shift Coach</strong> lets you remove individual health and activity records where the UI
            supports it—for example, deleting specific sleep history entries or updating logs on their respective
            screens.
          </p>
          <p className="mb-2">
            For broader deletion of certain categories without closing your account, contact{' '}
            <a href="mailto:shift-coach@outlook.com" className="text-blue-600 hover:underline dark:text-blue-400">
              shift-coach@outlook.com
            </a>{' '}
            from your account email describing what should be removed. We will confirm and comply subject to legal
            retention obligations.
          </p>
          <p className="mt-3">
            <strong>Delete your entire account and associated data:</strong>
            <br />
            <a href="/account/delete" className="text-blue-600 hover:underline dark:text-blue-400">
              Signed-in account deletion
            </a>{' '}
            |{' '}
            <a href="/account/delete-request" className="text-blue-600 hover:underline dark:text-blue-400">
              Web deletion request (if you cannot sign in)
            </a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            11. Cookies and similar technologies (web)
          </h2>
          <p>
            We use <strong>essential</strong> cookies and similar mechanisms to authenticate users and operate the
            website. We do not use third-party advertising cookies as a core part of Shift Coach.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            12. Children&apos;s privacy
          </h2>
          <p>
            Our Services are <strong>not directed to children under 13</strong>. We do not knowingly collect personal
            information from children under 13. If you believe we have collected information from a child under 13,
            contact us promptly.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            13. Third-party links &amp; integrations
          </h2>
          <p>
            Links to external sites or optional integrations are governed by each provider&apos;s policies. Review
            Apple, Google, and other vendors you connect independently.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            14. Changes to this policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time. We will post the revised policy on this page,
            adjust the stated effective/review date above, and may provide additional in-app notices for material
            changes where appropriate. Continued use after changes may constitute acceptance (where lawful).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mt-8 mb-4">
            15. Contact us
          </h2>
          <p>
            Questions about this Privacy Policy or requests to exercise your rights:
            <br />
            <a href="mailto:shift-coach@outlook.com" className="text-blue-600 hover:underline dark:text-blue-400">
              shift-coach@outlook.com
            </a>
          </p>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            Nothing in this policy is medical advice. For emergencies, seek professional help immediately.
          </p>
        </section>
      </div>
    </LegalDocumentChrome>
  )
}
