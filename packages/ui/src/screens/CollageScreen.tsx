import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ImagePlus, Trash2 } from 'lucide-react';
import {
  COLLAGE_LAYOUTS,
  bitmapToCanvas,
  createImageSticker,
  loadImageFromBlob,
  renderCollage,
  stitchLayout,
  type CollageLayout,
} from '@photoditor-buddy/core';
import { useEditorStore } from '../store/editorStore';
import { Button } from '../components/common/Button';
import { Chip, ChipRow } from '../components/common/Chip';
import { ColorPicker } from '../components/common/ColorPicker';
import { IconButton } from '../components/common/IconButton';
import { Slider } from '../components/common/Slider';
import { Section, Hint } from '../components/common/Section';

type Mode = 'grid' | 'poster' | 'stitch' | 'freestyle';

interface Photo {
  canvas: HTMLCanvasElement;
  name: string;
}

/**
 * Where freestyle photos start: a centred grid (as many columns as rows, roughly) with a slight
 * tilt and overlap, as fractions of the square canvas. The user then drags them around in the editor.
 */
function freestylePlacement(
  index: number,
  count: number,
  aspect: number,
): { x: number; y: number; size: number; rotation: number } {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / cols));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const itemsInRow = row === rows - 1 ? count - row * cols : cols;
  const offset = (cols - itemsInRow) / 2; // centre a short last row
  const jitter = ((index * 7) % 5) * 0.01;
  return {
    x: (col + offset + 0.5) / cols + jitter,
    y: (row + 0.5) / rows + jitter,
    // `size` is the photo height; keep the longer edge inside the cell (plus a little overlap).
    size: (Math.min(0.9 / cols, 0.9 / rows) * 1.08) / Math.max(1, aspect),
    rotation: ((index * 37) % 21) - 10,
  };
}

/** Draws the freestyle arrangement so the collage screen previews what the editor will open. */
function renderFreestylePreview(
  photos: Photo[],
  background: string,
  width: number,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = width;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is not available.');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, width);
  photos.forEach((photo, i) => {
    const place = freestylePlacement(i, photos.length, photo.canvas.width / photo.canvas.height);
    const h = place.size * width;
    const w = h * (photo.canvas.width / photo.canvas.height);
    ctx.save();
    ctx.translate(place.x * width, place.y * width);
    ctx.rotate((place.rotation * Math.PI) / 180);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = width * 0.02;
    ctx.drawImage(photo.canvas, -w / 2, -h / 2, w, h);
    ctx.restore();
  });
  return canvas;
}

