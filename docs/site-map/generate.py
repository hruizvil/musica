# Generates the Site Map canvas: every page of Abadá Música at phone, iPad and desktop,
# built from the site's real data, plus phone overlays and a flow diagram.
import io, json, os, html

REPO = r'C:\Users\HugoRuiz\source\repos\capoeira-musica-library'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'project')
HERO = '/_blob/fd208f8bdb4617d4181c7b546a89c5b3'
os.makedirs(OUT, exist_ok=True)

def load(name, key):
    return json.load(io.open(os.path.join(REPO, 'src', 'assets', 'data', name), encoding='utf-8'))[key]

SONGS = load('songs.json', 'songs')
TOQUES = load('toques.json', 'toques')
VIDEOS = load('videos.json', 'videos')
TQ = {t['id']: t for t in TOQUES}
SONG_TOTAL = 35  # 28 bundled + 7 added in the admin (Firestore), as verified live
e = html.escape

def tname(tid):
    return TQ[tid]['name'] if tid in TQ else tid

def songs_for(tid):
    return [s for s in SONGS if tid in s['toque']]

VIDEO_TOQUES = {v['toque'] for v in VIDEOS if v.get('toque')}

# ── devices ────────────────────────────────────────────────────────────────
DEV = {
    'Phone':   {'w': 390,  'pad': 16, 'wide': False, 'tablet': False},
    'iPad':    {'w': 820,  'pad': 32, 'wide': False, 'tablet': True},
    'Desktop': {'w': 1440, 'pad': 48, 'wide': True,  'tablet': False},
}
def is_phone(d): return d == 'Phone'
def href(page, d): return f'{page}-{d}.dc.html'

# ── colours (the site's own) ───────────────────────────────────────────────
BG = '#fefbf3'; SURF = '#ffffff'; LINE = '#f0ede8'; LINE2 = '#e7e5e4'
INK = '#292524'; INK2 = '#57534e'; INK3 = '#78716c'
GOLD = '#d4a017'; GOLDT = '#a07800'; BROWN = '#6b3a2a'; NIGHT = '#1a1208'; RED = '#dc2626'
DISPLAY = "'Playfair Display', Georgia, serif"

# ── icons ──────────────────────────────────────────────────────────────────
P = {
    'heart': '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"></path>',
    'search': '<circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4-4"></path>',
    'menu': '<path d="M4 6h16M4 12h16M4 18h16"></path>',
    'sun': '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
    'loop': '<path d="M4 4v5h.6m15.4 2A8 8 0 0 0 4.6 9m0 0H9m11 11v-5h-.6m0 0a8 8 0 0 1-15.4-2m15.4 2H15"></path>',
    'clock': '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    'check': '<path d="M5 13l4 4L19 7"></path>',
    'print': '<path d="M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z"></path>',
    'share': '<circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"></path>',
    'back': '<path d="M15 19l-7-7 7-7"></path>',
    'next': '<path d="M9 5l7 7-7 7"></path>',
    'shuffle': '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"></path>',
    'close': '<path d="M6 6l12 12M18 6L6 18"></path>',
    'plus': '<path d="M12 5v14M5 12h14"></path>',
    'chat': '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"></path>',
    'drum': '<ellipse cx="12" cy="7" rx="8" ry="3"></ellipse><path d="M4 7v9c0 1.7 3.6 3 8 3s8-1.3 8-3V7"></path>',
    'cap': '<path d="M2 9l10-5 10 5-10 5z"></path><path d="M6 11v5c3 2 9 2 12 0v-5"></path>',
    'note': '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>',
    'video': '<rect x="3" y="5" width="14" height="14" rx="2"></rect><path d="M17 10l4-2v8l-4-2"></path>',
    'phone': '<rect x="6" y="2" width="12" height="20" rx="2"></rect><path d="M11 18h2"></path>',
}
def ico(name, size=20, fill='none', color=None):
    c = f' style="color: {color}"' if color else ''
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{fill}" stroke="currentColor" '
            f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"{c}>{P[name]}</svg>')
def play_tri(size=18, color='#1a1208'):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="{color}" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>'

# ── document wrapper ───────────────────────────────────────────────────────
HELMET = ('<helmet>\n<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&amp;family=Inter:wght@400;500;600;700&amp;display=swap" rel="stylesheet">\n'
          '<style>\nbody{margin:0}\na{color:#6b3a2a}a:hover{color:#4a2619}\n'
          '.hero-photo{background-image:url(' + HERO + ');background-size:cover;background-position:right center}\n</style>\n</helmet>')

def doc(title, w, h, body, lang='pt-BR'):
    return f'''<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<title>{e(title)}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
{HELMET}
<div style="width: {w}px; height: {h}px; position: relative; overflow: hidden; background: {BG}; font-family: Inter, system-ui, sans-serif; color: {INK}; display: flex; flex-direction: column">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
  renderVals() {{
    return {{}};
  }}
}}
</script>
</body>
</html>
'''

# ── shared pieces ──────────────────────────────────────────────────────────
def iconbtn(name, label, link=None, color=INK2):
    style = (f'width: 44px; height: 44px; flex-shrink: 0; border: 0; border-radius: 10px; background: transparent; '
             f'color: {color}; display: flex; align-items: center; justify-content: center; text-decoration: none')
    if link:
        return f'<a href="{link}" aria-label="{label}" style="{style}">{ico(name)}</a>'
    return f'<button type="button" aria-label="{label}" style="{style}">{ico(name)}</button>'

def logo(d, size=18):
    return (f'<a href="{href("Home", d)}" style="font-family: {DISPLAY}; font-weight: 800; font-size: {size}px; '
            f'color: {BROWN}; text-decoration: none; white-space: nowrap">Abadá <span style="color: {GOLDT}">Música</span></a>')

def header(d, active=None, signed=True):
    if is_phone(d):
        return (f'<header style="height: 56px; flex-shrink: 0; display: flex; align-items: center; padding: 0 4px 0 16px; '
                f'background: {SURF}; border-bottom: 1px solid #eeeae4">'
                f'<span style="margin-right: auto; display: flex">{logo(d)}</span>'
                f'{iconbtn("sun", "Alternar tema")}'
                f'{iconbtn("search", "Buscar", "Overlay-Search.dc.html")}'
                f'{iconbtn("menu", "Menu", "Overlay-Menu.dc.html")}</header>')
    def nav(label, page):
        on = active == page
        st = (f'padding: 8px 12px; border-radius: 6px; font-size: 14px; text-decoration: none; '
              f'font-weight: {"600" if on else "500"}; color: {GOLDT if on else INK2}')
        cur = ' aria-current="page"' if on else ''
        return f'<a href="{href(page, d)}"{cur} style="{st}">{label}</a>'
    acct = (f'<button type="button" aria-label="Conta" style="width: 32px; height: 32px; flex-shrink: 0; border: 0; border-radius: 999px; '
            f'background: {GOLD}; color: {NIGHT}; font-size: 14px; font-weight: 700">H</button>') if signed else \
           (f'<a href="{href("Login", d)}" style="padding: 6px 12px; border-radius: 8px; border: 1px solid {GOLD}; color: {GOLDT}; '
            f'font-size: 14px; font-weight: 600; text-decoration: none">Entrar</a>')
    return (f'<header style="height: 56px; flex-shrink: 0; background: {SURF}; border-bottom: 1px solid #eeeae4">'
            f'<div style="max-width: 1152px; height: 56px; margin: 0 auto; display: flex; align-items: center; gap: 12px; padding: 0 16px; box-sizing: border-box">'
            f'{logo(d)}'
            f'<nav aria-label="Principal" style="display: flex; gap: 4px; margin-left: 8px">'
            f'{nav("Músicas", "Songs")}{nav("Toques", "Toques")}{nav("Minhas", "Minhas")}</nav>'
            f'<label style="margin-left: auto; flex-grow: 1; max-width: 384px; height: 40px; display: flex; align-items: center; gap: 8px; '
            f'padding: 0 12px; background: #fafaf9; border: 1px solid {LINE2}; border-radius: 12px; color: {INK3}">'
            f'{ico("search", 16)}<input type="search" aria-label="Buscar" placeholder="Buscar músicas, toques..." '
            f'style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: {INK}"></label>'
            f'{iconbtn("sun", "Alternar tema")}{acct}</div></header>')

def main_open(d, top=32, gap=24):
    pad = DEV[d]['pad']
    return f'<main style="flex-grow: 1; padding: {top}px {pad}px 48px; display: flex; flex-direction: column; gap: {gap}px">'

def h1(text, d, size=None):
    s = size or (30 if is_phone(d) else 36)
    return f'<h1 style="margin: 0; font-family: {DISPLAY}; font-size: {s}px; font-weight: 800; line-height: 1.12; color: {BROWN}">{e(text)}</h1>'

