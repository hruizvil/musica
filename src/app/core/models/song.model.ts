export type SongType = 'ladainha' | 'corrido' | 'louvacao' | 'quadra';

export interface AudioLinks {
  youtube?: string;
  spotify?: string;
}

export interface Song {
  id: string;
  title: string;
  type: SongType;
  toque: string[];
  mestre: string | null;
  composer: string | null;
  album: string | null;
  lyrics: string;
  translation: string | null;
  themes: string[];
  audioLinks: AudioLinks;
  notes: string | null;
  dateAdded: string;
  preview?: boolean;
}
