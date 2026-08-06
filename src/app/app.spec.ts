import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // The generated "should render title" test looked for an <h1> reading
  // "Hello, capoeira-musica-library". App renders a <router-outlet /> and never had
  // that heading, so the test had been failing since the scaffold was replaced.
});