def sub(text):
    return f'<p style="margin: 0; font-size: 14px; color: {INK3}">{e(text)}</p>'

def label(text):
    return (f'<p style="margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; '
            f'color: {INK3}">{e(text)}</p>')

def h2_accent(text, size=20):
    return (f'<h2 style="margin: 0; font-family: {DISPLAY}; font-size: {size}px; font-weight: 700; color: {INK}; '
            f'border-left: 4px solid {GOLD}; padding-left: 16px">{e(text)}</h2>')

def grid(items, cols, gap=12):
    return (f'<div style="display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); gap: {gap}px">'
            + ''.join(items) + '</div>')

def song_card(s, d, fav=False, learned=False):
    pad = 12 if is_phone(d) else 16
    tq = tname(s['toque'][0]) if s['toque'] else ''
    lrn = f'<span title="Aprendida" style="margin-left: auto; color: #059669; font-size: 12px">✓</span>' if learned else ''
    return (f'<div style="position: relative; display: flex; flex-direction: column; gap: 8px; min-height: 104px; padding: {pad}px; '
            f'box-sizing: border-box; background: {SURF}; border: 1px solid {LINE}; border-radius: 16px; box-shadow: 0 1px 2px rgba(41, 37, 36, 0.06)">'
            f'<a href="{href("Song", d)}" style="padding-right: 36px; font-size: 15px; font-weight: 700; line-height: 1.3; color: {INK}; text-decoration: none">{e(s["title"])}</a>'
            f'<div style="margin-top: auto; display: flex; align-items: center; gap: 6px; min-width: 0">'
            f'<span style="font-size: 12px; font-weight: 500; color: {INK3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{e(tq)}</span>{lrn}</div>'
            f'<button type="button" aria-pressed="{"true" if fav else "false"}" aria-label="{"Remover " if fav else "Favoritar "}{e(s["title"])}" '
            f'style="position: absolute; top: 4px; right: 4px; width: 44px; height: 44px; border: 0; border-radius: 12px; background: transparent; '
            f'display: flex; align-items: center; justify-content: center; color: {RED if fav else "#a8a29e"}">'
            f'{ico("heart", 20, "currentColor" if fav else "none")}</button></div>')

def video_box(height_css='auto', label_text='Vídeo do YouTube'):
    return (f'<div role="img" aria-label="{label_text}" style="aspect-ratio: 16 / 9; width: 100%; border-radius: 10px; background: {NIGHT}; '
            f'display: flex; align-items: center; justify-content: center; flex-shrink: 0">'
            f'<span style="width: 56px; height: 40px; border-radius: 10px; background: #ff0033; display: flex; align-items: center; justify-content: center">'
            f'{play_tri(18, "#ffffff")}</span></div>')

def action_btn(name, label_text, on=False, badge=None, tone=None):
    if tone == 'fav' and on:
        c = f'border: 1px solid #fecaca; background: #fef2f2; color: {RED}'
    elif on:
        c = f'border: 1px solid rgba(212, 160, 23, 0.5); background: rgba(212, 160, 23, 0.1); color: {BROWN}'
    else:
        c = f'border: 1px solid {LINE2}; background: {SURF}; color: {INK2}'
    fill = 'currentColor' if (name == 'heart' and on) else 'none'
    b = f'<span style="font-size: 12px; font-weight: 700">{badge}</span>' if badge else ''
    return (f'<button type="button" aria-label="{label_text}" style="height: 40px; min-width: 40px; padding: 0 10px; box-sizing: border-box; '
            f'border-radius: 12px; {c}; display: flex; align-items: center; justify-content: center; gap: 6px; flex-shrink: 0; '
            f'box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05)">{ico(name, 17, fill)}{b}</button>')

def action_bar(buttons):
    return f'<div role="group" aria-label="Ações" style="display: flex; justify-content: flex-end; gap: 8px">{"".join(buttons)}</div>'

SONG_ACTIONS = lambda: action_bar([
    action_btn('heart', 'Remover dos favoritos', True, tone='fav'),
    action_btn('loop', 'Repetir sem parar', True),
    action_btn('clock', 'Velocidade e início do loop', badge='1×'),
    action_btn('check', 'Marcar como aprendida'),
    action_btn('print', 'PDF / Imprimir'),
    action_btn('share', 'Compartilhar'),
])
EMBED_ACTIONS = lambda: action_bar([
    action_btn('loop', 'Repetir sem parar', True),
    action_btn('clock', 'Velocidade e início do loop', badge='1×'),
])

def card_box(inner, pad=20, extra=''):
    return (f'<div style="background: {SURF}; border: 1px solid {LINE}; border-radius: 12px; padding: {pad}px; '
            f'box-shadow: 0 1px 2px rgba(41, 37, 36, 0.05); {extra}">{inner}</div>')

def pre_lines(text, serif=True, italic=False, color=INK, size=16):
    fam = DISPLAY if serif else 'Inter, system-ui, sans-serif'
    it = 'font-style: italic; ' if italic else ''
    return (f'<p style="margin: 0; font-family: {fam}; {it}font-size: {size}px; line-height: 1.7; color: {color}; white-space: pre-line">'
            f'{e(text)}</p>')

# ── pages ──────────────────────────────────────────────────────────────────
RECENT = SONGS[:6]
FAVS = [SONGS[0], SONGS[1], SONGS[11], SONGS[3], SONGS[8]]
LEARNED = [SONGS[2], SONGS[5], SONGS[9]]

