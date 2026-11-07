import { Loader2 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { Button } from './Button';

/** Full-screen progress overlay for long operations (AI calls, model downloads, export). */
export function BusyOverlay() {
  const busy = useEditorStore((s) => s.busy);
  if (!busy) return null;
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="bg-surface border border-border rounded-2xl p-5 w-[min(90vw,340px)] flex flex-col items-center gap-3 text-center">
        <Loader2 className="animate-spin text-accent" size={28} />
        <div className="text-sm">{busy.message}</div>
        {typeof busy.progress === 'number' && (
          <div className="w-full h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.round(busy.progress * 100)}%` }}
            />
          </div>
        )}
        {busy.cancel && (
          <Button size="sm" variant="ghost" onClick={busy.cancel}>
            取消
          </Button>
        )}
      </div>
    </div>
  );
}
