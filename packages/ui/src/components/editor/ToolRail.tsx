import { useEditorStore } from '../../store/editorStore';
import { TOOLS } from '../../tools';
import { ICONS } from '../../icons';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { AiBadge } from '../common/AiBadge';

/** Resolves an icon from the registry by name with a safe fallback. */
export function LucideIcon({
  name,
  size = 20,
  className,
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[name] ?? ICONS.Circle!;
  return <Icon size={size} className={className} />;
}

/** Vertical rail on desktop, horizontal dock on phones. Only tools allowed by the embed config show. */
export function ToolRail() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setTool = useEditorStore((s) => s.setTool);
  const embed = useEditorStore((s) => s.embed);
  const desktop = useIsDesktop();
  const tools = TOOLS.filter((t) => !embed?.tools || embed.tools.includes(t.id));
  return (
    <nav
      aria-label="工具"
      className={
        desktop
          ? 'w-[76px] shrink-0 border-r border-border bg-surface overflow-y-auto py-1'
          : 'scroll-x shrink-0 border-t border-border bg-surface flex'
      }
      style={
        desktop
          ? undefined
          : {
              height: 'calc(var(--dock-height) + var(--safe-bottom))',
              paddingBottom: 'var(--safe-bottom)',
            }
      }
      data-testid="tool-rail"
    >
      {tools.map((tool) => {
        const active = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            type="button"
            aria-pressed={active}
            data-testid={`tool-${tool.id}`}
            className={`relative flex flex-col items-center justify-center gap-1 text-[11px] transition ${desktop ? 'w-full h-16' : 'w-[72px] h-full shrink-0'} ${active ? 'text-accent' : 'text-muted hover:text-text'}`}
            onClick={() => setTool(active ? null : tool.id)}
          >
            <LucideIcon name={tool.icon} size={22} />
            <span>{tool.label}</span>
            {tool.ai && (
              <span className="absolute top-1.5 right-3">
                <AiBadge kind={tool.ai} compact />
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
