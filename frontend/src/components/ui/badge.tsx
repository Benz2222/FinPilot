import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-border bg-muted text-secondary-foreground",
        primary: "border-[#c7d4f7] bg-primary-soft text-primary",
        danger: "border-shortage-line bg-shortage-soft text-shortage",
        warning: "border-caution-line bg-caution-soft text-caution",
        success: "border-ok-line bg-ok-soft text-ok",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
