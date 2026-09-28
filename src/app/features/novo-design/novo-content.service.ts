import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Song } from '../../core/models/song.model';
import { Toque, ToqueCategory, ToqueSpeed } from '../../core/models/toque.model';
import { NovoLangService } from './novo-lang.service';

interface ToqueEn { description: string; context: string; gameCharacter: string; instruments: string[]; }
interface SongEn { notes?: string; themes?: string[]; }
interface ContentEn { toques: Record<string, ToqueEn>; songs: Record<string, SongEn>; }

/**
 * Content in the visitor's language. Portuguese is the source everywhere; English comes
 * from the song itself when the admin wrote it (notesEn), otherwise from
 * assets/data/content-en.json, and falls back to the Portuguese when neither has it.
 */
@Injectable({ providedIn: 'root' })
export class NovoContentService {
  private lang = inject(NovoLangService);
  private en = toSignal(inject(HttpClient).get<ContentEn>('assets/data/content-en.json'), {
    initialValue: { toques: {}, songs: {} } as ContentEn,
  });

  private get english(): boolean { return this.lang.lang() === 'en'; }

  toqueDescription(t: Toque): string { return (this.english && this.en().toques[t.id]?.description) || t.description; }
  toqueContext(t: Toque): string { return (this.english && this.en().toques[t.id]?.context) || t.context; }
  toqueCharacter(t: Toque): string { return (this.english && this.en().toques[t.id]?.gameCharacter) || t.gameCharacter; }
  instruments(t: Toque): string[] {
    const en = this.english ? this.en().toques[t.id]?.instruments : undefined;
    return en?.length === t.instruments.length ? en : t.instruments;
  }

  songNotes(s: Song): string | null {
    if (!this.english) return s.notes;
    return s.notesEn || this.en().songs[s.id]?.notes || s.notes;
  }
  songThemes(s: Song): string[] {
    const en = this.english ? this.en().songs[s.id]?.themes : undefined;
    return en?.length === s.themes.length ? en : s.themes;
  }

  category(c: ToqueCategory): string {
    const d = this.lang.s();
    return { angola: d.catAngola, regional: d.catRegional, abada: d.catAbada, other: d.catOther }[c];
  }
  tempo(t: ToqueSpeed): string {
    const d = this.lang.s();
    return { slow: d.tempoSlow, medium: d.tempoMedium, fast: d.tempoFast, variable: d.tempoVariable }[t];
  }
}
