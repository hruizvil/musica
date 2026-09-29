import { Stroke } from '../models/toque.model';

/**
 * Patterns confirmed before the admin could edit them. A pattern saved in the admin
 * (Firestore "toque_patterns") replaces the one here; a toque in neither has no pattern,
 * and every screen says so instead of guessing one.
 */
export const DEFAULT_PATTERNS: Record<string, Stroke[]> = {
  'benguela': ['tch', 'tch', 'dom', 'dom', 'dim'],
  'sao-bento-abada': ['tch', 'dom', 'dim', 'dim', 'dom'],
};
