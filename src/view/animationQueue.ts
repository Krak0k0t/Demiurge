export interface AnimationStep {
  label?: string;
  /** Delay before executing this step relative to the previous step finishing (ms). */
  waitBeforeMs?: number;
  /** How long this step visually occupies the stage before the next step begins (ms). */
  durationMs: number;
  /** Synchronous trigger for the 3D/2D/audio effect at the start of this step. */
  run: () => void;
}

/**
 * Asynchronous sequential Animation Queue ensuring cards, spawns,
 * phased attacks, deaths, and turn exchanges play one after another
 * with clear pacing rather than snapping instantaneously.
 */
export class AnimationQueue {
  private pending: AnimationStep[] = [];
  private busy = false;
  private activeTimer: number | null = null;
  private activeResolve: ((ok: boolean) => void) | null = null;
  private generation = 0;
  private onBusyListeners = new Set<(busy: boolean) => void>();
  private currentChain: Promise<void> = Promise.resolve();

  public isBusy(): boolean {
    return this.busy;
  }

  public onBusyChange(listener: (busy: boolean) => void): () => void {
    this.onBusyListeners.add(listener);
    return () => {
      this.onBusyListeners.delete(listener);
    };
  }

  private setBusy(next: boolean): void {
    if (this.busy === next) return;
    this.busy = next;
    this.onBusyListeners.forEach((fn) => fn(next));
  }

  private delayMs(ms: number, gen: number): Promise<boolean> {
    if (ms <= 0) return Promise.resolve(gen === this.generation);
    return new Promise((resolve) => {
      this.activeResolve = resolve;
      this.activeTimer = globalThis.setTimeout(() => {
        this.activeTimer = null;
        this.activeResolve = null;
        resolve(gen === this.generation);
      }, ms) as unknown as number;
    });
  }

  public enqueue(steps: AnimationStep[], onComplete?: () => void): Promise<void> {
    if (steps.length === 0) {
      onComplete?.();
      return this.currentChain;
    }

    const gen = this.generation;
    this.pending.push(...steps);
    this.setBusy(true);

    this.currentChain = this.currentChain.then(async () => {
      if (gen !== this.generation) return;
      while (this.pending.length > 0) {
        if (gen !== this.generation) return;
        const step = this.pending.shift()!;
        if (step.waitBeforeMs && step.waitBeforeMs > 0) {
          const ok = await this.delayMs(step.waitBeforeMs, gen);
          if (!ok) return;
        }
        step.run();
        if (step.durationMs > 0) {
          const ok = await this.delayMs(step.durationMs, gen);
          if (!ok) return;
        }
      }
      if (gen === this.generation) {
        this.setBusy(false);
        onComplete?.();
      }
    });

    return this.currentChain;
  }

  public clear(): void {
    this.generation += 1;
    this.pending.length = 0;
    if (this.activeTimer !== null) {
      globalThis.clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
    if (this.activeResolve !== null) {
      const resolve = this.activeResolve;
      this.activeResolve = null;
      resolve(false);
    }
    this.setBusy(false);
  }
}
