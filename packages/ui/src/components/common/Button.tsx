import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  block?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-contrast hover:brightness-110 font-semibold',
  secondary: 'bg-surface-3 text-text hover:bg-[#333944]',
  ghost: 'bg-transparent text-text hover:bg-surface-3',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
  ai: 'ai-gradient text-white font-semibold hover:brightness-110',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

/** Standard button. `variant="ai"` is reserved for actions that call an AI model. */
export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  block,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed select-none ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
