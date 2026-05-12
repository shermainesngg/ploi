import { z } from 'zod'

export const slugSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9-]+$/)

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export const timeSchema = z.string().regex(/^\d{2}:\d{2}$/)
