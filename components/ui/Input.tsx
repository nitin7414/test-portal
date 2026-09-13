import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
          >
            {label}
          </label>
        )}
        <div className="relative rounded-xl shadow-xs">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-xl border bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400 ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''} ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200'
                : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-600 flex items-center gap-1 font-medium">{error}</p>
        ) : hint ? (
          <p className="text-xs text-slate-500">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
