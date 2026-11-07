import { Undo2, Trash2 } from 'lucide-react';
import type { MosaicLayer, MosaicStyle } from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { useInteractionStore } from '../store/interactionStore';
import { Button } from '../components/common/Button';
import { Chip, ChipRow } from '../components/common/Chip';
import { Slider } from '../components/common/Slider';
import { PanelHeader, Hint } from '../components/common/Section';

const STYLES: { id: MosaicStyle; label: string }[] = [
  { id: 'pixel', label: '像素' },
  { id: 'blur', label: '模糊' },
  { id: 'hex', label: '六边形' },
  { id: 'crystal', label: '水晶' },
];

/** Paint a mosaic / blur over faces, plates and private details. */
export function MosaicPanel() {
  const snapshot = useSnapshot();
  const commit = useEditorStore((s) => s.commit);
  const i = useInteractionStore();
  const layer = snapshot.overlays.find((l): l is MosaicLayer => l.type === 'mosaic') ?? null;
  const setStrokes = (strokes: MosaicLayer['strokes']): void => {
    if (!layer) return;
    commit({
      overlays: snapshot.overlays.map((l) => (l.id === layer.id ? { ...layer, strokes } : l)),
    });
  };
  return (
    <div data-testid="mosaic-panel">
      <PanelHeader
        title="马赛克"
        right={
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon={<Undo2 size={14} />}
              disabled={!layer?.strokes.length}
              onClick={() => layer && setStrokes(layer.strokes.slice(0, -1))}
              data-testid="mosaic-undo"
            >
              撤销
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
        {STYLES.map((s) => (
          <Chip
            key={s.id}
            active={i.mosaicStyle === s.id}
            onClick={() => i.set({ mosaicStyle: s.id })}
            data-testid={`mosaic-${s.id}`}
          >
            {s.label}
          </Chip>
        ))}
      </ChipRow>
      <Slider
        label="画笔大小"
        min={5}
        max={200}
        defaultValue={30}
        value={Math.round(i.brushSize * 1000)}
        onChange={(v) => i.set({ brushSize: v / 1000 })}
      />
      <Slider
        label="块大小"
        min={5}
        max={80}
        defaultValue={20}
        value={Math.round(i.mosaicBlock * 1000)}
        onChange={(v) => i.set({ mosaicBlock: v / 1000 })}
      />
      <Hint>
        涂抹要遮住的部分。导出时马赛克会真正应用到照片上，别人无法去除。
      </Hint>
    </div>
  );
}
