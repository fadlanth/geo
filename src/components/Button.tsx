import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  title?: string;
  className?: string;
  children?: React.ReactNode;
  onClick?: (e: any) => void;
}

const BASE = 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-xs transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--color-primary)] text-[var(--color-base)] hover:bg-[var(--color-primary-light)] shadow-sm shadow-[var(--color-primary)]/20',
  secondary: 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100',
  ghost: 'text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5'
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-4 py-2.5',
  sm: 'px-3 py-1.5 text-[11px]'
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  type = 'button',
  disabled,
  title,
  className = '',
  children,
  onClick
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}