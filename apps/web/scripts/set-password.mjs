// Admin utility: list business accounts, or set a password on an existing auth user.
//
//   node scripts/set-password.mjs                      # list businesses + auth status
//   node scripts/set-password.mjs <email> <password>   # set a password for that email
//
// Uses the Supabase service-role key (admin API) from .env.local. Staging only.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const here = dirname(fileURLToPath(import.meta.url))
const env = Object.fromEntries(
  readFileSync(join(here, '..', '.env.local'), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function findUserByEmail(email) {
  // Paginate auth.users (no direct get-by-email in the JS admin API).
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) break
  }
  return null
}

const [email, password] = process.argv.slice(2)

if (!email) {
  // List mode.
  const { data: businesses, error } = await admin
    .from('businesses')
    .select('name, slug, email, auth_user_id')
    .order('name')
  if (error) throw error
  console.log(`\nProject: ${url}\n`)
  console.log('Businesses:')
  for (const b of businesses ?? []) {
    console.log(
      `  • ${b.name}  (${b.slug})\n    email: ${b.email ?? '—'}   linked auth user: ${b.auth_user_id ? 'yes' : 'NO'}`,
    )
  }
  console.log('\nTo set a password:\n  node scripts/set-password.mjs <email> <password>\n')
  process.exit(0)
}

if (!password || password.length < 8) {
  console.error('Provide a password of at least 8 characters: node scripts/set-password.mjs <email> <password>')
  process.exit(1)
}

// Find the auth user, or create one (email-confirmed) if none exists yet.
let user = await findUserByEmail(email)
if (user) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true })
  if (error) { console.error('Failed to set password:', error.message); process.exit(1) }
  console.log(`✓ Updated password for existing auth user ${email} (${user.id}).`)
} else {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) { console.error('Failed to create auth user:', error.message); process.exit(1) }
  user = data.user
  console.log(`✓ Created auth user ${email} (${user.id}).`)
}

// Link any record owned by this email (mirrors linkAuthUserToRecord, admin-side).
let linked = 0
for (const table of ['businesses', 'creators', 'consumers']) {
  const { data, error } = await admin
    .from(table)
    .update({ auth_user_id: user.id })
    .eq('email', email)
    .is('auth_user_id', null)
    .select('id')
  if (error) { console.error(`Link ${table} failed:`, error.message); continue }
  if (data?.length) {
    linked += data.length
    console.log(`  linked ${data.length} ${table} record(s)`)
  }
}
if (!linked) console.log('  (no unlinked records matched this email — nothing to link)')

console.log(`\nDone. Sign in at /login with ${email} + your password.`)
