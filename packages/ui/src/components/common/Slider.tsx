import { useId } from 'react';
import { RotateCcw } from 'lucide-react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  /** Fires on every move (live preview). */
  onChange: (value: number) => void;
  /** Fires when the drag ends (record undo step). */
  onCommit?: (value: number) => void;
  description?: string;
  /** Formats the displayed value. */
  format?: (value: number) => string;
  disabled?: boolean;
}

/**
 * Labelled range slider with a value readout and a reset button. The track fills from the
 * neutral point so users can see at a glance which sliders they have touched.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  defaultValue = 0,
  onChange,
  onCommit,
  description,
  format,
  disabled,
}: SliderProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  const changed = value !== defaultValue;
  return (
    <div className={`py-1.5 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between text-xs mb-0.5">
        <label htmlFor={id} className="text-text/90 truncate" title={description}>
          {label}
        </label>
        <div className="flex items-center gap-1.5">
          <span
            className={`tabular-nums w-10 text-right ${changed ? 'text-accent' : 'text-muted'}`}
          >
            {format ? format(value) : value}
          </span>
          <button
            type="button"
            aria-label={`重置 ${label}`}
            className={`h-5 w-5 inline-flex items-center justify-center rounded text-muted hover:text-text ${changed ? '' : 'invisible'}`}
            onClick={() => {
              onChange(defaultValue);
              onCommit?.(defaultValue);
            }}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
      <input
        id={id}
        type="range"
        className="pb-range"
        style={{ ['--fill' as string]: `${fill}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => onCommit?.(Number((e.target as HTMLInputElement).value))}
        onDoubleClick={() => {
          onChange(defaultValue);
          onCommit?.(defaultValue);
        }}
        aria-valuetext={format ? format(value) : String(value)}
      />
    </div>
  );
}
