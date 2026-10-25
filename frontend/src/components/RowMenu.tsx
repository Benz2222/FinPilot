import { MoreHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DropdownMenu, DropdownMenuDivider, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu'
import { Icon } from '@astryxdesign/core/Icon'
import { IconButton } from '@astryxdesign/core/IconButton'

export interface RowAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  destructive?: boolean
}

/** The "⋯" menu on a list row. Destructive actions go last, after a divider. */
export function RowMenu({ label, actions }: { label: string; actions: RowAction[] }) {
  const safe = actions.filter((a) => !a.destructive)
  const danger = actions.filter((a) => a.destructive)
  return (
    <DropdownMenu
      placement="below"
      alignment="end"
      hasChevron={false}
      renderTrigger={(props) => <IconButton {...props} variant="ghost" label={label} icon={<Icon icon={MoreHorizontal} />} />}
    >
      {safe.map((a) => (
        <DropdownMenuItem key={a.label} icon={a.icon} label={a.label} onClick={a.onClick} />
      ))}
      {safe.length > 0 && danger.length > 0 && <DropdownMenuDivider />}
      {danger.map((a) => (
        <DropdownMenuItem key={a.label} icon={a.icon} label={a.label} variant="destructive" onClick={a.onClick} />
      ))}
    </DropdownMenu>
  )
}
