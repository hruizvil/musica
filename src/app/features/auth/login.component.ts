import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';

/** Firebase throws FirebaseError, but a catch is typed unknown and anything at all can
 *  be thrown. Pulls the code out when it is there, and '' when it is not. */
function authErrorCode(e: unknown): string {
  return typeof e === 'object' && e !== null && typeof (e as { code?: unknown }).code === 'string'
    ? (e as { code: string }).code
    : '';
}

@Component({
  selector: 'app-login',
  standalone: true,
  template: `
    <div class="max-w-md mx-auto mt-10 px-4 pb-12">
      <div class="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 shadow-sm space-y-6">

        <!-- Header -->
        <div class="text-center space-y-1">
          <h1 class="font-display text-2xl font-bold text-capoeira-brown dark:text-capoeira-cream">Abadá Música</h1>
          <p class="text-sm text-stone-500 dark:text-stone-400">Entre para salvar suas favoritas e aprendidas</p>
        </div>

        <!-- Google button -->
        <button type="button" (click)="signInWithGoogle()" [disabled]="loading"
          class="w-full min-h-[44px] flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors disabled:opacity-50 text-sm font-medium text-stone-700 dark:text-stone-200">
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {{ loading ? 'Aguarde...' : 'Continuar com Google' }}
        </button>

        <p class="text-xs text-center text-stone-400 leading-relaxed">
          Na primeira vez, sua conta é criada automaticamente.
        </p>

        @if (error) {
          <p role="alert" class="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{{ error }}</p>
        }

      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FirebaseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  error = '';
  loading = false;

  constructor() {
    // Checked after Firebase reports in. Checking straight away read null for everyone,
    // because the SDK loads a beat after the page, so a signed-in visitor was never sent on.
    void this.fb.waitForAuthReady().then(() => {
      if (this.fb.currentUser()) this.goOn();
    });
  }

  /** Back to the page that sent you here — the song you were trying to favourite, say —
   *  or home. Only same-site paths: a returnUrl is anyone's to write into a link. */
  private goOn(): void {
    const target = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    const safe = target.startsWith('/') && !target.startsWith('//') ? target : '/';
    this.router.navigateByUrl(safe);
  }

  async signInWithGoogle() {
    this.loading = true;
    this.error = '';
    try {
      await this.fb.signInWithGoogle();
      this.goOn();
    } catch (e: unknown) {
      this.error = this.friendlyError(authErrorCode(e));
    } finally {
      this.loading = false;
    }
  }

  /** Falls back to '' so an error without a code still gets the generic message. */
  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/popup-blocked': 'O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.',
      'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente de novo.',
      'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
      'auth/popup-closed-by-user': 'Login cancelado.',
      'auth/cancelled-popup-request': 'Login cancelado.',
    };
    return map[code] ?? 'Erro ao autenticar. Tente novamente.';
  }
}
