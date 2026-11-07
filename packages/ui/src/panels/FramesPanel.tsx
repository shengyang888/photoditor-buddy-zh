import { FRAME_STYLES, createFrameLayer, type FrameLayer } from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { Button } from '../components/common/Button';
import { ColorPicker } from '../components/common/ColorPicker';
import { Slider } from '../components/common/Slider';
import { PanelHeader, Hint } from '../components/common/Section';

/** Programmatic frames (no downloads). One frame layer at a time. */
export function FramesPanel() {
  const snapshot = useSnapshot();
  const addLayer = useEditorStore((s) => s.addLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const layer = snapshot.overlays.find((l): l is FrameLayer => l.type === 'frame') ?? null;
  const choose = (frameId: string): void => {
    if (layer) updateLayer(layer.id, { frameId });
    else addLayer(createFrameLayer(frameId), false);
  };
  return (
    <div data-testid="frames-panel">
      <PanelHeader
        title="相框"
        right={
          layer && (
            <Button size="sm" variant="ghost" onClick={() => removeLayer(layer.id)}>
              移除
            </Button>
          )
        }
      />
      <div className="grid grid-cols-3 gap-2" data-testid="frame-grid">
        {FRAME_STYLES.map((f) => (
          <button
            key={f.id}
            type="button"
            title={f.description}
            aria-pressed={layer?.frameId === f.id}
            data-testid={`frame-${f.id}`}
            className={`h-12 rounded-xl text-xs border transition ${layer?.frameId === f.id ? 'bg-accent/15 border-accent text-accent' : 'bg-surface-2 border-border hover:bg-surface-3'}`}
            onClick={() => choose(f.id)}
          >
            {f.name}
          </button>
        ))}
      </div>
      {layer ? (
        <div className="mt-2">
          <ColorPicker
            label="颜色"
            value={layer.color}
            onChange={(c) => updateLayer(layer.id, { color: c })}
          />
          <Slider
            label="粗细"
            min={1}
            max={150}
            defaultValue={30}
            value={Math.round(layer.width * 1000)}
            onChange={(v) => updateLayer(layer.id, { width: v / 1000 }, true)}
            onCommit={(v) => updateLayer(layer.id, { width: v / 1000 })}
          />
          {layer.frameId === 'rounded' && (
            <Slider
              label="圆角"
              min={0}
              max={300}
              defaultValue={50}
              value={Math.round(layer.radius * 1000)}
              onChange={(v) => updateLayer(layer.id, { radius: v / 1000 }, true)}
              onCommit={(v) => updateLayer(layer.id, { radius: v / 1000 })}
            />
          )}
          <Slider
            label="不透明度"
            min={0}
            max={100}
            defaultValue={100}
            value={Math.round(layer.opacity * 100)}
            onChange={(v) => updateLayer(layer.id, { opacity: v / 100 }, true)}
            onCommit={(v) => updateLayer(layer.id, { opacity: v / 100 })}
          />
        </div>
      ) : (
        <Hint>选一种相框样式，之后还能改颜色和粗细。</Hint>
      )}
    </div>
  );
}
