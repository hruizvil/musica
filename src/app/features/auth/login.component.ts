import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="max-w-md mx-auto mt-10 px-4 pb-12">
      <div class="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 shadow-sm space-y-6">

        <!-- Header -->
        <div class="text-center space-y-1">
          <h1 class="font-display text-2xl font-bold text-capoeira-brown dark:text-capoeira-cream">Abadá Música</h1>
          <p class="text-sm text-stone-500 dark:text-stone-400">Acesse sua conta</p>
        </div>

        <!-- Tabs -->
        <div class="flex rounded-lg border border-stone-200 dark:border-stone-700 overflow-hidden text-sm font-medium">
          <button type="button" (click)="mode = 'login'; error = ''"
            class="flex-1 py-2 transition-colors"
            [class]="mode === 'login' ? 'bg-capoeira-brown text-white' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700/50'">
            Entrar
          </button>
          <button type="button" (click)="mode = 'signup'; error = ''"
            class="flex-1 py-2 transition-colors"
            [class]="mode === 'signup' ? 'bg-capoeira-brown text-white' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700/50'">
            Criar conta
          </button>
        </div>

        <!-- Google button -->
        <button type="button" (click)="signInWithGoogle()" [disabled]="loading"
          class="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors disabled:opacity-50 text-sm font-medium text-stone-700 dark:text-stone-200">
          <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar com Google
        </button>

        <div class="flex items-center gap-3">
          <div class="flex-1 border-t border-stone-200 dark:border-stone-700"></div>
          <span class="text-xs text-stone-400">ou</span>
          <div class="flex-1 border-t border-stone-200 dark:border-stone-700"></div>
        </div>

        <!-- Email/password form -->
        <form (ngSubmit)="submit()" class="space-y-4">
          @if (mode === 'signup') {
            <div class="space-y-1.5">
              <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Nome</label>
              <input type="text" [(ngModel)]="displayName" name="displayName"
                placeholder="Seu nome"
                class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
            </div>
          }
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Email</label>
            <input type="email" [(ngModel)]="email" name="email"
              placeholder="seu@email.com"
              class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
          </div>
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-stone-400 uppercase tracking-wide">Senha</label>
            <input type="password" [(ngModel)]="password" name="password"
              placeholder="••••••••"
              class="w-full px-3 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-capoeira-gold" />
          </div>

          @if (error) {
            <p class="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{{ error }}</p>
          }

          <button type="submit" [disabled]="loading || !email || !password"
            class="w-full py-2.5 rounded-lg bg-capoeira-brown text-white text-sm font-semibold hover:bg-capoeira-brown/90 disabled:opacity-50 transition-colors">
            {{ loading ? 'Aguarde...' : (mode === 'login' ? 'Entrar' : 'Criar conta') }}
          </button>
        </form>

      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FirebaseService);
  private router = inject(Router);

  mode: 'login' | 'signup' = 'login';
  email = '';
  password = '';
  displayName = '';
  error = '';
  loading = false;

  constructor() {
    if (this.fb.currentUser()) this.router.navigate(['/']);
  }

  async signInWithGoogle() {
    this.loading = true;
    this.error = '';
    try {
      await this.fb.signInWithGoogle();
      this.router.navigate(['/']);
    } catch (e: any) {
      this.error = this.friendlyError(e.code);
    } finally {
      this.loading = false;
    }
  }

  async submit() {
    if (!this.email.trim() || !this.password) return;
    this.loading = true;
    this.error = '';
    try {
      if (this.mode === 'login') {
        await this.fb.signInWithEmailPublic(this.email, this.password);
      } else {
        if (!this.displayName.trim()) {
          this.error = 'Nome é obrigatório.';
          this.loading = false;
          return;
        }
        await this.fb.signUpWithEmailPublic(this.email, this.password, this.displayName);
      }
      this.router.navigate(['/']);
    } catch (e: any) {
      this.error = this.friendlyError(e.code);
    } finally {
      this.loading = false;
    }
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/wrong-password': 'Senha incorreta.',
      'auth/invalid-credential': 'Email ou senha incorretos.',
      'auth/user-not-found': 'Usuário não encontrado.',
      'auth/email-already-in-use': 'Este email já está cadastrado.',
      'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
      'auth/invalid-email': 'Email inválido.',
      'auth/popup-closed-by-user': 'Login cancelado.',
      'auth/cancelled-popup-request': 'Login cancelado.',
    };
    return map[code] ?? 'Erro ao autenticar. Tente novamente.';
  }
}
