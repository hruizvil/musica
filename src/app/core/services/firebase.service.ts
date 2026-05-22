import { Injectable, signal, computed } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth, signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, User, Auth,
  GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, updateProfile,
} from 'firebase/auth';
import {
  getFirestore, collection, getDocs, setDoc, deleteDoc, doc, getDoc,
  updateDoc, arrayUnion, arrayRemove, Firestore,
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
  preview?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp;
  private auth: Auth;
  private db: Firestore;

  readonly currentUser = signal<User | null>(null);
  readonly membershipActive = signal<boolean>(false);
  readonly favorites = signal<Set<string>>(new Set());
  readonly learnedSongs = signal<Set<string>>(new Set());
  readonly isAdmin = computed(() => this.currentUser()?.email === environment.adminEmail);

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    onAuthStateChanged(this.auth, async user => {
      this.currentUser.set(user);
      if (user && user.email !== environment.adminEmail) {
        await this.loadUserData(user.uid);
      } else {
        this.membershipActive.set(false);
        this.favorites.set(new Set());
        this.learnedSongs.set(new Set());
      }
    });
  }

  waitForAuthReady(): Promise<void> {
    return this.auth.authStateReady();
  }

  // ── Admin auth ────────────────────────────────────────────────────────────

  signIn(password: string): Promise<void> {
    return signInWithEmailAndPassword(this.auth, environment.adminEmail, password)
      .then(() => void 0);
  }

  signOut(): Promise<void> {
    return fbSignOut(this.auth);
  }

  // ── Public user auth ──────────────────────────────────────────────────────

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    await this.ensureUserDoc(result.user);
  }

  async signInWithEmailPublic(email: string, password: string): Promise<void> {
    const result = await signInWithEmailAndPassword(this.auth, email, password);
    await this.ensureUserDoc(result.user);
  }

  async signUpWithEmailPublic(email: string, password: string, displayName: string): Promise<void> {
    const result = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(result.user, { displayName });
    await this.ensureUserDoc(result.user);
  }

  private async ensureUserDoc(user: User): Promise<void> {
    const ref = doc(this.db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        membershipActive: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  private async loadUserData(uid: string): Promise<void> {
    try {
      const snap = await getDoc(doc(this.db, 'users', uid));
      const data = snap.data() ?? {};
      this.membershipActive.set(data['membershipActive'] === true);
      this.favorites.set(new Set(data['favorites'] ?? []));
      this.learnedSongs.set(new Set(data['learnedSongs'] ?? []));
    } catch {
      this.membershipActive.set(false);
      this.favorites.set(new Set());
      this.learnedSongs.set(new Set());
    }
  }

  // ── Favorites & learned ───────────────────────────────────────────────────

  async toggleFavorite(songId: string): Promise<void> {
    const uid = this.currentUser()?.uid;
    if (!uid) return;
    const isFav = this.favorites().has(songId);
    const next = new Set(this.favorites());
    if (isFav) {
      next.delete(songId);
      await updateDoc(doc(this.db, 'users', uid), { favorites: arrayRemove(songId) });
    } else {
      next.add(songId);
      await updateDoc(doc(this.db, 'users', uid), { favorites: arrayUnion(songId) });
    }
    this.favorites.set(next);
  }

  async toggleLearned(songId: string): Promise<void> {
    const uid = this.currentUser()?.uid;
    if (!uid) return;
    const isLearned = this.learnedSongs().has(songId);
    const next = new Set(this.learnedSongs());
    if (isLearned) {
      next.delete(songId);
      await updateDoc(doc(this.db, 'users', uid), { learnedSongs: arrayRemove(songId) });
    } else {
      next.add(songId);
      await updateDoc(doc(this.db, 'users', uid), { learnedSongs: arrayUnion(songId) });
    }
    this.learnedSongs.set(next);
  }

  // ── Firestore: song overrides & extra songs ───────────────────────────────

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
