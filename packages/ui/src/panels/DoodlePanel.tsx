import { Undo2, Trash2 } from 'lucide-react';
import type { BrushKind, DoodleLayer } from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { useInteractionStore } from '../store/interactionStore';
import { Button } from '../components/common/Button';
import { Chip, ChipRow } from '../components/common/Chip';
import { ColorPicker } from '../components/common/ColorPicker';
import { Slider } from '../components/common/Slider';
import { PanelHeader, Hint } from '../components/common/Section';

const BRUSHES: { id: BrushKind; label: string }[] = [
  { id: 'pen', label: '画笔' },
  { id: 'marker', label: '马克笔' },
  { id: 'neon', label: '霓虹' },
  { id: 'dashed', label: '虚线' },
  { id: 'eraser', label: '橡皮' },
];

/** Free-hand drawing with several brushes. Strokes live on one doodle layer. */
export function DoodlePanel() {
  const snapshot = useSnapshot();
  const commit = useEditorStore((s) => s.commit);
  const i = useInteractionStore();
  const layer = snapshot.overlays.find((l): l is DoodleLayer => l.type === 'doodle') ?? null;
  const setStrokes = (strokes: DoodleLayer['strokes']): void => {
    if (!layer) return;
    commit({
      overlays: snapshot.overlays.map((l) => (l.id === layer.id ? { ...layer, strokes } : l)),
    });
  };
  return (
    <div data-testid="doodle-panel">
      <PanelHeader
        title="涂鸦"
        right={
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon={<Undo2 size={14} />}
              disabled={!layer?.strokes.length}
              onClick={() => layer && setStrokes(layer.strokes.slice(0, -1))}
              data-testid="doodle-undo"
            >
              撤销一笔
            </Button>
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 size={14} />}
              disabled={!layer?.strokes.length}
              onClick={() => setStrokes([])}
            >
              清空
            </Button>
          </div>
        }
      />
      <ChipRow>
        {BRUSHES.map((b) => (
          <Chip
            key={b.id}
            active={i.brushKind === b.id}
            onClick={() => i.set({ brushKind: b.id })}
            data-testid={`brush-${b.id}`}
          >
            {b.label}
          </Chip>
        ))}
      </ChipRow>
      <ColorPicker value={i.brushColor} onChange={(c) => i.set({ brushColor: c })} />
      <Slider
        label="画笔大小"
        min={2}
        max={150}
        defaultValue={30}
        value={Math.round(i.brushSize * 1000)}
        onChange={(v) => i.set({ brushSize: v / 1000 })}
      />
      <Slider
        label="不透明度"
        min={5}
        max={100}
        defaultValue={100}
        value={Math.round(i.brushOpacity * 100)}
        onChange={(v) => i.set({ brushOpacity: v / 100 })}
      />
      <Hint>
        直接在照片上画。霓虹会发光，马克笔半透明，橡皮只擦除涂鸦笔触。
      </Hint>
    </div>
  );
}
