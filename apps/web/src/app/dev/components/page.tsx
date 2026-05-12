'use client'

import { useState } from 'react'
import { Calendar, Search, Inbox, Users, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Textarea } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/Skeleton'
import { Modal } from '@/components/ui/Modal'

export default function DevComponentsPage() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-section">
      <h1 className="text-display text-bridge-stone">Design System</h1>
      <p className="text-body text-bridge-muted">All shared UI primitives with variants</p>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="sm">Primary SM</Button>
          <Button variant="primary" size="md">Primary MD</Button>
          <Button variant="primary" size="lg">Primary LG</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Card</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card variant="default">
            <p className="text-label">Default Card</p>
            <p className="text-caption text-bridge-muted mt-1">With border, no shadow</p>
          </Card>
          <Card variant="elevated">
            <p className="text-label">Elevated Card</p>
            <p className="text-caption text-bridge-muted mt-1">With shadow, no border</p>
          </Card>
          <Card variant="colored">
            <p className="text-label">Colored Card</p>
            <p className="text-caption text-bridge-muted mt-1">Tinted background</p>
          </Card>
          <Card variant="interactive">
            <p className="text-label">Interactive Card</p>
            <p className="text-caption text-bridge-muted mt-1">Hover to lift</p>
          </Card>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Input</h2>
        <div className="max-w-md space-y-4">
          <Input label="Name" placeholder="Enter your name" />
          <Input label="Search" placeholder="Search..." icon={<Search size={16} />} />
          <Input label="Email" placeholder="you@example.com" error="Invalid email address" />
          <Input label="Disabled" placeholder="Cannot edit" disabled />
          <Textarea label="Description" placeholder="Write something..." rows={3} />
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Badge</h2>
        <div className="flex flex-wrap gap-2">
          <Badge status="confirmed">Confirmed</Badge>
          <Badge status="pending">Pending</Badge>
          <Badge status="cancelled">Cancelled</Badge>
          <Badge status="declined">Declined</Badge>
          <Badge status="completed">Completed</Badge>
          <Badge status="no_show">No Show</Badge>
          <Badge status="repeat">Repeat</Badge>
          <Badge status="active">Active</Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge status="confirmed" size="md">MD Confirmed</Badge>
          <Badge status="pending" size="md">MD Pending</Badge>
        </div>
      </section>

      {/* Avatar */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Avatar</h2>
        <div className="flex items-center gap-3">
          <Avatar initials="SC" color="#e11d48" size="xs" />
          <Avatar initials="SC" color="#e11d48" size="sm" />
          <Avatar initials="SC" color="#e11d48" size="md" />
          <Avatar initials="SC" color="#e11d48" size="lg" />
          <Avatar initials="JD" color="#3b82f6" size="md" />
          <Avatar initials="KP" color="#10b981" size="md" />
        </div>
      </section>

      {/* EmptyState */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">EmptyState</h2>
        <Card variant="default">
          <EmptyState
            icon={<Inbox size={48} />}
            title="No bookings yet"
            description="When customers book through your creator links, they'll appear here."
            action={{ label: 'Invite creators', onClick: () => {} }}
          />
        </Card>
      </section>

      {/* Skeleton */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Skeleton</h2>
        <div className="space-y-3 max-w-md">
          <Skeleton className="h-10 w-full rounded" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonText className="w-3/4" />
              <SkeletonText className="w-1/2" />
            </div>
          </div>
          <SkeletonCard />
        </div>
      </section>

      {/* Modal */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Modal</h2>
        <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example Modal">
          <div className="space-y-4">
            <p className="text-body text-bridge-muted">This is a standardized bottom sheet modal with spring animation.</p>
            <Input label="Full Name" placeholder="Enter name" />
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={() => setModalOpen(false)}>Confirm</Button>
            </div>
          </div>
        </Modal>
      </section>

      {/* Typography Scale */}
      <section className="space-y-4">
        <h2 className="text-heading text-bridge-stone">Typography Scale</h2>
        <div className="space-y-2">
          <p className="text-display">Display (2rem / 900)</p>
          <p className="text-heading">Heading (1.5rem / 900)</p>
          <p className="text-title">Title (1.125rem / 700)</p>
          <p className="text-body">Body (1rem / 400)</p>
          <p className="text-label">Label (0.875rem / 600)</p>
          <p className="text-caption">Caption (0.75rem / 500)</p>
          <p className="text-micro">Micro (0.625rem / 700)</p>
        </div>
      </section>
    </div>
  )
}