def page_home(d):
    ph = is_phone(d)
    hero_h = {'Phone': 506, 'iPad': 708, 'Desktop': 540}[d]
    pad_y, pad_x = (56, 24) if ph else ((80, 40) if d == 'iPad' else (80, 48))
    h1s = 36 if ph else 72
    br = '' if ph else '<br>'
    def badge(icon, t, b):
        return (f'<div style="display: flex; align-items: center; gap: 10px">'
                f'<span style="width: 32px; height: 32px; flex-shrink: 0; border-radius: 8px; background: rgba(255, 255, 255, 0.1); '
                f'border: 1px solid rgba(255, 255, 255, 0.15); display: flex; align-items: center; justify-content: center; color: #ffffff">{ico(icon, 16)}</span>'
                f'<span style="display: flex; flex-direction: column"><span style="font-size: 12px; font-weight: 600; color: #ffffff">{t}</span>'
                f'<span style="font-size: 11px; color: rgba(254, 243, 199, 0.7)">{b}</span></span></div>')
    hero = (f'<section style="position: relative; overflow: hidden; min-height: {hero_h}px; box-sizing: border-box; display: flex; flex-direction: column; '
            f'justify-content: center; padding: {pad_y}px {pad_x}px; background: {NIGHT}; color: #ffffff; flex-shrink: 0">'
            f'<div class="hero-photo" style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; opacity: 0.7"></div>'
            f'<div style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: linear-gradient(to right, rgba(26, 18, 8, 0.9), rgba(26, 18, 8, 0.5), rgba(26, 18, 8, 0))"></div>'
            f'<div style="position: relative; display: flex; flex-direction: column">'
            f'<p style="margin: 0 0 16px; align-self: flex-start; padding-bottom: 4px; border-bottom: 1px solid rgba(212, 160, 23, 0.3); font-size: 12px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: {GOLD}">Abadá Capoeira</p>'
            f'<h1 style="margin: 0 0 20px; font-family: {DISPLAY}; font-size: {h1s}px; font-weight: 800; line-height: 1.05; color: #ffffff">A biblioteca musical{br} da <span style="color: {GOLD}">capoeira</span></h1>'
            f'<p style="margin: 0 0 32px; max-width: 448px; font-size: 16px; line-height: 1.6; color: rgba(254, 243, 199, 0.75)">Letras completas com tradução em inglês, organizadas por toque e estilo. Aprenda o repertório da roda — onde quer que você esteja.</p>'
            f'<a href="{href("Songs", d)}" style="align-self: flex-start; padding: 12px 24px; border-radius: 12px; background: {GOLD}; color: {BROWN}; font-size: 14px; font-weight: 700; text-decoration: none">Explorar músicas</a>'
            f'<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-wrap: wrap; gap: 16px 32px">'
            f'{badge("chat", "Traduções em inglês", "Letras lado a lado")}{badge("drum", "Organizadas por toque", "Encontre rápido")}{badge("cap", "Conteúdo confiável", "Curado por professores")}'
            f'</div></div></section>')
    def stat(icon, n, l, det, page):
        return (f'<a href="{href(page, d)}" style="display: flex; align-items: center; gap: 16px; padding: {16 if ph else 20}px; background: {SURF}; '
                f'border: 1px solid {LINE}; border-radius: 16px; text-decoration: none; box-shadow: 0 1px 2px rgba(41, 37, 36, 0.05)">'
                f'<span style="width: 48px; height: 48px; flex-shrink: 0; border-radius: 16px; background: rgba(212, 160, 23, 0.1); display: flex; align-items: center; justify-content: center; color: {GOLDT}">{ico(icon, 22)}</span>'
                f'<span style="display: flex; flex-direction: column; gap: 2px"><span style="font-family: {DISPLAY}; font-size: 24px; font-weight: 700; line-height: 1; color: {GOLDT}">{n}</span>'
                f'<span style="font-size: 12px; font-weight: 500; color: {INK3}">{l}</span><span style="font-size: 11px; color: {INK3}">{det}</span></span></a>')
    stats = grid([stat('note', SONG_TOTAL, 'músicas', 'Letras com tradução', 'Songs'),
                  stat('drum', len(TOQUES), 'toques', 'Angola, Regional, Abadá', 'Toques'),
                  stat('video', len(VIDEOS), 'vídeos', 'Aulas e demonstrações', 'Videos')], 1 if ph else 3)
    def why(icon, t, b, link=None, lt=None):
        lk = (f'<a href="{href(link, d)}" style="margin-top: 16px; align-self: flex-start; padding: 4px 0; font-size: 12px; font-weight: 600; color: {GOLDT}; text-decoration: none">{lt} →</a>') if link else ''
        return (f'<div style="display: flex; flex-direction: column; padding: 20px; background: {SURF}; border: 1px solid {LINE}; border-radius: 16px; box-shadow: 0 1px 2px rgba(41, 37, 36, 0.05)">'
                f'<span style="width: 48px; height: 48px; margin-bottom: 16px; border-radius: 16px; background: rgba(212, 160, 23, 0.1); display: flex; align-items: center; justify-content: center; color: {GOLDT}">{ico(icon, 22)}</span>'
                f'<h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: {INK}">{t}</h3>'
                f'<p style="margin: 0; font-size: 14px; line-height: 1.6; color: {INK3}">{b}</p>{lk}</div>')
    whys = grid([why('chat', 'Tradução em inglês', 'Cada letra tem tradução completa para inglês. Sites gratuitos só têm o português — sem contexto para quem está aprendendo.', 'Songs', 'Ver as letras'),
                 why('drum', 'Organizados por toque', 'Encontre músicas pelo ritmo que o berimbau está tocando. Angola, Regional, Abadá — cada tradição tem seu repertório.', 'Toques', 'Ver os toques'),
                 why('cap', 'Curado por professores', 'Não é um repositório aberto onde qualquer pessoa posta. O conteúdo é revisado e organizado por praticantes experientes.')], 1 if ph else 3, 16)
    cols = {'Phone': 2, 'iPad': 3, 'Desktop': 6}[d]
    recent = grid([song_card(s, d, fav=(i in (0, 3))) for i, s in enumerate(RECENT)], cols)
    install = ''
    if ph:
        install = card_box(
            f'<div style="display: flex; gap: 16px; align-items: flex-start"><span style="color: {GOLDT}">{ico("phone", 30)}</span>'
            f'<div style="display: flex; flex-direction: column; gap: 6px"><p style="margin: 0; font-weight: 600">Adicionar à tela inicial</p>'
            f'<p style="margin: 0; font-size: 14px; color: {INK3}">Instale o app para acesso rápido — funciona como um aplicativo nativo.</p>'
            f'<button type="button" style="align-self: flex-start; margin-top: 6px; padding: 10px 16px; border: 0; border-radius: 10px; background: {GOLD}; color: {BROWN}; font: inherit; font-size: 14px; font-weight: 700">Instalar app</button></div></div>')
    body = (header(d) + hero + main_open(d, 40, 40) + stats
            + f'<section style="display: flex; flex-direction: column; gap: 20px">{h2_accent("Por que somos diferentes")}{whys}</section>'
            + f'<section style="display: flex; flex-direction: column; gap: 16px"><div style="display: flex; align-items: center; justify-content: space-between">'
            + f'{h2_accent("Últimas adicionadas", 18)}<a href="{href("Songs", d)}" style="display: flex; align-items: center; min-height: 44px; font-size: 12px; font-weight: 500; color: {GOLDT}; text-decoration: none">Ver todas →</a></div>{recent}</section>'
            + install + '</main>')
    return body

def page_songs(d):
    ph = is_phone(d)
    cols = {'Phone': 2, 'iPad': 3, 'Desktop': 5}[d]
    n = {'Phone': 10, 'iPad': 12, 'Desktop': 10}[d]
    chips = ''.join(
        f'<button type="button" aria-pressed="{"true" if i == 0 else "false"}" style="min-height: {44 if ph else 32}px; padding: 0 12px; border-radius: 12px; '
        f'font: inherit; font-size: 12px; font-weight: 600; {"border: 1px solid " + GOLD + "; background: rgba(212, 160, 23, 0.1); color: " + BROWN if i == 0 else "border: 1px solid " + LINE2 + "; background: " + SURF + "; color: " + INK3}">{t}</button>'
        for i, t in enumerate(['Todas', 'Favoritas', 'Aprendidas']))
    search = (f'<label style="height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 14px; background: {SURF}; border: 1px solid {LINE2}; border-radius: 12px; color: {INK3}">'
              f'{ico("search", 18)}<input type="search" aria-label="Buscar" placeholder="Buscar músicas, toques..." style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px; color: {INK}"></label>')
    filt = (f'<div style="display: flex; flex-direction: column; gap: 12px">'
            f'<div style="display: flex; align-items: center; gap: 12px">{label("Toque")}'
            f'<select aria-label="Toque" style="min-height: {44 if ph else 34}px; padding: 0 12px; border: 1px solid {LINE2}; border-radius: 12px; background: {SURF}; font: inherit; font-size: 14px; color: {INK2}"><option>Todos os toques</option></select></div>'
            f'<div style="display: flex; align-items: center; gap: 12px">{label("Minhas")}<div style="display: flex; gap: 6px">{chips}</div></div></div>')
    cards = grid([song_card(s, d, fav=(s in FAVS), learned=(s in LEARNED)) for s in SONGS[:n]], cols)
    return (header(d, 'Songs') + main_open(d)
            + f'<div style="display: flex; flex-direction: column; gap: 4px">{h1("Músicas", d)}{sub(f"{SONG_TOTAL} resultado(s)")}</div>'
            + search + filt + cards + '</main>')

SONG = next(s for s in SONGS if s['id'] == 'paranue-paranua')
CORO = 'Paranauê, paranauê paraná\nParanauê, paranauê paraná'
RELATED = [s for s in songs_for(SONG['toque'][0]) if s['id'] != SONG['id']][:3]

def song_title_block(d):
    ph = is_phone(d)
    t = SONG['toque'][0]
    return (f'<div style="display: flex; flex-direction: column; gap: 12px">'
            f'<h1 style="margin: 0; font-family: {DISPLAY}; font-size: {30 if ph else 36}px; font-weight: 800; line-height: 1.1; color: {BROWN}">{e(SONG["title"])}</h1>'
            f'<div style="display: flex; align-items: center; gap: 10px"><span aria-hidden="true" style="width: 32px; height: 32px; border-radius: 999px; background: rgba(212, 160, 23, 0.2); border: 1px solid rgba(212, 160, 23, 0.3); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: {GOLDT}">T</span>'
            f'<span style="font-size: 14px; font-weight: 500; color: {INK2}">{e(SONG["composer"])}</span></div>'
            f'<a href="{href("Toque", d)}" style="align-self: flex-start; display: flex; align-items: center; min-height: {44 if ph else 30}px; padding: 0 12px; border-radius: 999px; '
            f'background: rgba(212, 160, 23, 0.1); border: 1px solid rgba(212, 160, 23, 0.2); color: {BROWN}; font-size: 12px; font-weight: 600; text-decoration: none">RITMO: {e(tname(t).upper())}</a></div>')

def coro_card():
    return (f'<div style="padding: 20px; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a; display: flex; flex-direction: column; gap: 10px">'
            f'<h2 style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; color: #92400e">CORO</h2>'
            f'{pre_lines(CORO, serif=False, size=15, color="#44403c")}</div>')

def letra_card(side_by_side):
    cols = 'repeat(2, minmax(0, 1fr))' if side_by_side else 'repeat(1, minmax(0, 1fr))'
    en_border = f'border-left: 1px solid {LINE}; padding-left: 24px; ' if side_by_side else ''
    return card_box(
        f'<h2 style="margin: 0 0 16px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {INK3}">Letra</h2>'
        f'<div style="display: grid; grid-template-columns: {cols}; gap: 24px">'
        f'{pre_lines(SONG["lyrics"])}<div style="{en_border}">{pre_lines(SONG["translation"], italic=True, color=INK3)}</div></div>', 24)

