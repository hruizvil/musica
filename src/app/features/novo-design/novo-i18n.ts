/**
 * Every piece of interface text in the new design, in English (the default) and
 * Portuguese. Song titles and lyrics are not here: they stay in Portuguese in both
 * languages, because that is what is sung. Content that has an English version (toque
 * descriptions, song notes) comes from assets/data/content-en.json instead.
 *
 * PT is typed against EN, so a key missing from either language fails the build.
 */
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const EN = {
  htmlLang: 'en',
  locale: 'en_US',
  site: 'Abadá Música',
  tagline: 'The music of the capoeira roda, with English translations',

  // Navigation and chrome
  navHome: 'Home', navToques: 'Toques', navSongs: 'Songs', navLiked: 'Liked',
  navMain: 'Main', searchLabel: 'Search', searchPlaceholder: 'Song, verse or toque',
  themeDark: 'Dark', useLight: 'Use light theme', useDark: 'Use dark theme',
  language: 'Language', switchTo: 'Português', switchToShort: 'PT', switchHint: 'Ver em português',
  signIn: 'Sign in', signInGoogle: 'Sign in with Google', signOut: 'Sign out', yourAccount: 'Your account', account: 'Account',
  classic: 'Classic site', classicLong: 'See this page on the classic site',
  footerNote: 'Capoeira songs with lyrics and translations',

  // Berimbau
  patternTitle: 'Berimbau pattern', patternNone: 'Berimbau pattern not added yet',
  strokeDim: 'high', strokeTch: 'buzz', strokeDom: 'low',
  hearPattern: 'Hear the pattern', stop: 'Stop',
  patternSynthNote: 'The button plays a synthesized approximation. For the real berimbau, watch the toque video.',

  // Categories and tempo
  catAngola: 'Angola', catRegional: 'Regional', catAbada: 'Abadá', catOther: 'Other rhythms',
  tempoSlow: 'Slow', tempoMedium: 'Medium', tempoFast: 'Fast', tempoVariable: 'Variable',

  // Home
  resume: 'Pick up where you left off', startHere: 'Start here', play: 'Play', continue: 'Continue', pause: 'Pause',
  liked: 'Liked', learned: 'Learned', playAll: 'Play all',
  likedSignedOut: 'Sign in to keep the songs you like and play them one after another.',
  likedEmpty: 'Tap the heart on a song to keep it here.',
  learnedSignedOut: 'Sign in to mark the songs you can already sing.',
  learnedEmpty: 'Open a song and mark it learned once you know it.',
  toques: 'Toques', allToques: (n: number) => `All ${n} toques`,
  recentlyAdded: 'Recently added', all: 'All',

  // Toques page
  toquesIntro: 'The berimbau’s toque decides which game is played in the roda and what gets sung. Each card shows the toque’s pattern.',
  toqueLabel: 'Toque', noSongsYet: 'No songs yet', songCount: (n: number) => `${n} ${plural(n, 'song', 'songs')}`,

  // Toque page
  playSongs: (n: number) => (n === 1 ? 'Play the song' : `Play the ${n} songs`),
  watchToque: 'Watch the toque video',
  songsInToque: 'Songs in this toque',
  toqueNoSongs: 'No songs have been added for this toque yet.',
  toqueNoSongsVideo: ' The video and the pattern already help you recognize it in the roda.',
  whenPlayed: 'When it’s played', instruments: 'Instruments', relatedToques: 'Related toques',
  toqueNotFound: 'Toque not found', seeAllToques: 'See all toques',

  // Songs page
  songs: 'Songs', searchSongs: 'Search songs',
  searchSongsPlaceholder: 'Title or any verse, in Portuguese or English',
  of: 'of', filterAll: 'All', filterLiked: 'Liked', filterLearned: 'Learned', toqueFilter: 'Toque', toqueAny: 'All',
  listsNeedSignIn: 'Your liked and learned songs are saved to your account.',
  noMatch: (q: string) => `No songs match “${q}”.`, noFilterMatch: 'No songs match these filters.',

  // Song page
  lyrics: 'Lyrics', translation: 'Translation', coro: 'Chorus',
  tapHint: 'Tap a line to follow along: it shows in the player while the music plays.',
  coroOnlyHint: 'This song only has its chorus. ',
  noRecordingToque: 'No recording yet: plays the toque video.', noRecordingAtAll: 'No recording of this song or its toque yet.',
  like: 'Like', likedBtn: 'Liked', learnedBtn: 'Learned', learnedAsk: 'I know it', share: 'Share', linkCopied: 'Link copied',
  aboutSong: 'About this song', alsoInToque: (t: string) => `Also in ${t}`,
  songNotFound: 'Song not found', seeAllSongs: 'See all songs', portugueseCol: 'Portuguese', englishCol: 'English',

  // Liked / learned
  yourList: 'Your list', likedOrder: ' · in the order you liked them', shuffle: 'Shuffle', lists: 'Lists',
  listsSignedOut: 'Sign in with Google to keep your liked songs and mark what you’ve learned, on any device.',
  learnedNone: 'No songs marked as learned yet. Open a song and tap “I know it”.',
  likedNone: 'No liked songs yet. Tap the heart on a song to keep it here.', seeSongs: 'See the songs',

  // Player
  player: 'Player', playerAndVideo: 'Player and video', previous: 'Previous', next: 'Next', repeat: 'Repeat', speed: 'Speed',
  prevLine: 'Previous line', nextLine: 'Next line', showVideo: 'Show video', hideVideo: 'Hide video (pauses)', closePlayer: 'Close player',
  moreControls: 'More controls', playPauseHint: 'Play / pause (space bar)', moveVideo: 'Move the video (drag; swipe sideways to tuck it away; double-tap to put it back)', showPlayer: 'Show the player', tuckVideo: 'Tuck the video to the side (pauses)',
  noRecordingShort: 'No recording yet', toqueVideoFor: (t: string) => `No recording: ${t} toque video`, toqueDemo: 'Toque demonstration',
  likeSong: 'Like', unlikeSong: (t: string) => `Remove from liked: ${t}`, likeNamed: (t: string) => `Like: ${t}`, playNamed: (t: string) => `Play ${t}`,
  learning: 'Learning', learnedStatus: 'Learned', coverOf: (t: string) => `Cover: ${t}`,
  patternAria: (s: string) => `Berimbau pattern: ${s}`,

  // Sign-in sheet and toasts
  keepLiked: 'Keep your liked songs',
  keepLikedBody: 'Sign in with Google to keep the songs you like on any device and play them one after another.',
  notNow: 'Not now', close: 'Close', savedToLiked: 'Saved to liked', removedFromLiked: 'Removed from liked',
  couldNotSave: 'Couldn’t save. Try again.', seeLiked: 'See liked',

  // Login
  loginTitle: 'Sign in to Abadá Música', loginBody: 'Keep your liked and learned songs on any device. The first time, your account is created automatically.',
  loginWait: 'One moment…', loginCancelled: 'Sign-in cancelled.', loginBlocked: 'Your browser blocked the Google window. Allow pop-ups and try again.',
  loginOffline: 'No connection. Check your internet and try again.', loginFailed: 'Couldn’t sign in. Try again.',

  // Not found
  notFoundTitle: 'Page not found', notFoundBody: 'The link may be wrong, or the page was removed.', goHome: 'Home',

  // SEO descriptions
  seoHome: 'Capoeira songs with full lyrics and line-by-line English translations, organized by berimbau toque. Listen, follow the lyrics and learn the songs of the roda.',
  seoToques: 'The berimbau toques of capoeira — Angola, Regional and Abadá — with their patterns, videos and the songs sung to each.',
  seoSongs: 'Every capoeira song in the library, with Portuguese lyrics and English translations. Search by title or by any verse.',
  seoLiked: 'Your liked and learned capoeira songs.',
  seoSong: (title: string, toque: string) => `Lyrics and English translation of “${title}”, a capoeira song${toque ? ' sung to the ' + toque + ' toque' : ''}.`,
  seoToque: (name: string) => `${name}: berimbau pattern, video, when it is played and the capoeira songs sung to it.`,
};

