import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'capoeira-roda';

/**
 * Ordered queue of song ids for "roda mode" — the setlist someone works
 * through song by song around the circle. Persisted like theme.service.ts,
 * so the queue survives a reload.
 */
@Injectable({ providedIn: 'root' })
export class RodaService {
  readonly ids = signal<string[]>(this.readStored());

  readonly count = computed(() => this.ids().length);

  has(id: string): boolean {
    return this.ids().includes(id);
  }

  add(id: string): void {
    if (this.ids().includes(id)) return;
    this.ids.update(ids => [...ids, id]);
    this.persist();
  }

  remove(id: string): void {
    this.ids.update(ids => ids.filter(existing => existing !== id));
    this.persist();
  }

  /** Swaps the song at `index` with the neighbour one place earlier (-1) or later (+1). */
  reorder(index: number, direction: -1 | 1): void {
    const ids = this.ids();
    const target = index + direction;
    if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    this.ids.set(next);
    this.persist();
  }

  clear(): void {
    this.ids.set([]);
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids()));
    } catch {
      // storage unavailable (private mode) — the queue still works for this session
    }
  }

  private readStored(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }
}
