import { listStaff } from '@/lib/db'
import { createServerClient, isSupabaseConfigured } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import StaffManagement from '@/components/StaffManagement'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  if (!isSupabaseConfigured()) return notFound()

  const db = createServerClient()
  const { data: biz } = await db
    .from('businesses')
    .select('id, name, slug, opening_hours, services(id, name, duration, price)')
    .eq('slug', slug)
    .single()
  if (!biz) return notFound()

  const staff = await listStaff(slug)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const services = (biz.services as any[] ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => ({ id: s.id, name: s.name, duration: s.duration, price: s.price }))
    .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i)

  return (
    <StaffManagement
      businessSlug={slug}
      businessName={biz.name}
      services={services}
      businessHours={biz.opening_hours ?? null}
      initialStaff={staff}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  return { title: `${slug} · Staff — BRIDGE` }
}
