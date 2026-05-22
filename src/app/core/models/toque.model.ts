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
