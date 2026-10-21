import { Injectable, signal, computed, afterNextRender } from '@angular/core';
// Types only — `import type` is erased at build time, so none of this pulls the SDK
// into the initial bundle. The real modules arrive through the dynamic imports below.
import type { User } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { environment } from '../../../environments/environment';
import { Song } from '../models/song.model';
import { ToquePattern } from '../models/toque.model';

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

/** The signed-in user's lists from last time. They are a handful of song ids, so keeping a
 *  copy on the device lets the home show them the moment the app starts, instead of after
 *  the SDK download, the auth check and the Firestore read have all finished in a row. */
const USER_CACHE = 'capoeira-user-data';

interface UserCache {
  uid: string;
  favorites: string[];
  learnedSongs: string[];
  membershipActive: boolean;
}

function readUserCache(): UserCache | null {
  try {
    const raw = localStorage.getItem(USER_CACHE);
    return raw ? (JSON.parse(raw) as UserCache) : null;
  } catch {
    return null;
  }
}

function writeUserCache(cache: UserCache | null): void {
  try {
    if (cache) localStorage.setItem(USER_CACHE, JSON.stringify(cache));
    else localStorage.removeItem(USER_CACHE);
  } catch {
    // storage unavailable — the lists just arrive from Firestore as before
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
  /** Allow-listed admins have an `admins/{email}` doc in Firestore (added in the console), read
   *  after sign-in. The legacy admin@abada.app password account stays admin without an entry. */
  readonly adminAllowed = signal(false);
  readonly isAdmin = computed(() => {
    const email = this.currentUser()?.email;
    if (!email) return false;
    return email === environment.adminEmail || this.adminAllowed();
  });

  /** True once Firebase has reported who is signed in, if anyone. Until then currentUser()
   *  is null for everyone, which is not the same as signed out. */
  readonly authReady = signal(false);
  /** The guess to use before authReady: signed in last time. Lets a signed-in visitor see
   *  a placeholder rather than "Entrar" while Firebase loads. */
  readonly likelySignedIn = signal(readSignedInHint());
  /** Signed in as far as anyone can tell yet: known, or strongly suspected. */
  readonly pendingSignedIn = computed(() => !this.authReady() && this.likelySignedIn());
  /** False until the signed-in user's favourites/learned have been read (or cleared for a
   *  signed-out one). Lets the home hold stable skeletons instead of flashing an empty state
   *  and then reflowing the lists right under a tap. */
  readonly userDataReady = signal(false);
  /** Auth and (if signed in) the favourites/learned lists are not resolved yet — including the
   *  prerendered page, so the home can show a neutral skeleton to everyone instead of flashing
   *  the signed-out view before the client learns who you are. */
  readonly loadingUserData = computed(() => !this.userDataReady());

  constructor() {
    // Warm it once the first paint is out of the way, so a signed-in user's header and
    // favourites appear on their own rather than waiting for something to touch them.
    afterNextRender(() => {
      // Show last visit's lists straight away. This runs once the page has hydrated (so it
      // can't disagree with the prerendered markup) but before any network: the skeleton only
      // lasts as long as the app takes to start. Firebase confirms or replaces them below.
      const cache = this.likelySignedIn() ? readUserCache() : null;
      if (cache) {
        this.membershipActive.set(cache.membershipActive);
        this.favorites.set(new Set(cache.favorites));
        this.learnedSongs.set(new Set(cache.learnedSongs));
        this.userDataReady.set(true);
      }
      void this.ready();
      // Safety net: if the SDK never loads or auth never resolves (flaky network), stop waiting
      // after a few seconds so the home falls through to its real state (signed out, or content)
      // instead of holding the loading skeletons forever.
      setTimeout(() => {
        if (!this.userDataReady()) {
          this.authReady.set(true);
          this.userDataReady.set(true);
        }
      }, 6000);
    });
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
      // No reset to "loading" here: if the cached lists are already on screen they stay put
      // and the fresh copy replaces them in place, with no second trip through the skeleton.
      if (user) {
        await Promise.all([
          this.loadUserData(sdk, user.uid),
          this.checkAdmin(sdk, user.email),
        ]);
      } else {
        this.clearUserData();
        this.adminAllowed.set(false);
      }
      this.userDataReady.set(true);
    });

    return sdk;
  }

  async waitForAuthReady(): Promise<void> {
    const { auth } = await this.ready();
    await auth.authStateReady();
  }

  /** Resolve admin status, then report it. The route guard awaits this so it never decides
   *  before the allow-list has been read. Safe to call repeatedly. */
  async ensureAdminChecked(): Promise<boolean> {
    const sdk = await this.ready();
    await sdk.auth.authStateReady();
    await this.checkAdmin(sdk, this.currentUser()?.email ?? null);
    return this.isAdmin();
  }

  /** Admin = the legacy password account, or any email with an `admins/{email}` doc. Each
   *  signed-in user may read only their own entry (see firestore.rules), so the list can't
   *  be enumerated and a normal user's check just comes back empty. */
  private async checkAdmin({ db, f }: Sdk, email: string | null): Promise<void> {
    if (!email) { this.adminAllowed.set(false); return; }
    if (email === environment.adminEmail) { this.adminAllowed.set(true); return; }
    try {
      const snap = await f.getDoc(f.doc(db, 'admins', email));
      this.adminAllowed.set(snap.exists());
    } catch {
      this.adminAllowed.set(false);
    }
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
      this.saveUserCache(uid);
    } catch {
      // Offline or a failed read: keep this user's cached lists rather than blanking them.
      // Only someone else's cache (a shared phone) gets cleared.
      if (readUserCache()?.uid !== uid) this.clearUserData();
    }
  }

  private clearUserData(): void {
    this.membershipActive.set(false);
    this.favorites.set(new Set());
    this.learnedSongs.set(new Set());
    writeUserCache(null);
  }

  private saveUserCache(uid: string): void {
    writeUserCache({
      uid,
      favorites: [...this.favorites()],
      learnedSongs: [...this.learnedSongs()],
      membershipActive: this.membershipActive(),
    });
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
    this.saveUserCache(uid);
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
      this.saveUserCache(uid);
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

  async getToquePatterns(): Promise<Record<string, ToquePattern>> {
    const { db, f } = await this.ready();
    const snap = await f.getDocs(f.collection(db, 'toque_patterns'));
    return Object.fromEntries(snap.docs.map(d => [d.id, d.data() as ToquePattern]));
  }

  /** An empty stroke list is saved on purpose: it means "no pattern", even for a built-in one. */
  async saveToquePattern(toqueId: string, pattern: ToquePattern): Promise<void> {
    const { db, f } = await this.ready();
    await f.setDoc(f.doc(db, 'toque_patterns', toqueId), pattern);
  }

  async deleteExtraSong(songId: string): Promise<void> {
    const { db, f } = await this.ready();
    await f.deleteDoc(f.doc(db, 'songs_extra', songId));
  }
}
