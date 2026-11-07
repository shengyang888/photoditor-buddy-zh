import { Sparkles, Cpu } from 'lucide-react';

interface AiBadgeProps {
  /** `cloud` = uses the user's API key (costs money); `local` = free model that runs on the device. */
  kind?: 'cloud' | 'local';
  size?: 'sm' | 'md';
  /** Icon only, for narrow places such as the tool rail. */
  compact?: boolean;
}

/** Marks a feature that needs an AI model. Shown next to every such feature in the UI. */
export function AiBadge({ kind = 'cloud', size = 'sm', compact = false }: AiBadgeProps) {
  const title = kind === 'local' ? '免费 AI，在本设备上运行' : '使用你自己的 AI API 密钥';
  const label = kind === 'local' ? '本地' : 'AI';
  const Icon = kind === 'local' ? Cpu : Sparkles;
  if (compact) {
    return (
      <span
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-white ${kind === 'local' ? 'bg-success' : 'ai-gradient'}`}
        title={title}
        aria-label={label}
      >
        <Icon size={10} />
      </span>
    );
  }
  const dims = size === 'sm' ? 'h-4 px-1.5 text-[10px] gap-0.5' : 'h-6 px-2 text-xs gap-1';
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${dims} ${kind === 'local' ? 'bg-success/15 text-success' : 'ai-gradient text-white'}`}
      title={title}
    >
      <Icon size={size === 'sm' ? 10 : 12} /> {label}
    </span>
  );
}
