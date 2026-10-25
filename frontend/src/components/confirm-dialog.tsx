import { AlertDialog } from '@astryxdesign/core/AlertDialog'

/** A yes/no question before something that cannot be undone. Controlled: the caller owns `open`; confirming closes it. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = 'danger',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  tone?: 'danger' | 'default'
}) {
  return (
    <AlertDialog
      isOpen={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      cancelLabel="Hủy"
      actionLabel={confirmLabel}
      actionVariant={tone === 'danger' ? 'destructive' : 'primary'}
      onAction={() => {
        onConfirm()
        onOpenChange(false)
      }}
    />
  )
}

export { ConfirmDialog }
