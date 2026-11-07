import { ChevronLeft, Download, Eye, Redo2, RotateCcw, Settings, Undo2 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { IconButton } from '../common/IconButton';
import { Button } from '../common/Button';

interface TopBarProps {
  onExport: () => void;
  onOpenSettings: () => void;
}

/** Editor header: back, undo/redo, compare (press and hold), reset, settings, export. */
export function TopBar({ onExport, onOpenSettings }: TopBarProps) {
  const canUndo = useEditorStore((s) => s.canUndo);
  const canRedo = useEditorStore((s) => s.canRedo);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const resetEdits = useEditorStore((s) => s.resetEdits);
  const setCompare = useEditorStore((s) => s.setCompare);
  const goHome = useEditorStore((s) => s.goHome);
  const embed = useEditorStore((s) => s.embed);
  const fileName = useEditorStore((s) => s.snapshot?.source.fileName ?? '');
  return (
    <header
      className="h-12 shrink-0 flex items-center gap-1 px-2 border-b border-border bg-surface"
      data-testid="topbar"
    >
      <IconButton
        label="返回首页"
        icon={<ChevronLeft size={20} />}
        onClick={() => {
          if (window.confirm('离开这张照片？未保存的编辑会丢失。')) goHome();
        }}
      />
      <div className="hidden sm:block text-xs text-muted truncate max-w-[160px]" title={fileName}>
        {fileName}
      </div>
      <div className="flex-1" />
      <IconButton
        label="撤销"
        icon={<Undo2 size={18} />}
        onClick={undo}
        disabled={!canUndo}
        data-testid="undo"
      />
      <IconButton
        label="重做"
        icon={<Redo2 size={18} />}
        onClick={redo}
        disabled={!canRedo}
        data-testid="redo"
      />
      <IconButton
        label="按住对比原图"
        icon={<Eye size={18} />}
        onPointerDown={() => setCompare(true)}
        onPointerUp={() => setCompare(false)}
        onPointerLeave={() => setCompare(false)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') setCompare(true);
        }}
        onKeyUp={() => setCompare(false)}
        data-testid="compare"
      />
      <IconButton
        label="重置全部编辑"
        icon={<RotateCcw size={18} />}
        onClick={() => {
          if (window.confirm('清除全部编辑，从原图重新开始？'))
            resetEdits();
        }}
        disabled={!canUndo}
      />
      <IconButton
        label="设置"
        icon={<Settings size={18} />}
        onClick={onOpenSettings}
        data-testid="open-settings"
      />
      <Button
        variant="primary"
        size="sm"
        icon={<Download size={16} />}
        onClick={onExport}
        className="ml-1"
        data-testid="export-button"
      >
        {embed?.doneLabel ?? '导出'}
      </Button>
    </header>
  );
}
