import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helpText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helpText,
      error,
      leftIcon,
      rightIcon,
      id,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-text-primary mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3.5 text-text-muted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
            className={`w-full h-12 rounded-md border-[1.5px] bg-white text-base text-text-primary placeholder:text-text-muted transition-colors duration-160 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
              leftIcon ? "pl-10" : "px-3.5"
            } ${rightIcon ? "pr-10" : "px-3.5"} ${
              error
                ? "border-emergency focus:border-emergency focus:ring-2 focus:ring-emergency-soft"
                : "border-border focus:border-brand focus:ring-2 focus:ring-brand-light"
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <span className="absolute right-3.5 text-text-muted pointer-events-none flex items-center justify-center">
              {rightIcon}
            </span>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-emergency mt-1 flex items-center gap-1 font-medium">
            <svg
              className="w-3.5 h-3.5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{error}</span>
          </p>
        ) : helpText ? (
          <p id={`${inputId}-help`} className="text-xs text-text-muted mt-1">
            {helpText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
