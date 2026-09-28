import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';
import { NovoLangService } from './novo-lang.service';
import { NovoSeoService } from './novo-seo.service';
import { NovoIconComponent } from './novo-ui';

/** Code off a Firebase error, or '' when the thrown thing has none. */
function errorCode(e: unknown): string {
  return typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string' ? (e as { code: string }).code : '';
}

/**
 * Sign in, in the site's language. Google is the only way in: the first time creates the
 * account. After signing in you go back to the page that sent you here.
 */
@Component({
  selector: 'app-novo-login',
  standalone: true,
  imports: [NovoIconComponent],
  template: `
    <div class="max-w-md mx-auto px-4 py-10 md:py-16">
      <div class="p-7 md:p-9 rounded-3xl bg-[var(--n-surf)] border border-[var(--n-line)] flex flex-col gap-5 text-center items-center">
        <span aria-hidden="true" class="w-14 h-14 rounded-2xl bg-[#4338ca] text-white flex items-center justify-center"><app-novo-icon name="heart" [size]="26" [filled]="true" /></span>
        <h1 class="m-0 n-disp text-[24px] md:text-[28px] font-bold tracking-[-0.03em] leading-tight">{{ L.s().loginTitle }}</h1>
        <p class="m-0 text-[15px] leading-relaxed text-[var(--n-tx2)]">{{ L.s().loginBody }}</p>
        <button type="button" (click)="signIn()" [disabled]="busy()"
          class="self-stretch h-12 rounded-xl border border-[var(--n-line)] bg-[var(--n-surf)] flex items-center justify-center gap-3 text-[15px] font-bold disabled:opacity-60 hover:bg-[var(--n-raise)]">
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {{ busy() ? L.s().loginWait : L.s().signInGoogle }}
        </button>
        @if (error()) {
          <p role="alert" class="m-0 self-stretch text-sm font-semibold text-[#b42318] bg-[#fdecea] rounded-xl px-3 py-2">{{ error() }}</p>
        }
      </div>
    </div>
  `,
})
export class NovoLoginComponent {
  readonly L = inject(NovoLangService);
  private fb = inject(FirebaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private seo = inject(NovoSeoService);

  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => this.seo.set({ title: this.L.s().signIn, description: this.L.s().loginBody, path: '/login', noindex: true }));
  }

  async signIn(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.fb.signInWithGoogle();
      this.goOn();
    } catch (e) {
      const d = this.L.s();
      const code = errorCode(e);
      this.error.set(
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ? d.loginCancelled
          : code === 'auth/popup-blocked' ? d.loginBlocked
          : code === 'auth/network-request-failed' ? d.loginOffline
          : d.loginFailed,
      );
    } finally {
      this.busy.set(false);
    }
  }

  /** Back where the visitor came from; only same-site paths, since returnUrl is anyone's to write into a link. */
  private goOn(): void {
    const target = this.route.snapshot.queryParamMap.get('returnUrl') ?? this.L.to('/');
    void this.router.navigateByUrl(target.startsWith('/') && !target.startsWith('//') ? target : this.L.to('/'));
  }
}
