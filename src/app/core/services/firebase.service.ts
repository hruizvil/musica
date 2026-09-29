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

/** Remembers across visits whether someone was signed in, so the header can make a good
 *  guess in the second or two before Firebase has loaded and can say for sure. */
const SIGNED_IN_HINT = 'capoeira-signed-in';

function readSignedInHint(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_HINT) === '1';
  } catch {
    return false;
  }
}

function writeSignedInHint(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(SIGNED_IN_HINT, '1');
    else localStorage.removeItem(SIGNED_IN_HINT);
  } catch {
    // storage unavailable — the guess just falls back to "signed out"
  }
}

export interface SongOverride {
  title?: string;
  toque?: string[];
  composer?: string | null;
  youtube?: string | null;
  spotify?: string;
  lyrics?: string | null;
  translation?: string | null;
  notes?: string | null;
  notesEn?: string | null;
  refrao?: string | null;
  refraoTranslation?: string | null;
  deleted?: boolean;
  preview?: boolean;
  updatedBy?: string | null;
  updatedAt?: string | null;
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

  /** True once Firebase has reported who is signed in, if anyone. Until then currentUser()
   *  is null for everyone, which is not the same as signed out. */
  readonly authReady = signal(false);
  /** The guess to use before authReady: signed in last time. Lets a signed-in visitor see
   *  a placeholder rather than "Entrar" while Firebase loads. */
  readonly likelySignedIn = signal(readSignedInHint());
  /** Signed in as far as anyone can tell yet: known, or strongly suspected. */
  readonly pendingSignedIn = computed(() => !this.authReady() && this.likelySignedIn());

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
      this.authReady.set(true);
      this.likelySignedIn.set(!!user);
      writeSignedInHint(!!user);
      // Every signed-in account keeps favourites, admin included — admin used to be
      // skipped here, which is why its heart never showed.
      if (user) {
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

  /** Google is the only way in for students: one flow, no password to set or forget.
   *  The first sign-in creates the account (ensureUserDoc). The admin keeps its own
   *  password sign-in above. */
  async signInWithGoogle(): Promise<void> {
    const sdk = await this.ready();
    const result = await sdk.a.signInWithPopup(sdk.auth, new sdk.a.GoogleAuthProvider());
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

    const previous = local();
    const had = previous.has(songId);
    const next = new Set(previous);
    if (had) next.delete(songId); else next.add(songId);

    // Optimistic: the heart fills on the tap, not after a round trip on a phone at a
    // roda. A failed write puts it back and rethrows so the caller can say so.
    local.set(next);
    try {
      const { db, f } = await this.ready();
      // merge rather than updateDoc: an account that never went through the public
      // sign-up (the admin one) has no user document yet, and updateDoc refuses to
      // write to a document that does not exist.
      await f.setDoc(
        f.doc(db, 'users', uid),
        { [field]: had ? f.arrayRemove(songId) : f.arrayUnion(songId) },
        { merge: true },
      );
    } catch (error) {
      local.set(previous);
      throw error;
    }
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
