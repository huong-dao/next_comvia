import * as React from "react";
import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  trailingAction?: React.ReactNode;
  forceActive?: boolean;
  invalid?: boolean;
  errorMessage?: string;
};

export function Input({
  leadingIcon,
  trailingIcon,
  trailingAction,
  forceActive = false,
  invalid = false,
  errorMessage,
  className,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      <div className="relative w-full">
        {leadingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
            {leadingIcon}
          </span>
        ) : null}
        <input
          aria-invalid={invalid || undefined}
          className={cn(
            "h-11 w-full rounded-xl border border-border bg-surface-muted text-sm text-foreground shadow-none outline-none transition focus:!border-primary dark:focus:!border-primary focus:shadow-none",
            leadingIcon ? "pl-10" : "px-4",
            trailingIcon || trailingAction ? "pr-10" : "",
            className,
            forceActive && !invalid && "!border-primary dark:!border-primary",
            invalid &&
              "!border-danger dark:!border-danger text-danger placeholder:text-danger/70 focus:!border-danger dark:focus:!border-danger",
          )}
          {...props}
        />
        {trailingAction ? (
          <span className="absolute inset-y-0 right-2 flex items-center">
            {trailingAction}
          </span>
        ) : null}
        {trailingIcon ? (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
            {trailingIcon}
          </span>
        ) : null}
      </div>
      {errorMessage ? <p className="mt-1 text-xs text-danger/90">{errorMessage}</p> : null}
    </div>
  );
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    invalid?: boolean;
    errorMessage?: string;
  }
>(function Textarea({ invalid = false, errorMessage, className, ...props }, ref) {
  return (
    <div className="w-full">
      <textarea
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground shadow-none outline-none transition focus:!border-primary dark:focus:!border-primary focus:shadow-none",
          className,
          invalid &&
            "!border-danger dark:!border-danger text-danger placeholder:text-danger/70 focus:!border-danger dark:focus:!border-danger",
        )}
        {...props}
      />
      {errorMessage ? <p className="mt-1 text-xs text-danger/90">{errorMessage}</p> : null}
    </div>
  );
});

export function Select({
  invalid = false,
  errorMessage,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  errorMessage?: string;
}) {
  return (
    <div className="w-full">
      <select
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 w-full rounded-xl border border-border bg-surface-muted px-4 text-sm text-foreground shadow-none outline-none transition focus:!border-primary dark:focus:!border-primary focus:shadow-none",
          className,
          invalid &&
            "!border-danger dark:!border-danger text-danger focus:!border-danger dark:focus:!border-danger",
        )}
        {...props}
      />
      {errorMessage ? <p className="mt-1 text-xs text-danger/90">{errorMessage}</p> : null}
    </div>
  );
}
