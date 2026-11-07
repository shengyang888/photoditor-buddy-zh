import { useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, EyeOff, XCircle } from 'lucide-react';
import {
  GEMINI_MODELS,
  OPENAI_MODELS,
  looksLikeKey,
  verifyKey,
  type CloudProviderId,
} from '@photoditor-buddy/ai';
import { keyVault, useEditorStore } from '../store/editorStore';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Chip, ChipRow } from '../components/common/Chip';
import { Tabs } from '../components/common/Tabs';
import { Section, Hint } from '../components/common/Section';

const KEY_HELP: Record<CloudProviderId, { label: string; url: string; steps: string[] }> = {
  gemini: {
    label: 'Google Gemini',
    url: 'https://aistudio.google.com/apikey',
    steps: [
      '打开 Google AI Studio，用 Google 账号登录。',
      '点「Create API key」并复制（以 AIza… 开头）。',
      '图片生成需要在 Google Cloud 项目中开通计费（图片模型没有免费额度）。',
    ],
  },
  openai: {
    label: 'OpenAI',
    url: 'https://platform.openai.com/api-keys',
    steps: [
      '打开 OpenAI 平台并登录。',
      '点「Create new secret key」并复制（以 sk-… 开头）。',
      '在 Billing 中添加付款方式；每次图片编辑花费几美分。',
    ],
  },
};

