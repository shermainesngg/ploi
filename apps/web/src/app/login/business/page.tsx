import { redirect } from 'next/navigation'

interface PageProps {
  searchParams: Promise<{ next?: string }>
}

// Login is unified — role is inferred from the account email. Keep this path alive
// for old bookmarks/links and forward it to the single sign-in page.
export default async function BusinessLoginPage({ searchParams }: PageProps) {
  const { next } = await searchParams
  redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
}
