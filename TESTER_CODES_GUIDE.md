# Tester Codes Guide

## How to Add Tester Codes

Tester codes grant **lifetime free access** to ShiftCoach. Users with tester codes don't need to pay and have full access forever.

### Quick Method: Add Codes to API Files

1. **Open** `app/api/promo/validate/route.ts`
2. **Find** the `validCodes` array (around line 20)
3. **Add** your new codes to the array:

```typescript
const validCodes = [
  'TESTER2025',
  'BETA2025',
  'SHIFTCOACH2025',
  'YOURNEWCODE1',  // Add your codes here
  'YOURNEWCODE2',
  'YOURNEWCODE3',
]
```

4. **Also update** `app/api/profile/plan/route.ts` with the same codes (around line 30)
   - Keep both lists in sync!

5. **Save** both files
6. **Restart** your dev server if running

### Code Format

- Codes are **case-insensitive** (automatically converted to uppercase)
- Use letters and numbers
- Recommended format: `TESTER2025`, `BETA001`, `SHIFTCOACH2025`
- Make them unique and hard to guess

### Example Codes

```typescript
const validCodes = [
  'TESTER2025',
  'BETA2025',
  'SHIFTCOACH2025',
  'NURSE2025',      // For nurse testers
  'PARAMEDIC2025',  // For paramedic testers
  'GUARD2025',      // For security guard testers
  'CHEF2025',       // For chef testers
  'OPERATOR2025',   // For factory operator testers
]
```

## How It Works

1. User enters tester code on pricing page
2. Code is validated
3. User gets `subscription_plan = 'tester'` in their profile
4. **Lifetime free access** - no expiration, no payment

## Database Method (Advanced)

If you want to track code usage, expiration dates, or limit uses:

1. Run the migration: `supabase/migrations/20250127_create_promo_codes.sql`
2. Add codes to the `promo_codes` table in Supabase
3. Update the API routes to check the database instead of hardcoded list

## Security Notes

- Codes are validated **server-side** (can't be bypassed)
- Keep your code list private
- Consider rotating codes periodically
- Monitor usage if using database method

## Testing

1. Go to `/select-plan`
2. Enter a tester code (e.g., `TESTER2025`)
3. Click "Apply"
4. Should see "✓ Tester code accepted!"
5. Click "Continue with Free Access"
6. User proceeds to onboarding with lifetime free access

