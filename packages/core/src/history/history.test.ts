import { describe, expect, it } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('undoes and redoes in order', () => {
    const h = new History(0);
    h.push(1);
    h.push(2);
    expect(h.present).toBe(2);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
    expect(h.undo()).toBe(0);
    expect(h.redo()).toBe(1);
    expect(h.canRedo).toBe(true);
    h.push(5);
    expect(h.canRedo).toBe(false);
    expect(h.present).toBe(5);
  });

  it('trims to maxDepth and replace does not add a step', () => {
    const h = new History(0, 3);
    for (let i = 1; i <= 10; i++) h.push(i);
    expect(h.length).toBe(3);
    h.replace(99);
    expect(h.present).toBe(99);
    expect(h.length).toBe(3);
    h.reset(7);
    expect(h.present).toBe(7);
    expect(h.canUndo).toBe(false);
  });
});
