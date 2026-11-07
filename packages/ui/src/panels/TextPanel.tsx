import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Plus } from 'lucide-react';
import { FONT_OPTIONS, createTextLayer, fontStack, type TextLayer } from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { Button } from '../components/common/Button';
import { Chip, ChipRow } from '../components/common/Chip';
import { ColorPicker } from '../components/common/ColorPicker';
import { IconButton } from '../components/common/IconButton';
import { Slider } from '../components/common/Slider';
import { PanelHeader, Hint, Section } from '../components/common/Section';
import { LayerCommonControls } from './layerControls';

/** Text layers: add, edit content, font, colour, outline, background, shadow, curve. */
export function TextPanel() {
  const snapshot = useSnapshot();
  const selectedId = useEditorStore((s) => s.selectedLayerId);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const addLayer = useEditorStore((s) => s.addLayer);
  const updateLayer = useEditorStore((s) => s.updateLayer);
  const textLayers = snapshot.overlays.filter((l): l is TextLayer => l.type === 'text');
  const layer = textLayers.find((l) => l.id === selectedId) ?? null;
  const patch = (p: Partial<TextLayer>, live = false): void => {
    if (layer) updateLayer(layer.id, p, live);
  };

  return (
    <div data-testid="text-panel">
      <PanelHeader
        title="文字"
        right={
          <Button
            size="sm"
            variant="primary"
            icon={<Plus size={14} />}
            onClick={() => addLayer(createTextLayer())}
            data-testid="add-text"
          >
            添加文字
          </Button>
        }
      />
      {textLayers.length > 1 && (
        <ChipRow>
          {textLayers.map((l, i) => (
            <Chip key={l.id} active={l.id === selectedId} onClick={() => selectLayer(l.id)}>
              {l.text.slice(0, 14) || `文字 ${i + 1}`}
            </Chip>
          ))}
        </ChipRow>
      )}
      {!layer && (
        <Hint>
          点「添加文字」，然后在照片上拖动。双指捏合（或用滑杆）可以缩放和旋转。
        </Hint>
      )}
      {layer && (
        <div>
          <textarea
            className="w-full bg-surface-2 border border-border rounded-xl p-2 text-sm min-h-[64px] focus:outline-none focus:border-accent"
            value={layer.text}
            onChange={(e) => patch({ text: e.target.value }, true)}
            onBlur={(e) => patch({ text: e.target.value })}
            aria-label="文字内容"
            data-testid="text-content"
          />
          <Section title="字体">
            <ChipRow>
              {FONT_OPTIONS.map((f) => (
                <Chip
                  key={f.family}
                  active={layer.fontFamily === f.family}
                  onClick={() => patch({ fontFamily: f.family })}
                  style={{ fontFamily: fontStack(f.family) }}
                >
                  {f.label}
                </Chip>
              ))}
            </ChipRow>
            <div className="flex gap-1 mt-1">
              <IconButton
                label="加粗"
                icon={<Bold size={16} />}
                active={layer.bold}
                onClick={() => patch({ bold: !layer.bold })}
              />
              <IconButton
                label="斜体"
                icon={<Italic size={16} />}
                active={layer.italic}
                onClick={() => patch({ italic: !layer.italic })}
              />
              <span className="w-2" />
              <IconButton
                label="左对齐"
                icon={<AlignLeft size={16} />}
                active={layer.align === 'left'}
                onClick={() => patch({ align: 'left' })}
              />
              <IconButton
                label="居中对齐"
                icon={<AlignCenter size={16} />}
                active={layer.align === 'center'}
                onClick={() => patch({ align: 'center' })}
              />
              <IconButton
                label="右对齐"
                icon={<AlignRight size={16} />}
                active={layer.align === 'right'}
                onClick={() => patch({ align: 'right' })}
              />
            </div>
          </Section>
          <ColorPicker
            label="文字颜色"
            value={layer.color}
            onChange={(c) => patch({ color: c })}
          />
          <ColorPicker
            label="背景"
            value={layer.background ?? ''}
            allowNone
            onChange={(c) => patch({ background: c || null })}
          />
          <ColorPicker
            label="描边"
            value={layer.strokeColor ?? ''}
            allowNone
            onChange={(c) =>
              patch({
                strokeColor: c || null,
                strokeWidth: c ? Math.max(layer.strokeWidth, 0.08) : 0,
              })
            }
          />
          {layer.strokeColor && (
            <Slider
              label="描边粗细"
              min={1}
              max={30}
              defaultValue={8}
              value={Math.round(layer.strokeWidth * 100)}
              onChange={(v) => patch({ strokeWidth: v / 100 }, true)}
              onCommit={(v) => patch({ strokeWidth: v / 100 })}
            />
          )}
          <Slider
            label="字间距"
            min={-10}
            max={50}
            value={Math.round(layer.letterSpacing * 100)}
            onChange={(v) => patch({ letterSpacing: v / 100 }, true)}
            onCommit={(v) => patch({ letterSpacing: v / 100 })}
          />
          <Slider
            label="行高"
            min={80}
            max={200}
            defaultValue={120}
            value={Math.round(layer.lineHeight * 100)}
            format={(v) => `${v}%`}
            onChange={(v) => patch({ lineHeight: v / 100 }, true)}
            onCommit={(v) => patch({ lineHeight: v / 100 })}
          />
          <Slider
            label="弯曲"
            min={-100}
            max={100}
            value={layer.curve}
            onChange={(v) => patch({ curve: v }, true)}
            onCommit={(v) => patch({ curve: v })}
            description="让单行文字沿弧线弯曲。"
          />
          <label className="flex items-center gap-2 text-xs py-1">
            <input
              type="checkbox"
              checked={layer.shadow}
              onChange={(e) => patch({ shadow: e.target.checked })}
            />{' '}
            投影
          </label>
          <LayerCommonControls layer={layer} sizeKey="fontSize" />
        </div>
      )}
    </div>
  );
}
