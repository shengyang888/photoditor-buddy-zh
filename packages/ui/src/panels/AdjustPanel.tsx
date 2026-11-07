import { useRef, useState } from 'react';
import { Upload, Wand2 } from 'lucide-react';
import {
  ADJUSTMENT_DEFINITIONS,
  HSL_BANDS,
  HSL_BAND_LABELS,
  defaultAdjustments,
  parseCube,
  type Adjustments,
  type HslBand,
  type ScalarAdjustmentKey,
} from '@photoditor-buddy/core';
import { useEditorStore, useSnapshot } from '../store/editorStore';
import { Slider } from '../components/common/Slider';
import { Tabs } from '../components/common/Tabs';
import { Chip, ChipRow } from '../components/common/Chip';
import { Button } from '../components/common/Button';
import { PanelHeader, Section, Hint } from '../components/common/Section';
import { CurveEditor } from '../components/editor/CurveEditor';

type Tab = 'light' | 'color' | 'detail' | 'effects' | 'hsl' | 'curves' | 'tone' | 'lut';

const TABS: { id: Tab; label: string }[] = [
  { id: 'light', label: '光线' },
  { id: 'color', label: '色彩' },
  { id: 'detail', label: '细节' },
  { id: 'effects', label: '特效' },
  { id: 'hsl', label: 'HSL' },
  { id: 'curves', label: '曲线' },
  { id: 'tone', label: '色调' },
  { id: 'lut', label: 'LUT' },
];

