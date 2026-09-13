import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}: CardProps) {
  const base = 'rounded-2xl transition-all duration-150';

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variantStyles = {
    default: 'bg-white border border-slate-200 shadow-xs',
    elevated: 'bg-white border border-slate-100 shadow-md',
    bordered: 'bg-white border-2 border-slate-200',
    interactive:
      'bg-white border border-slate-200 shadow-xs hover:shadow-md hover:border-blue-400 cursor-pointer',
  };

  return (
    <div
      className={`${base} ${paddingStyles[padding]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
