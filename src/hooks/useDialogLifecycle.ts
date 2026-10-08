import { useEffect, useRef } from 'react'

export function useDialogLifecycle(onClose: () => void) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape') {
        onClose()
        return
      }

      if (keyboardEvent.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])',
      ))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (keyboardEvent.shiftKey && document.activeElement === first) {
        keyboardEvent.preventDefault()
        last.focus()
      } else if (!keyboardEvent.shiftKey && document.activeElement === last) {
        keyboardEvent.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previousFocus?.focus()
    }
  }, [onClose])

  return { closeButtonRef, dialogRef }
}
