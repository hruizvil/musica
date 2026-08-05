export interface AudioLinks {
  youtube?: string;
  spotify?: string;
}

export interface Song {
  id: string;
  title: string;
  toque: string[];
  composer: string | null;
  album: string | null;
  lyrics: string;
  translation: string | null;
  themes: string[];
  audioLinks: AudioLinks;
  notes: string | null;
  refrao?: string | null;
  refraoTranslation?: string | null;
  dateAdded: string;
  preview?: boolean;
}
