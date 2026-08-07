import { Injectable, signal, computed, afterNextRender } from '@angular/core';
// Types only — `import type` is erased at build time, so none of this pulls the SDK
// into the initial bundle. The real modules arrive through the dynamic imports below.
import type { User } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { Song } from '../models/song.model';

type AuthModule = typeof import('firebase/auth');
type FirestoreModule = typeof import('firebase/firestore');

/** The loaded SDK plus the two initialised handles, passed around together so no
 *  method has to reach for module-level state that may not exist yet. */
interface Sdk {
  auth: Auth;
  db: Firestore;
  a: AuthModule;
  f: FirestoreModule;
}

export interface SongOverride {
  title?: string;
  toque?: string[];
  composer?: string;
  youtube?: string;
  spotify?: string;
  lyrics?: string;
  translation?: string;
  notes?: string | null;
  refrao?: string | null;
  refraoTranslation?: string | null;
  deleted?: boolean;
  preview?: boolean;
}

/**
 * Firestore and Auth are about half the app's JavaScript, and the first screen needs
 * neither: songs come from the bundled JSON and the localStorage cache. So the SDK is
 * imported dynamically and warmed after the first paint instead of blocking it.
 *
 * Every public method already returned a Promise, so going lazy changed no callers —
 * each one now awaits `ready()` first, and the signals fill in when the SDK lands.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private sdk?: Promise<Sdk>;

  readonly currentUser = signal<User | null>(null);
  readonly membershipActive = signal<boolean>(false);
  readonly favorites = signal<Set<string>>(new Set());
  readonly learnedSongs = signal<Set<string>>(new Set());
  readonly isAdmin = computed(() => this.currentUser()?.email === environment.adminEmail);

  constructor() {
    // Warm it once the first paint is out of the way, so a signed-in user's header and
    // favourites appear on their own rather than waiting for something to touch them.
    afterNextRender(() => void this.ready());
  }

  /** Loads and initialises the SDK, once, however many callers race for it. */
  private ready(): Promise<Sdk> {
    return (this.sdk ??= this.load());
  }

  private async load(): Promise<Sdk> {
    const [app, a, f] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);

    const instance = app.initializeApp(environment.firebase);
    const sdk: Sdk = { auth: a.getAuth(instance), db: f.getFirestore(instance), a, f };

    // Built before the listener is registered and handed to it directly: the callback
    // must never await ready(), which is the promise this function is still settling.
    a.onAuthStateChanged(sdk.auth, async user => {
      this.currentUser.set(user);
      if (user && user.email !== environment.adminEmail) {
        await this.loadUserData(sdk, user.uid);
      } else {
        this.clearUserData();
      }
    });

    return sdk;
  }

  async waitForAuthReady(): Promise<void> {
    const { auth } = await this.ready();
    await auth.authStateReady();
  }

  // ── Admin auth ────────────────────────────────────────────────────────────

  async signIn(password: string): Promise<void> {
    const { auth, a } = await this.ready();
    await a.signInWithEmailAndPassword(auth, environment.adminEmail, password);
  }

  async signOut(): Promise<void> {
    const { auth, a } = await this.ready();
    await a.signOut(auth);
  }

  // ── Public user auth ──────────────────────────────────────────────────────

  async signInWithGoogle(): Promise<void> {
    const sdk = await this.ready();
    const result = await sdk.a.signInWithPopup(sdk.auth, new sdk.a.GoogleAuthProvider());
    await this.ensureUserDoc(sdk, result.user);
  }

  async signInWithEmailPublic(email: string, password: string): Promise<void> {
    const sdk = await this.ready();
    const result = await sdk.a.signInWithEmailAndPassword(sdk.auth, email, password);
    await this.ensureUserDoc(sdk, result.user);
  }

  async signUpWithEmailPublic(email: string, password: string, displayName: string): Promise<void> {
    const sdk = await this.ready();
    const result = await sdk.a.createUserWithEmailAndPassword(sdk.auth, email, password);
    await sdk.a.updateProfile(result.user, { displayName });
    await this.ensureUserDoc(sdk, result.user);
  }

  private async ensureUserDoc({ db, f }: Sdk, user: User): Promise<void> {
    const ref = f.doc(db, 'users', user.uid);
    const snap = await f.getDoc(ref);
    if (!snap.exists()) {
      await f.setDoc(ref, {
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        membershipActive: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  private async loadUserData({ db, f }: Sdk, uid: string): Promise<void> {
    try {
      const snap = await f.getDoc(f.doc(db, 'users', uid));
      const data = snap.data() ?? {};
      this.membershipActive.set(data['membershipActive'] === true);
      this.favorites.set(new Set(data['favorites'] ?? []));
      this.learnedSongs.set(new Set(data['learnedSongs'] ?? []));
    } catch {
      this.clearUserData();
    }
  }

  private clearUserData(): void {
    this.membershipActive.set(false);
    this.favorites.set(new Set());
    this.learnedSongs.set(new Set());
  }

  // ── Favorites & learned ───────────────────────────────────────────────────

  async toggleFavorite(songId: string): Promise<void> {
    await this.toggleMembership('favorites', this.favorites, songId);
  }

  async toggleLearned(songId: string): Promise<void> {
    await this.toggleMembership('learnedSongs', this.learnedSongs, songId);
  }

  /** Both toggles are the same write against a different field on the user doc. */
  private async toggleMembership(
    field: 'favorites' | 'learnedSongs',
    local: ReturnType<typeof signal<Set<string>>>,
    songId: string,
  ): Promise<void> {
    const uid = this.currentUser()?.uid;
    if (!uid) return;

    const { db, f } = await this.ready();
    const had = local().has(songId);
    const next = new Set(local());
    if (had) next.delete(songId); else next.add(songId);

    await f.updateDoc(f.doc(db, 'users', uid), {
      [field]: had ? f.arrayRemove(songId) : f.arrayUnion(songId),
    });
    local.set(next);
  }

  // ── Firestore: song overrides & extra songs ───────────────────────────────

  async getSongOverrides(): Promise<Map<string, SongOverride>> {
    const { db, f } = await this.ready();
    const snap = await f.getDocs(f.collection(db, 'song_overrides'));
    const map = new Map<string, SongOverride>();
    snap.forEach(d => map.set(d.id, d.data() as SongOverride));
    return map;
  }

  async saveSongOverride(songId: string, fields: SongOverride): Promise<void> {
    const { db, f } = await this.ready();
    await f.setDoc(f.doc(db, 'song_overrides', songId), fields, { merge: true });
  }

  async markDeleted(songId: string): Promise<void> {
    const { db, f } = await this.ready();
    await f.setDoc(f.doc(db, 'song_overrides', songId), { deleted: true }, { merge: true });
  }

  async getExtraSongs(): Promise<Song[]> {
    const { db, f } = await this.ready();
    const snap = await f.getDocs(f.collection(db, 'songs_extra'));
    return snap.docs.map(d => d.data() as Song);
  }

  async saveExtraSong(song: Song): Promise<void> {
    const { db, f } = await this.ready();
    await f.setDoc(f.doc(db, 'songs_extra', song.id), song);
  }

  async deleteExtraSong(songId: string): Promise<void> {
    const { db, f } = await this.ready();
    await f.deleteDoc(f.doc(db, 'songs_extra', songId));
  }
}
