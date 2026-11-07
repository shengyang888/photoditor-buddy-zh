/**
 * A generic undo/redo stack of immutable snapshots.
 * Snapshots are stored as-is, so callers must pass values they will not mutate afterwards.
 */
export class History<T> {
  private past: T[] = [];
  private future: T[] = [];
  private current: T;

  constructor(
    initial: T,
    private readonly maxDepth = 60,
  ) {
    this.current = initial;
  }

  /** The state at the top of the stack. */
  get present(): T {
    return this.current;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Number of undoable steps. */
  get length(): number {
    return this.past.length;
  }

  /** Records a new state, clearing the redo branch and trimming to `maxDepth`. */
  push(next: T): void {
    this.past.push(this.current);
    if (this.past.length > this.maxDepth) this.past.shift();
    this.current = next;
    this.future = [];
  }

  /** Replaces the current state without creating an undo step (for live slider drags). */
  replace(next: T): void {
    this.current = next;
  }

  /** Steps back once. Returns the new present, or the unchanged present when nothing to undo. */
  undo(): T {
    const previous = this.past.pop();
    if (previous === undefined) return this.current;
    this.future.push(this.current);
    this.current = previous;
    return this.current;
  }

  /** Steps forward once. Returns the new present, or the unchanged present when nothing to redo. */
  redo(): T {
    const next = this.future.pop();
    if (next === undefined) return this.current;
    this.past.push(this.current);
    this.current = next;
    return this.current;
  }

  /** Drops all history and starts again from `initial`. */
  reset(initial: T): void {
    this.past = [];
    this.future = [];
    this.current = initial;
  }
}
