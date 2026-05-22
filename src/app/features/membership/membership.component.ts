import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-membership',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-12 space-y-10">

      <!-- Hero -->
      <div class="text-center space-y-4">
        <p class="text-xs font-semibold text-capoeira-gold uppercase tracking-widest">Abadá Música</p>
        <h1 class="font-display text-4xl font-bold text-capoeira-brown dark:text-capoeira-cream">Torne-se Membro</h1>
        <p class="text-stone-500 dark:text-stone-400 text-lg">Acesso completo à biblioteca, letras, traduções e vídeos exclusivos.</p>
      </div>

      <!-- Benefits -->
      <div class="bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-100 dark:divide-stone-700">
        @for (benefit of benefits; track benefit.title) {
          <div class="flex items-start gap-4 px-6 py-4">
            <span class="text-xl shrink-0">{{ benefit.icon }}</span>
            <div>
              <p class="text-sm font-semibold text-stone-800 dark:text-stone-100">{{ benefit.title }}</p>
              <p class="text-sm text-stone-500 dark:text-stone-400">{{ benefit.description }}</p>
            </div>
          </div>
        }
      </div>

      <!-- CTA card -->
      <div class="bg-capoeira-brown rounded-2xl p-5 sm:p-8 text-center space-y-4">
        <div>
          <p class="text-capoeira-gold text-sm font-semibold uppercase tracking-widest">Plano mensal</p>
          <p class="text-white font-display text-5xl font-bold mt-1">$2.99<span class="text-xl font-normal text-white/60">/mês</span></p>
        </div>

        @if (!firebase.currentUser()) {
          <p class="text-white/70 text-sm">Crie uma conta primeiro para assinar.</p>
          <a routerLink="/login"
             class="inline-block px-8 py-3 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-capoeira-gold/90 transition-colors">
            Criar conta
          </a>
        } @else if (firebase.membershipActive()) {
          <p class="text-emerald-300 font-semibold">✓ Você já é membro!</p>
        } @else {
          <button (click)="subscribe()" [disabled]="loading()"
            class="px-8 py-3 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-capoeira-gold/90 disabled:opacity-60 transition-colors">
            {{ loading() ? 'Aguarde...' : 'Assinar agora' }}
          </button>
          @if (error()) {
            <p class="text-red-300 text-sm">{{ error() }}</p>
          }
        }
      </div>

    </div>
  `,
})
export class MembershipComponent {
  firebase = inject(FirebaseService);
  loading = signal(false);
  error = signal('');

  benefits = [
    { icon: '🎵', title: 'Biblioteca completa', description: 'Acesso a todas as músicas, letras e traduções.' },
    { icon: '🎬', title: 'Vídeos exclusivos', description: 'Aulas, rodas e conteúdo especial em vídeo.' },
    { icon: '📖', title: 'Letras e traduções', description: 'Letra completa com tradução em inglês para cada música.' },
    { icon: '🥋', title: 'Músicas exclusivas', description: 'Gravações e músicas disponíveis apenas para membros.' },
  ];

  async subscribe() {
    const user = this.firebase.currentUser();
    if (!user) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, email: user.email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        this.error.set(data.error ?? 'Erro ao iniciar pagamento. Tente novamente.');
      }
    } catch (e: any) {
      this.error.set(e?.message ?? 'Erro ao iniciar pagamento. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
