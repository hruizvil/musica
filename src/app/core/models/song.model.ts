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
  /** English version of the notes, written in the admin. */
  notesEn?: string | null;
  refrao?: string | null;
  refraoTranslation?: string | null;
  dateAdded: string;
  preview?: boolean;
}
