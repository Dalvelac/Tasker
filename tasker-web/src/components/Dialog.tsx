import { useEffect, useRef, type ReactNode } from 'react'

export function Dialog({
  label,
  children,
  onClose,
  wide = false,
}: {
  label: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    const focus = dialog.querySelector<HTMLElement>('[data-initial-focus]')
    focus?.focus()
    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [])
  return (
    <dialog
      aria-label={label}
      ref={ref}
      className={'modal-panel native-dialog' + (wide ? ' modal-panel--wide' : '')}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const b = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < b.left ||
            event.clientX > b.right ||
            event.clientY < b.top ||
            event.clientY > b.bottom
          )
            onClose()
        }
      }}
    >
      {children}
    </dialog>
  )
}
