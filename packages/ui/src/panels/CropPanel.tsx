import { useEffect, useRef } from 'react';
import { FlipHorizontal2, FlipVertical2, RotateCw } from 'lucide-react';
import {
  ASPECT_PRESETS,
  bakeGeometry,
  bakePerspective,
  fitAspect,
  quadFromPerspective,
  rotatedSize,
  type GeometryEdit,
} from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { useInteractionStore, type CropDraft } from '../store/interactionStore';
import { Chip, ChipRow } from '../components/common/Chip';
import { Slider } from '../components/common/Slider';
import { Button } from '../components/common/Button';
import { PanelHeader, Section, Hint } from '../components/common/Section';
import { IconButton } from '../components/common/IconButton';

/**
 * Crop, rotate, flip, straighten and perspective. Rotation/flip/straighten/perspective preview
 * live by re-baking the preview image; Apply bakes everything at full resolution.
 */
export function CropPanel() {
  const snapshot = useSnapshot();
  const draft = useInteractionStore((s) => s.cropDraft);
  const set = useInteractionStore((s) => s.set);
  const updateLive = useEditorStore((s) => s.updateLive);
  const commitSource = useEditorStore((s) => s.commitSource);
  const setTool = useEditorStore((s) => s.setTool);
  const setBusy = useEditorStore((s) => s.setBusy);
  const toast = useEditorStore((s) => s.toast);
  const originalRef = useRef(snapshot.source);
  const previewTimer = useRef<number | null>(null);

  // Initialise the draft when the tool opens; restore the untouched source when it closes.
  useEffect(() => {
    const original = originalRef.current;
    const preview = original.preview;
    set({
      cropDraft: {
        rotation: 0,
        flipHorizontal: false,
        flipVertical: false,
        straighten: 0,
        presetId: 'free',
        perspectiveV: 0,
        perspectiveH: 0,
        crop: { x: 0, y: 0, width: preview.width, height: preview.height },
      },
      zoom: 1,
      pan: { x: 0, y: 0 },
    });
    return () => {
      set({ cropDraft: null });
      const current = useEditorStore.getState().snapshot;
      if (current && current.source !== original && current.source.full === original.full) {
        useEditorStore.getState().updateLive({ source: original });
      }
    };
  }, [set]);

  if (!draft) return null;

  /** Re-bakes the preview so rotation, flips, straighten and perspective show live. */
  const applyPreview = (next: CropDraft): void => {
    const original = originalRef.current;
    const edit: GeometryEdit = {
      rotation: next.rotation,
      flipHorizontal: next.flipHorizontal,
      flipVertical: next.flipVertical,
      straighten: next.straighten,
      crop: null,
    };
    let preview = bakeGeometry(original.preview, edit);
    if (next.perspectiveV || next.perspectiveH)
      preview = bakePerspective(preview, quadFromPerspective(next.perspectiveV, next.perspectiveH));
    updateLive({ source: { ...original, preview } });
  };

  const update = (patch: Partial<CropDraft>, rebake = true): void => {
    const next = { ...draft, ...patch };
    const size = rotatedSize(
      originalRef.current.preview.width,
      originalRef.current.preview.height,
      next.rotation,
    );
    if (patch.rotation !== undefined || patch.presetId !== undefined) {
      const preset = ASPECT_PRESETS.find((p) => p.id === next.presetId);
      const ratio = preset?.ratio === -1 ? size.width / size.height : (preset?.ratio ?? null);
      next.crop = fitAspect(size.width, size.height, ratio);
    }
    set({ cropDraft: next });
    if (!rebake) return;
    if (previewTimer.current) cancelAnimationFrame(previewTimer.current);
    previewTimer.current = requestAnimationFrame(() => applyPreview(next));
  };

  const apply = (): void => {
    const original = originalRef.current;
    setBusy({ message: '正在应用裁剪…' });
    // Let the busy overlay paint before the (synchronous) bake.
    setTimeout(() => {
      try {
        const scale = original.full.width / original.preview.width;
        const edit: GeometryEdit = {
          rotation: draft.rotation,
          flipHorizontal: draft.flipHorizontal,
          flipVertical: draft.flipVertical,
          straighten: draft.straighten,
          crop: null,
        };
        let full = bakeGeometry(original.full, edit);
        if (draft.perspectiveV || draft.perspectiveH)
          full = bakePerspective(full, quadFromPerspective(draft.perspectiveV, draft.perspectiveH));
        const crop = {
          x: draft.crop.x * scale,
          y: draft.crop.y * scale,
          width: draft.crop.width * scale,
          height: draft.crop.height * scale,
        };
        const cropped = bakeGeometry(full, {
          rotation: 0,
          flipHorizontal: false,
          flipVertical: false,
          straighten: 0,
          crop,
        });
        updateLive({ source: original });
        commitSource(cropped, { keepOverlays: true });
        setTool(null);
      } catch (error) {
        toast(error instanceof Error ? error.message : '裁剪失败。', 'error');
      } finally {
        setBusy(null);
      }
    }, 30);
  };

  const cancel = (): void => {
    updateLive({ source: originalRef.current });
    setTool(null);
  };

  return (
    <div data-testid="crop-panel">
      <PanelHeader title="裁剪与旋转" />
      <Section title="宽高比">
        <ChipRow>
          {ASPECT_PRESETS.map((p) => (
            <Chip
              key={p.id}
              active={draft.presetId === p.id}
              onClick={() => update({ presetId: p.id }, false)}
              data-testid={`aspect-${p.id}`}
            >
              {p.label}
            </Chip>
          ))}
        </ChipRow>
      </Section>
      <Section title="旋转与翻转">
        <div className="flex gap-2">
          <IconButton
            label="旋转 90°"
            icon={<RotateCw size={18} />}
            onClick={() => update({ rotation: ((draft.rotation + 1) % 4) as 0 | 1 | 2 | 3 })}
            data-testid="rotate-90"
          />
          <IconButton
            label="水平翻转"
            icon={<FlipHorizontal2 size={18} />}
            active={draft.flipHorizontal}
            onClick={() => update({ flipHorizontal: !draft.flipHorizontal })}
            data-testid="flip-h"
          />
          <IconButton
            label="垂直翻转"
            icon={<FlipVertical2 size={18} />}
            active={draft.flipVertical}
            onClick={() => update({ flipVertical: !draft.flipVertical })}
            data-testid="flip-v"
          />
        </div>
        <Slider
          label="校正"
          min={-45}
          max={45}
          step={0.5}
          value={draft.straighten}
          format={(v) => `${v}°`}
          onChange={(v) => update({ straighten: v })}
        />
      </Section>
      <Section title="透视">
        <Slider
          label="垂直"
          min={-100}
          max={100}
          value={draft.perspectiveV}
          onChange={(v) => update({ perspectiveV: v }, false)}
          onCommit={(v) => update({ perspectiveV: v })}
          description="修正前后倾斜的建筑物。"
        />
        <Slider
          label="水平"
          min={-100}
          max={100}
          value={draft.perspectiveH}
          onChange={(v) => update({ perspectiveH: v }, false)}
          onCommit={(v) => update({ perspectiveH: v })}
        />
        <Hint>松开滑杆后预览透视效果。</Hint>
      </Section>
      <div className="flex gap-2 mt-3">
        <Button block onClick={cancel} data-testid="crop-cancel">
          取消
        </Button>
        <Button block variant="primary" onClick={apply} data-testid="crop-apply">
          应用
        </Button>
      </div>
    </div>
  );
}