def sobre_card():
    return (f'<div style="padding: 20px; border-left: 4px solid {GOLD}; border-radius: 0 12px 12px 0; background: rgba(212, 160, 23, 0.06)">'
            f'<h3 style="margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: {GOLDT}">Sobre esta música</h3>'
            f'<p style="margin: 0; font-size: 14px; line-height: 1.6; color: {INK2}">{e(SONG["notes"])}</p></div>')

def details_card(d):
    t = TQ[SONG['toque'][0]]
    rows = [('drum', 'Ritmo', t['name']), ('note', 'Instrumentos', ', '.join(t['instruments'][:3])), ('cap', 'Compositor', SONG['composer']), ('video', 'Álbum', SONG['album'])]
    inner = ''.join(f'<div style="display: flex; gap: 12px; align-items: flex-start; font-size: 14px"><span style="color: {GOLDT}; margin-top: 2px">{ico(i, 18)}</span>'
                    f'<div><p style="margin: 0 0 2px; font-size: 12px; font-weight: 500; color: {INK3}">{k}</p><p style="margin: 0; font-weight: 500; color: {INK}">{e(v)}</p></div></div>' for i, k, v in rows)
    return (f'<div style="display: flex; flex-direction: column; gap: 12px">{label("Detalhes da música")}'
            + card_box(f'<div style="display: flex; flex-direction: column; gap: 12px">{inner}</div>') + '</div>')

def related_block(d):
    rows = ''.join(f'<a href="{href("Song", d)}" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: {SURF}; border: 1px solid {LINE}; border-radius: 12px; text-decoration: none">'
                   f'<span style="width: 28px; height: 28px; border-radius: 8px; background: rgba(212, 160, 23, 0.1); display: flex; align-items: center; justify-content: center; color: {GOLDT}">{ico("note", 15)}</span>'
                   f'<span style="font-size: 14px; font-weight: 500; color: {INK}">{e(s["title"])}</span></a>' for s in RELATED)
    return (f'<div style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: center; justify-content: space-between">'
            f'{label("Músicas relacionadas")}<a href="{href("Toque", d)}" style="display: flex; align-items: center; min-height: 44px; font-size: 12px; color: {GOLDT}; text-decoration: none">Ver todas →</a></div>'
            f'<div style="display: flex; flex-direction: column; gap: 8px">{rows}</div></div>')

def breadcrumb(d):
    return (f'<nav aria-label="Trilha" style="display: flex; align-items: center; gap: 6px; font-size: 14px; color: {INK3}">'
            f'<a href="{href("Songs", d)}" style="display: flex; align-items: center; min-height: 44px; color: {INK3}; text-decoration: none">Músicas</a>'
            f'<span aria-hidden="true">›</span><span style="color: {INK2}">{e(SONG["title"])}</span></nav>')

def page_song(d):
    ph = is_phone(d)
    if d == 'Desktop':
        left = (f'<div style="display: flex; flex-direction: column; gap: 24px">{song_title_block(d)}{SONG_ACTIONS()}{coro_card()}{letra_card(True)}{sobre_card()}</div>')
        right = (f'<div style="display: flex; flex-direction: column; gap: 20px">{label("Vídeo")}{video_box()}{details_card(d)}{related_block(d)}</div>')
        return (header(d, 'Songs') + main_open(d, 32, 16) + breadcrumb(d)
                + f'<div style="display: grid; grid-template-columns: 3fr 2fr; gap: 40px; align-items: start">{left}{right}</div></main>')
    tabs = ''
    if ph:
        seg = ''.join(f'<button type="button" aria-pressed="{"true" if i == 0 else "false"}" style="min-height: 44px; padding: 0 12px; border: 0; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 700; '
                      f'{"background: #ffffff; color: " + BROWN + "; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08)" if i == 0 else "background: transparent; color: " + INK3}">{t}</button>'
                      for i, t in enumerate(['Ambos', 'Português', 'Inglês']))
        tabs = (f'<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px">'
                f'<div role="tablist" aria-label="Seções" style="display: flex; gap: 6px">'
                f'<button type="button" role="tab" aria-selected="true" style="min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid {GOLD}; background: rgba(212, 160, 23, 0.1); color: {BROWN}; font: inherit; font-size: 14px; font-weight: 600">Letra</button>'
                f'<button type="button" role="tab" aria-selected="false" style="min-height: 44px; padding: 0 14px; border-radius: 12px; border: 1px solid {LINE2}; background: {SURF}; color: {INK3}; font: inherit; font-size: 14px; font-weight: 600">Sobre</button></div>'
                f'<div role="group" aria-label="Idioma" style="display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #f5f5f4; border: 1px solid {LINE2}">{seg}</div></div>')
    body = (header(d, 'Songs') + main_open(d, 32, 24) + breadcrumb(d) + song_title_block(d) + video_box()
            + SONG_ACTIONS() + coro_card() + tabs + letra_card(False) + ('' if ph else sobre_card())
            + details_card(d) + related_block(d) + '</main>')
    return body

TEMPO = {'slow': ('Lento', '#dbeafe', '#1d4ed8'), 'medium': ('Médio', '#fef3c7', '#a16207'), 'fast': ('Rápido', '#fee2e2', '#b91c1c'), 'variable': ('Variável', '#f5f5f4', '#57534e')}
CAT_LABEL = {'abada': 'Capoeira Abadá', 'regional': 'Capoeira Regional', 'angola': 'Capoeira Angola', 'other': 'Outros Ritmos'}

def toque_card(t, d):
    lab, bg, fg = TEMPO[t['tempo']]
    vid = (f'<span style="display: flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: rgba(212, 160, 23, 0.15); border: 1px solid rgba(212, 160, 23, 0.3); font-size: 11px; font-weight: 700; color: {BROWN}">'
           f'{play_tri(10, BROWN)}Vídeo</span>') if t['id'] in VIDEO_TOQUES else ''
    n = len(songs_for(t['id']))
    cnt = f'<p style="margin: 12px 0 0; font-size: 12px; color: {INK3}">{n} música(s)</p>' if n else ''
    return (f'<a href="{href("Toque", d)}" style="display: flex; flex-direction: column; padding: 20px; background: {SURF}; border: 1px solid {LINE}; border-radius: 16px; text-decoration: none; box-shadow: 0 1px 2px rgba(41, 37, 36, 0.05)">'
            f'<div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 12px">'
            f'<h3 style="margin: 0; font-family: {DISPLAY}; font-size: 16px; font-weight: 700; color: {INK}">{e(t["name"])}</h3>'
            f'<div style="display: flex; gap: 6px; flex-shrink: 0">{vid}<span style="padding: 2px 8px; border-radius: 999px; background: {bg}; color: {fg}; font-size: 12px; font-weight: 500">{lab}</span></div></div>'
            f'<p style="margin: 0; font-size: 14px; line-height: 1.5; color: {INK3}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden">{e(t["context"])}</p>{cnt}</a>')

def page_toques(d):
    cols = {'Phone': 1, 'iPad': 2, 'Desktop': 3}[d]
    tabs = ''.join(f'<button type="button" role="tab" aria-selected="{"true" if i == 0 else "false"}" style="flex-shrink: 0; min-height: 36px; padding: 0 16px; border: 0; border-radius: 8px; font: inherit; font-size: 14px; font-weight: 500; '
                   f'{"background: #ffffff; color: " + BROWN + "; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08)" if i == 0 else "background: transparent; color: " + INK3}">{t}</button>'
                   for i, t in enumerate(['Toques', 'Abadá', 'Regional', 'Angola', 'Outros']))
    groups = ''
    for cat, limit in (('abada', 99), ('regional', 3)):
        ts = [t for t in TOQUES if t['category'] == cat]
        groups += (f'<section style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: center; gap: 12px">'
                   f'<h2 style="margin: 0; font-family: {DISPLAY}; font-size: 18px; font-weight: 700; color: {BROWN}">{CAT_LABEL[cat]}</h2>'
                   f'<span style="flex-grow: 1; height: 1px; background: {LINE2}"></span><span style="font-size: 12px; color: {INK3}">{len(ts)} toque(s)</span></div>'
                   + grid([toque_card(t, d) for t in ts[:limit]], cols, 16) + '</section>')
    return (header(d, 'Toques') + main_open(d)
            + f'<div style="display: flex; flex-direction: column; gap: 4px">{h1("Toques de Capoeira", d)}{sub("Os ritmos do berimbau que comandam o jogo")}</div>'
            + f'<div role="tablist" aria-label="Categorias de toque" style="display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: #f5f5f4; overflow: hidden">{tabs}</div>'
            + groups + '</main>')

