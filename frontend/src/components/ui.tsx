import React from 'react'
import { clsx } from 'clsx'

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs)
}

type CardProps = React.HTMLAttributes<HTMLDivElement>

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-md border border-border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: CardProps) {
  return <div className={cn('flex items-center justify-between border-b border-border px-4 py-3', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-sm font-semibold leading-none text-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: CardProps) {
  return <div className={cn('p-4', className)} {...props} />
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'icon'
}

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    icon: 'h-8 w-8',
  }

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  )
}

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-primary/10 text-primary ring-primary/20',
    secondary: 'bg-secondary text-secondary-foreground ring-border',
    success: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-300 ring-amber-500/20',
    destructive: 'bg-destructive/10 text-red-300 ring-destructive/20',
    outline: 'text-muted-foreground ring-border',
  }

  return (
    <span
      className={cn('inline-flex h-6 items-center rounded-md px-2 text-xs font-medium ring-1 ring-inset', variants[variant], className)}
      {...props}
    />
  )
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-14 flex-col justify-between gap-3 border-b border-border bg-background/95 px-6 py-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-xl font-semibold tracking-normal text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string
  value: string
  detail: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">{icon}</div>
      </CardContent>
    </Card>
  )
}

