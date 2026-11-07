import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

/** Stacked notifications in the top-centre. Errors stay longer and can be dismissed. */
export function Toasts() {
  const toasts = useEditorStore((s) => s.toasts);
  const dismiss = useEditorStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-14 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 w-[min(92vw,420px)]"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={`fade-in flex items-start gap-2 rounded-xl border px-3 py-2 text-sm shadow-lg ${t.kind === 'error' ? 'bg-[#2a1416] border-danger/40 text-red-100' : t.kind === 'success' ? 'bg-[#0f2a20] border-success/40 text-emerald-100' : 'bg-surface-2 border-border'}`}
        >
          <span className="mt-0.5 shrink-0">
            {t.kind === 'error' ? (
              <AlertCircle size={16} />
            ) : t.kind === 'success' ? (
              <CheckCircle2 size={16} />
            ) : (
              <Info size={16} />
            )}
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            aria-label="关闭"
            className="shrink-0 opacity-70 hover:opacity-100"
            onClick={() => dismiss(t.id)}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
