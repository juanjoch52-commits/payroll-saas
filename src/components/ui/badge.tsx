import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Badge con variants semánticas que respetan tokens del tema actual.
 * Nunca uses `bg-green-100 text-green-700` directamente — usa <Badge variant="success">.
 */
const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        success:
          'border-transparent bg-success/15 text-success-foreground dark:bg-success/25',
        warning:
          'border-transparent bg-warning/15 text-warning-foreground dark:bg-warning/25',
        destructive:
          'border-transparent bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-destructive-foreground',
        info: 'border-transparent bg-info/15 text-info-foreground dark:bg-info/25',
        muted: 'border-transparent bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