def page_toque(d):
    t = TQ['benguela']
    v = next(x for x in VIDEOS if x.get('toque') == 'benguela')
    lab, bg, fg = TEMPO[t['tempo']]
    def section(title, text):
        return card_box(f'<h2 style="margin: 0 0 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {INK3}">{title}</h2>'
                        f'<p style="margin: 0; font-size: 15px; line-height: 1.6; color: {INK2}">{e(text)}</p>')
    chips = ''.join(f'<span style="padding: 6px 12px; border-radius: 999px; background: #f5f5f4; border: 1px solid {LINE2}; font-size: 13px; color: {INK2}">{e(i)}</span>' for i in t['instruments'])
    inner = (f'<a href="{href("Toques", d)}" style="align-self: flex-start; display: flex; align-items: center; gap: 4px; min-height: 44px; font-size: 14px; color: {INK3}; text-decoration: none">{ico("back", 16)}Toques</a>'
             f'<div style="display: flex; flex-wrap: wrap; gap: 8px"><span style="padding: 4px 10px; border-radius: 999px; background: rgba(212, 160, 23, 0.1); color: {BROWN}; font-size: 12px; font-weight: 600">Abadá</span>'
             f'<span style="padding: 4px 10px; border-radius: 999px; background: {bg}; color: {fg}; font-size: 12px; font-weight: 500">{lab}</span>'
             f'<span style="padding: 4px 10px; font-size: 12px; color: {INK3}">{t["tempoBPM"]["min"]}–{t["tempoBPM"]["max"]} BPM</span></div>'
             f'{h1(t["name"], d)}'
             f'<div style="display: flex; flex-direction: column; gap: 8px">{video_box()}{EMBED_ACTIONS()}'
             f'<p style="margin: 0; font-size: 14px; font-weight: 500; color: {INK}">{e(v["title"])}</p></div>'
             + '<section style="display: flex; flex-direction: column; gap: 12px">' + label('Músicas · ' + str(len(songs_for(t['id']))))
             + grid([song_card(x, d, fav=(x in FAVS)) for x in sorted(songs_for(t['id']), key=lambda x: x['title'])], 2 if is_phone(d) else 3) + '</section>'
             + f'{section("Descrição", t["description"])}{section("Contexto do jogo", t["context"])}{section("Caráter do jogo", t["gameCharacter"])}'
             + card_box(f'<h2 style="margin: 0 0 12px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: {INK3}">Instrumentos</h2><div style="display: flex; flex-wrap: wrap; gap: 8px">{chips}</div>'))
    return (header(d, 'Toques') + main_open(d)
            + f'<div style="width: 100%; max-width: 672px; display: flex; flex-direction: column; gap: 24px">{inner}</div></main>')

def page_minhas(d):
    cols = {'Phone': 2, 'iPad': 3, 'Desktop': 5}[d]
    return (header(d, 'Minhas') + main_open(d, 32, 32)
            + f'<div style="display: flex; flex-direction: column; gap: 4px">{h1("Minhas", d)}{sub("Suas favoritas e aprendidas.")}</div>'
            + f'<section style="display: flex; flex-direction: column; gap: 12px"><div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap">'
            + f'{label(f"Favoritas · {len(FAVS)}")}<a href="{href("Player", d)}" style="display: flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 14px; border-radius: 12px; background: {GOLD}; color: {BROWN}; font-size: 14px; font-weight: 700; text-decoration: none">{play_tri(12, BROWN)}Tocar favoritas</a></div>'
            + grid([song_card(s, d, fav=True) for s in FAVS], cols) + '</section>'
            + f'<section style="display: flex; flex-direction: column; gap: 12px">{label(f"Aprendidas · {len(LEARNED)}")}'
            + grid([song_card(s, d, learned=True) for s in LEARNED], cols) + '</section></main>')

def player_row(s, i, active):
    lead = (f'<span aria-hidden="true" style="display: flex; align-items: flex-end; gap: 2px; height: 12px; width: 16px">'
            f'<span style="width: 3px; height: 60%; border-radius: 1px; background: {GOLD}"></span><span style="width: 3px; height: 100%; border-radius: 1px; background: {GOLD}"></span><span style="width: 3px; height: 40%; border-radius: 1px; background: {GOLD}"></span></span>') if active \
        else f'<span style="width: 16px; font-size: 11px; color: {INK3}">{i + 1}</span>'
    bgc = f'border: 1px solid rgba(212, 160, 23, 0.5); background: rgba(212, 160, 23, 0.1)' if active else f'border: 1px solid {LINE}; background: {SURF}'
    tq = tname(s['toque'][0]) if s['toque'] else ''
    return (f'<li style="display: flex; align-items: center; gap: 10px; padding: 10px 4px 10px 12px; border-radius: 12px; {bgc}">'
            f'{lead}<span style="flex-grow: 1; min-width: 0; display: flex; flex-direction: column"><span style="font-size: 14px; font-weight: 600; color: {INK}">{e(s["title"])}</span>'
            f'<span style="font-size: 11px; color: {INK3}">{e(tq)}</span></span>'
            f'<button type="button" aria-label="Remover {e(s["title"])} das favoritas" style="width: 36px; height: 36px; border: 0; background: transparent; color: {RED}; display: flex; align-items: center; justify-content: center">{ico("heart", 16, "currentColor")}</button></li>')

def page_player(d):
    active = FAVS[1]
    transport = (f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 12px">'
                 f'<a href="{href("Song", d)}" style="display: flex; align-items: center; min-height: 44px; font-size: 12px; color: {INK3}; text-decoration: none">Ver letra completa</a>'
                 + action_bar([action_btn('back', 'Anterior'), action_btn('next', 'Próxima'), action_btn('shuffle', 'Aleatório')]) + '</div>')
    player = (f'<div style="display: flex; flex-direction: column; gap: 12px"><h2 style="margin: 0; font-family: {DISPLAY}; font-size: 18px; font-weight: 700; color: {INK}">{e(active["title"])}</h2>'
              f'{video_box()}{EMBED_ACTIONS()}{transport}</div>')
    lst = f'<ol style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px">' + ''.join(player_row(s, i, s is active) for i, s in enumerate(FAVS)) + '</ol>'
    top = (f'<div style="display: flex; align-items: center; gap: 12px"><a href="{href("Minhas", d)}" style="display: flex; align-items: center; min-height: 40px; padding: 0 12px; border-radius: 12px; border: 1px solid {LINE2}; background: {SURF}; color: {INK3}; font-size: 14px; font-weight: 600; text-decoration: none">← Minhas</a>'
           f'{label(f"A tocar · 2 de {len(FAVS)}")}</div>')
    if d == 'Desktop':
        return (header(d, 'Minhas') + main_open(d, 32, 20) + top
                + f'<div style="display: grid; grid-template-columns: 2fr 3fr; gap: 32px; align-items: start">{lst}{player}</div></main>')
    return header(d, 'Minhas') + main_open(d, 32, 20) + top + player + lst + '</main>'

def page_videos(d):
    cols = 1 if is_phone(d) else 2
    cards = []
    for v in VIDEOS:
        t = TQ.get(v['toque'])
        cards.append(f'<div style="display: flex; flex-direction: column; gap: 8px">{video_box()}{EMBED_ACTIONS()}'
                     f'<div><h3 style="margin: 0; font-size: 14px; font-weight: 500; color: {INK}">{e(v["title"])}</h3><span style="font-size: 12px; color: {INK3}">Demonstração de Toque</span></div>'
                     f'<p style="margin: 0; font-size: 12px; line-height: 1.5; color: {INK3}">{e(v.get("description") or "")}</p>'
                     f'<a href="{href("Toque", d)}" style="align-self: flex-start; display: flex; align-items: center; gap: 4px; min-height: 36px; font-size: 12px; font-weight: 500; color: {BROWN}; text-decoration: none">Ver o toque {e(t["name"] if t else "")} {ico("next", 12)}</a></div>')
    return (header(d) + main_open(d)
            + f'<div style="display: flex; flex-direction: column; gap: 4px">{h1("Vídeos", d)}{sub("Todos os vídeos reunidos. Cada demonstração também aparece na página do seu toque.")}</div>'
            + grid(cards, cols, 24) + '</main>')

def field(lbl, typ='text', ph=''):
    return (f'<label style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: {INK3}">{lbl}</span>'
            f'<input type="{typ}" placeholder="{ph}" style="height: 44px; padding: 0 12px; border: 1px solid {LINE2}; border-radius: 10px; background: #fafaf9; font: inherit; font-size: 16px; color: {INK}"></label>')

