import React, { forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "emergency" | "whatsapp";
export type ButtonSize = "s" | "m" | "l" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-sm hover:bg-brand-dark hover:shadow-md focus-visible:outline-brand active:scale-[0.98]",
  secondary:
    "bg-white text-brand border-[1.5px] border-brand hover:bg-brand-light focus-visible:outline-brand active:scale-[0.98]",
  ghost:
    "bg-transparent text-text-muted hover:bg-bg-soft hover:text-text-primary focus-visible:outline-brand active:scale-[0.98]",
  emergency:
    "bg-emergency text-white hover:bg-emergency-dark focus-visible:outline-emergency active:scale-[0.98]",
  whatsapp:
    "bg-whatsapp text-white hover:bg-whatsapp-dark focus-visible:outline-whatsapp active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  // Every size is at least 44px tall (h-11) so that touch targets meet
  // WCAG 2.5.8 / platform minimums, including the emergency call actions.
  s: "h-11 px-4 text-sm rounded-md",
  m: "h-11 px-[22px] text-[15px] rounded-md",
  l: "h-[52px] px-7 text-base rounded-[14px]",
  icon: "h-11 w-11 p-0 rounded-md shrink-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "m",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-160 select-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
          variantStyles[variant]
        } ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center justify-center">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Loading...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