/** All non-destructive sliders, grouped into tabs. Every slider previews live and records one undo step on release. */
export function AdjustPanel() {
  const snapshot = useSnapshot();
  const updateLive = useEditorStore((s) => s.updateLive);
  const commit = useEditorStore((s) => s.commit);
  const toast = useEditorStore((s) => s.toast);
  const [tab, setTab] = useState<Tab>('light');
  const [band, setBand] = useState<HslBand>('red');
  const [curveChannel, setCurveChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>('rgb');
  const fileRef = useRef<HTMLInputElement>(null);
  const a = snapshot.adjustments;

  const patch = (fn: (draft: Adjustments) => void, live: boolean): void => {
    const next = structuredClone(a);
    fn(next);
    if (live) updateLive({ adjustments: next });
    else commit({ adjustments: next });
  };
  const scalar = (key: ScalarAdjustmentKey) => {
    const def = ADJUSTMENT_DEFINITIONS.find((d) => d.key === key)!;
    return (
      <Slider
        key={key}
        label={def.label}
        description={def.description}
        min={def.min}
        max={def.max}
        defaultValue={def.defaultValue}
        value={a[key]}
        onChange={(v) =>
          patch((d) => {
            d[key] = v;
          }, true)
        }
        onCommit={(v) =>
          patch((d) => {
            d[key] = v;
          }, false)
        }
      />
    );
  };

  const autoEnhance = (): void => {
    patch((d) => {
      d.contrast = Math.max(d.contrast, 10);
      d.vibrance = Math.max(d.vibrance, 16);
      d.clarity = Math.max(d.clarity, 8);
      d.shadows = Math.max(d.shadows, 10);
      d.highlights = Math.min(d.highlights, -6);
    }, false);
  };

  const onLutFile = async (file: File | undefined): Promise<void> => {
    if (!file) return;
    try {
      const lut = parseCube(await file.text());
      const next = structuredClone(a);
      next.lut = { id: 'user', intensity: 100 };
      commit({ adjustments: next, userLut: lut });
      toast(`已加载 LUT「${lut.title}」（${lut.size}³）。`, 'success');
    } catch (error) {
      toast(error instanceof Error ? error.message : '无法读取 LUT 文件。', 'error');
    }
  };

  return (
    <div data-testid="adjust-panel">
      <PanelHeader
        title="调整"
        right={
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              icon={<Wand2 size={14} />}
              onClick={autoEnhance}
              data-testid="auto-enhance"
            >
              自动
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => commit({ adjustments: { ...defaultAdjustments(), lut: a.lut } })}
            >
              重置
            </Button>
          </div>
        }
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {(tab === 'light' || tab === 'color' || tab === 'detail' || tab === 'effects') && (
        <div>{ADJUSTMENT_DEFINITIONS.filter((d) => d.group === tab).map((d) => scalar(d.key))}</div>
      )}
      {tab === 'hsl' && (
        <div>
          <ChipRow>
            {HSL_BANDS.map((b) => (
              <Chip
                key={b}
                active={band === b}
                onClick={() => setBand(b)}
                icon={
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{
                      background: `hsl(${{ red: 0, orange: 30, yellow: 60, green: 120, aqua: 180, blue: 240, purple: 280, magenta: 320 }[b]} 80% 55%)`,
                    }}
                  />
                }
              >
                {HSL_BAND_LABELS[b]}
              </Chip>
            ))}
          </ChipRow>
          {(['hue', 'saturation', 'luminance'] as const).map((k) => (
            <Slider
              key={k}
              label={k === 'hue' ? '色相' : k === 'saturation' ? '饱和度' : '明度'}
              min={-100}
              max={100}
              value={a.hsl[band][k]}
              onChange={(v) =>
                patch((d) => {
                  d.hsl[band][k] = v;
                }, true)
              }
              onCommit={(v) =>
                patch((d) => {
                  d.hsl[band][k] = v;
                }, false)
              }
            />
          ))}
          <Hint>选择一个色带，然后调整它的色相、饱和度或明度，不影响其他颜色。</Hint>
        </div>
      )}
      {tab === 'curves' && (
        <div>
          <ChipRow>
            {(['rgb', 'red', 'green', 'blue'] as const).map((c) => (
              <Chip key={c} active={curveChannel === c} onClick={() => setCurveChannel(c)}>
                {({ rgb: 'RGB', red: '红色', green: '绿色', blue: '蓝色' } as const)[c]}
              </Chip>
            ))}
          </ChipRow>
          <CurveEditor
            points={a.curves[curveChannel]}
            color={
              { rgb: '#ffb454', red: '#f87171', green: '#4ade80', blue: '#60a5fa' }[curveChannel]
            }
            onChange={(pts) =>
              patch((d) => {
                d.curves[curveChannel] = pts;
              }, true)
            }
            onCommit={(pts) =>
              patch((d) => {
                d.curves[curveChannel] = pts;
              }, false)
            }
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              onClick={() =>
                patch((d) => {
                  d.curves[curveChannel] = [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                  ];
                }, false)
              }
            >
              重置曲线
            </Button>
            <Button
              size="sm"
              onClick={() =>
                patch((d) => {
                  d.curves.rgb = [
                    { x: 0, y: 0 },
                    { x: 0.25, y: 0.2 },
                    { x: 0.75, y: 0.8 },
                    { x: 1, y: 1 },
                  ];
                }, false)
              }
            >
              S 形曲线
            </Button>
            <Button
              size="sm"
              onClick={() =>
                patch((d) => {
                  d.curves.rgb = [
                    { x: 0, y: 0.12 },
                    { x: 1, y: 1 },
                  ];
                }, false)
              }
            >
              哑光
            </Button>
          </div>
          <Hint>拖动控制点，点按曲线添加控制点，双击控制点删除。</Hint>
        </div>
      )}
      {tab === 'tone' && (
        <div>
          <Section title="分离色调">
            <Slider
              label="高光色相"
              min={0}
              max={360}
              defaultValue={45}
              value={a.splitToning.highlightHue}
              format={(v) => `${v}°`}
              onChange={(v) =>
                patch((d) => {
                  d.splitToning.highlightHue = v;
                }, true)
              }
              onCommit={(v) =>
                patch((d) => {
                  d.splitToning.highlightHue = v;
                }, false)
              }
            />
            <Slider
              label="高光强度"
              min={0}
              max={100}
              value={a.splitToning.highlightSaturation}
              onChange={(v) =>
                patch((d) => {
                  d.splitToning.highlightSaturation = v;
                }, true)
              }
              onCommit={(v) =>
                patch((d) => {
                  d.splitToning.highlightSaturation = v;
                }, false)
              }
            />
            <Slider
              label="阴影色相"
              min={0}
              max={360}
              defaultValue={220}
              value={a.splitToning.shadowHue}
              format={(v) => `${v}°`}
              onChange={(v) =>
                patch((d) => {
                  d.splitToning.shadowHue = v;
                }, true)
              }
              onCommit={(v) =>
                patch((d) => {
                  d.splitToning.shadowHue = v;
                }, false)
              }
            />
            <Slider
              label="阴影强度"
              min={0}
              max={100}
              value={a.splitToning.shadowSaturation}
              onChange={(v) =>
                patch((d) => {
                  d.splitToning.shadowSaturation = v;
                }, true)
              }
              onCommit={(v) =>
                patch((d) => {
                  d.splitToning.shadowSaturation = v;
                }, false)
              }
            />
            <Slider
              label="平衡"
              min={-100}
              max={100}
              value={a.splitToning.balance}
              onChange={(v) =>
                patch((d) => {
                  d.splitToning.balance = v;
                }, true)
              }
              onCommit={(v) =>
                patch((d) => {
                  d.splitToning.balance = v;
                }, false)
              }
            />
          </Section>
          <Section title="色彩平衡">
            {(['shadows', 'midtones', 'highlights'] as const).map((range) => (
              <div key={range}>
                <div className="text-xs text-muted mt-1">
                  {{ shadows: '阴影', midtones: '中间调', highlights: '高光' }[range]}
                </div>
                {(['Red', 'Green', 'Blue'] as const).map((ch, i) => (
                  <Slider
                    key={ch}
                    label={`${{ Red: '红色', Green: '绿色', Blue: '蓝色' }[ch]}`}
                    min={-100}
                    max={100}
                    value={a.colorBalance[range][i]!}
                    onChange={(v) =>
                      patch((d) => {
                        d.colorBalance[range][i] = v;
                      }, true)
                    }
                    onCommit={(v) =>
                      patch((d) => {
                        d.colorBalance[range][i] = v;
                      }, false)
                    }
                  />
                ))}
              </div>
            ))}
          </Section>
        </div>
      )}
      {tab === 'lut' && (
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".cube,text/plain"
            className="hidden"
            onChange={(e) => void onLutFile(e.target.files?.[0])}
            data-testid="lut-file"
          />
          <Button icon={<Upload size={16} />} onClick={() => fileRef.current?.click()} block>
            导入 .cube LUT
          </Button>
          {snapshot.userLut ? (
            <div className="mt-2">
              <div className="text-xs text-muted">已加载：{snapshot.userLut.title}</div>
              <Slider
                label="LUT 强度"
                min={0}
                max={100}
                defaultValue={100}
                value={a.lut.id === 'user' ? a.lut.intensity : 0}
                onChange={(v) =>
                  patch((d) => {
                    d.lut = { id: 'user', intensity: v };
                  }, true)
                }
                onCommit={(v) =>
                  patch((d) => {
                    d.lut = { id: 'user', intensity: v };
                  }, false)
                }
              />
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  commit({
                    userLut: null,
                    adjustments: { ...a, lut: { id: null, intensity: 100 } },
                  })
                }
              >
                移除 LUT
              </Button>
            </div>
          ) : (
            <Hint>
              LUT 文件（.cube）是在 DaVinci Resolve、Lightroom 中制作或从 LUT
              包下载的色彩风格。导入后会叠加在你的调整之上。
            </Hint>
          )}
        </div>
      )}
    </div>
  );
}
