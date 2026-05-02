import Fastify from 'fastify'
import cors from '@fastify/cors'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', service: 'bridge-api' }))

// ── Bookings ──────────────────────────────────────────────────────────────────
// POST /bookings — create a booking with optional attribution
app.post('/bookings', async (request, reply) => {
  // TODO: validate body, write to DB, record attribution event
  reply.code(201).send({ message: 'Booking endpoint — connect Supabase to activate' })
})

// GET /bookings/:id — fetch a single booking
app.get('/bookings/:id', async (request, reply) => {
  reply.code(501).send({ message: 'Not implemented yet' })
})

// ── Attribution ───────────────────────────────────────────────────────────────
// POST /attribution/click — record a link click
app.post('/attribution/click', async (request, reply) => {
  // TODO: increment link.click_count, write attribution_event
  reply.code(201).send({ message: 'Attribution click endpoint — connect Supabase to activate' })
})

const PORT = Number(process.env.PORT ?? 3001)
await app.listen({ port: PORT, host: '0.0.0.0' })
