import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5',
    md: 'text-sm px-4 py-2.5 min-h-[44px] sm:min-h-[42px] gap-2',
    lg: 'text-base px-6 py-3.5 min-h-[50px] gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow focus:ring-blue-500 border border-blue-600',
    secondary:
      'bg-slate-900 hover:bg-slate-800 text-white shadow-sm hover:shadow focus:ring-slate-900 border border-slate-900',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 focus:ring-slate-400 shadow-xs',
    ghost:
      'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 focus:ring-slate-300',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500 border border-rose-600',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500 border border-emerald-600',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
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
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}