def page_login(d):
    g = ('<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>'
         '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>'
         '<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>'
         '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path></svg>')
    card = (f'<div style="width: 100%; max-width: 448px; margin: 0 auto; box-sizing: border-box; padding: 32px; background: {SURF}; border: 1px solid {LINE2}; border-radius: 16px; display: flex; flex-direction: column; gap: 22px">'
            f'<div style="text-align: center"><h1 style="margin: 0; font-family: {DISPLAY}; font-size: 24px; font-weight: 700; color: {BROWN}">Abadá Música</h1><p style="margin: 4px 0 0; font-size: 14px; color: {INK3}">Entre para salvar suas favoritas e aprendidas</p></div>'
            f'<a href="{href("Home", d)}" style="height: 44px; display: flex; align-items: center; justify-content: center; gap: 12px; border: 1px solid {LINE2}; border-radius: 10px; color: {INK}; font-size: 14px; font-weight: 500; text-decoration: none">{g}Continuar com Google</a>'
            f'<p style="margin: 0; text-align: center; font-size: 12px; line-height: 1.6; color: {INK3}">Na primeira vez, sua conta é criada automaticamente.</p></div>')
    return header(d, signed=False) + main_open(d, 40) + card + '</main>'

def page_admin(d):
    ph = is_phone(d)
    top = (f'<header style="height: 56px; flex-shrink: 0; display: flex; align-items: center; gap: 12px; padding: 0 20px; background: {SURF}; border-bottom: 1px solid #eeeae4">'
           f'<span style="font-family: {DISPLAY}; font-weight: 700; font-size: 14px; color: {BROWN}">Abadá Música</span>'
           f'<span style="color: #d6d3d1">›</span><span style="font-size: 14px; color: {INK3}">Admin</span>'
           + ('' if ph else f'<span style="color: #d6d3d1">›</span><span style="font-size: 14px; font-weight: 500; color: {INK2}">{e(SONG["title"])}</span>')
           + f'<span style="margin-left: auto"></span>'
           + ('' if ph else f'<button type="button" style="height: 34px; padding: 0 12px; border-radius: 12px; border: 1px solid {LINE2}; background: transparent; color: {INK3}; font: inherit; font-size: 14px">Cancelar</button>'
                           f'<button type="button" style="height: 34px; padding: 0 16px; border: 0; border-radius: 12px; background: {BROWN}; color: #ffffff; font: inherit; font-size: 14px; font-weight: 600">Salvar alterações</button>')
           + f'<a href="{href("Home", d)}" style="display: flex; align-items: center; min-height: 36px; padding: 0 10px; border-radius: 8px; border: 1px solid {LINE2}; color: {INK3}; font-size: 12px; text-decoration: none">Sair</a></header>')
    rows = ''.join(f'<div style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid {LINE}; {"background: #fffbeb; border-left: 2px solid " + GOLD if (i == 0 and not ph) else "border-left: 2px solid transparent"}">'
                   f'<span style="flex-grow: 1; display: flex; flex-direction: column"><span style="font-size: 14px; color: {INK}; {"font-weight: 600" if (i == 0 and not ph) else ""}">{e(s["title"])}</span>'
                   f'<span style="font-size: 12px; color: {INK3}">{e(tname(s["toque"][0]) if s["toque"] else "")}</span></span>'
                   f'<span style="font-size: 10px; color: {"#f87171" if s.get("audioLinks", {}).get("youtube") else "#e7e5e4"}">▶</span></div>' for i, s in enumerate(SONGS[:12 if not ph else 11]))
    aside = (f'<aside style="width: {"100%" if ph else "256px"}; flex-shrink: 0; display: flex; flex-direction: column; background: {SURF}; border-right: 1px solid {LINE}">'
             f'<div style="padding: 12px; border-bottom: 1px solid {LINE}; display: flex; flex-direction: column; gap: 8px">'
             f'<p style="margin: 0; padding: 0 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: {INK3}">{SONG_TOTAL} músicas</p>'
             f'<input type="search" aria-label="Filtrar músicas" placeholder="Filtrar músicas..." style="height: 36px; padding: 0 10px; border: 1px solid {LINE2}; border-radius: 12px; background: #fafaf9; font: inherit; font-size: {16 if ph else 12}px"></div>'
             f'<div style="flex-grow: 1; overflow: hidden">{rows}</div>'
             f'<div style="padding: 12px; border-top: 1px solid {LINE}"><button type="button" style="width: 100%; height: 40px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 12px; background: {BROWN}; color: #ffffff; font: inherit; font-size: 14px; font-weight: 600">{ico("plus", 16)}Adicionar música</button></div></aside>')
    if ph:
        return top + f'<div style="flex-grow: 1; display: flex; overflow: hidden">{aside}</div>'
    def area(lbl, text, h=96):
        return (f'<label style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: {INK3}">{lbl}</span>'
                f'<textarea style="height: {h}px; padding: 10px 12px; border: 1px solid {LINE2}; border-radius: 10px; background: #fafaf9; font: inherit; font-size: 14px; line-height: 1.6; color: {INK}; resize: none">{e(text)}</textarea></label>')
    two = 'repeat(2, minmax(0, 1fr))'
    form = (f'<div style="flex-grow: 1; overflow: hidden; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px">'
            + card_box(f'<div style="display: flex; flex-direction: column; gap: 16px">'
                       f'<div style="display: grid; grid-template-columns: {"repeat(3, minmax(0, 1fr))" if d == "Desktop" else two}; gap: 12px">'
                       f'{field("Título")}{field("Compositor")}{field("Toque")}</div>'
                       f'<div style="display: grid; grid-template-columns: {two}; gap: 12px">{area("Coro (português)", CORO, 80)}{area("Coro (inglês)", CORO, 80)}</div>'
                       f'<div style="display: grid; grid-template-columns: {two}; gap: 12px">{area("Letra (português)", SONG["lyrics"], 260)}{area("Letra (inglês)", SONG["translation"], 260)}</div></div>')
            + '</div>')
    return top + f'<div style="flex-grow: 1; display: flex; overflow: hidden">{aside}{form}</div>'

def page_notfound(d):
    return (header(d) + main_open(d, 80)
            + f'<div style="max-width: 448px; margin: 0 auto; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px">'
            f'<p style="margin: 0; font-family: {DISPLAY}; font-size: 60px; font-weight: 700; color: {GOLDT}">404</p>'
            f'<h1 style="margin: 0; font-family: {DISPLAY}; font-size: 24px; font-weight: 700; color: {BROWN}">Página não encontrada</h1>'
            f'<p style="margin: 0; line-height: 1.6; color: {INK3}">O link pode estar errado ou a página foi removida.</p>'
            f'<div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 8px">'
            f'<a href="{href("Songs", d)}" style="height: 44px; padding: 0 20px; display: flex; align-items: center; border-radius: 12px; background: {GOLD}; color: {NIGHT}; font-weight: 700; text-decoration: none">Ver músicas</a>'
            f'<a href="{href("Home", d)}" style="height: 44px; padding: 0 20px; display: flex; align-items: center; border-radius: 12px; border: 1px solid {LINE2}; color: {INK2}; font-weight: 600; text-decoration: none">Página inicial</a></div></div></main>')

# ── phone overlays ─────────────────────────────────────────────────────────
DIM = f'<div aria-hidden="true" style="position: absolute; top: 0; right: 0; bottom: 0; left: 0; background: rgba(26, 18, 8, 0.45)"></div>'

def overlay_menu():
    d = 'Phone'
    link = lambda t, p: f'<a href="{href(p, d)}" style="display: flex; align-items: center; min-height: 48px; padding: 0 12px; border-radius: 8px; font-size: 15px; font-weight: 500; color: {INK2}; text-decoration: none">{t}</a>'
    under = header(d) + main_open(d) + h1('Músicas', d) + grid([song_card(s, d) for s in SONGS[:6]], 2) + '</main>'
    panel = (f'<section role="dialog" aria-modal="true" aria-label="Menu" style="position: absolute; top: 0; right: 0; bottom: 0; width: 300px; background: {SURF}; box-shadow: -8px 0 30px rgba(0, 0, 0, 0.18); display: flex; flex-direction: column">'
             f'<div style="height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 8px 0 16px; border-bottom: 1px solid {LINE}">{logo(d, 17)}'
             f'{iconbtn("close", "Fechar menu", href("Songs", d))}</div>'
             f'<nav aria-label="Menu" style="padding: 12px; display: flex; flex-direction: column; gap: 2px">'
             f'<label style="height: 44px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid {LINE2}; border-radius: 12px; color: {INK3}">{ico("search", 16)}<input type="search" aria-label="Buscar" placeholder="Buscar músicas, toques..." style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px"></label>'
             f'{link("Músicas", "Songs")}{link("Toques", "Toques")}{link("Minhas", "Minhas")}</nav>'
             f'<div style="margin-top: auto; padding: 12px 16px 20px; border-top: 1px solid {LINE}; display: flex; flex-direction: column; gap: 8px">'
             f'<div style="display: flex; align-items: center; gap: 10px"><span style="width: 28px; height: 28px; border-radius: 999px; background: rgba(212, 160, 23, 0.2); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: {BROWN}">H</span>'
             f'<span style="font-size: 14px; color: {INK2}">Hugo</span></div>'
             f'<a href="{href("Home", d)}" style="display: flex; align-items: center; min-height: 40px; font-size: 13px; color: {INK3}; text-decoration: none">Sair</a></div></section>')
    return under + DIM + panel

