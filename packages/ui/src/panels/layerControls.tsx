import { ArrowDown, ArrowUp, Copy, Trash2 } from 'lucide-react';
import { layerId, type OverlayLayer } from '@photoditor-buddy/core';
import { useEditorStore } from '../store/editorStore';
import { Slider } from '../components/common/Slider';
import { IconButton } from '../components/common/IconButton';

/** Shared position/size/opacity sliders and order/duplicate/delete buttons for a selected layer. */
export function LayerCommonControls({
  layer,
  sizeKey,
}: {
  layer: OverlayLayer;
  sizeKey?: 'fontSize' | 'size';
}) {
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const moveLayer = useEditorStore((s) => s.moveLayer);
  const addLayer = useEditorStore((s) => s.addLayer);
  const sizeValue = sizeKey
    ? Math.round(((layer as unknown as Record<string, number>)[sizeKey] ?? 0.1) * 1000)
    : null;
  return (
    <div>
      {sizeKey && sizeValue !== null && (
        <Slider
          label="大小"
          min={10}
          max={600}
          value={sizeValue}
          onChange={(v) =>
            updateLayer(layer.id, { [sizeKey]: v / 1000 } as Partial<OverlayLayer>, true)
          }
          onCommit={(v) => updateLayer(layer.id, { [sizeKey]: v / 1000 } as Partial<OverlayLayer>)}
        />
      )}
      <Slider
        label="旋转"
        min={-180}
        max={180}
        value={Math.round(layer.rotation)}
        format={(v) => `${v}°`}
        onChange={(v) => updateLayer(layer.id, { rotation: v }, true)}
        onCommit={(v) => updateLayer(layer.id, { rotation: v })}
      />
      <Slider
        label="不透明度"
        min={0}
        max={100}
        defaultValue={100}
        value={Math.round(layer.opacity * 100)}
        onChange={(v) => updateLayer(layer.id, { opacity: v / 100 }, true)}
        onCommit={(v) => updateLayer(layer.id, { opacity: v / 100 })}
      />
      <div className="flex gap-1 mt-1">
        <IconButton
          label="上移一层"
          icon={<ArrowUp size={16} />}
          onClick={() => moveLayer(layer.id, 'up')}
        />
        <IconButton
          label="下移一层"
          icon={<ArrowDown size={16} />}
          onClick={() => moveLayer(layer.id, 'down')}
        />
        <IconButton
          label="复制"
          icon={<Copy size={16} />}
          onClick={() =>
            addLayer({
              ...layer,
              id: layerId(layer.type),
              x: Math.min(0.95, layer.x + 0.04),
              y: Math.min(0.95, layer.y + 0.04),
            } as OverlayLayer)
          }
        />
        <IconButton
          label="删除图层"
          icon={<Trash2 size={16} />}
          className="text-danger"
          onClick={() => removeLayer(layer.id)}
          data-testid="delete-layer"
        />
      </div>
    </div>
  );
}
