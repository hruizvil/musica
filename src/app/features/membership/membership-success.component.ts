import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../core/services/firebase.service';

@Component({
  selector: 'app-membership-success',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="max-w-lg mx-auto px-4 py-20 text-center space-y-6">
      <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
        <svg class="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      </div>

      <div class="space-y-2">
        <h1 class="font-display text-3xl font-bold text-capoeira-brown dark:text-capoeira-cream">
          Bem-vindo, Membro!
        </h1>
        <p class="text-stone-500 dark:text-stone-400">
          Seu pagamento foi confirmado. Agora você tem acesso completo à biblioteca.
        </p>
      </div>

      @if (checking()) {
        <p class="text-sm text-stone-400">Verificando acesso...</p>
      } @else {
        <a routerLink="/musicas"
           class="inline-block px-8 py-3 rounded-xl bg-capoeira-gold text-capoeira-brown font-bold text-sm hover:bg-capoeira-gold/90 transition-colors">
          Explorar músicas
        </a>
      }
    </div>
  `,
})
export class MembershipSuccessComponent implements OnInit {
  firebase = inject(FirebaseService);
  checking = signal(true);

  async ngOnInit() {
    // Give Firestore a moment to be updated by the webhook before showing the CTA
    await new Promise(r => setTimeout(r, 2000));
    this.checking.set(false);
  }
}