def overlay_search():
    d = 'Phone'
    hits = [s for s in SONGS if 'Paran' in s['title'] or 'Benedito' in s['title'] or 'Sabi' in s['title']][:3]
    res = ''.join(f'<a href="{href("Song", d)}" style="display: flex; flex-direction: column; gap: 2px; padding: 12px 14px; border-bottom: 1px solid {LINE}; text-decoration: none">'
                  f'<span style="font-size: 14px; font-weight: 600; color: {INK}">{e(s["title"])}</span><span style="font-size: 12px; color: {INK3}">{e(tname(s["toque"][0]))}</span></a>' for s in hits)
    row = (f'<div style="padding: 0 16px 12px; background: {SURF}; border-bottom: 1px solid #eeeae4; position: relative">'
           f'<label style="height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border: 2px solid {GOLD}; border-radius: 12px; color: {INK3}">{ico("search", 18)}'
           f'<input type="search" aria-label="Buscar" value="Paranauê" style="flex-grow: 1; min-width: 0; border: 0; outline: 0; background: transparent; font: inherit; font-size: 16px; color: {INK}"></label>'
           f'<div style="position: absolute; left: 16px; right: 16px; top: 52px; background: {SURF}; border: 1px solid {LINE2}; border-radius: 12px; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12); overflow: hidden">{res}</div></div>')
    return header(d) + row + main_open(d) + h1('Toques de Capoeira', d) + '</main>'

def overlay_signin():
    d = 'Phone'
    under = header(d, signed=False) + main_open(d, 24, 16) + song_title_block(d) + video_box() + action_bar([action_btn('heart', 'Favoritar', False), action_btn('loop', 'Repetir', True), action_btn('clock', 'Velocidade', badge='1×')]) + '</main>'
    sheet = (f'<section role="dialog" aria-modal="true" aria-labelledby="sheet-title" style="position: absolute; left: 0; right: 0; bottom: 0; padding: 12px 24px 32px; background: {SURF}; border-radius: 24px 24px 0 0; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.15)">'
             f'<span aria-hidden="true" style="width: 40px; height: 6px; border-radius: 999px; background: #d6d3d1"></span>'
             f'<span aria-hidden="true" style="margin-top: 8px; width: 56px; height: 56px; border-radius: 999px; background: #fef2f2; color: {RED}; display: flex; align-items: center; justify-content: center">{ico("heart", 28, "currentColor")}</span>'
             f'<h2 id="sheet-title" style="margin: 0; font-family: {DISPLAY}; font-size: 24px; font-weight: 700; color: {INK}">Salve suas músicas favoritas</h2>'
             f'<p style="margin: 0; font-size: 14px; line-height: 1.6; color: {INK2}">Entre na sua conta para guardar suas favoritas em qualquer aparelho e tocá-las em sequência em Minhas.</p>'
             f'<div style="align-self: stretch; display: flex; flex-direction: column; gap: 8px; margin-top: 4px">'
             f'<a href="{href("Login", d)}" style="height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; background: {GOLD}; color: {NIGHT}; font-weight: 700; text-decoration: none">Entrar para salvar</a>'
             f'<a href="{href("Song", d)}" style="height: 48px; display: flex; align-items: center; justify-content: center; border-radius: 12px; color: {INK2}; font-weight: 600; text-decoration: none">Agora não</a></div></section>')
    return under + DIM + sheet

# ── flow diagram ───────────────────────────────────────────────────────────
FW, FH = 2810, 1600
NODES = {  # id: (x, y, title, route, board)
    'header':   (80,   520, 'Every page · header', 'Busca · Menu · Entrar', 'Home-Desktop'),
    'home':     (480,  520, 'Home', '/', 'Home-Desktop'),
    'songs':    (900,  300, 'Músicas', '/musicas', 'Songs-Desktop'),
    'toques':   (900,  740, 'Toques', '/toques', 'Toques-Desktop'),
    'videos':   (900,  1180, 'Vídeos', '/videos', 'Videos-Desktop'),
    'song':     (1340, 300, 'Música', '/musicas/:id', 'Song-Desktop'),
    'toque':    (1340, 740, 'Toque', '/toques/:id', 'Toque-Desktop'),
    'minhas':   (1340, 1180, 'Minhas', '/minhas', 'Minhas-Desktop'),
    'sheet':    (1780, 120, 'Entrar para salvar', 'sheet over the page', 'Overlay-SignIn'),
    'login':    (2220, 120, 'Entrar com Google', '/login', 'Login-Desktop'),
    'player':   (1780, 1180, 'Tocar favoritas', '/minhas/tocar', 'Player-Desktop'),
    'adminlog': (1780, 520, 'Admin login', '/admin/login', 'Admin-Desktop'),
    'admin':    (2220, 520, 'Admin', '/admin', 'Admin-Desktop'),
    'nf':       (2220, 900, 'Página não encontrada', 'any unknown address', 'NotFound-Desktop'),
}
NW, NH = 300, 96
EDGES = [  # (from, to, label, kind)
    ('header', 'home', 'logo', 'solid'),
    ('home', 'songs', 'Explorar músicas', 'solid'),
    ('home', 'toques', 'Ver os toques', 'solid'),
    ('home', 'videos', 'card de vídeos', 'solid'),
    ('songs', 'song', 'cartão', 'solid'),
    ('toques', 'toque', 'cartão', 'solid'),
    ('videos', 'toque', 'Ver o toque', 'solid'),
    ('song', 'toque', 'ritmo · Ver todas', 'solid'),
    ('song', 'sheet', '♡ sem conta', 'solid'),
    ('sheet', 'login', 'Entrar para salvar', 'solid'),
    ('minhas', 'player', 'Tocar favoritas', 'solid'),
    ('adminlog', 'admin', 'senha', 'solid'),
]
def node_center(n, side):
    x, y = NODES[n][0], NODES[n][1]
    return {'r': (x + NW, y + NH / 2), 'l': (x, y + NH / 2), 't': (x + NW / 2, y), 'b': (x + NW / 2, y + NH)}[side]

def flow_svg():
    parts = []
    for a, b, lbl, kind in EDGES:
        ax, ay = NODES[a][0], NODES[a][1]; bx, by = NODES[b][0], NODES[b][1]
        if bx > ax:
            (x1, y1), (x2, y2) = node_center(a, 'r'), node_center(b, 'l')
            mx = (x1 + x2) / 2
            d_ = f'M{x1},{y1} C{mx},{y1} {mx},{y2} {x2 - 8},{y2}'
        else:
            (x1, y1), (x2, y2) = (node_center(a, 'b'), node_center(b, 't')) if by > ay else (node_center(a, 't'), node_center(b, 'b'))
            d_ = f'M{x1},{y1} L{x2},{y2 - 8 if by > ay else y2 + 8}'
        col = '#c2410c' if kind == 'issue' else '#a8a29e'
        dash = ' stroke-dasharray="8 6"' if kind == 'issue' else ''
        mk = 'arrow-issue' if kind == 'issue' else 'arrow'
        parts.append(f'<path d="{d_}" fill="none" stroke="{col}" stroke-width="2"{dash} marker-end="url(#{mk})"></path>')
        lx, ly = (x1 + x2) / 2, (y1 + y2) / 2 - 10
        tw = len(lbl) * 7.4 + 16
        parts.append(f'<rect x="{lx - tw / 2}" y="{ly - 14}" width="{tw}" height="22" rx="11" fill="#fefbf3" stroke="{col}" stroke-width="1"></rect>')
        parts.append(f'<text x="{lx}" y="{ly + 1}" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="12" fill="{"#9a3412" if kind == "issue" else "#57534e"}">{e(lbl)}</text>')
    return (f'<svg width="{FW}" height="{FH}" viewBox="0 0 {FW} {FH}" aria-hidden="true" style="position: absolute; top: 0; left: 0">'
            f'<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#a8a29e"></path></marker>'
            f'<marker id="arrow-issue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c2410c"></path></marker></defs>'
            + ''.join(parts) + '</svg>')

