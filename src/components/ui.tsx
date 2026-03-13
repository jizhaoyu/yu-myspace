import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogContent = DialogPrimitive.Content;
export const DialogHeader = (props: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-2 space-y-1", props.className)} {...props} />
);
export const DialogTitle = DialogPrimitive.Title;
export const DialogFooter = (props: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 flex justify-end gap-2", props.className)} {...props} />
);

type PanelProps = HTMLAttributes<HTMLElement> & {
  title?: string;
  description?: string;
  actions?: ReactNode;
};

export type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function Switch({ checked, onCheckedChange, disabled, id, className }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-7 w-12 items-center rounded-full border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]/35 disabled:opacity-50",
        checked
          ? "border-[color:var(--accent-strong)]/40 bg-[color:var(--accent-soft)]"
          : "border-[color:var(--border)] bg-[color:var(--input)]",
        className,
      )}
    >
      <span
        className={cn(
          "ml-0.5 size-5 rounded-full bg-[color:var(--foreground)] transition",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted)]",
        className,
      )}
      {...props}
    />
  );
}

export type ToastPayload = {
  title: string;
  description?: string;
  variant?: "destructive" | "default";
};

export function toast(_payload: ToastPayload) {
  // Preview-safe placeholder to avoid runtime errors before a real toast system is wired in.
}

export function Panel({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <section
        className={cn(
          "panel-surface noise-mask relative overflow-hidden rounded-[30px] p-5 md:p-6",
          className,
        )}
        {...props}
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-sky-400/5 blur-3xl" />
        {(title || description || actions) && (
          <div className="relative z-10 mb-5 flex items-start justify-between gap-3">
            <div className="space-y-1">
              {title ? (
                <h2 className="text-lg font-semibold tracking-tight text-[color:var(--foreground)] md:text-[1.15rem]">
                  {title}
                </h2>
              ) : null}
              {description ? <p className="max-w-2xl text-sm leading-6 text-[color:var(--muted)]">{description}</p> : null}
            </div>
            {actions ? <div className="shrink-0">{actions}</div> : null}
          </div>
        )}
        <div className="relative z-10">{children}</div>
      </section>
    </motion.div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  loading?: boolean;
};

const buttonVariants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "border border-[color:var(--accent-strong)]/28 bg-[color:var(--accent-strong)] text-white shadow-[0_12px_30px_rgba(14,165,233,0.18)] hover:-translate-y-0.5 hover:brightness-105",
  secondary:
    "border border-[color:var(--border)] bg-[color:var(--card-strong)] text-[color:var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:border-[color:var(--accent-strong)]/30 hover:bg-[color:var(--background-elevated)]",
  ghost:
    "border border-transparent bg-transparent text-[color:var(--muted-strong)] hover:border-[color:var(--border)] hover:bg-[color:var(--accent-soft)] hover:text-[color:var(--foreground)]",
  danger:
    "border border-rose-500/28 bg-rose-500/12 text-rose-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:-translate-y-0.5 hover:bg-rose-500/18",
};

const buttonSizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3.5 text-[12px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-w-11 cursor-pointer items-center justify-center gap-2 rounded-xl font-medium tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]/35 disabled:cursor-not-allowed disabled:opacity-55",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </button>
  ),
);

Button.displayName = "Button";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
};

const badgeTones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-[color:var(--accent-soft)] text-[color:var(--foreground)] ring-[color:var(--border)]",
  accent: "bg-sky-500/12 text-sky-300 ring-sky-500/24",
  success: "bg-emerald-500/12 text-emerald-300 ring-emerald-500/24",
  warning: "bg-amber-500/14 text-amber-300 ring-amber-500/24",
  danger: "bg-rose-500/12 text-rose-300 ring-rose-500/24",
  info: "bg-cyan-500/12 text-cyan-300 ring-cyan-500/24",
};

export function Badge({ tone = "neutral", className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] ring-1",
        badgeTones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

type ProgressBarProps = {
  value: number;
  indicatorClassName?: string;
  className?: string;
};

export function ProgressBar({ value, indicatorClassName, className }: ProgressBarProps) {
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-2.5 overflow-hidden rounded-full bg-[color:var(--accent-soft)]", className)}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full bg-[color:var(--accent-strong)] shadow-[0_0_18px_rgba(56,189,248,0.25)] transition-transform duration-300",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function FieldLabel({ className, children, ...props }: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input)] px-4 text-sm text-[color:var(--foreground)] outline-none transition-all placeholder:text-[color:var(--muted)] hover:border-[color:var(--accent-strong)]/35 hover:bg-[color:var(--input-hover)] focus:border-[color:var(--accent-strong)]/45 focus:bg-[color:var(--input-hover)] focus:ring-2 focus:ring-[color:var(--accent-strong)]/20",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[180px] w-full rounded-[24px] border border-[color:var(--border)] bg-[color:var(--input)] px-4 py-3 text-sm leading-7 text-[color:var(--foreground)] outline-none transition-all placeholder:text-[color:var(--muted)] hover:border-[color:var(--accent-strong)]/35 hover:bg-[color:var(--input-hover)] focus:border-[color:var(--accent-strong)]/45 focus:bg-[color:var(--input-hover)] focus:ring-2 focus:ring-[color:var(--accent-strong)]/20",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--input)] px-4 text-sm text-[color:var(--foreground)] outline-none transition-all hover:border-[color:var(--accent-strong)]/35 hover:bg-[color:var(--input-hover)] focus:border-[color:var(--accent-strong)]/45 focus:bg-[color:var(--input-hover)] focus:ring-2 focus:ring-[color:var(--accent-strong)]/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);

Select.displayName = "Select";

type ToggleProps = {
  checked: boolean;
  onPressedChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
};

export function Toggle({ checked, onPressedChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onPressedChange(!checked)}
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-between rounded-xl border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]/35 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-[color:var(--accent-strong)]/28 bg-[color:var(--accent-soft)] text-[color:var(--foreground)]"
          : "border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--muted-strong)] hover:bg-[color:var(--card-strong)]",
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border transition",
          checked
            ? "border-[color:var(--accent-strong)]/35 bg-[color:var(--accent-soft)]"
            : "border-[color:var(--border)] bg-[color:var(--input)]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-[color:var(--foreground)] transition",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
