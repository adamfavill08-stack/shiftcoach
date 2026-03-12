# Create Test Account for Google Play

## Option 1: Create via Your App (Easiest) ✅

1. **Go to your app**: `https://www.shiftcoach.app/auth/sign-up`
2. **Sign up** with:
   - Email: `playstore.test@shiftcoach.app`
   - Password: `TestPassword123`
3. **Check email** for confirmation link
4. **Click confirmation link**
5. **Complete onboarding** (if required)
6. **Done!** Account is ready for Google Play reviewers

---

## Option 2: Create via Supabase Dashboard

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Go to Authentication → Users**
4. **Click "Add user"** or "Invite user"
5. **Enter**:
   - Email: `playstore.test@shiftcoach.app`
   - Password: `TestPassword123`
   - Auto Confirm: ✅ (check this - skips email confirmation)
6. **Create user**
7. **User is created** and can log in immediately

---

## Option 3: Create via Supabase SQL (Advanced)

If you want to create it via SQL:

```sql
-- Create the user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'playstore.test@shiftcoach.app',
  crypt('TestPassword123', gen_salt('bf')),
  now(), -- Email confirmed immediately
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Create profile for the user
INSERT INTO public.profiles (user_id, name)
SELECT id, 'Play Store Tester'
FROM auth.users
WHERE email = 'playstore.test@shiftcoach.app';
```

---

## Recommended: Option 1 or 2

**Option 1** (via app) is easiest - just sign up normally.

**Option 2** (via Supabase Dashboard) is fastest - creates user immediately without email confirmation.

---

## After Creating Account

1. **Test login** to make sure it works
2. **Complete onboarding** (if your app requires it)
3. **Optionally**: Give the account a subscription so reviewers can test premium features
4. **Then submit** the credentials in Play Console

---

## Quick Steps

1. **Create account** (Option 1 or 2 above)
2. **Test login** works
3. **Submit credentials** in Play Console (you've already filled the form)
4. **Click "Add"** in Play Console
5. **Done!**

---

## That's It! ✅

Create the account, then submit the form in Play Console. Google Play reviewers will be able to test your app!
