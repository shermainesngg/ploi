import { describe, it, expect } from 'vitest'
import { decideAccess } from './ownership'

const owner = { id: 'auth-1', email: 'owner@example.com' }
const stranger = { id: 'auth-2', email: 'stranger@example.com' }

describe('decideAccess', () => {
  it('grants the linked auth user access to a claimed record', () => {
    expect(decideAccess(owner, { auth_user_id: 'auth-1' })).toBe('granted')
  })

  it('denies a different logged-in user access to a claimed record', () => {
    expect(decideAccess(stranger, { auth_user_id: 'auth-1' })).toBe('forbidden')
  })

  it('asks anonymous visitors to log in for a claimed record', () => {
    expect(decideAccess(null, { auth_user_id: 'auth-1' })).toBe('unauthenticated')
  })

  it('leaves unclaimed records open to everyone (demo/seed data)', () => {
    expect(decideAccess(null, { auth_user_id: null })).toBe('granted')
    expect(decideAccess(stranger, { auth_user_id: null })).toBe('granted')
  })
})
