import * as React from "react"
import { cn } from "cn"
import { DropdownMenu } from "radix-ui"

const Menu = DropdownMenu.Root
const MenuTrigger = DropdownMenu.Trigger

function MenuContent({ className, align = "end", sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          "z-50 min-w-48 overflow-hidden rounded-lg border bg-popover p-1 text-sm text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  )
}

function MenuItem({ className, tone, ...props }: React.ComponentProps<typeof DropdownMenu.Item> & { tone?: "danger" }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:text-muted-foreground",
        tone === "danger" && "text-destructive data-[highlighted]:bg-shortage-soft [&_svg]:text-destructive",
        className
      )}
      {...props}
    />
  )
}

function MenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Label>) {
  return <DropdownMenu.Label className={cn("px-2.5 py-1.5 text-xs text-muted-foreground", className)} {...props} />
}

function MenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenu.Separator>) {
  return <DropdownMenu.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />
}

export { Menu, MenuTrigger, MenuContent, MenuItem, MenuLabel, MenuSeparator }
