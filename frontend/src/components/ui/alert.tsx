import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const alertVariants = cva(
  "grid w-full gap-x-3 gap-y-1 rounded-lg border px-4 py-3.5 text-sm has-[>svg]:grid-cols-[auto_minmax(0,1fr)] *:[svg]:row-span-3 *:[svg]:mt-0.5 *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        info: "border-border bg-card text-foreground *:[svg]:text-primary",
        danger: "border-shortage-line bg-shortage-soft text-foreground *:[svg]:text-shortage",
        warning: "border-caution-line bg-caution-soft text-foreground *:[svg]:text-caution-mark",
        success: "border-ok-line bg-ok-soft text-foreground *:[svg]:text-ok",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

/** `role` defaults to none: pass role="alert" only for messages that appear in response to an action. */
function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="alert-title" className={cn("font-semibold", className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-secondary-foreground [&_p+p]:mt-1", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
