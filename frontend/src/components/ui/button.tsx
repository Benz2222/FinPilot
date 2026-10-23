import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground font-semibold shadow-[0_0_0_1px_rgb(76_201_224/0.4),0_0_18px_-6px_var(--primary)] hover:bg-[#7ad8ea]",
        outline: "border-input! bg-card text-foreground hover:border-input-hover! hover:bg-secondary",
        secondary: "bg-secondary text-foreground hover:bg-border",
        ghost: "text-secondary-foreground hover:bg-secondary hover:text-foreground",
        destructive: "bg-destructive text-[#1a0505] font-semibold hover:bg-[#ff8a8a]",
        "destructive-ghost": "text-destructive hover:bg-shortage-soft",
        link: "h-auto px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 gap-1.5 px-3 text-[0.8125rem]",
        lg: "h-12 px-5 text-[0.9375rem]",
        icon: "size-10",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
