import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary hover:bg-primary-hover disabled:bg-surface-muted disabled:text-muted-foreground dark:text-slate-950",
  secondary:
    "bg-secondary hover:brightness-110 disabled:bg-surface-muted disabled:text-muted-foreground dark:text-slate-950",
  accent:
    "bg-accent hover:brightness-105 disabled:bg-surface-muted disabled:text-muted-foreground dark:text-slate-900",
  ghost:
    "bg-transparent text-[var(--button-ghost-fg)] hover:bg-surface-muted disabled:text-muted-foreground",
  outline:
    "border border-border bg-transparent text-[var(--button-outline-fg)] hover:border-primary hover:text-primary disabled:text-muted-foreground",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  /** Gộp style nút vào một phần tử con duy nhất (vd `next/link`). */
  asChild?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  type = "button",
  children,
  asChild = false,
  ...props
}: ButtonProps) {
  const iconNode = icon ? (
    <span aria-hidden="true" className="inline-flex items-center">
      {icon}
    </span>
  ) : null;
  const content = (
    <>
      {iconPosition === "left" ? iconNode : null}
      {children}
      {iconPosition === "right" ? iconNode : null}
    </>
  );

  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
    }>;

    return React.cloneElement(child, {
      className: cn(classes, child.props.className),
      children: (
        <>
          {iconPosition === "left" ? iconNode : null}
          {child.props.children}
          {iconPosition === "right" ? iconNode : null}
        </>
      ),
    });
  }

  return (
    <button type={type} className={classes} {...props}>
      {content}
    </button>
  );
}
