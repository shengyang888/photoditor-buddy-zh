import { describe, expect, it } from 'vitest';
import { AI_TASKS, AI_TASK_CATEGORIES, findTask } from './tasks';
import { chooseProvider, defaultAiSettings } from './run';
import { KeyVault } from './vault';

describe('AI task catalogue', () => {
  it('has unique ids, valid categories and prompts that mention the user text', () => {
    const ids = new Set<string>();
    for (const t of AI_TASKS) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(AI_TASK_CATEGORIES).toContain(t.category);
      if (t.runtime === 'local') expect(t.local).toBeDefined();
      if (t.needsPrompt) expect(t.buildPrompt({ text: 'UNIQUE_TOKEN' })).toContain('UNIQUE_TOKEN');
      if (t.options) {
        const withOption = t.buildPrompt({ text: '', option: t.options[0] });
        expect(withOption.length).toBeGreaterThan(10);
      }
    }
    expect(AI_TASKS.length).toBeGreaterThanOrEqual(25);
    expect(findTask('ai-remove')?.usesMask).toBe(true);
  });

  it('routes masked edits to OpenAI when available, otherwise to the preferred provider', () => {
    const vault = new KeyVault(null);
    const settings = defaultAiSettings();
    const remove = findTask('ai-remove')!;
    expect(chooseProvider(remove, true, settings, vault)).toBe('gemini');
    vault.set('openai', 'sk-x');
    expect(chooseProvider(remove, true, settings, vault)).toBe('openai');
    expect(chooseProvider(remove, false, settings, vault)).toBe('openai');
    vault.set('gemini', 'AIza');
    expect(chooseProvider(remove, false, settings, vault)).toBe('gemini');
  });
});
