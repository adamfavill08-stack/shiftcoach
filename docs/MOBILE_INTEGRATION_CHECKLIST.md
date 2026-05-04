# Mobile integration checklist (ShiftCoach)

Manual configuration required outside the repo after code changes.

## Google Cloud Console (OAuth → Supabase)

1. Open **APIs & Services → Credentials → OAuth 2.0 Client IDs**.
2. Use the **Web application** client whose Client ID matches **Supabase → Authentication → Providers → Google**.
3. Under **Authorized redirect URIs**, add **exactly** (no trailing slash unless already there):

   `https://hfkittwgwvjdzvwzjvqqx.supabase.co/auth/v1/callback`

   Replace the host if your Supabase project URL differs. Pattern:

   `{NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`

4. **Do not** put only your app domain here for the Supabase/Google exchange; that is separate (see Supabase redirect URLs).

## Supabase Dashboard

1. **Authentication → URL Configuration → Redirect URLs**  
   Include your app callback(s), for example:

   - `https://www.shiftcoach.app/auth/callback`
   - `http://localhost:3000/auth/callback` (optional, dev)
   - **`shiftcoach://auth/callback`** — required for **Capacitor native** OAuth and email confirmation when using the app deep link (see `lib/auth/oauthRedirect.ts`).

2. **Redirect base:** `lib/auth/oauthRedirect.ts` detects the Capacitor shell at runtime (`isNativeApp()`, including `getPlatform()`). For **Play/App Store** bundles that load the hosted site in a WebView but must always send Supabase **`emailRedirectTo`** to the app scheme, bake in **`NEXT_PUBLIC_FORCE_NATIVE_AUTH=1`** at `npm run build` time. Optional: **`NEXT_PUBLIC_DEBUG_AUTH_REDIRECT=1`** enables the sign-up debug panel and signup redirect `console.log`. Web uses **`NEXT_PUBLIC_OAUTH_REDIRECT_BASE`** or **`NEXT_PUBLIC_SITE_URL`** or `window.location.origin` when not native / not forced.

3. **Authentication → Email Templates → Confirm signup:** the confirmation link must use **`{{ .ConfirmationURL }}`** (Supabase-generated URL that respects `emailRedirectTo`). Do **not** use **`{{ .SiteURL }}`**, a hardcoded `https://www.shiftcoach.app` link, or **`{{ .RedirectTo }}`** alone — those ignore the client `emailRedirectTo` and keep users on the web redirect.

## RevenueCat

1. Use **public** SDK keys in the web bundle only:

   - `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` → starts with **`goog_`**
   - `NEXT_PUBLIC_REVENUECAT_IOS_API_KEY` → starts with **`appl_`**

2. Never ship **secret** keys (`sk_`) in client code.

3. Create an **Offering**, set it as **current**, attach packages whose **store product IDs** match app expectations (see `PRODUCT_IDS` in `lib/purchases/native-purchases.ts`, e.g. `pro_monthly`, `pro_annual`).

4. Entitlement **`pro`** should unlock paid features once purchase completes.

## Google Play Console

1. Activate subscription / in-app products with the same IDs as in RevenueCat and the app code.
2. Add **license testers** and distribute via internal/closed testing for real BillingClient behavior.
3. Health Connect: ensure the Play declaration for health permissions matches manifest / actual reads (Steps, Sleep, Heart rate).

## After native Kotlin changes

Run from project root:

`npx cap sync android`

then rebuild the Android app.
