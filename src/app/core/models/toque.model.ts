export type ToqueCategory = 'angola' | 'regional' | 'abada' | 'other';
export type ToqueSpeed = 'slow' | 'medium' | 'fast' | 'variable';

export interface VideoLink {
  url: string;
  label: string;
  thumbnailId?: string;
}

export interface Toque {
  id: string;
  name: string;
  category: ToqueCategory;
  description: string;
  tempo: ToqueSpeed;
  tempoBPM?: { min: number; max: number };
  context: string;
  instruments: string[];
  gameCharacter: string;
  videoLinks: VideoLink[];
  relatedToques: string[];
}

/** Berimbau strokes: chiado (the buzz, stone resting on the wire), dom (open, low), dim (stone pressed, high). */
export type Stroke = 'tch' | 'dom' | 'dim';

/** A toque's berimbau pattern as saved in the admin. An empty list means "no pattern". */
export interface ToquePattern {
  strokes: Stroke[];
  updatedBy?: string | null;
  updatedAt?: string | null;
}
