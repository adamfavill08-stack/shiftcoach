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

2. **Capacitor native build env** (`NEXT_PUBLIC_*` is baked in at `npm run build` time):

   ```bash
   NEXT_PUBLIC_MOBILE_OAUTH_REDIRECT_BASE=shiftcoach://auth
   ```

   Web / hosted WebView can still use production HTTPS via  
   `NEXT_PUBLIC_OAUTH_REDIRECT_BASE=https://www.shiftcoach.app`  
   so email links and OAuth use `https://www.shiftcoach.app/auth/callback` when **not** on a native shell.

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
