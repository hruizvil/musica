export interface MestreLinks {
  youtube?: string;
  instagram?: string;
  website?: string;
  spotify?: string;
}

export interface Mestre {
  id: string;
  name: string;
  nickname: string;
  graduacao: string;
  bio: string;
  birthYear?: number;
  birthPlace?: string;
  lineage: string;
  studentOf: string | null;
  mestreOf: string[];
  knownSongs: string[];
  albums: string[];
  photoUrl?: string;
  links: MestreLinks;
  activeAbada: boolean;
}
