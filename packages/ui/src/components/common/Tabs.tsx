interface TabsProps<T extends string> {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}

/** Segmented control for sub-sections inside a panel. */
export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div className="scroll-x flex gap-1 p-1 bg-surface-2 rounded-xl mb-2" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          className={`shrink-0 h-8 px-3 rounded-lg text-xs whitespace-nowrap transition ${value === t.id ? 'bg-surface-3 text-text font-semibold' : 'text-muted hover:text-text'}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
