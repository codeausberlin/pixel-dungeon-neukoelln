# Skaliert die Pixelart aus dem Repo pixelgenau (nur ganzzahlige Faktoren) für das Instagram-Carousel.
#
#   python3 docs/presse/instagram/2026-10-06-carousel/quelle/assets-vorbereiten.py
#
# Schreibt nach quelle/bilder/. Quellen: Pressekit-Artwork, README-Sprites, Intro-Tafel, Screenshot.
import os
from PIL import Image

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, '..', '..', '..', '..', '..'))
OUT = os.path.join(HIER, 'bilder')
os.makedirs(OUT, exist_ok=True)


def lade(rel):
    return Image.open(os.path.join(REPO, rel)).convert('RGBA')


def basis(im, block):
    """Zurück auf 1 Pixel pro Kunstpixel."""
    return im.resize((im.width // block, im.height // block), Image.NEAREST)


def hoch(im, f):
    return im.resize((im.width * f, im.height * f), Image.NEAREST)


def mitte(im, w, h):
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def speichere(im, name):
    im.save(os.path.join(OUT, name))
    print(name, im.size)


# Titelbild: Key-Art 240x135 in 5x, links und rechts je 60 px beschnitten (Schild bleibt ganz).
speichere(mitte(hoch(basis(lade('docs/presse/bilder/artwork/key-art-ortsschild.png'), 4), 5), 1080, 675), 'titel.png')

# Rollen: 160x90 in 7x, randlos auf 1080 Breite.
for r in ['alteingesessene', 'expat', 'zugezogene', 'tourist']:
    im = basis(lade(f'docs/presse/bilder/artwork/rolle-{r}.png'), 6)
    speichere(mitte(hoch(im, 7), 1080, 630), f'rolle-{r}.png')

# Regionen: 160x90 in 2x.
for r in ['hinterhof', 'amt', 'baustelle', 'renditequartier', 'rathaus']:
    speichere(hoch(basis(lade(f'docs/presse/bilder/artwork/region-{r}.png'), 6), 2), f'region-{r}.png')

# Intro-Tafel 4 (RUMS): 160x90 in 6x.
speichere(hoch(basis(lade('core/src/main/assets/splashes/intro/intro_4.png'), 5), 6), 'intro-rums.png')

# Gegner und Spätimann: README-Sprites liegen in 4x vor.
for g in ['leihscooter', 'pfandgolem', 'terminhaendler', 'presslufter', 'luxussanierer', 'hausordnungs-hydra']:
    speichere(hoch(lade(f'docs/readme/gegner/{g}.png'), 2), f'gegner-{g}.png')
speichere(hoch(basis(lade('docs/readme/gegner/spaetimann.png'), 4), 14), 'spaetimann.png')

# Spielszene: Ausschnitt aus dem Screenshot (Spiel rendert 4x), auf 6x gebracht.
shot = lade('docs/presse/bilder/screenshots/09-kampf-kabelschlange.png').crop((288, 112, 928, 432))
speichere(shot.resize((960, 480), Image.NEAREST), 'spielszene.png')

# Logo quer: liegt in 4x vor, unverändert.
speichere(lade('docs/presse/bilder/logo/logo-querformat.png'), 'logo-quer.png')
