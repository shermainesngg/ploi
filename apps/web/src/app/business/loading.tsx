import { DashboardSkeleton } from '@/components/PageSkeletons'

// /business is the post-login landing for business owners, who are by far the
// common navigators here (the marketing landing page is mostly hit via direct/
// external links). Show the dashboard skeleton so owner navigation paints
// instantly instead of blocking on the full dashboard data fetch.
export default function Loading() {
  return <DashboardSkeleton />
}
