import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Lifts a section into view as it is scrolled to, so the page unfolds instead of
 * arriving as a stack of finished blocks.
 *
 * The hidden starting state is applied here rather than in the template, so a
 * browser without IntersectionObserver — or with JavaScript broken — shows the
 * content normally instead of a blank page. Same reason nothing is hidden when the
 * reader has asked for less motion.
 */
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealOnScrollDirective implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngOnInit(): void {
    const node = this.host.nativeElement;

    const prefersLessMotion =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersLessMotion || typeof IntersectionObserver === 'undefined') return;

    node.classList.add('reveal');

    this.observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('reveal-in');
          // One way only: scrolling back up must not replay it.
          this.observer?.unobserve(entry.target);
        }
      },
      // Waits until a little of the section is genuinely up from the bottom edge,
      // so it animates as you arrive at it rather than the instant it peeks in.
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
    );

    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
