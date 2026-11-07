import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORY_SLUGS,
  FILTER_CATEGORIES,
  Renderer,
  buildRecipeLut,
  defaultAdjustments,
  filtersInCategory,
  bitmapToCanvas,
  fitWithin,
  stackPreset,
  type FilterCategory,
  type FilterDefinition,
} from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { Chip, ChipRow } from '../components/common/Chip';
import { Slider } from '../components/common/Slider';
import { PanelHeader, Hint } from '../components/common/Section';
import { Button } from '../components/common/Button';

/** Size of the square thumbnails. */
const THUMB = 112;

/**
 * One shared WebGL renderer draws every thumbnail from a tiny copy of the photo.
 * Filters are rendered synchronously, so a whole category appears at once.
 */
let thumbRenderer: Renderer | null = null;
function getThumbRenderer(): Renderer {
  if (!thumbRenderer) thumbRenderer = new Renderer(document.createElement('canvas'));
  return thumbRenderer;
}

/** Filters grouped by category with live thumbnails and a strength slider. */
export function FiltersPanel() {
  const snapshot = useSnapshot();
  const commit = useEditorStore((s) => s.commit);
  const updateLive = useEditorStore((s) => s.updateLive);
  const [category, setCategory] = useState<FilterCategory>(
    snapshot.filter
      ? (FILTER_CATEGORIES.find((c) =>
          filtersInCategory(c).some((f) => f.id === snapshot.filter!.id),
        ) ?? FILTER_CATEGORIES[0]!)
      : FILTER_CATEGORIES[0]!,
  );
  const filters = useMemo(() => filtersInCategory(category), [category]);

  // A small square crop of the preview used as the thumbnail source.
  const thumbSource = useMemo(() => {
    const src = snapshot.source.preview;
    const side = Math.min(src.width, src.height);
    const canvas = document.createElement('canvas');
    canvas.width = THUMB;
    canvas.height = THUMB;
    canvas
      .getContext('2d')!
      .drawImage(
        src,
        (src.width - side) / 2,
        (src.height - side) / 2,
        side,
        side,
        0,
        0,
        THUMB,
        THUMB,
      );
    return canvas;
  }, [snapshot.source.preview]);

  const active = snapshot.filter;
  const setFilter = (filter: FilterDefinition | null): void => {
    commit({
      filter: filter
        ? { id: filter.id, intensity: active?.id === filter.id ? active.intensity : 100 }
        : null,
    });
  };

  return (
    <div data-testid="filters-panel">
      <PanelHeader
        title="滤镜"
        right={
          active && (
            <Button size="sm" variant="ghost" onClick={() => setFilter(null)}>
              移除
            </Button>
          )
        }
      />
      <ChipRow>
        {FILTER_CATEGORIES.map((c) => (
          <Chip
            key={c}
            active={category === c}
            onClick={() => setCategory(c)}
            data-testid={`filter-category-${CATEGORY_SLUGS[c]}`}
          >
            {c}
          </Chip>
        ))}
      </ChipRow>
      <div className="grid grid-cols-3 lg:grid-cols-3 gap-2 mt-2" data-testid="filter-grid">
        <FilterThumb
          key="none"
          source={thumbSource}
          filter={null}
          active={!active}
          onClick={() => setFilter(null)}
        />
        {filters.map((f) => (
          <FilterThumb
            key={f.id}
            source={thumbSource}
            filter={f}
            active={active?.id === f.id}
            onClick={() => setFilter(f)}
          />
        ))}
      </div>
      {active && (
        <div className="mt-2">
          <Slider
            label="强度"
            min={0}
            max={100}
            defaultValue={100}
            value={active.intensity}
            onChange={(v) => updateLive({ filter: { ...active, intensity: v } })}
            onCommit={(v) => commit({ filter: { ...active, intensity: v } })}
          />
        </div>
      )}
      <Hint>滤镜叠加在调整滑杆之上。再次点按同一滤镜可保留并调节强度。</Hint>
    </div>
  );
}

function FilterThumb({
  source,
  filter,
  active,
  onClick,
}: {
  source: HTMLCanvasElement;
  filter: FilterDefinition | null;
  active: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    try {
      const renderer = getThumbRenderer();
      renderer.setSource(source);
      const base = defaultAdjustments();
      const adjustments = filter ? stackPreset(base, filter.preset, 1) : base;
      const lut = filter?.lut ? buildRecipeLut(filter.lut) : null;
      renderer.render({
        adjustments: lut
          ? { ...adjustments, lut: { id: filter!.id, intensity: 100 } }
          : adjustments,
        lut,
        effect: null,
        portrait: null,
      });
      canvas.width = THUMB;
      canvas.height = THUMB;
      canvas.getContext('2d')!.drawImage(renderer.canvas as CanvasImageSource, 0, 0);
    } catch {
      // Thumbnail failures are cosmetic; the filter can still be applied.
      const size = fitWithin(source.width, source.height, THUMB);
      canvas.getContext('2d')!.drawImage(bitmapToCanvas(source, size.width, size.height), 0, 0);
    }
  }, [source, filter]);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={`filter-${filter?.id ?? 'none'}`}
      className={`rounded-xl overflow-hidden border-2 text-left transition ${active ? 'border-accent' : 'border-transparent hover:border-border'}`}
    >
      <canvas ref={ref} className="w-full aspect-square block bg-surface-2" />
      <div className={`text-[11px] px-1.5 py-1 truncate ${active ? 'text-accent' : 'text-muted'}`}>
        {filter?.name ?? '原图'}
      </div>
    </button>
  );
}
