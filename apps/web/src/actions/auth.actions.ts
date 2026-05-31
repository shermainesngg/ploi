'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'
import { getCurrentUser, PLOI_ACTIVE_ROLE, type UserRole } from '@/lib/auth'

const roleSchema = z.enum(['creator', 'business', 'consumer'])

const ONE_YEAR = 60 * 60 * 24 * 365

/**
 * Switch the active role for a multi-role user. Writes the `ploi_active_role`
 * cookie so subsequent server renders (layout, dashboards) resolve to that role.
 * Only succeeds if the current user actually owns the requested role.
 */
export async function setActiveRole(role: UserRole) {
  const parsed = roleSchema.safeParse(role)
  if (!parsed.success) return { error: 'Invalid role' }

  const user = await getCurrentUser()
  if (!user) return { error: 'Not signed in' }
  if (!user.roles.includes(parsed.data)) return { error: 'You do not have that role' }

  const store = await cookies()
  store.set(PLOI_ACTIVE_ROLE, parsed.data, {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR,
  })

  return { success: true }
}
