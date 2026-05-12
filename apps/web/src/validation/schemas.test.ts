import { describe, it, expect } from 'vitest'
import { createBusinessSchema } from './business.schema'
import { createCreatorSchema } from './creator.schema'
import { createLinkSchema, updateLinkStatusSchema } from './link.schema'
import {
  createStaffSchema,
  updateStaffSchema,
  setStaffScheduleSchema,
  createStaffBlockSchema,
  createWalkinSchema,
} from './staff.schema'
import { slugSchema, dateSchema, timeSchema } from './common.schema'

describe('common schemas', () => {
  it('slugSchema accepts valid slugs', () => {
    expect(slugSchema.safeParse('hello-world').success).toBe(true)
    expect(slugSchema.safeParse('a').success).toBe(true)
  })

  it('slugSchema rejects empty or invalid chars', () => {
    expect(slugSchema.safeParse('').success).toBe(false)
    expect(slugSchema.safeParse('Hello World').success).toBe(false)
    expect(slugSchema.safeParse('a'.repeat(41)).success).toBe(false)
  })

  it('dateSchema accepts YYYY-MM-DD', () => {
    expect(dateSchema.safeParse('2026-05-15').success).toBe(true)
  })

  it('dateSchema rejects invalid format', () => {
    expect(dateSchema.safeParse('15/05/2026').success).toBe(false)
    expect(dateSchema.safeParse('2026-5-1').success).toBe(false)
  })

  it('timeSchema accepts HH:MM', () => {
    expect(timeSchema.safeParse('09:30').success).toBe(true)
    expect(timeSchema.safeParse('23:59').success).toBe(true)
  })

  it('timeSchema rejects invalid format', () => {
    expect(timeSchema.safeParse('9:30').success).toBe(false)
  })
})

describe('createBusinessSchema', () => {
  const validInput = {
    name: 'Test Spa',
    category: 'Spa',
    location: 'Bangkok',
    services: [{ name: 'Massage', duration: 60, price: 500 }],
  }

  it('accepts valid input', () => {
    expect(createBusinessSchema.safeParse(validInput).success).toBe(true)
  })

  it('requires at least one service', () => {
    const result = createBusinessSchema.safeParse({ ...validInput, services: [] })
    expect(result.success).toBe(false)
  })

  it('requires name, category, location', () => {
    expect(createBusinessSchema.safeParse({ ...validInput, name: '' }).success).toBe(false)
    expect(createBusinessSchema.safeParse({ ...validInput, category: '' }).success).toBe(false)
    expect(createBusinessSchema.safeParse({ ...validInput, location: '' }).success).toBe(false)
  })

  it('coerces price and duration to numbers', () => {
    const result = createBusinessSchema.safeParse({
      ...validInput,
      services: [{ name: 'Test', duration: '30', price: '100' }],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.services[0].duration).toBe(30)
      expect(result.data.services[0].price).toBe(100)
    }
  })

  it('accepts optional email', () => {
    const result = createBusinessSchema.safeParse({
      ...validInput,
      email: 'test@example.com',
    })
    expect(result.success).toBe(true)
  })
})

describe('createCreatorSchema', () => {
  it('accepts valid input', () => {
    const result = createCreatorSchema.safeParse({
      handle: '@testcreator',
      displayName: 'Test Creator',
    })
    expect(result.success).toBe(true)
  })

  it('requires handle and displayName', () => {
    expect(createCreatorSchema.safeParse({ handle: '', displayName: 'Test' }).success).toBe(false)
    expect(createCreatorSchema.safeParse({ handle: '@test' }).success).toBe(false)
  })

  it('accepts optional socials', () => {
    const result = createCreatorSchema.safeParse({
      handle: '@test',
      displayName: 'Test',
      socials: [{ platform: 'instagram', url: 'https://instagram.com/test' }],
    })
    expect(result.success).toBe(true)
  })
})

describe('createLinkSchema', () => {
  it('accepts valid input', () => {
    const result = createLinkSchema.safeParse({
      creatorSlug: 'test-creator',
      businessSlug: 'test-business',
    })
    expect(result.success).toBe(true)
  })

  it('requires both slugs', () => {
    expect(createLinkSchema.safeParse({ creatorSlug: 'test' }).success).toBe(false)
    expect(createLinkSchema.safeParse({ businessSlug: 'test' }).success).toBe(false)
  })
})

