import { COLOR_SWATCHES } from '@photoditor-buddy/core';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  swatches?: readonly string[];
  label?: string;
  allowNone?: boolean;
}

/** Swatch row plus the native colour input for custom colours. */
export function ColorPicker({
  value,
  onChange,
  swatches = COLOR_SWATCHES,
  label,
  allowNone,
}: ColorPickerProps) {
  return (
    <div className="py-1.5">
      {label && <div className="text-xs text-text/90 mb-1">{label}</div>}
      <div className="scroll-x flex items-center gap-2 py-1">
        {allowNone && (
          <button
            type="button"
            aria-label="无颜色"
            className={`h-7 w-7 shrink-0 rounded-full border-2 ${value === '' ? 'border-accent' : 'border-border'} bg-[linear-gradient(45deg,transparent_45%,#f87171_45%,#f87171_55%,transparent_55%)]`}
            onClick={() => onChange('')}
          />
        )}
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`颜色 ${c}`}
            className={`h-7 w-7 shrink-0 rounded-full border-2 ${value.toLowerCase() === c.toLowerCase() ? 'border-accent scale-110' : 'border-border'}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
          />
        ))}
        <label
          className="h-7 w-7 shrink-0 rounded-full border-2 border-dashed border-border overflow-hidden cursor-pointer relative"
          title="自定义颜色"
        >
          <span className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)] opacity-80" />
          <input
            type="color"
            value={value || '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label="自定义颜色"
          />
        </label>
      </div>
    </div>
  );
}
