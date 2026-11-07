import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  active?: boolean;
  size?: 'sm' | 'md';
}

/** Square icon-only button with an accessible label (shown as tooltip). */
export function IconButton({
  label,
  icon,
  active,
  size = 'md',
  className = '',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'} ${active ? 'bg-accent/20 text-accent' : 'text-text hover:bg-surface-3'} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
