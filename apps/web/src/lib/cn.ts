import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/*
 * The project defines custom font-size tokens (text-display, text-body, text-label, …).
 * tailwind-merge doesn't know these are font sizes, so by default it lumps e.g. `text-body`
 * and a custom text color like `text-bridge-ink-foreground` into the same conflict group and
 * drops one of them. Register the tokens as font-size so size and color never collide.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['display', 'heading', 'title', 'body-lg', 'body', 'label', 'caption', 'micro'] },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
