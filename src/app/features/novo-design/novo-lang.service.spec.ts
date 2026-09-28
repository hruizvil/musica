import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Component } from '@angular/core';
import { NovoLangService } from './novo-lang.service';

@Component({ template: '' })
class Blank {}

/** Every internal link and the language switch go through this service, so its paths must be exact. */
describe('NovoLangService', () => {
  async function at(url: string): Promise<NovoLangService> {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Blank }])] });
    const lang = TestBed.inject(NovoLangService);
    await TestBed.inject(Router).navigateByUrl(url);
    return lang;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('reads English from a plain path and Portuguese from /pt', async () => {
    expect((await at('/cantigas/paranaue')).lang()).toBe('en');
    TestBed.resetTestingModule();
    expect((await at('/pt/cantigas/paranaue')).lang()).toBe('pt');
  });

  it('does not mistake a path that merely starts with "pt" for Portuguese', async () => {
    expect((await at('/ptolemy')).lang()).toBe('en');
  });

  it('builds links in the current language', async () => {
    const lang = await at('/pt/toques');
    expect(lang.to('/cantigas/x')).toBe('/pt/cantigas/x');
    expect(lang.to('/')).toBe('/pt');
    expect(lang.inLang('en', '/cantigas/x')).toBe('/cantigas/x');
  });

  it('points the switch at the same page in the other language, keeping the query', async () => {
    expect((await at('/cantigas?q=berimbau')).otherUrl()).toBe('/pt/cantigas?q=berimbau');
    TestBed.resetTestingModule();
    expect((await at('/pt')).otherUrl()).toBe('/');
    TestBed.resetTestingModule();
    expect((await at('/pt/toques/benguela')).otherUrl()).toBe('/toques/benguela');
  });
});
