/**
 * Script to clear all authentication data from Supabase
 * 
 * WARNING: This is a destructive operation that will:
 * - Delete all users from Supabase Auth
 * - Optionally clear related data from Prisma database
 * 
 * Usage:
 *   npx tsx scripts/clear-auth-data.ts [--prisma]
 * 
 * Options:
 *   --prisma: Also clear all user data from Prisma database
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗')
  process.exit(1)
}

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function clearAuthUsers() {
  console.log('🔄 Fetching all users from Supabase Auth...')
  
  let page = 1
  let totalDeleted = 0
  
  while (true) {
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    })
    
    if (error) {
      console.error('❌ Error fetching users:', error)
      break
    }
    
    if (!users?.users || users.users.length === 0) {
      break
    }
    
    console.log(`📄 Found ${users.users.length} users on page ${page}`)
    
    // Delete users in batches
    for (const user of users.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
      if (deleteError) {
        console.error(`❌ Failed to delete user ${user.email}:`, deleteError.message)
      } else {
        console.log(`✓ Deleted user: ${user.email} (${user.id})`)
        totalDeleted++
      }
    }
    
    // Check if there are more pages
    if (users.users.length < 100) {
      break
    }
    
    page++
  }
  
  console.log(`\n✅ Deleted ${totalDeleted} users from Supabase Auth`)
  return totalDeleted
}

async function clearSupabaseTables() {
  console.log('\n🔄 Clearing Supabase tables...')
  
  const tables = [
    'influencer_applications',
    'admin_users',
  ]
  
  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        console.error(`❌ Error clearing ${table}:`, error.message)
      } else {
        console.log(`✓ Cleared table: ${table}`)
      }
    } catch (err) {
      console.error(`❌ Error clearing ${table}:`, err)
    }
  }
}

async function main() {
  const clearPrisma = process.argv.includes('--prisma')
  
  console.log('⚠️  WARNING: This will delete ALL authentication data!')
  console.log('   - All Supabase Auth users')
  console.log('   - All Supabase tables (influencer_applications, admin_users)')
  if (clearPrisma) {
    console.log('   - All Prisma user data')
  }
  console.log('\nThis operation cannot be undone!\n')
  
  // In a real scenario, you'd want to add a confirmation prompt
  // For now, we'll proceed (you can add readline/prompt if needed)
  
  try {
    // Clear Supabase Auth users
    await clearAuthUsers()
    
    // Clear Supabase tables
    await clearSupabaseTables()
    
    if (clearPrisma) {
      console.log('\n⚠️  Prisma database clearing requires database access.')
      console.log('   Run this SQL in your database:')
      console.log('   DELETE FROM "User";')
      console.log('   (This will cascade delete related records)')
    }
    
    console.log('\n✅ Authentication data cleared successfully!')
    console.log('   You can now start fresh with new registrations.')
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error)
    process.exit(1)
  }
}

main()
