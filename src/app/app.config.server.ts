import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SONG_SNAPSHOT, SongSnapshot } from './core/services/songs-remote';
import snapshot from '../assets/data/songs-remote.json';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: SONG_SNAPSHOT, useValue: snapshot as unknown as SongSnapshot },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
