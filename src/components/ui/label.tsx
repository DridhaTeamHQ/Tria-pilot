import * as React from 'react'
import { cn } from '@/lib/utils'

type LabelProps = React.HTMLAttributes<HTMLElement> & {
  htmlFor?: string
}

function Label({ className, htmlFor, ...props }: LabelProps) {
  const classes = cn(
    'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    className,
  )

  if (htmlFor) {
    return (
      <label
        className={classes}
        htmlFor={htmlFor}
        {...(props as React.LabelHTMLAttributes<HTMLLabelElement>)}
      />
    )
  }

  return <div className={classes} {...props} />
}

export { Label }
