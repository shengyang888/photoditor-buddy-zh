import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Centred dialog (full-screen sheet on phones). Closes on Escape and backdrop click. */
export function Modal({ open, title, onClose, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-surface border border-border w-full sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <h2 className="font-semibold text-sm">{title}</h2>
          <IconButton label="关闭" icon={<X size={18} />} onClick={onClose} size="sm" />
        </div>
        <div className="overflow-y-auto px-4 py-3 text-sm">{children}</div>
        {footer && (
          <div
            className="px-4 py-3 border-t border-border flex justify-end gap-2 shrink-0"
            style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
