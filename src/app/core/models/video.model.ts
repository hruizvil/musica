export type VideoCategory = 'toque-demo' | 'performance' | 'class' | 'batizado' | 'interview';

export interface Video {
  id: string;
  title: string;
  category: VideoCategory;
  youtubeId: string;
  description: string;
  mestre: string | null;
  toque: string | null;
  relatedSongs: string[];
  dateAdded: string;
  durationSeconds?: number;
}
