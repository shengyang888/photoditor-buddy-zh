import { useState } from 'react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useEditorStore } from '../../store/editorStore';
import { ExportDialog } from '../../panels/ExportDialog';
import { SettingsDialog } from '../../panels/SettingsDialog';
import { PanelHost } from './PanelHost';
import { ToolRail } from './ToolRail';
import { TopBar } from './TopBar';
import { Viewport } from './Viewport';

/** Layout of the editor screen. Desktop: rail | viewport | panel. Phone: viewport / panel / dock. */
export function EditorShell() {
  const desktop = useIsDesktop();
  const [exportOpen, setExportOpen] = useState(false);
  const settingsOpen = useEditorStore((s) => s.settingsOpen);
  const setSettingsOpen = useEditorStore((s) => s.setSettingsOpen);
  return (
    <div className="h-full flex flex-col" data-testid="editor">
      <TopBar onExport={() => setExportOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      {desktop ? (
        <div className="flex-1 min-h-0 flex">
          <ToolRail />
          <Viewport />
          <PanelHost />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <Viewport />
          <PanelHost />
          <ToolRail />
        </div>
      )}
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
