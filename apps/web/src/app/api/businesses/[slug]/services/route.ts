import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!isSupabaseConfigured()) return NextResponse.json([])
  const db = createServerClient()
  const { data: biz } = await db.from('businesses').select('id').eq('slug', slug).single()
  if (!biz) return NextResponse.json([])
  const { data: services } = await db
    .from('services')
    .select('id, name, duration, price')
    .eq('business_id', biz.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  // Dedupe by name (defends against re-seeded duplicate rows)
  const seen = new Set<string>()
  const unique = (services ?? []).filter((s: { name: string }) => {
    const k = s.name.trim().toLowerCase()
    if (seen.has(k)) return false
    seen.add(k); return true
  })
  return NextResponse.json(unique)
}