export type Dict = typeof EN;

const PT: Dict = {
  htmlLang: 'pt-BR',
  locale: 'pt_BR',
  site: 'Abadá Música',
  tagline: 'As cantigas da roda de capoeira, com tradução em inglês',

  navHome: 'Início', navToques: 'Toques', navSongs: 'Cantigas', navLiked: 'Curtidas',
  navMain: 'Principal', searchLabel: 'Buscar', searchPlaceholder: 'Cantiga, verso ou toque',
  themeDark: 'Escuro', useLight: 'Usar tema claro', useDark: 'Usar tema escuro',
  language: 'Idioma', switchTo: 'English', switchToShort: 'EN', switchHint: 'View in English',
  signIn: 'Entrar', signInGoogle: 'Entrar com Google', signOut: 'Sair', yourAccount: 'Sua conta', account: 'Conta',
  classic: 'Site clássico', classicLong: 'Ver esta página no site clássico',
  footerNote: 'Cantigas de capoeira com letra e tradução',

  patternTitle: 'Padrão do berimbau', patternNone: 'Padrão do berimbau ainda não cadastrado',
  strokeDim: 'agudo', strokeTch: 'chiado', strokeDom: 'grave',
  hearPattern: 'Ouvir o padrão', stop: 'Parar',
  patternSynthNote: 'O som do botão é uma aproximação sintetizada. Para o berimbau de verdade, veja o vídeo do toque.',

  catAngola: 'Angola', catRegional: 'Regional', catAbada: 'Abadá', catOther: 'Outros ritmos',
  tempoSlow: 'Lento', tempoMedium: 'Médio', tempoFast: 'Rápido', tempoVariable: 'Variável',

  resume: 'Continue de onde parou', startHere: 'Comece por aqui', play: 'Tocar', continue: 'Continuar', pause: 'Pausar',
  liked: 'Curtidas', learned: 'Aprendidas', playAll: 'Tocar tudo',
  likedSignedOut: 'Entre para guardar as cantigas que você curte e tocar todas em sequência.',
  likedEmpty: 'Toque no coração de uma cantiga para guardá-la aqui.',
  learnedSignedOut: 'Entre para marcar as cantigas que você já sabe cantar.',
  learnedEmpty: 'Abra uma cantiga e marque como aprendida quando souber.',
  toques: 'Toques', allToques: (n: number) => `Todos os ${n} toques`,
  recentlyAdded: 'Adicionadas recentemente', all: 'Todas',

  toquesIntro: 'O toque do berimbau diz que jogo acontece na roda e o que se canta. Cada cartão mostra o padrão do toque.',
  toqueLabel: 'Toque', noSongsYet: 'Sem cantigas ainda', songCount: (n: number) => `${n} ${plural(n, 'cantiga', 'cantigas')}`,

  playSongs: (n: number) => (n === 1 ? 'Tocar a cantiga' : `Tocar as ${n} cantigas`),
  watchToque: 'Ver o vídeo do toque',
  songsInToque: 'Cantigas neste toque',
  toqueNoSongs: 'Ainda não há cantigas cadastradas neste toque.',
  toqueNoSongsVideo: ' O vídeo e o padrão já ajudam a reconhecê-lo na roda.',
  whenPlayed: 'Quando se toca', instruments: 'Instrumentos', relatedToques: 'Toques próximos',
  toqueNotFound: 'Toque não encontrado', seeAllToques: 'Ver todos os toques',

  songs: 'Cantigas', searchSongs: 'Buscar cantigas',
  searchSongsPlaceholder: 'Título ou qualquer verso, em português ou inglês',
  of: 'de', filterAll: 'Todas', filterLiked: 'Curtidas', filterLearned: 'Aprendidas', toqueFilter: 'Toque', toqueAny: 'Todos',
  listsNeedSignIn: 'Suas curtidas e aprendidas ficam salvas na sua conta.',
  noMatch: (q: string) => `Nenhuma cantiga com “${q}”.`, noFilterMatch: 'Nenhuma cantiga com esses filtros.',

  lyrics: 'Letra', translation: 'Tradução', coro: 'Coro',
  tapHint: 'Toque numa linha para acompanhar: ela aparece no player enquanto a música toca.',
  coroOnlyHint: 'Esta cantiga tem só o coro. ',
  noRecordingToque: 'Ainda sem gravação: toca o vídeo do toque.', noRecordingAtAll: 'Ainda sem gravação desta cantiga nem do toque.',
  like: 'Curtir', likedBtn: 'Curtida', learnedBtn: 'Aprendida', learnedAsk: 'Aprendi', share: 'Compartilhar', linkCopied: 'Link copiado',
  aboutSong: 'Sobre a cantiga', alsoInToque: (t: string) => `Também no toque ${t}`,
  songNotFound: 'Cantiga não encontrada', seeAllSongs: 'Ver todas as cantigas', portugueseCol: 'Português', englishCol: 'Inglês',

  yourList: 'Sua lista', likedOrder: ' · na ordem em que você curtiu', shuffle: 'Aleatório', lists: 'Listas',
  listsSignedOut: 'Entre com o Google para guardar suas curtidas e marcar o que já aprendeu, em qualquer aparelho.',
  learnedNone: 'Nenhuma cantiga marcada como aprendida ainda. Abra uma cantiga e toque em “Aprendi”.',
  likedNone: 'Nenhuma curtida ainda. Toque no coração de uma cantiga para guardá-la aqui.', seeSongs: 'Ver as cantigas',

  player: 'Player', playerAndVideo: 'Player e vídeo', previous: 'Anterior', next: 'Próxima', repeat: 'Repetir', speed: 'Velocidade',
  prevLine: 'Linha anterior', nextLine: 'Próxima linha', showVideo: 'Mostrar vídeo', hideVideo: 'Esconder vídeo (pausa)', closePlayer: 'Fechar player',
  moreControls: 'Mais controles', playPauseHint: 'Tocar / pausar (barra de espaço)', moveVideo: 'Mover o vídeo (arraste; deslize para o lado para guardar; toque duas vezes para voltar)', showPlayer: 'Mostrar o player', tuckVideo: 'Guardar o vídeo ao lado (pausa)',
  noRecordingShort: 'Sem gravação ainda', toqueVideoFor: (t: string) => `Sem gravação: vídeo do toque ${t}`, toqueDemo: 'Demonstração do toque',
  likeSong: 'Curtir', unlikeSong: (t: string) => `Tirar das curtidas: ${t}`, likeNamed: (t: string) => `Curtir: ${t}`, playNamed: (t: string) => `Tocar ${t}`,
  learning: 'Aprendendo', learnedStatus: 'Aprendida', coverOf: (t: string) => `Capa: ${t}`,
  patternAria: (s: string) => `Padrão do berimbau: ${s}`,

  keepLiked: 'Guarde suas curtidas',
  keepLikedBody: 'Entre com o Google para guardar as cantigas que você curte em qualquer aparelho e tocar todas em sequência.',
  notNow: 'Agora não', close: 'Fechar', savedToLiked: 'Salva nas curtidas', removedFromLiked: 'Removida das curtidas',
  couldNotSave: 'Não foi possível salvar. Tente de novo.', seeLiked: 'Ver curtidas',

  loginTitle: 'Entrar no Abadá Música', loginBody: 'Guarde suas curtidas e aprendidas em qualquer aparelho. Na primeira vez, sua conta é criada automaticamente.',
  loginWait: 'Aguarde…', loginCancelled: 'Login cancelado.', loginBlocked: 'O navegador bloqueou a janela do Google. Permita pop-ups e tente de novo.',
  loginOffline: 'Sem conexão. Verifique a internet e tente de novo.', loginFailed: 'Não foi possível entrar. Tente de novo.',

  notFoundTitle: 'Página não encontrada', notFoundBody: 'O link pode estar errado ou a página foi removida.', goHome: 'Início',

  seoHome: 'Cantigas de capoeira com letra completa e tradução em inglês linha a linha, organizadas pelo toque do berimbau. Ouça, acompanhe a letra e aprenda as cantigas da roda.',
  seoToques: 'Os toques de berimbau da capoeira — Angola, Regional e Abadá — com o padrão, o vídeo e as cantigas de cada um.',
  seoSongs: 'Todas as cantigas de capoeira da biblioteca, com letra em português e tradução em inglês. Busque pelo título ou por qualquer verso.',
  seoLiked: 'Suas cantigas de capoeira curtidas e aprendidas.',
  seoSong: (title: string, toque: string) => `Letra e tradução em inglês de “${title}”, cantiga de capoeira${toque ? ' do toque ' + toque : ''}.`,
  seoToque: (name: string) => `${name}: padrão do berimbau, vídeo, quando se toca e as cantigas de capoeira do toque.`,
};

export const STRINGS: Record<'en' | 'pt', Dict> = { en: EN, pt: PT };
