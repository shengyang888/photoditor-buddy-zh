import type { ReactNode } from 'react';

/** Titled block inside a panel. */
export function Section({
  title,
  right,
  children,
  className = '',
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mb-3 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between mb-1">
          {title && (
            <h3 className="text-[11px] uppercase tracking-wider text-muted font-semibold">
              {title}
            </h3>
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

/** Panel header with a title and optional actions. */
export function PanelHeader({
  title,
  badge,
  right,
}: {
  title: string;
  badge?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between h-10 px-1 pr-9 lg:pr-1 shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge}
      </div>
      {right}
    </div>
  );
}

/** Small muted helper text. */
export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted leading-relaxed mt-1">{children}</p>;
}
