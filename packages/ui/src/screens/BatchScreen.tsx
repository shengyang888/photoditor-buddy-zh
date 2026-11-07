import { useRef, useState } from 'react';
import { ChevronLeft, Download, ImagePlus } from 'lucide-react';
import {
  FILTER_CATALOG,
  Renderer,
  bitmapToCanvas,
  canvasToBlob,
  createZip,
  defaultAdjustments,
  exportFileName,
  fitWithin,
  loadImageFromBlob,
  stackPreset,
  downloadBlob,
  type ExportFormat,
  type FilterDefinition,
} from '@photoditor-buddy/core';
import { useEditorStore } from '../store/editorStore';
import { Button } from '../components/common/Button';
import { Chip, ChipRow } from '../components/common/Chip';
import { IconButton } from '../components/common/IconButton';
import { Section, Hint } from '../components/common/Section';
import { Slider } from '../components/common/Slider';

/** Applies one look (the last edited photo's look, or a chosen filter) to many photos and zips them. */
export function BatchScreen() {
  const setScreen = useEditorStore((s) => s.setScreen);
  const lookTemplate = useEditorStore((s) => s.lookTemplate);
  const setBusy = useEditorStore((s) => s.setBusy);
  const toast = useEditorStore((s) => s.toast);
  const [files, setFiles] = useState<File[]>([]);
  const [useTemplate, setUseTemplate] = useState(Boolean(lookTemplate));
  const [filter, setFilter] = useState<FilterDefinition | null>(null);
  const [format, setFormat] = useState<ExportFormat>('image/jpeg');
  const [maxEdge, setMaxEdge] = useState<number>(2048);
  const [quality, setQuality] = useState(90);
  const fileRef = useRef<HTMLInputElement>(null);
  const popularFilters = FILTER_CATALOG.filter((f) =>
    ['极简', '胶片', '人像', '日系', '电影感'].includes(f.category),
  );

  const run = async (): Promise<void> => {
    if (files.length === 0) return;
    const renderer = new Renderer(document.createElement('canvas'));
    const entries: { name: string; data: Uint8Array }[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        setBusy({
          message: `正在处理 ${i + 1} / ${files.length}：${file.name}`,
          progress: i / files.length,
        });
        try {
          const loaded = await loadImageFromBlob(file, file.name);
          const size = fitWithin(
            loaded.width,
            loaded.height,
            Math.min(maxEdge, renderer.maxTextureSize),
          );
          const source = bitmapToCanvas(loaded.bitmap, size.width, size.height);
          loaded.bitmap.close();
          renderer.setSource(source);
          const base =
            useTemplate && lookTemplate ? lookTemplate.adjustments : defaultAdjustments();
          const activeFilter =
            useTemplate && lookTemplate
              ? lookTemplate.filter
                ? (FILTER_CATALOG.find((f) => f.id === lookTemplate.filter!.id) ?? null)
                : null
              : filter;
          const intensity =
            useTemplate && lookTemplate?.filter ? lookTemplate.filter.intensity / 100 : 1;
          const adjustments = activeFilter
            ? stackPreset(base, activeFilter.preset, intensity)
            : base;
          const lut = activeFilter?.lut
            ? (await import('@photoditor-buddy/core')).buildRecipeLut(activeFilter.lut)
            : null;
          renderer.render({
            adjustments: lut
              ? { ...adjustments, lut: { id: activeFilter!.id, intensity: intensity * 100 } }
              : adjustments,
            lut,
            effect: useTemplate && lookTemplate ? lookTemplate.effect : null,
            portrait: null,
          });
          const blob = await canvasToBlob(renderer.snapshot(), { format, quality: quality / 100 });
          entries.push({
            name: exportFileName(file.name, format),
            data: new Uint8Array(await blob.arrayBuffer()),
          });
        } catch (error) {
          toast(
            `已跳过 ${file.name}：${error instanceof Error ? error.message : '出错'}`,
            'error',
          );
        }
      }
      if (entries.length === 0) return;
      if (entries.length === 1) {
        downloadBlob(new Blob([entries[0]!.data as BlobPart], { type: format }), entries[0]!.name);
      } else {
        downloadBlob(createZip(entries), `photoditor-buddy-batch-${entries.length}.zip`);
      }
      toast(`完成：已导出 ${entries.length} 张照片。`, 'success');
    } finally {
      renderer.dispose();
      setBusy(null);
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="batch">
      <header className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-border bg-surface">
        <IconButton
          label="返回"
          icon={<ChevronLeft size={20} />}
          onClick={() => setScreen('home')}
        />
        <h1 className="font-semibold text-sm">批量编辑</h1>
      </header>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          setFiles([...files, ...Array.from(e.target.files ?? [])]);
          e.target.value = '';
        }}
        data-testid="batch-files"
      />
      <div className="flex-1 overflow-y-auto p-4 max-w-2xl w-full mx-auto">
        <Section
          title="照片"
          right={
            <Button
              size="sm"
              icon={<ImagePlus size={14} />}
              onClick={() => fileRef.current?.click()}
              data-testid="batch-add"
            >
              添加照片
            </Button>
          }
        >
          {files.length === 0 ? (
            <Hint>
              选择要处理的照片。它们会在你的设备上逐张处理，并打包成 ZIP 下载。
            </Hint>
          ) : (
            <ul className="text-xs text-muted flex flex-wrap gap-1">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="bg-surface-2 rounded-full px-2 py-1">
                  {f.name}
                </li>
              ))}
            </ul>
          )}
          {files.length > 0 && (
            <Button size="sm" variant="ghost" className="mt-1" onClick={() => setFiles([])}>
              清空列表
            </Button>
          )}
        </Section>
        <Section title="套用效果">
          <ChipRow>
            {lookTemplate && (
              <Chip active={useTemplate} onClick={() => setUseTemplate(true)}>
                上次编辑的效果
              </Chip>
            )}
            <Chip
              active={!useTemplate && filter === null}
              onClick={() => {
                setUseTemplate(false);
                setFilter(null);
              }}
            >
              无滤镜（仅转换/缩放）
            </Chip>
            {popularFilters.map((f) => (
              <Chip
                key={f.id}
                active={!useTemplate && filter?.id === f.id}
                onClick={() => {
                  setUseTemplate(false);
                  setFilter(f);
                }}
              >
                {f.name}
              </Chip>
            ))}
          </ChipRow>
          <Hint>
            提示：先修好一张照片，再打开「导出 → 批量…」，即可在此复用同样的滑杆和滤镜。
          </Hint>
        </Section>
        <Section title="输出">
          <ChipRow>
            {(
              [
                ['image/jpeg', 'JPG'],
                ['image/png', 'PNG'],
                ['image/webp', 'WebP'],
              ] as [ExportFormat, string][]
            ).map(([id, label]) => (
              <Chip key={id} active={format === id} onClick={() => setFormat(id)}>
                {label}
              </Chip>
            ))}
          </ChipRow>
          <ChipRow>
            {[4096, 2048, 1920, 1280, 1080].map((n) => (
              <Chip key={n} active={maxEdge === n} onClick={() => setMaxEdge(n)}>
                {n}px
              </Chip>
            ))}
          </ChipRow>
          {format !== 'image/png' && (
            <Slider
              label="质量"
              min={40}
              max={100}
              defaultValue={90}
              value={quality}
              onChange={setQuality}
              format={(v) => `${v}%`}
            />
          )}
        </Section>
        <Button
          variant="primary"
          block
          size="lg"
          icon={<Download size={18} />}
          disabled={files.length === 0}
          onClick={() => void run()}
          data-testid="batch-run"
        >
          处理 {files.length || ''} 张照片
        </Button>
      </div>
    </div>
  );
}
