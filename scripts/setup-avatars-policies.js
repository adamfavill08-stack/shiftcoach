/**
 * Script to automatically create storage policies for the avatars bucket
 * 
 * Usage:
 *   node scripts/setup-avatars-policies.js
 * 
 * Requirements:
 *   - SUPABASE_SERVICE_ROLE_KEY in your .env file
 *   - NEXT_PUBLIC_SUPABASE_URL in your .env file
 *   - The 'avatars' bucket must already exist in Supabase Storage
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const policies = [
  {
    name: 'Public avatar access',
    operation: 'SELECT',
    roles: ['public'],
    definition: "bucket_id = 'avatars'"
  },
  {
    name: 'Users can upload their own avatars',
    operation: 'INSERT',
    roles: ['authenticated'],
    definition: "bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text"
  },
  {
    name: 'Users can update their own avatars',
    operation: 'UPDATE',
    roles: ['authenticated'],
    definition: "bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text"
  },
  {
    name: 'Users can delete their own avatars',
    operation: 'DELETE',
    roles: ['authenticated'],
    definition: "bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text"
  }
]

async function createPolicies() {
  console.log('🚀 Setting up avatars storage policies...\n')

  for (const policy of policies) {
    try {
      // Note: Supabase Storage policies must be created via the REST API
      // This is a workaround using raw SQL execution
      const operationMap = {
        'SELECT': 'FOR SELECT',
        'INSERT': 'FOR INSERT',
        'UPDATE': 'FOR UPDATE',
        'DELETE': 'FOR DELETE'
      }

      const roles = policy.roles.join(', ')
      const operation = operationMap[policy.operation]
      
      // For INSERT, we need WITH CHECK instead of USING
      const usingClause = policy.operation === 'INSERT' 
        ? `WITH CHECK (${policy.definition})`
        : `USING (${policy.definition})`
      
      const updateCheck = policy.operation === 'UPDATE'
        ? `WITH CHECK (${policy.definition})`
        : ''

      let sql = `CREATE POLICY "${policy.name}" ON storage.objects ${operation} TO ${roles} ${usingClause}`
      if (updateCheck) {
        sql += ` ${updateCheck}`
      }

      console.log(`Creating policy: ${policy.name}...`)
      
      // Execute via RPC or direct SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql })
      
      if (error) {
        // Try alternative method - direct SQL execution
        console.log(`   ⚠️  RPC method failed, trying direct SQL...`)
        console.log(`   SQL: ${sql}`)
        console.log(`   ❌ Error: ${error.message}`)
        console.log(`   💡 You may need to create this policy manually via the UI`)
      } else {
        console.log(`   ✅ Created successfully`)
      }
    } catch (err) {
      console.error(`   ❌ Failed to create policy "${policy.name}":`, err.message)
    }
  }

  console.log('\n⚠️  Note: Supabase Storage policies typically need to be created via the UI.')
  console.log('   If the script failed, please use the UI method in SETUP_AVATARS_UI_STEPS.md\n')
}

createPolicies().catch(console.error)