/** Collage builder: pick photos, choose a layout, tweak spacing, then continue in the editor. */
export function CollageScreen() {
  const setScreen = useEditorStore((s) => s.setScreen);
  const openCanvas = useEditorStore((s) => s.openCanvas);
  const addLayer = useEditorStore((s) => s.addLayer);
  const toast = useEditorStore((s) => s.toast);
  const setBusy = useEditorStore((s) => s.setBusy);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mode, setMode] = useState<Mode>('grid');
  const [layoutId, setLayoutId] = useState<string | null>(null);
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const [gap, setGap] = useState(2);
  const [radius, setRadius] = useState(2);
  const [background, setBackground] = useState('#ffffff');
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceIndex = useRef<number | null>(null);

  const candidates = useMemo(
    () =>
      COLLAGE_LAYOUTS.filter(
        (l) =>
          l.kind === (mode === 'poster' ? 'poster' : 'grid') &&
          l.count === Math.max(1, Math.min(9, photos.length)),
      ),
    [mode, photos.length],
  );
  const layout: CollageLayout | null = useMemo(() => {
    if (mode === 'stitch')
      return photos.length
        ? stitchLayout(
            photos.map((p) => p.canvas.width / p.canvas.height),
            direction,
          )
        : null;
    if (mode === 'freestyle') return null;
    return candidates.find((l) => l.id === layoutId) ?? candidates[0] ?? null;
  }, [mode, photos, direction, candidates, layoutId]);

  const preview = useMemo(() => {
    if (mode === 'freestyle')
      return photos.length ? renderFreestylePreview(photos, background, 600) : null;
    if (!layout) return null;
    try {
      return renderCollage({
        layout,
        images: photos.map((p) => p.canvas),
        width: 600,
        background,
        gap: gap / 100,
        radius: radius / 100,
        shadow: mode === 'poster',
      });
    } catch {
      return null;
    }
  }, [layout, photos, background, gap, radius, mode]);

  const addFiles = async (files: FileList | null): Promise<void> => {
    if (!files?.length) return;
    setBusy({ message: '正在加载照片…' });
    const loaded: Photo[] = [];
    for (const file of Array.from(files).slice(0, 9)) {
      try {
        const img = await loadImageFromBlob(file, file.name);
        const maxEdge = 2000;
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        loaded.push({
          canvas: bitmapToCanvas(
            img.bitmap,
            Math.round(img.width * scale),
            Math.round(img.height * scale),
          ),
          name: file.name,
        });
        img.bitmap.close();
      } catch (error) {
        toast(error instanceof Error ? error.message : `无法加载 ${file.name}`, 'error');
      }
    }
    setBusy(null);
    if (replaceIndex.current !== null && loaded[0]) {
      const idx = replaceIndex.current;
      replaceIndex.current = null;
      setPhotos((p) => p.map((x, i) => (i === idx ? loaded[0]! : x)));
      return;
    }
    setPhotos((p) => [...p, ...loaded].slice(0, 9));
  };

  const finish = (): void => {
    if (mode === 'freestyle') {
      const base = document.createElement('canvas');
      base.width = 1600;
      base.height = 1600;
      const ctx = base.getContext('2d')!;
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, base.width, base.height);
      openCanvas(base, 'collage.png');
      photos.forEach((p, i) => {
        const sticker = createImageSticker(p.canvas);
        const place = freestylePlacement(i, photos.length, p.canvas.width / p.canvas.height);
        sticker.x = place.x;
        sticker.y = place.y;
        sticker.rotation = place.rotation;
        sticker.size = place.size;
        addLayer(sticker, i === photos.length - 1);
      });
      return;
    }
    if (!layout) return;
    const canvas = renderCollage({
      layout,
      images: photos.map((p) => p.canvas),
      width: 2400,
      background,
      gap: gap / 100,
      radius: radius / 100,
      shadow: mode === 'poster',
    });
    openCanvas(canvas, 'collage.png');
  };

  return (
    <div className="h-full flex flex-col" data-testid="collage">
      <header className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-border bg-surface">
        <IconButton
          label="返回"
          icon={<ChevronLeft size={20} />}
          onClick={() => setScreen('home')}
        />
        <h1 className="font-semibold text-sm">拼图</h1>
        <div className="flex-1" />
        <Button
          variant="primary"
          size="sm"
          disabled={photos.length === 0}
          onClick={finish}
          data-testid="collage-finish"
        >
          在编辑器中继续
        </Button>
      </header>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = '';
        }}
        data-testid="collage-files"
      />
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="flex-1 min-h-[40vh] flex items-center justify-center p-4 bg-bg">
          {preview ? (
            <canvas
              ref={(el) => {
                if (el && preview) {
                  el.width = preview.width;
                  el.height = preview.height;
                  el.getContext('2d')!.drawImage(preview, 0, 0);
                }
              }}
              className="max-w-full max-h-full rounded-lg shadow-lg"
              data-testid="collage-preview"
            />
          ) : (
            <button
              type="button"
              className="rounded-2xl border-2 border-dashed border-border p-8 text-center text-muted"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="mx-auto mb-2" />
              {mode === 'freestyle'
                ? '添加照片后，在编辑器中自由排布。'
                : '最多添加 9 张照片开始制作。'}
            </button>
          )}
        </div>
        <aside className="lg:w-[340px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-surface overflow-y-auto p-3 max-h-[50vh] lg:max-h-none">
          <Section
            title="照片"
            right={
              <Button
                size="sm"
                icon={<ImagePlus size={14} />}
                onClick={() => {
                  replaceIndex.current = null;
                  fileRef.current?.click();
                }}
                data-testid="collage-add"
              >
                添加
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <div
                  key={`${p.name}-${i}`}
                  className="relative h-14 w-14 rounded-lg overflow-hidden border border-border"
                >
                  <canvas
                    ref={(el) => {
                      if (el) {
                        el.width = 56;
                        el.height = 56;
                        const c = el.getContext('2d')!;
                        const s = Math.min(p.canvas.width, p.canvas.height);
                        c.drawImage(
                          p.canvas,
                          (p.canvas.width - s) / 2,
                          (p.canvas.height - s) / 2,
                          s,
                          s,
                          0,
                          0,
                          56,
                          56,
                        );
                      }
                    }}
                    className="h-full w-full"
                  />
                  <button
                    type="button"
                    aria-label="移除照片"
                    className="absolute top-0 right-0 bg-black/60 p-0.5 rounded-bl"
                    onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label="替换照片"
                    className="absolute inset-0"
                    onClick={() => {
                      replaceIndex.current = i;
                      fileRef.current?.click();
                    }}
                  />
                </div>
              ))}
            </div>
            <Hint>点按缩略图可替换照片。</Hint>
          </Section>
          <Section title="类型">
            <ChipRow>
              {(
                [
                  ['grid', '网格'],
                  ['poster', '海报'],
                  ['stitch', '拼接'],
                  ['freestyle', '自由拼贴'],
                ] as [Mode, string][]
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  active={mode === id}
                  onClick={() => {
                    setMode(id);
                    setLayoutId(null);
                  }}
                  data-testid={`collage-mode-${id}`}
                >
                  {label}
                </Chip>
              ))}
            </ChipRow>
          </Section>
          {(mode === 'grid' || mode === 'poster') && (
            <Section title="布局">
              <div className="grid grid-cols-4 gap-2">
                {candidates.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    aria-pressed={layout?.id === l.id}
                    title={l.name}
                    className={`aspect-square rounded-lg border p-1 ${layout?.id === l.id ? 'border-accent bg-accent/10' : 'border-border bg-surface-2'}`}
                    onClick={() => setLayoutId(l.id)}
                  >
                    <div className="relative w-full h-full">
                      {l.slots.map((s, i) => (
                        <div
                          key={i}
                          className="absolute bg-muted/60 rounded-[2px]"
                          style={{
                            left: `${s.x * 100}%`,
                            top: `${s.y * 100}%`,
                            width: `${s.w * 100 - 4}%`,
                            height: `${s.h * 100 - 4}%`,
                          }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              {candidates.length === 0 && <Hint>请添加 1 至 9 张照片。</Hint>}
            </Section>
          )}
          {mode === 'stitch' && (
            <Section title="方向">
              <ChipRow>
                <Chip active={direction === 'vertical'} onClick={() => setDirection('vertical')}>
                  竖向（长截图）
                </Chip>
                <Chip
                  active={direction === 'horizontal'}
                  onClick={() => setDirection('horizontal')}
                >
                  横向
                </Chip>
              </ChipRow>
            </Section>
          )}
          {mode !== 'freestyle' && (
            <>
              <Slider
                label="间距"
                min={0}
                max={8}
                value={gap}
                onChange={setGap}
                format={(v) => `${v}%`}
              />
              <Slider
                label="圆角"
                min={0}
                max={10}
                value={radius}
                onChange={setRadius}
                format={(v) => `${v}%`}
              />
            </>
          )}
          <ColorPicker label="背景" value={background} onChange={setBackground} />
        </aside>
      </div>
    </div>
  );
}
