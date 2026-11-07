import type { ToolId } from './store/types';

/** Tool rail entries in display order. `icon` is a lucide-react icon name resolved in ToolRail. */
export interface ToolDefinition {
  id: ToolId;
  label: string;
  icon: string;
  /** Marks tools that involve an AI model (cloud or on-device). */
  ai?: 'cloud' | 'local';
}

export const TOOLS: readonly ToolDefinition[] = [
  { id: 'adjust', label: '调整', icon: 'SlidersHorizontal' },
  { id: 'filters', label: '滤镜', icon: 'Aperture' },
  { id: 'crop', label: '裁剪', icon: 'Crop' },
  { id: 'beauty', label: '美颜', icon: 'Smile', ai: 'local' },
  { id: 'ai', label: 'AI', icon: 'Sparkles', ai: 'cloud' },
  { id: 'effects', label: '特效', icon: 'Wand2' },
  { id: 'text', label: '文字', icon: 'Type' },
  { id: 'stickers', label: '贴纸', icon: 'Sticker' },
  { id: 'frames', label: '边框', icon: 'Frame' },
  { id: 'doodle', label: '涂鸦', icon: 'Brush' },
  { id: 'mosaic', label: '马赛克', icon: 'Grid3x3' },
  { id: 'watermark', label: '水印', icon: 'Stamp' },
  { id: 'layers', label: '图层', icon: 'Layers' },
];
