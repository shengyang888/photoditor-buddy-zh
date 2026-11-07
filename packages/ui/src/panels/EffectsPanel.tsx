import {
  EFFECT_DEFINITIONS,
  defaultEffectSettings,
  findEffect,
  type BlurShape,
} from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { Chip, ChipRow } from '../components/common/Chip';
import { Slider } from '../components/common/Slider';
import { Button } from '../components/common/Button';
import { PanelHeader, Hint, Section } from '../components/common/Section';

/** Creative effects (one at a time) including the Blur / Bokeh tool. */
export function EffectsPanel() {
  const snapshot = useSnapshot();
  const commit = useEditorStore((s) => s.commit);
  const updateLive = useEditorStore((s) => s.updateLive);
  const effect = snapshot.effect;
  const def = effect ? findEffect(effect.id) : undefined;

  return (
    <div data-testid="effects-panel">
      <PanelHeader
        title="特效"
        right={
          effect && (
            <Button size="sm" variant="ghost" onClick={() => commit({ effect: null })}>
              移除
            </Button>
          )
        }
      />
      <div className="grid grid-cols-3 gap-2" data-testid="effect-grid">
        {EFFECT_DEFINITIONS.map((e) => (
          <button
            key={e.id}
            type="button"
            aria-pressed={effect?.id === e.id}
            data-testid={`effect-${e.id}`}
            title={e.description}
            className={`h-14 rounded-xl text-xs px-1 border transition ${effect?.id === e.id ? 'bg-accent/15 border-accent text-accent' : 'bg-surface-2 border-border hover:bg-surface-3'}`}
            onClick={() =>
              commit({ effect: effect?.id === e.id ? null : defaultEffectSettings(e.id) })
            }
          >
            {e.name}
          </button>
        ))}
      </div>
      {effect && def && (
        <Section title={def.name} className="mt-3">
          <Hint>{def.description}</Hint>
          {def.id === 'blur' && (
            <ChipRow className="mt-1">
              {(['whole', 'radial', 'linear'] as BlurShape[]).map((shape) => (
                <Chip
                  key={shape}
                  active={effect.shape === shape}
                  onClick={() => commit({ effect: { ...effect, shape } })}
                >
                  {shape === 'whole' ? '整张照片' : shape === 'radial' ? '圆形聚焦' : '移轴带'}
                </Chip>
              ))}
            </ChipRow>
          )}
          <Slider
            label={def.amountLabel}
            min={0}
            max={100}
            defaultValue={def.defaultAmount}
            value={effect.amount}
            onChange={(v) => updateLive({ effect: { ...effect, amount: v } })}
            onCommit={(v) => commit({ effect: { ...effect, amount: v } })}
          />
          {def.paramLabel && (
            <Slider
              label={def.paramLabel}
              min={0}
              max={100}
              defaultValue={def.defaultParam}
              value={effect.param}
              onChange={(v) => updateLive({ effect: { ...effect, param: v } })}
              onCommit={(v) => commit({ effect: { ...effect, param: v } })}
            />
          )}
          {def.id === 'blur' && effect.shape === 'linear' && (
            <Slider
              label="角度"
              min={-90}
              max={90}
              value={effect.angle}
              format={(v) => `${v}°`}
              onChange={(v) => updateLive({ effect: { ...effect, angle: v } })}
              onCommit={(v) => commit({ effect: { ...effect, angle: v } })}
            />
          )}
          {def.hasCenter && <Hint>点按照片移动焦点。</Hint>}
        </Section>
      )}
    </div>
  );
}
