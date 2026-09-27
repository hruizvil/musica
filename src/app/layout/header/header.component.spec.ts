import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink, RouterLinkActive } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA, computed, signal } from '@angular/core';
import { HeaderComponent } from './header.component';
import { FirebaseService } from '../../core/services/firebase.service';
import { ThemeService } from '../../core/services/theme.service';

interface AuthState {
  user: { email: string; displayName?: string } | null;
  authReady: boolean;
  likelySignedIn: boolean;
  admin?: boolean;
}

/** The header's account area, with the sign-in state set directly — no Firebase, no
 *  network, and no race against how fast the SDK happens to load. */
function render(state: AuthState): ComponentFixture<HeaderComponent> {
  const authReady = signal(state.authReady);
  const likelySignedIn = signal(state.likelySignedIn);
  TestBed.configureTestingModule({
    imports: [HeaderComponent],
    providers: [
      provideRouter([]),
      { provide: ThemeService, useValue: { isDark: signal(false), toggle: () => undefined } },
      {
        provide: FirebaseService,
        useValue: {
          currentUser: signal(state.user),
          isAdmin: signal(!!state.admin),
          membershipActive: signal(false),
          authReady,
          likelySignedIn,
          pendingSignedIn: computed(() => !authReady() && likelySignedIn()),
          signOut: async () => undefined,
        },
      },
    ],
  });
  // The search bar pulls in the song data; the account area does not need it.
  TestBed.overrideComponent(HeaderComponent, {
    set: { imports: [RouterLink, RouterLinkActive], schemas: [CUSTOM_ELEMENTS_SCHEMA] },
  });
  const fixture = TestBed.createComponent(HeaderComponent);
  fixture.detectChanges();
  return fixture;
}

const el = (f: ComponentFixture<HeaderComponent>) => f.nativeElement as HTMLElement;

const entrarLinks = (f: ComponentFixture<HeaderComponent>) =>
  [...el(f).querySelectorAll('a')].filter(a => a.textContent?.trim() === 'Entrar');

describe('HeaderComponent — the account area', () => {
  afterEach(() => TestBed.resetTestingModule());

  // Firebase loads a beat after the page, and until it has, currentUser() is null for
  // everyone. The header used to read that as "signed out" and show Entrar to people who
  // were signed in, for a second on desktop and several on mobile data.
  it('shows a placeholder, not Entrar, to a returning visitor while sign-in loads', () => {
    const f = render({ user: null, authReady: false, likelySignedIn: true });
    expect(entrarLinks(f).length).toBe(0);
    expect(el(f).querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows Entrar straight away to a first-time visitor, without waiting on Firebase', () => {
    const f = render({ user: null, authReady: false, likelySignedIn: false });
    expect(entrarLinks(f).length).toBeGreaterThan(0);
  });

  it('shows Entrar once Firebase confirms nobody is signed in', () => {
    const f = render({ user: null, authReady: true, likelySignedIn: true });
    expect(entrarLinks(f).length).toBeGreaterThan(0);
  });

  // The admin account matched neither the avatar branch (non-admin only) nor the Entrar
  // branch (signed out only), so it had no sign-in indicator and no way to sign out.
  it('gives the admin account an avatar, an admin badge and a way to sign out', () => {
    const f = render({ user: { email: 'admin@abada.app' }, authReady: true, likelySignedIn: true, admin: true });
    expect(entrarLinks(f).length).toBe(0);

    const avatar = el(f).querySelector<HTMLButtonElement>('button[title="admin@abada.app"]');
    expect(avatar).not.toBeNull();
    avatar!.click();
    f.detectChanges();
    expect(el(f).textContent).toContain('Administrador');
    expect(el(f).textContent).toContain('Abrir painel');
    expect(el(f).textContent).toContain('Sair');
  });

  it('offers no membership plan to a regular signed-in user', () => {
    const f = render({ user: { email: 'aluno@example.com', displayName: 'Aluno' }, authReady: true, likelySignedIn: true });
    el(f).querySelector<HTMLButtonElement>('button[title="Aluno"]')!.click();
    f.detectChanges();
    expect(el(f).textContent).toContain('Sair');
    expect(el(f).textContent).not.toContain('Seja Membro');
    expect(el(f).textContent).not.toContain('Plano gratuito');
  });
});