/** API keys, model choices and app info. Keys are stored only in this browser. */
export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'keys' | 'models' | 'about'>('keys');
  return (
    <Modal open={open} title="设置" onClose={onClose} wide>
      <Tabs
        tabs={[
          { id: 'keys', label: 'AI 密钥' },
          { id: 'models', label: '模型与画质' },
          { id: 'about', label: '关于' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'keys' && (
        <div>
          <Hint>
            自带密钥：每次请求都直接从你的浏览器发给服务商，不会经过我们。密钥只保存在本浏览器。
          </Hint>
          <KeyField provider="gemini" />
          <KeyField provider="openai" />
          <Button
            size="sm"
            variant="danger"
            className="mt-2"
            onClick={() => {
              keyVault.clear();
              useEditorStore.setState({});
            }}
          >
            删除本浏览器中的全部密钥
          </Button>
        </div>
      )}
      {tab === 'models' && <ModelSettings />}
      {tab === 'about' && (
        <div className="text-sm leading-relaxed">
          <p className="mb-2">
            <strong>photoditor-buddy</strong> 是一款开源（MIT）照片编辑器，完全在你的浏览器中运行。除非你用自己的密钥使用云端 AI 工具，否则编辑内容不会离开你的设备。
          </p>
          <p className="mb-2">
            免费本机 AI：人脸关键点（MediaPipe）、去背景（MODNet / BiRefNet）、2× 超分（Swin2SR）、物体消除（LaMa）。模型从 Hugging Face / Google 下载一次后缓存。
          </p>
          <p>
            源代码与文档：{' '}
            <a
              className="text-accent underline"
              href="https://github.com/alwaysnelson/photoditor-buddy"
              target="_blank"
              rel="noreferrer"
            >
              github.com/alwaysnelson/photoditor-buddy
            </a>
          </p>
        </div>
      )}
    </Modal>
  );
}

function KeyField({ provider }: { provider: CloudProviderId }) {
  const help = KEY_HELP[provider];
  const [value, setValue] = useState(keyVault.get(provider));
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const toast = useEditorStore((s) => s.toast);
  const save = (): void => {
    keyVault.set(provider, value);
    useEditorStore.setState({});
    toast(
      value.trim() ? `${help.label} 密钥已保存在本设备。` : `${help.label} 密钥已删除。`,
      'success',
    );
  };
  const test = async (): Promise<void> => {
    setTesting(true);
    const result = await verifyKey(provider, value.trim());
    setStatus(result);
    setTesting(false);
    if (result.ok) save();
  };
  return (
    <Section
      title={help.label}
      className="mt-3"
      right={
        <a
          className="text-xs text-accent inline-flex items-center gap-1"
          href={help.url}
          target="_blank"
          rel="noreferrer"
        >
          获取密钥 <ExternalLink size={12} />
        </a>
      }
    >
      <div className="flex gap-1">
        <input
          type={show ? 'text' : 'password'}
          className="flex-1 bg-surface-2 border border-border rounded-xl px-3 h-10 text-sm focus:outline-none focus:border-accent font-mono"
          placeholder={provider === 'gemini' ? 'AIza…' : 'sk-…'}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setStatus(null);
          }}
          autoComplete="off"
          spellCheck={false}
          aria-label={`${help.label} API key`}
          data-testid={`key-${provider}`}
        />
        <Button
          variant="ghost"
          onClick={() => setShow(!show)}
          aria-label={show ? '隐藏密钥' : '显示密钥'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </Button>
        <Button onClick={() => void test()} disabled={!value.trim() || testing}>
          {testing ? '正在验证…' : '验证并保存'}
        </Button>
        <Button variant="primary" onClick={save} data-testid={`save-key-${provider}`}>
          保存
        </Button>
      </div>
      {value && !looksLikeKey(provider, value) && (
        <div className="text-[11px] text-danger mt-1">
          这看起来不像 {help.label} 密钥。
        </div>
      )}
      {status && (
        <div
          className={`text-xs mt-1 inline-flex items-center gap-1 ${status.ok ? 'text-success' : 'text-danger'}`}
        >
          {status.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {status.message}
        </div>
      )}
      <ol className="text-xs text-muted list-decimal ml-4 mt-2 space-y-0.5">
        {help.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </Section>
  );
}

function ModelSettings() {
  const aiSettings = useEditorStore((s) => s.aiSettings);
  const setAiSettings = useEditorStore((s) => s.setAiSettings);
  return (
    <div>
      <Section title="提示词任务的首选服务商">
        <ChipRow>
          <Chip
            active={aiSettings.provider === 'gemini'}
            onClick={() => setAiSettings({ provider: 'gemini' })}
          >
            Gemini（更便宜，不支持蒙版）
          </Chip>
          <Chip
            active={aiSettings.provider === 'openai'}
            onClick={() => setAiSettings({ provider: 'openai' })}
          >
            OpenAI（蒙版精确）
          </Chip>
        </ChipRow>
        <Hint>
          涂抹的蒙版始终发给 OpenAI（如果你有 OpenAI 密钥），因为 Gemini 没有蒙版输入。
        </Hint>
      </Section>
      <Section title="Gemini 模型">
        {GEMINI_MODELS.map((m) => (
          <label key={m.id} className="flex items-start gap-2 text-xs py-1">
            <input
              type="radio"
              name="gemini-model"
              checked={aiSettings.geminiModel === m.id}
              onChange={() => setAiSettings({ geminiModel: m.id })}
            />
            <span>
              <span className="text-text">{m.label}</span>
              <br />
              <span className="text-muted">{m.price}</span>
            </span>
          </label>
        ))}
      </Section>
      <Section title="OpenAI 模型">
        {OPENAI_MODELS.map((m) => (
          <label key={m.id} className="flex items-start gap-2 text-xs py-1">
            <input
              type="radio"
              name="openai-model"
              checked={aiSettings.openAiModel === m.id}
              onChange={() => setAiSettings({ openAiModel: m.id })}
            />
            <span>
              <span className="text-text">{m.label}</span>
              <br />
              <span className="text-muted">{m.price}</span>
            </span>
          </label>
        ))}
        <ChipRow className="mt-1">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <Chip
              key={q}
              active={aiSettings.openAiQuality === q}
              onClick={() => setAiSettings({ openAiQuality: q })}
            >
              {({ low: '低画质', medium: '中画质', high: '高画质' } as const)[q]}
            </Chip>
          ))}
        </ChipRow>
      </Section>
      <Section title="免费去背景模型">
        <ChipRow>
          <Chip
            active={aiSettings.backgroundModel === 'portrait'}
            onClick={() => setAiSettings({ backgroundModel: 'portrait' })}
          >
            人物（MODNet，约 25 MB）
          </Chip>
          <Chip
            active={aiSettings.backgroundModel === 'general'}
            onClick={() => setAiSettings({ backgroundModel: 'general' })}
          >
            任意物体（BiRefNet，更大）
          </Chip>
        </ChipRow>
      </Section>
      <Section title="云端 AI 上传尺寸">
        <ChipRow>
          {[1024, 1536, 2048].map((n) => (
            <Chip
              key={n}
              active={aiSettings.uploadMaxEdge === n}
              onClick={() => setAiSettings({ uploadMaxEdge: n })}
            >
              {n}px
            </Chip>
          ))}
        </ChipRow>
        <Hint>
          上传越小，在移动网络上越快。AI 结果为模型自身的分辨率。
        </Hint>
      </Section>
    </div>
  );
}
