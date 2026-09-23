import React from 'react';

type IconButtonTone = 'default' | 'primary' | 'danger';
type IconButtonSize = 'md' | 'sm';

interface IconButtonProps {
  label: string;
  icon: React.ReactNode;
  tone?: IconButtonTone;
  size?: IconButtonSize;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const BASE = 'inline-flex items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-[var(--color-primary)]';

const TONES: Record<IconButtonTone, string> = {
  default: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
  primary: 'text-gray-600 hover:text-blue-700 hover:bg-blue-50',
  danger: 'text-rose-600/80 hover:text-rose-700 hover:bg-rose-50'
};

const SIZES: Record<IconButtonSize, string> = {
  md: 'p-1.5',
  sm: 'p-1'
};

export default function IconButton({
  label,
  icon,
  tone = 'default',
  size = 'md',
  className = '',
  onClick
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`${BASE} ${TONES[tone]} ${SIZES[size]} ${className}`}
    >
      {icon}
    </button>
  );
}