def flow_body():
    nodes = ''
    for k, (x, y, t, r, b) in NODES.items():
        dashed = k in ('sheet',)
        border = f'2px dashed {GOLD}' if dashed else f'1px solid {LINE2}'
        accent = GOLD if k in ('home',) else INK3
        nodes += (f'<a href="{b}.dc.html" style="position: absolute; left: {x}px; top: {y}px; width: {NW}px; height: {NH}px; box-sizing: border-box; padding: 16px 20px; '
                  f'background: {SURF}; border: {border}; border-radius: 14px; box-shadow: 0 2px 8px rgba(41, 37, 36, 0.08); text-decoration: none; display: flex; flex-direction: column; justify-content: center; gap: 4px">'
                  f'<span style="font-family: {DISPLAY}; font-size: 20px; font-weight: 700; color: {BROWN}">{e(t)}</span>'
                  f'<span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; color: {accent}">{e(r)}</span></a>')
    retired = (f'<div style="position: absolute; left: 80px; top: 1180px; width: 700px; display: flex; flex-direction: column; gap: 10px">'
               f'<p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: {INK3}">Redirects</p>'
               + ''.join(f'<p style="margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 15px; color: {INK2}">{a} <span style="color: {INK3}">→</span> {b}</p>'
                         for a, b in (('/roda', '/minhas'), ('/membership', '/'), ('/membership/success', '/'), ('any unknown address', 'Página não encontrada')))
               + '</div>')
    key = (f'<div style="position: absolute; left: 80px; top: 80px; display: flex; flex-direction: column; gap: 12px">'
           f'<p style="margin: 0; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: {INK3}">Key</p>'
           f'<div style="display: flex; align-items: center; gap: 12px; font-size: 15px; color: {INK2}"><span style="width: 48px; height: 2px; background: #a8a29e"></span>Link on the page</div>'
           f'<div style="display: flex; align-items: center; gap: 12px; font-size: 15px; color: {INK2}"><span style="width: 48px; height: 22px; box-sizing: border-box; border: 2px dashed {GOLD}; border-radius: 6px"></span>A sheet over the page, not a page</div>'
           f'<p style="margin: 8px 0 0; max-width: 340px; font-size: 14px; line-height: 1.5; color: {INK3}">Each box opens that page on the canvas.</p></div>')
    return flow_svg() + nodes + retired + key

# ── assemble ───────────────────────────────────────────────────────────────
PAGES = [
    ('Home', page_home, 'Home', '/', {'Phone': 2450, 'iPad': 1800, 'Desktop': 1550}),
    ('Songs', page_songs, 'Songs (Músicas)', '/musicas', {'Phone': 1250, 'iPad': 1150, 'Desktop': 950}),
    ('Song', page_song, 'Song page (Música)', '/musicas/:id', {'Phone': 2350, 'iPad': 2350, 'Desktop': 1550}),
    ('Toques', page_toques, 'Toques', '/toques', {'Phone': 2150, 'iPad': 1550, 'Desktop': 1200}),
    ('Toque', page_toque, 'Toque page', '/toques/:id', {'Phone': 2150, 'iPad': 1850, 'Desktop': 1850}),
    ('Minhas', page_minhas, 'Minhas', '/minhas', {'Phone': 1150, 'iPad': 1000, 'Desktop': 850}),
    ('Player', page_player, 'Play favourites (Tocar favoritas)', '/minhas/tocar', {'Phone': 1150, 'iPad': 1350, 'Desktop': 950}),
    ('Videos', page_videos, 'Videos (Vídeos)', '/videos', {'Phone': 1450, 'iPad': 1150, 'Desktop': 1400}),
    ('Login', page_login, 'Sign in (Entrar) — Google only', '/login', {'Phone': 844, 'iPad': 900, 'Desktop': 800}),
    ('Admin', page_admin, 'Admin', '/admin', {'Phone': 844, 'iPad': 1180, 'Desktop': 1000}),
    ('NotFound', page_notfound, 'Page not found', 'any unknown address', {'Phone': 844, 'iPad': 900, 'Desktop': 800}),
]
XS = {'Phone': 0, 'iPad': 470, 'Desktop': 1370}
ROW_W = 1370 + 1440

boards, order, notes = {}, [], {}
def write(name, content):
    io.open(os.path.join(OUT, name), 'w', encoding='utf-8', newline='\n').write(content)

# flow diagram = the entry artboard
write('Main.dc.html', doc('Site map — how the pages connect', FW, FH, flow_body(), lang='en'))
boards['Main.dc.html'] = {'x': 0, 'y': 300, 'w': FW, 'h': FH, 'title': 'How the pages connect — click a box to open that page', 'is_interactive': True}
order.append('Main.dc.html')
notes['flow'] = {'x': 0, 'y': 0, 'text': 'Abadá Música — how the pages connect', 'kind': 'title1', 'maxW': ROW_W}
notes['key'] = {'x': ROW_W + 120, 'y': 300, 'w': 420, 'fill': 'blue',
                'text': 'Every page below is shown at phone (390), iPad (820) and desktop (1440) widths, built from the site\'s real songs, toques and videos. Panels show a signed-in student; the Sign-in sheet and the Entrar page show what a signed-out visitor gets. Labels are the site\'s real Portuguese. Press Play on any panel to click through that device.'}

y = 300 + FH + 120
for key, fn, title, route, heights in PAGES:
    notes[f'row{key}'] = {'x': 0, 'y': y, 'text': f'{title}  ·  {route}', 'kind': 'title1', 'maxW': ROW_W}
    by = y + 300
    for d in ('Phone', 'iPad', 'Desktop'):
        name = f'{key}-{d}.dc.html'
        h = heights[d]
        write(name, doc(f'{title} — {d}', DEV[d]['w'], h, fn(d)))
        boards[name] = {'x': XS[d], 'y': by, 'w': DEV[d]['w'], 'h': h, 'title': f'{title} · {d}', 'is_interactive': True}
        order.append(name)
    y = by + max(heights.values()) + 120

# phone overlays
notes['rowOverlays'] = {'x': 0, 'y': y, 'text': 'Phone overlays — menu, search, sign-in sheet', 'kind': 'title1', 'maxW': ROW_W}
by = y + 300
for i, (name, fn, t) in enumerate((('Overlay-Menu', overlay_menu, 'Menu (☰)'), ('Overlay-Search', overlay_search, 'Search row (🔍)'), ('Overlay-SignIn', overlay_signin, 'Sign-in sheet (♡ while signed out)'))):
    write(f'{name}.dc.html', doc(t, 390, 844, fn()))
    boards[f'{name}.dc.html'] = {'x': i * 470, 'y': by, 'w': 390, 'h': 844, 'title': f'{t} · Phone', 'is_interactive': True}
    order.append(f'{name}.dc.html')

# open issues, as stickies beside their rows
def row_y(key):
    return notes[f'row{key}']['y'] + 300
notes['issueShare'] = {'x': ROW_W + 120, 'y': row_y('Song'), 'w': 420, 'fill': 'teal',
    'text': 'A shared song link now shows the site card (title, description, hero photo). Showing the song\'s own name in WhatsApp needs a small server-side piece, since chat apps don\'t run JavaScript.'}
notes['issueVideos'] = {'x': ROW_W + 120, 'y': row_y('Videos'), 'w': 420, 'fill': 'gray',
    'text': 'Vídeos isn\'t in the menu. The only way in is the "vídeos" card in Home\'s stats row (or typing the address). Each video also plays on its toque\'s page.'}
notes['issueGold'] = {'x': ROW_W + 120, 'y': row_y('Home'), 'w': 420, 'fill': 'gray',
    'text': 'The site\'s gold (#D4A017) is too light to read as text on white — the active nav link, "Música" in the logo, and links like "Ver todas". These panels use a slightly darker gold (#A07800) so they stay legible.'}

canvas = {
    'v': 3, 'createdOnFiles': {'v': 1, 'at': '2026-09-27T18:10:00Z'}, 'title': 'Site Map',
    'launch': {'view': 'canvas'}, 'pages': [], 'boards': boards, 'order': order, 'notes': notes, 'designSystems': [],
}
io.open(os.path.join(OUT, 'canvas.json'), 'w', encoding='utf-8', newline='\n').write(json.dumps(canvas, ensure_ascii=False, indent=1))
print('boards:', len(boards), '· files:', len(os.listdir(OUT)))
print('canvas height ~', y + 300 + 844)
