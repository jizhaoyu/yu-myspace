import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
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
        "inline-flex h-7 w-12 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:opacity-50",
        checked
          ? "border-amber-300/35 bg-amber-400/25"
          : "border-white/10 bg-slate-900/80",
        className,
      )}
    >
      <span
        className={cn(
          "ml-0.5 size-5 rounded-full bg-white transition",
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
        "text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400",
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
  // lightweight placeholder for now; prevents runtime crash in browser preview
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
          "panel-surface noise-mask relative overflow-hidden rounded-[28px] p-5",
          className,
        )}
        {...props}
      >
        {(title || description || actions) && (
          <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              {title ? (
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="max-w-2xl text-sm text-slate-400">{description}</p>
              ) : null}
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
    "border border-amber-300/25 bg-amber-400/90 text-slate-950 shadow-[0_16px_32px_rgba(245,158,11,0.24)] hover:bg-amber-300",
  secondary:
    "border border-slate-700/80 bg-slate-900/80 text-slate-100 hover:border-slate-600 hover:bg-slate-800/80",
  ghost:
    "border border-transparent bg-white/5 text-slate-200 hover:bg-white/10",
  danger:
    "border border-rose-400/25 bg-rose-500/14 text-rose-200 hover:bg-rose-500/20",
};

const buttonSizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  md: "h-11 px-4 text-sm",
  sm: "h-9 px-3 text-xs",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "secondary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-w-11 cursor-pointer items-center justify-center gap-2 rounded-2xl font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-55",
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
  neutral: "bg-white/6 text-slate-300 ring-white/8",
  accent: "bg-amber-400/16 text-amber-200 ring-amber-200/16",
  success: "bg-emerald-400/14 text-emerald-200 ring-emerald-200/16",
  warning: "bg-yellow-400/14 text-yellow-200 ring-yellow-200/16",
  danger: "bg-rose-400/14 text-rose-200 ring-rose-200/16",
  info: "bg-sky-400/14 text-sky-200 ring-sky-200/16",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.22em] ring-1",
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

export function ProgressBar({
  value,
  indicatorClassName,
  className,
}: ProgressBarProps) {
  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-2.5 overflow-hidden rounded-full bg-white/7",
        className,
      )}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full bg-[linear-gradient(90deg,rgba(56,189,248,0.8),rgba(245,158,11,0.95))] transition-transform duration-300",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - value}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export function FieldLabel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-slate-100 outline-none transition focus:border-sky-300/45 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-300/20",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[180px] w-full rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-sky-300/45 focus:bg-slate-950/80 focus:ring-2 focus:ring-sky-300/20",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

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
        "flex min-h-11 cursor-pointer items-center justify-between rounded-2xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "border-amber-300/30 bg-amber-400/10 text-amber-100"
          : "border-white/8 bg-white/4 text-slate-300 hover:bg-white/8",
      )}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={cn(
          "relative h-6 w-11 rounded-full border transition",
          checked
            ? "border-amber-300/35 bg-amber-400/25"
            : "border-white/10 bg-slate-900/80",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-4 rounded-full bg-white transition",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
