import { useState } from 'react';
import { Download, Layers } from 'lucide-react';
import { downloadBlob, exportFileName, fitWithin, type ExportFormat } from '@photoditor-buddy/core';
import { useEditorStore } from '../store/editorStore';
import { exportSnapshot } from '../engine/exportImage';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Chip, ChipRow } from '../components/common/Chip';
import { Slider } from '../components/common/Slider';
import { Section, Hint } from '../components/common/Section';

const SIZES: { id: number | 'original'; label: string }[] = [
  { id: 'original', label: '原图' },
  { id: 3840, label: '4K' },
  { id: 2048, label: '2K' },
  { id: 1920, label: '1080p' },
  { id: 1280, label: '720p' },
];

/** Export options: format, quality, size and file name. Handles both download and SDK hand-off. */
export function ExportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <ExportForm onClose={onClose} />;
}

function ExportForm({ onClose }: { onClose: () => void }) {
  const open = true;
  const snapshot = useEditorStore((s) => s.snapshot);
  const faces = useEditorStore((s) => s.faces);
  const embed = useEditorStore((s) => s.embed);
  const exportHandler = useEditorStore((s) => s.exportHandler);
  const setBusy = useEditorStore((s) => s.setBusy);
  const toast = useEditorStore((s) => s.toast);
  const saveLookTemplate = useEditorStore((s) => s.saveLookTemplate);
  const setScreen = useEditorStore((s) => s.setScreen);
  const hasTransparency = snapshot?.source.mimeType === 'image/png';
  const [format, setFormat] = useState<ExportFormat>(
    embed?.exportFormat ?? (hasTransparency ? 'image/png' : 'image/jpeg'),
  );
  const [quality, setQuality] = useState(Math.round((embed?.exportQuality ?? 0.92) * 100));
  const [maxEdge, setMaxEdge] = useState<number | 'original'>('original');
  const [name, setName] = useState(() =>
    snapshot
      ? exportFileName(snapshot.source.fileName, 'image/png').replace(/\.[^.]+$/, '')
      : 'photo',
  );
  if (!snapshot) return null;
  const full = snapshot.source.full;
  const outSize =
    maxEdge === 'original'
      ? { width: full.width, height: full.height }
      : fitWithin(full.width, full.height, maxEdge);
  const ext = format === 'image/png' ? 'png' : format === 'image/jpeg' ? 'jpg' : 'webp';

  const doExport = async (): Promise<void> => {
    setBusy({ message: '正在渲染全分辨率…' });
    try {
      const result = await exportSnapshot(snapshot, faces, {
        format,
        quality: quality / 100,
        maxEdge,
      });
      const fileName = `${name.trim() || 'photo'}.${ext}`;
      const handled = exportHandler
        ? await exportHandler({
            blob: result.blob,
            fileName,
            width: result.width,
            height: result.height,
          })
        : false;
      if (!handled) downloadBlob(result.blob, fileName);
      toast(
        handled
          ? '已发送到宿主页面。'
          : `已保存 ${fileName}（${result.width}×${result.height}）。`,
        'success',
      );
      onClose();
    } catch (error) {
      toast(error instanceof Error ? error.message : '导出失败。', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      open={open}
      title="导出"
      onClose={onClose}
      footer={
        <>
          <Button
            variant="ghost"
            icon={<Layers size={16} />}
            onClick={() => {
              saveLookTemplate();
              onClose();
              setScreen('batch');
            }}
            title="把这些编辑应用到多张照片"
          >
            批量…
          </Button>
          <Button
            variant="primary"
            icon={<Download size={16} />}
            onClick={() => void doExport()}
            data-testid="export-confirm"
          >
            {embed?.doneLabel ?? '保存图片'}
          </Button>
        </>
      }
    >
      <Section title="格式">
        <ChipRow>
          {(
            [
              ['image/jpeg', 'JPG'],
              ['image/png', 'PNG'],
              ['image/webp', 'WebP'],
            ] as [ExportFormat, string][]
          ).map(([id, label]) => (
            <Chip
              key={id}
              active={format === id}
              onClick={() => setFormat(id)}
              data-testid={`format-${label}`}
            >
              {label}
            </Chip>
          ))}
        </ChipRow>
        <Hint>
          {format === 'image/png'
            ? 'PNG 保留透明度和完整画质，文件更大。'
            : format === 'image/jpeg'
              ? 'JPG 是照片最小的选择，通用性最好。'
              : 'WebP 体积小、画质好，现代浏览器都支持。'}
        </Hint>
      </Section>
      {format !== 'image/png' && (
        <Slider
          label="画质"
          min={40}
          max={100}
          defaultValue={92}
          value={quality}
          onChange={setQuality}
          format={(v) => `${v}%`}
        />
      )}
      <Section title="尺寸">
        <ChipRow>
          {SIZES.map((s) => (
            <Chip key={String(s.id)} active={maxEdge === s.id} onClick={() => setMaxEdge(s.id)}>
              {s.label}
            </Chip>
          ))}
        </ChipRow>
        <Hint>
          输出：{outSize.width} × {outSize.height} 像素
        </Hint>
      </Section>
      <Section title="文件名">
        <div className="flex items-center gap-1">
          <input
            className="flex-1 bg-surface-2 border border-border rounded-xl px-3 h-10 text-sm focus:outline-none focus:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="文件名"
          />
          <span className="text-muted text-sm">.{ext}</span>
        </div>
      </Section>
    </Modal>
  );
}
