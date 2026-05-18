import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, User, Auth
} from 'firebase/auth';
import {
  getFirestore, collection, getDocs, setDoc, deleteDoc, doc, Firestore
} from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { Song } from '../models/song.model';

export interface SongOverride {
  title?: string;
  type?: string;
  toque?: string[];
  mestre?: string;
  youtube?: string;
  spotify?: string;
  lyrics?: string;
  translation?: string;
  deleted?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp;
  private auth: Auth;
  private db: Firestore;

  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    onAuthStateChanged(this.auth, user => this.currentUser.set(user));
  }

  waitForAuthReady(): Promise<void> {
    return this.auth.authStateReady();
  }

  signIn(password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, environment.adminEmail, password)
      .then(() => void 0);
  }

  signOut(): Promise<void> {
    return fbSignOut(this.auth);
  }

  async getSongOverrides(): Promise<Map<string, SongOverride>> {
    const snap = await getDocs(collection(this.db, 'song_overrides'));
    const map = new Map<string, SongOverride>();
    snap.forEach(d => map.set(d.id, d.data() as SongOverride));
    return map;
  }

  saveSongOverride(songId: string, fields: SongOverride): Promise<void> {
    return setDoc(doc(this.db, 'song_overrides', songId), fields, { merge: true });
  }

  markDeleted(songId: string): Promise<void> {
    return setDoc(doc(this.db, 'song_overrides', songId), { deleted: true }, { merge: true });
  }

  async getExtraSongs(): Promise<Song[]> {
    const snap = await getDocs(collection(this.db, 'songs_extra'));
    return snap.docs.map(d => d.data() as Song);
  }

  saveExtraSong(song: Song): Promise<void> {
    return setDoc(doc(this.db, 'songs_extra', song.id), song);
  }

  deleteExtraSong(songId: string): Promise<void> {
    return deleteDoc(doc(this.db, 'songs_extra', songId));
  }
}
