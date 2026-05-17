import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-[60vh] flex items-center justify-center">
      <div class="w-full max-w-sm">
        <div class="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 space-y-6">
          <div>
            <h1 class="font-display text-2xl font-bold text-capoeira-brown dark:text-capoeira-cream">Área Admin</h1>
            <p class="text-sm text-stone-400 mt-1">Digite a senha para continuar</p>
          </div>

          <form (ngSubmit)="login()" class="space-y-4">
            <div class="relative">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="Senha"
                autocomplete="current-password"
                class="w-full px-4 pr-10 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-capoeira-gold text-sm"
              />
              <button type="button" (click)="showPassword.set(!showPassword())"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                @if (showPassword()) {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                  </svg>
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                }
              </button>
            </div>

            @if (error()) {
              <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{{ error() }}</p>
            }

            <button
              type="submit"
              [disabled]="loading()"
              class="w-full py-2.5 rounded-lg bg-capoeira-brown text-white font-medium text-sm hover:bg-capoeira-brown/90 disabled:opacity-50 transition-colors">
              {{ loading() ? 'Entrando...' : 'Entrar' }}
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class AdminLoginComponent {
  private fb = inject(FirebaseService);
  private router = inject(Router);

  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  async login() {
    if (!this.password) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.fb.signIn(this.password);
      this.router.navigate(['/admin']);
    } catch {
      this.error.set('Senha incorreta. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
