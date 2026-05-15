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
            className="fixed inset-0 bg-bridge-heading/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-bridge-card rounded-t-modal shadow-modal max-h-[85vh] overflow-y-auto',
              className,
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="sticky top-0 bg-bridge-card rounded-t-modal z-10">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-bridge-border-strong" />
              </div>
              {title && (
                <div className="flex items-center justify-between px-card-padding pb-3">
                  <h2 className="text-title text-bridge-heading">{title}</h2>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-full hover:bg-bridge-surface transition-colors"
                  >
                    <X size={20} className="text-bridge-muted" />
                  </button>
                </div>
              )}
            </div>
            <div className="px-card-padding pb-card-padding">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
