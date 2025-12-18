// Quick script to check if environment variables are loaded
// Run with: node check-env.js

require('dotenv').config({ path: '.env.local' })

console.log('Environment Variables Check:')
console.log('============================')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Found' : '✗ Missing')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Found' : '✗ Missing')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ Found' : '✗ Missing')
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ Found' : '✗ Missing')
console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? '✓ Found' : '✗ Missing')
console.log('============================')

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n❌ Missing required Supabase variables!')
  console.log('Make sure .env.local exists in the project root with these variables.')
  process.exit(1)
} else {
  console.log('\n✅ All required variables found!')
}

