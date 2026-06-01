'use client'

import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'

interface EditableAvatarProps {
  slug: string
  initials: string
  color: string
  imageUrl?: string | null
  className?: string
}

/**
 * Owner-only avatar that opens a file picker on click and uploads the chosen
 * image to `/api/creators/[slug]/avatar`. Shows the new photo immediately on
 * success. Render the plain <Avatar> for non-owners.
 */
export function EditableAvatar({
  slug,
  initials,
  color,
  imageUrl,
  className,
}: EditableAvatarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null | undefined>(imageUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setError(null)
    setUploading(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch(`/api/creators/${slug}/avatar`, {
        method: 'POST',
        body,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setUrl(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto w-24">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Change profile photo"
        className="group relative block rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bridge-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bridge-bg disabled:cursor-wait"
      >
        <Avatar
          initials={initials}
          color={color}
          imageUrl={url}
          size="lg"
          className={cn('w-24 h-24 text-3xl', className)}
        />

        <span
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/45 text-white transition-opacity',
            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Camera size={18} />
              <span className="text-micro font-semibold">Change</span>
            </>
          )}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFile}
        className="hidden"
      />

      {error && <p className="mt-2 text-micro text-red-500">{error}</p>}
    </div>
  )
}
