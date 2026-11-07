import { lazy, Suspense, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { IconButton } from '../common/IconButton';
import type { ToolId } from '../../store/types';

const panels: Record<ToolId, React.LazyExoticComponent<() => ReactNode>> = {
  adjust: lazy(() => import('../../panels/AdjustPanel').then((m) => ({ default: m.AdjustPanel }))),
  filters: lazy(() =>
    import('../../panels/FiltersPanel').then((m) => ({ default: m.FiltersPanel })),
  ),
  crop: lazy(() => import('../../panels/CropPanel').then((m) => ({ default: m.CropPanel }))),
  effects: lazy(() =>
    import('../../panels/EffectsPanel').then((m) => ({ default: m.EffectsPanel })),
  ),
  beauty: lazy(() => import('../../panels/BeautyPanel').then((m) => ({ default: m.BeautyPanel }))),
  ai: lazy(() => import('../../panels/AiPanel').then((m) => ({ default: m.AiPanel }))),
  text: lazy(() => import('../../panels/TextPanel').then((m) => ({ default: m.TextPanel }))),
  stickers: lazy(() =>
    import('../../panels/StickersPanel').then((m) => ({ default: m.StickersPanel })),
  ),
  frames: lazy(() => import('../../panels/FramesPanel').then((m) => ({ default: m.FramesPanel }))),
  doodle: lazy(() => import('../../panels/DoodlePanel').then((m) => ({ default: m.DoodlePanel }))),
  mosaic: lazy(() => import('../../panels/MosaicPanel').then((m) => ({ default: m.MosaicPanel }))),
  watermark: lazy(() =>
    import('../../panels/WatermarkPanel').then((m) => ({ default: m.WatermarkPanel })),
  ),
  layers: lazy(() => import('../../panels/LayersPanel').then((m) => ({ default: m.LayersPanel }))),
};

/** Hosts the active tool's panel: a right sidebar on desktop, a bottom sheet on phones. */
export function PanelHost() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setTool = useEditorStore((s) => s.setTool);
  const desktop = useIsDesktop();
  if (!activeTool) return null;
  const Panel = panels[activeTool];
  return (
    <aside
      className={
        desktop
          ? 'w-[340px] shrink-0 border-l border-border bg-surface flex flex-col min-h-0'
          : 'relative shrink-0 border-t border-border bg-surface flex flex-col max-h-[46vh]'
      }
      data-testid={`panel-${activeTool}`}
    >
      {!desktop && (
        <div className="absolute top-1 right-1 z-10">
          <IconButton
            label="关闭面板"
            icon={<X size={16} />}
            size="sm"
            onClick={() => setTool(null)}
          />
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 pt-1">
        <ErrorBoundary>
          <Suspense fallback={<div className="text-xs text-muted p-3">加载中…</div>}>
            <Panel />
          </Suspense>
        </ErrorBoundary>
      </div>
    </aside>
  );
}
