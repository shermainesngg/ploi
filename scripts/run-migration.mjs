// One-off migration runner for STAGING via the IPv4 session pooler.
// Reads the staging DB password from .env.local (root) and the pooler host
// region from .env.prod, then connects with the STAGING project ref username.
// Runs the given .sql file inside a single transaction.
//
//   node scripts/run-migration.mjs packages/db/migration_013_multi_location.sql
//
import { readFileSync } from 'node:fs'
import pg from 'pg'

function parseEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2]
  }
  return out
}

const staging = parseEnv('.env.local')
const prod = parseEnv('.env.prod')

const stagingUrl = staging.NEXT_PUBLIC_SUPABASE_URL || ''
const ref = stagingUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (!ref) throw new Error('Could not resolve staging project ref from .env.local')

// Safety: the project ref MUST be the known staging ref, never prod.
const PROD_REF = (prod.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1]
if (ref === PROD_REF) throw new Error('REFUSING TO RUN: .env.local resolves to the PROD project ref')

// Extract staging DB password from the direct URL (password may itself contain '@').
//   postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
const directUrl = staging.SUPABASE_DB_URL || ''
const password = directUrl.match(/postgres:(.+)@db\./)?.[1]
if (!password) throw new Error('Could not extract staging DB password from SUPABASE_DB_URL')

// Pooler host (IPv4). Staging lives in its own region (ap-southeast-1),
// distinct from prod (ap-south-1); allow an explicit override, else fall back
// to the prod pooler region.
const poolerHost =
  process.env.POOLER_HOST ||
  prod.SUPABASE_DB_URL?.match(/@([a-z0-9-]+\.pooler\.supabase\.com)/)?.[1]
if (!poolerHost) throw new Error('Could not derive pooler host')

const sqlPath = process.argv[2]
if (!sqlPath) throw new Error('Usage: node scripts/run-migration.mjs <path-to.sql>')
const sql = readFileSync(sqlPath, 'utf8')

const client = new pg.Client({
  host: poolerHost,
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const run = async () => {
  console.log(`→ project ref : ${ref} (staging)`)
  console.log(`→ pooler host : ${poolerHost}`)
  console.log(`→ migration   : ${sqlPath}\n`)
  await client.connect()

  const who = await client.query('select current_database() as db, current_user as usr')
  console.log(`Connected to db=${who.rows[0].db} as ${who.rows[0].usr}`)
  const before = await client.query('select count(*)::int as n from businesses')
  console.log(`businesses rows: ${before.rows[0].n}\n`)

  console.log('Running migration in a transaction…')
  await client.query('begin')
  try {
    await client.query(sql)
    await client.query('commit')
    console.log('✓ committed\n')
  } catch (e) {
    await client.query('rollback')
    throw e
  }

  const loc = await client.query(
    'select count(*)::int as n, count(*) filter (where is_primary)::int as primaries from locations',
  )
  console.log(`locations rows: ${loc.rows[0].n} (primary: ${loc.rows[0].primaries})`)
  const orphanStaff = await client.query('select count(*)::int as n from staff where location_id is null')
  const orphanBookings = await client.query('select count(*)::int as n from bookings where location_id is null')
  console.log(`staff w/o location_id: ${orphanStaff.rows[0].n}`)
  console.log(`bookings w/o location_id: ${orphanBookings.rows[0].n}`)
}

run()
  .then(() => client.end())
  .then(() => console.log('\nDone.'))
  .catch(async (e) => {
    console.error('\n✗ FAILED:', e.message)
    try { await client.end() } catch {}
    process.exit(1)
  })
