'use client'

import { useEffect, useCallback, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className={cn(
                'w-full max-w-md bg-bridge-card rounded-modal shadow-modal max-h-[85vh] overflow-y-auto pointer-events-auto',
                className,
              )}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {title && (
                <div className="sticky top-0 bg-bridge-card rounded-t-modal z-10">
                  <div className="flex items-center justify-between px-card-padding pt-card-padding pb-3">
                    <h2 className="text-title text-bridge-heading">{title}</h2>
                    <button
                      onClick={onClose}
                      className="p-1 rounded-full hover:bg-bridge-surface transition-colors"
                    >
                      <X size={20} className="text-bridge-muted" />
                    </button>
                  </div>
                </div>
              )}
              <div className={cn('px-card-padding pb-card-padding', !title && 'pt-card-padding')}>{children}</div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
