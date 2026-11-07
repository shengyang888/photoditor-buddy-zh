import { useEffect, useRef, useState } from 'react';
import { Grid2x2, ImagePlus, Images, Settings, Sparkles, Wand2 } from 'lucide-react';
import { useEditorStore } from '../store/editorStore';
import { createSampleImage } from '../engine/sampleImage';
import { Button } from '../components/common/Button';
import { AiBadge } from '../components/common/AiBadge';

const HIGHLIGHTS: { title: string; text: string; ai?: 'cloud' | 'local' }[] = [
  { title: '20+ 项调节', text: '亮度、色彩、HSL、曲线、分离色调、LUT。' },
  {
    title: '200+ 滤镜',
    text: '胶片、复古、日系、韩系、电影感等，每款都可调强度。',
  },
  {
    title: '美颜',
    text: '磨皮、塑形、妆容、液化、祛瑕。',
    ai: 'local',
  },
  {
    title: 'AI 工具',
    text: '消除、替换、扩图、修复、上色、风格、发型、天空、重打光……',
    ai: 'cloud',
  },
  { title: '创意', text: '文字、贴纸、边框、涂鸦、马赛克、水印、特效。' },
  {
    title: '拼图与批量',
    text: '网格、海报、拼接，一键给多张照片套用同款效果。',
  },
];

/** Landing screen: open a photo (tap, drop, paste), try a sample, collage or batch. */
export function HomeScreen() {
  const openFile = useEditorStore((s) => s.openFile);
  const openCanvas = useEditorStore((s) => s.openCanvas);
  const setScreen = useEditorStore((s) => s.setScreen);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);
  const embed = useEditorStore((s) => s.embed);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent): void => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/'),
      );
      if (file) void openFile(file, file.name || 'pasted-image.png');
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [openFile]);

  /** Opens the bundled sample photo; if it cannot be fetched (offline build), draws a picture instead. */
  const openSamplePhoto = async (): Promise<void> => {
    try {
      const response = await fetch(new URL('sample.jpg', document.baseURI).toString());
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await openFile(await response.blob(), 'sample-photo.jpg');
    } catch {
      openCanvas(createSampleImage(), 'sample-photo.jpg', 'image/jpeg');
    }
  };

  const onDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    setDragging(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (file) void openFile(file);
  };

  return (
    <div
      className={`h-full overflow-y-auto ${dragging ? 'bg-accent/10' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      data-testid="home"
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void openFile(f);
          e.target.value = '';
        }}
        data-testid="open-file-input"
      />
      <div className="max-w-3xl mx-auto px-5 py-10 sm:py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-xl bg-accent text-accent-contrast flex items-center justify-center font-black">
              pb
            </span>
            <span className="font-semibold text-lg">photoditor-buddy</span>
          </div>
          {!embed && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings size={16} />}
              onClick={() => setSettingsOpen(true)}
              data-testid="home-settings"
            >
              设置
            </Button>
          )}
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">
          在浏览器里，像专业人士一样修图。
        </h1>
        <p className="text-muted mb-8 max-w-xl">
          无需注册，无需上传，一切都在你的设备上运行。AI 工具使用你自己的 API Key，用多少付多少，直接付给服务商。
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          <button
            type="button"
            data-testid="open-photo"
            className="rounded-2xl border-2 border-dashed border-border hover:border-accent bg-surface p-6 text-left transition"
            onClick={() => fileRef.current?.click()}
          >
            <ImagePlus className="text-accent mb-2" />
            <div className="font-semibold">打开照片</div>
            <div className="text-xs text-muted">
              点按选择，或拖放 / 粘贴到任意位置。
            </div>
          </button>
          <button
            type="button"
            data-testid="open-sample"
            className="rounded-2xl border border-border hover:border-accent bg-surface p-6 text-left transition"
            onClick={() => void openSamplePhoto()}
          >
            <Wand2 className="text-accent mb-2" />
            <div className="font-semibold">试试示例照片</div>
            <div className="text-xs text-muted">用内置图片体验全部工具。</div>
          </button>
          <button
            type="button"
            data-testid="open-collage"
            className="rounded-2xl border border-border hover:border-accent bg-surface p-6 text-left transition"
            onClick={() => setScreen('collage')}
          >
            <Grid2x2 className="text-accent mb-2" />
            <div className="font-semibold">制作拼图</div>
            <div className="text-xs text-muted">网格、海报、自由拼贴和长图拼接。</div>
          </button>
          <button
            type="button"
            data-testid="open-batch"
            className="rounded-2xl border border-border hover:border-accent bg-surface p-6 text-left transition"
            onClick={() => setScreen('batch')}
          >
            <Images className="text-accent mb-2" />
            <div className="font-semibold">批量编辑</div>
            <div className="text-xs text-muted">
              给多张照片套用同一滤镜或效果，打包下载 ZIP。
            </div>
          </button>
        </div>
        <h2 className="text-sm uppercase tracking-wider text-muted font-semibold mb-3">
          功能一览
        </h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {HIGHLIGHTS.map((h) => (
            <div key={h.title} className="rounded-xl bg-surface border border-border p-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                {h.ai === 'cloud' ? <Sparkles size={14} className="text-accent" /> : null}
                {h.title}
                {h.ai && <AiBadge kind={h.ai} />}
              </div>
              <div className="text-xs text-muted mt-0.5">{h.text}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted mt-8">
          开源（MIT）。除非使用云端 AI 工具，你的照片绝不离开设备。
        </p>
      </div>
    </div>
  );
}
