export interface AlbumTrack {
  trackNumber: number;
  songId: string | null;
  title: string;
  duration?: string;
}

export interface Album {
  id: string;
  title: string;
  year: number;
  mestre: string | null;
  contributors: string[];
  coverUrl?: string;
  description: string;
  trackList: AlbumTrack[];
  spotifyUrl?: string;
  youtubePlaylistUrl?: string;
}