describe('updateLinkStatusSchema', () => {
  it('accepts valid statuses', () => {
    expect(updateLinkStatusSchema.safeParse({ linkId: '550e8400-e29b-41d4-a716-446655440000', status: 'active' }).success).toBe(true)
    expect(updateLinkStatusSchema.safeParse({ linkId: '550e8400-e29b-41d4-a716-446655440000', status: 'pending' }).success).toBe(true)
    expect(updateLinkStatusSchema.safeParse({ linkId: '550e8400-e29b-41d4-a716-446655440000', status: 'declined' }).success).toBe(true)
  })

  it('rejects invalid status', () => {
    expect(updateLinkStatusSchema.safeParse({ linkId: '550e8400-e29b-41d4-a716-446655440000', status: 'unknown' }).success).toBe(false)
  })
})

describe('createStaffSchema', () => {
  it('accepts valid input', () => {
    const result = createStaffSchema.safeParse({ businessSlug: 'test-biz', name: 'Alice' })
    expect(result.success).toBe(true)
  })

  it('requires name and businessSlug', () => {
    expect(createStaffSchema.safeParse({ businessSlug: 'test' }).success).toBe(false)
    expect(createStaffSchema.safeParse({ name: 'Alice' }).success).toBe(false)
  })

  it('accepts optional role and serviceIds', () => {
    const result = createStaffSchema.safeParse({
      businessSlug: 'test-biz',
      name: 'Alice',
      role: 'Therapist',
      serviceIds: ['550e8400-e29b-41d4-a716-446655440000'],
    })
    expect(result.success).toBe(true)
  })
})

describe('updateStaffSchema', () => {
  const staffId = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts partial updates', () => {
    expect(updateStaffSchema.safeParse({ staffId, name: 'New Name' }).success).toBe(true)
    expect(updateStaffSchema.safeParse({ staffId, role: 'Lead' }).success).toBe(true)
    expect(updateStaffSchema.safeParse({ staffId, serviceIds: [staffId] }).success).toBe(true)
  })

  it('requires staffId', () => {
    expect(updateStaffSchema.safeParse({ name: 'Test' }).success).toBe(false)
  })
})

describe('setStaffScheduleSchema', () => {
  const staffId = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts valid schedule entries', () => {
    const result = setStaffScheduleSchema.safeParse({
      staffId,
      schedule: [
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isAvailable: true },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid dayOfWeek', () => {
    const result = setStaffScheduleSchema.safeParse({
      staffId,
      schedule: [
        { dayOfWeek: 7, startTime: '09:00', endTime: '17:00', isAvailable: true },
      ],
    })
    expect(result.success).toBe(false)
  })
})

describe('createStaffBlockSchema', () => {
  const staffId = '550e8400-e29b-41d4-a716-446655440000'

  it('accepts valid block date', () => {
    const result = createStaffBlockSchema.safeParse({ staffId, blockDate: '2026-05-20' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    expect(createStaffBlockSchema.safeParse({ staffId, blockDate: '20-05-2026' }).success).toBe(false)
  })

  it('accepts optional reason and times', () => {
    const result = createStaffBlockSchema.safeParse({
      staffId,
      blockDate: '2026-05-20',
      startTime: '10:00',
      endTime: '12:00',
      reason: 'Personal',
    })
    expect(result.success).toBe(true)
  })
})

describe('createWalkinSchema', () => {
  const validInput = {
    businessSlug: 'test-biz',
    serviceId: '550e8400-e29b-41d4-a716-446655440000',
    bookingDate: '2026-05-15',
    bookingTime: '14:00',
  }

  it('accepts valid input', () => {
    expect(createWalkinSchema.safeParse(validInput).success).toBe(true)
  })

  it('requires serviceId, bookingDate, bookingTime', () => {
    expect(createWalkinSchema.safeParse({ businessSlug: 'test' }).success).toBe(false)
  })

  it('accepts optional customerName and staffId', () => {
    const result = createWalkinSchema.safeParse({
      ...validInput,
      customerName: 'Walk-in Customer',
      staffId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })
})
