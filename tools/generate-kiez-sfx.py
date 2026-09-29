#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Neukölln Pixel Dungeon - prozedurale Kiez-Soundeffekte.

Erzeugt alle 67 Soundeffekte (core/src/main/assets/sounds/*.mp3) rein per
Synthese mit numpy/scipy: keine Samples, keine Downloads. Deterministisch
(Seed je Sound aus CRC32 des Namens). MP3-Kodierung mit dem reinen
Python-Paket `lameenc` (LAME), 44,1 kHz, Mono, CBR.

Lautheit: Jeder neue Sound wird auf die gemessene Lautheit des Upstream-Sounds
gleichen Namens gebracht (grobe K-Gewichtung, aktive Frames, siehe `loudness`).
Die Referenzwerte stehen fest im Skript (REF), damit das Skript auch nach dem
Ersetzen der Dateien reproduzierbar bleibt.

Aufruf (aus dem Repo-Wurzelverzeichnis):
    python3 tools/generate-kiez-sfx.py                    # alle Sounds
    python3 tools/generate-kiez-sfx.py --only hit,alert   # einzelne Sounds
    python3 tools/generate-kiez-sfx.py --out DIR --wav    # woanders hin, zusätzlich WAV
    python3 tools/generate-kiez-sfx.py --measure DIR      # nur messen (z. B. Upstream-Sounds)

Abhängigkeiten: pip install --user numpy scipy soundfile lameenc
Details: docs/NEUKOELLN-AUDIO.md, Abschnitt "Soundeffekte".
"""
import argparse
import os
import sys
import zlib

import numpy as np
from scipy.signal import butter, sosfilt, lfilter, fftconvolve

SR = 44100
BITRATE = 64            # kbit/s CBR, Mono (Upstream: 32-64 kbit/s)
HQ_BITRATE = 160        # kbit/s CBR für die Waffen-/Kampfklänge (siehe `sound_hq`)
PEAK_MAX_DB = -1.5      # vor der Kodierung; MP3 kann leicht überschwingen
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOUND_DIR = os.path.join(REPO, 'core', 'src', 'main', 'assets', 'sounds')

# Gemessene Upstream-Referenz (vor dem Ersetzen, mit `--measure`):
# name: (Dauer s, Lautheit dB nach `loudness`, Peak dBFS)
REF = {}  # wird unten aus _REF_TEXT gefüllt

# ---------------------------------------------------------------------------
# Grundbausteine
# ---------------------------------------------------------------------------


def N(d):
    return max(1, int(round(d * SR)))


def tt(d):
    return np.arange(N(d)) / SR


def buf(d):
    return np.zeros(N(d))


def add(dst, x, at, gain=1.0):
    """x ab Sekunde `at` in dst addieren (abschneiden, falls zu lang)."""
    i = int(round(at * SR))
    if i >= len(dst):
        return dst
    n = min(len(x), len(dst) - i)
    dst[i:i + n] += gain * x[:n]
    return dst


def mix(*xs):
    """Summe unterschiedlich langer Signale (mit Nullen aufgefüllt)."""
    out = np.zeros(max(len(x) for x in xs))
    for x in xs:
        out[:len(x)] += x
    return out


def db(x):
    return 10.0 ** (x / 20.0)


def lp(x, f, order=2):
    f = min(f, SR * 0.45)
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, f, q=2.0, order=2):
    lo = f * (2 ** (-0.5 / q))
    hi = min(f * (2 ** (0.5 / q)), SR * 0.45)
    return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)


def reson(x, f, q):
    """RBJ-Bandpass (konstanter Spitzenwert 0 dB), eine Formante/Resonanz."""
    w = 2 * np.pi * f / SR
    al = np.sin(w) / (2 * q)
    b = np.array([al, 0, -al])
    a = np.array([1 + al, -2 * np.cos(w), 1 - al])
    return lfilter(b / a[0], a / a[0], x)


def sweep_bp(x, f0, f1, q=2.0, block=128, curve='exp'):
    """Zeitvariabler Resonanzfilter (blockweise), Mittenfrequenz f0 -> f1."""
    y = np.zeros_like(x)
    zi = np.zeros(2)
    nb = (len(x) + block - 1) // block
    for k in range(nb):
        u = k / max(1, nb - 1)
        if callable(f0):
            f = f0(u)
        else:
            f = f0 * (f1 / f0) ** u if curve == 'exp' else f0 + (f1 - f0) * u
        f = min(max(f, 20), SR * 0.45)
        w = 2 * np.pi * f / SR
        al = np.sin(w) / (2 * q)
        a0 = 1 + al
        b = np.array([al, 0, -al]) / a0
        a = np.array([1, -2 * np.cos(w) / a0, (1 - al) / a0])
        s = slice(k * block, (k + 1) * block)
        y[s], zi = lfilter(b, a, x[s], zi=zi)
    return y


def phase(freq, n=None):
    """Phase aus (zeitvariabler) Frequenz."""
    f = np.asarray(freq, float)
    if f.ndim == 0:
        f = np.full(n, float(f))
    return 2 * np.pi * np.cumsum(f) / SR


def glide(f0, f1, d, curve='exp'):
    u = np.linspace(0, 1, N(d))
    if curve == 'exp':
        return f0 * (f1 / f0) ** u
    return f0 + (f1 - f0) * u


def glide_hold(f0, f1, tg, d):
    """Gleiten über tg Sekunden, danach Ton halten (Gesamtlänge d)."""
    g = glide(f0, f1, tg)
    return np.concatenate([g, np.full(max(0, N(d) - len(g)), f1)])[:N(d)]


def sine(freq, d):
    return np.sin(phase(freq, N(d)) if np.ndim(freq) == 0 else phase(freq))


def saw(freq, d, harmonics=None):
    """Bandbegrenzter Sägezahn (additiv, genügt für kurze Effekte)."""
    f = np.full(N(d), float(freq)) if np.ndim(freq) == 0 else np.asarray(freq, float)
    ph = phase(f)
    out = np.zeros(len(f))
    fmax = f.max()
    kmax = harmonics or max(1, int(SR * 0.45 / fmax))
    for k in range(1, kmax + 1):
        out += np.sin(k * ph) / k
    return out * 0.6


def square(freq, d, harmonics=None):
    f = np.full(N(d), float(freq)) if np.ndim(freq) == 0 else np.asarray(freq, float)
    ph = phase(f)
    out = np.zeros(len(f))
    kmax = harmonics or max(1, int(SR * 0.45 / f.max()))
    for k in range(1, kmax + 1, 2):
        out += np.sin(k * ph) / k
    return out * 0.8


def env_exp(d, tau, attack=0.002):
    t = tt(d)
    e = np.exp(-t / tau)
    if attack > 0:
        e *= np.minimum(1, t / attack)
    return e


def env_adsr(d, a, dcy, s, r):
    n = N(d)
    t = tt(d)
    e = np.full(n, s)
    e[t < a] = t[t < a] / max(a, 1e-4)
    m = (t >= a) & (t < a + dcy)
    e[m] = 1 - (1 - s) * (t[m] - a) / max(dcy, 1e-4)
    rel = t > d - r
    e[rel] *= np.clip((d - t[rel]) / max(r, 1e-4), 0, 1)
    return e


def modal(d, partials, rng=None, jitter=0.0):
    """Gedämpfte Sinusse: partials = [(freq, decay_s, amp), ...]."""
    t = tt(d)
    out = np.zeros(len(t))
    for f, dec, a in partials:
        if rng is not None and jitter:
            f *= 1 + rng.uniform(-jitter, jitter)
        ph = 0 if rng is None else rng.uniform(0, 2 * np.pi)
        out += a * np.exp(-t / dec) * np.sin(2 * np.pi * f * t + ph)
    out *= np.minimum(1, t / 0.0006)
    return out


def noise(d, rng):
    return rng.standard_normal(N(d))


def burst(d, rng, tau, f=None, q=1.0, kind='bp'):
    x = noise(d, rng) * env_exp(d, tau, 0.0005)
    if f is None:
        return x
    if kind == 'bp':
        return bp(x, f, q)
    if kind == 'lp':
        return lp(x, f)
    return hp(x, f)


def grains(d, rng, rate, f_lo, f_hi, glen=(0.0008, 0.004), density_env=None, q=1.5):
    """Knister-/Raschelkörner: viele kurze gefilterte Rauschstöße."""
    out = buf(d)
    t = 0.0
    while t < d:
        dens = 1.0 if density_env is None else density_env(t / d)
        t += rng.exponential(1.0 / max(rate * max(dens, 0.02), 1e-3))
        if t >= d:
            break
        if rng.uniform() > dens and density_env is not None:
            continue
        g = rng.uniform(*glen)
        f = np.exp(rng.uniform(np.log(f_lo), np.log(f_hi)))
        x = bp(noise(g + 0.004, rng) * env_exp(g + 0.004, g / 2, 0.0003), f, q)
        add(out, x * rng.uniform(0.3, 1.0), t)
    return out


def ks_pluck(f0, d, rng, damp=0.996, bright=0.5, bend=0.0):
    """Karplus-Strong-Zupfer (Gummiband, Saite)."""
    n = N(d)
    out = np.zeros(n)
    p = max(2, int(SR / f0))
    line = rng.uniform(-1, 1, p)
    line = lp(line, 2000 + 8000 * bright)
    idx = 0
    prev = 0.0
    for i in range(n):
        v = line[idx]
        nxt = line[(idx + 1) % p]
        newv = damp * (0.5 * (v + nxt))
        out[i] = v
        line[idx] = newv
        idx += 1
        if idx >= p:
            idx = 0
            if bend:
                # Tonhöhe fällt: Puffer minimal verlängern
                pn = min(int(p * (1 + bend)), 4 * p)
                if pn > p:
                    line = np.concatenate([line, line[:pn - p]])
                    p = pn
    return out


def formant(src, formants):
    """Parallele Formantfilter: formants = [(f, q, gain), ...]."""
    return sum(g * reson(src, f, q) for f, q, g in formants)


def glottal(f0, d, rng, jitter=0.01):
    f = np.full(N(d), float(f0)) if np.ndim(f0) == 0 else np.asarray(f0, float)
    f = f * (1 + jitter * lp(rng.standard_normal(len(f)), 30) * 5)
    return lp(saw(f, d, harmonics=40), 4000) + 0.02 * rng.standard_normal(len(f))


def reverb(x, rt=0.6, mix=0.25, pre=0.01, bright=4000, rng=None, tail=True):
    rng = rng or np.random.default_rng(1)
    d = rt * 1.2
    ir = rng.standard_normal(N(d)) * np.exp(-6.9 * tt(d) / rt)
    ir = lp(ir, bright)
    ir /= np.sqrt((ir ** 2).sum())
    ir = np.concatenate([np.zeros(N(pre)), ir])
    wet = fftconvolve(x, ir)
    y = np.concatenate([x, np.zeros(len(wet) - len(x))]) if tail else x.copy()
    return (1 - mix) * y + mix * wet[:len(y)] * 1.5


def echo(x, delay, fb=0.35, n=3, f=3000):
    y = np.concatenate([x, np.zeros(N(delay * n))])
    cur = x.copy()
    for k in range(1, n + 1):
        cur = lp(cur, f) * fb
        add(y, cur, delay * k)
    return y


def sat(x, drive=2.0):
    return np.tanh(drive * x) / np.tanh(drive)


def norm(x):
    m = np.abs(x).max()
    return x / m if m > 0 else x


def fade(x, fin=0.001, fout=0.01):
    x = x.copy()
    a, b = N(fin), N(fout)
    if a > 1:
        x[:a] *= np.linspace(0, 1, a)
    if b > 1:
        x[-b:] *= np.linspace(1, 0, b) ** 2
    return x


def trim(x, thresh_db=-60):
    """Stille am Ende abschneiden, sanft ausblenden."""
    m = np.abs(x).max()
    if m == 0:
        return x
    idx = np.where(np.abs(x) > m * db(thresh_db))[0]
    end = min(len(x), idx[-1] + N(0.01)) if len(idx) else len(x)
    return fade(x[:end], 0.0005, 0.015)


def vowel(name):
    return {
        'a': [(800, 6, 1.0), (1200, 8, 0.5), (2500, 10, 0.15)],
        'e': [(450, 6, 1.0), (2000, 10, 0.45), (2700, 12, 0.2)],
        'ae': [(700, 6, 1.0), (1750, 9, 0.5), (2600, 12, 0.2)],
        'u': [(320, 5, 1.0), (800, 6, 0.25), (2300, 12, 0.05)],
        'o': [(500, 6, 1.0), (900, 7, 0.4), (2500, 12, 0.08)],
    }[name]


def bell(f, d, rng, dec=0.8, bright=1.0):
    """Glocke/Gong (Türklingel): leicht inharmonische Teiltöne."""
    return modal(d, [(f, dec, 1.0), (f * 2.0, dec * 0.6, 0.45 * bright),
                     (f * 2.76, dec * 0.4, 0.3 * bright), (f * 5.4, dec * 0.2, 0.12 * bright),
                     (f * 0.5, dec * 1.2, 0.18)], rng)


def glass(f, d, rng, dec=0.25):
    """Flasche/Glas: inharmonische Teiltöne 1 : 2,32 : 4,25 : 6,6."""
    return modal(d, [(f, dec, 1.0), (f * 2.32, dec * 0.6, 0.55),
                     (f * 4.25, dec * 0.35, 0.3), (f * 6.6, dec * 0.2, 0.15)], rng, 0.02)


def metal(f, d, rng, dec=0.2):
    """Metall (Regal, Schloss, Münze): dichte inharmonische Teiltöne."""
    ratios = [1.0, 1.59, 2.14, 2.65, 3.16, 3.93, 4.7]
    return modal(d, [(f * r, dec / (1 + 0.35 * i), 1.0 / (1 + 0.5 * i))
                     for i, r in enumerate(ratios)], rng, 0.015)


def wood(f, d, rng, dec=0.04):
    return modal(d, [(f, dec, 1.0), (f * 2.4, dec * 0.6, 0.5), (f * 4.3, dec * 0.4, 0.25)], rng, 0.03)


def beep(f, d, soft=3500, kind='sq'):
    x = square(f, d, harmonics=9) if kind == 'sq' else sine(f, d) + 0.25 * sine(2 * f, d)
    return lp(x, soft) * env_adsr(d, 0.004, 0.02, 0.8, 0.012)


def horn(freqs, d, rng, cutoff=1800, vib=5.0, vdepth=0.004, drive=1.6):
    out = np.zeros(N(d))
    t = tt(d)
    for i, f in enumerate(freqs):
        fv = f * (1 + vdepth * np.sin(2 * np.pi * vib * t + i) + 0.002 * i)
        out += saw(fv, d, harmonics=30)
    out = sat(lp(out / len(freqs), cutoff), drive)
    return out


# ---------------------------------------------------------------------------
# Die Sounds (jede Funktion: rng -> Signal). Kommentar = Kiez-Idee.
# ---------------------------------------------------------------------------
S = {}


def sound(fn):
    S[fn.__name__.rstrip('_')] = fn
    return fn


# --- Oberfläche, Bewegung, Umgebung ---------------------------------------

@sound
def click(r):
    # Kugelschreiber-Klick am Amtsschalter: zwei Mikroklicks
    x = buf(0.07)
    for at, f in ((0.0, 3400), (0.022, 2700)):
        add(x, mix(bp(noise(0.004, r) * env_exp(0.004, 0.0008, 0), f, 3), 0.4 * modal(0.02, [(f * 0.9, 0.006, 1), (f * 1.6, 0.004, 0.5)], r)), at)
    return x


@sound
def step(r):
    # Schritt auf Altbaudielen: dumpfer Tritt, kurzer Holzton
    d = 0.17
    x = 1.0 * sine(glide(95, 55, d), d) * env_exp(d, 0.035, 0.002)
    x += 0.5 * lp(noise(d, r) * env_exp(d, 0.012, 0.0008), 900)
    x += 0.2 * wood(210, d, r, 0.03)
    return x


@sound
def grass(r):
    # Laub und Kiezgrün auf dem Tempelhofer Feld: kurzes Rascheln
    d = 0.17
    x = grains(d, r, 900, 2500, 7000, density_env=lambda u: np.sin(np.pi * min(u * 1.2, 1)))
    return x + 0.15 * hp(noise(d, r), 3000) * env_adsr(d, 0.02, 0.05, 0.6, 0.08)


@sound
def water(r):
    # Pfütze vor dem Späti: Platschen + zwei Blubber
    d = 0.24
    x = 0.7 * hp(noise(d, r) * env_exp(d, 0.04, 0.001), 900)
    for at, f in ((0.03, 650), (0.09, 900)):
        bd = 0.05
        add(x, sine(glide(f, f * 2.2, bd), bd) * env_exp(bd, 0.015, 0.001), at, 0.6)
    return x


@sound
def trample(r):
    # Plastikbecher wird zertreten: Knistern + kleiner Tritt
    d = 0.2
    x = grains(d, r, 700, 1500, 7000, glen=(0.001, 0.003), density_env=lambda u: np.exp(-3 * u))
    return x + 0.3 * lp(noise(d, r) * env_exp(d, 0.02), 700)


@sound
def sturdy(r):
    # Klopfen an einer massiven Altbautür
    d = 0.15
    return wood(190, d, r, 0.045) + 0.4 * lp(noise(d, r) * env_exp(d, 0.006), 2500)


@sound
def dewdrop(r):
    # Biertropfen landet im Kronkorken: Tropfen + kleines Blechklimpern
    d = 0.36
    x = sine(glide(700, 1500, 0.04), 0.04) * env_exp(0.04, 0.02, 0.001)
    x = np.concatenate([x, np.zeros(N(d) - len(x))])
    add(x, metal(3900, 0.3, r, 0.07), 0.035, 0.35)
    return reverb(x, 0.3, 0.2, rng=r)


@sound
def item(r):
    # Plastiktüte vom Späti raschelt
    d = 0.42
    env = lambda u: np.sin(np.pi * u) ** 0.7
    x = grains(d, r, 1400, 1800, 9000, glen=(0.001, 0.005), density_env=env)
    x += 0.25 * sweep_bp(noise(d, r), 900, 2600, 1.0) * np.sin(np.pi * np.linspace(0, 1, N(d)))
    return x


@sound
def gold(r):
    # Münzen fallen in den Pfandautomaten: Klapp + drei Münzen
    d = 0.36
    x = 0.4 * lp(noise(d, r) * env_exp(d, 0.008), 1200)
    for i, at in enumerate((0.0, 0.055, 0.1)):
        f = 2350 * (1.0, 1.12, 0.94)[i]
        add(x, metal(f, 0.25, r, 0.09), at + 0.005, (1.0, 0.8, 0.6)[i])
    return x


@sound
def door_open(r):
    # Altbautür: Schnappschloss klackt, dann knarzt das Scharnier
    d = 0.5
    x = buf(d)
    add(x, mix(metal(1900, 0.05, r, 0.012), 0.5 * bp(noise(0.02, r) * env_exp(0.02, 0.003), 4000, 2)), 0.0, 0.8)
    add(x, metal(1400, 0.05, r, 0.01), 0.035, 0.5)
    # Knarzen: Stick-Slip-Impulsfolge durch Holzresonanzen
    cd = 0.36
    fr = 70 + 50 * np.sin(np.pi * np.linspace(0, 1, N(cd))) + 10 * r.standard_normal(N(cd)).cumsum() / 200
    ph = phase(np.clip(fr, 30, 200))
    pulses = (np.diff(np.floor(ph / (2 * np.pi)), prepend=0) > 0).astype(float)
    pulses *= r.uniform(0.5, 1.0, len(pulses))
    cr = formant(pulses, [(480, 6, 1.0), (1150, 8, 0.8), (2300, 10, 0.4)])
    cr *= env_adsr(cd, 0.03, 0.1, 0.8, 0.12)
    add(x, cr, 0.07, 3.0)
    return x


@sound
def unlock(r):
    # Schlüsselbund klimpert, Riegel schnappt
    d = 0.55
    x = buf(d)
    for at in (0.0, 0.05, 0.11, 0.15):
        add(x, metal(r.uniform(3200, 5200), 0.12, r, 0.05), at, r.uniform(0.3, 0.6))
    add(x, wood(330, 0.15, r, 0.04) + 0.6 * metal(1500, 0.15, r, 0.03), 0.3, 1.0)
    add(x, bp(noise(0.02, r) * env_exp(0.02, 0.003), 3500, 1.5), 0.3, 0.6)
    return x


@sound
def descend(r):
    # Treppenhaus: Schritte nach unten mit Hall, am Ende klackt der Minutenlicht-Schalter
    d = 2.6
    x = buf(d)
    for k in range(6):
        at = 0.05 + k * 0.27
        g = 1.0 - 0.1 * k
        s = step(r) * 1.2
        add(x, s, at, g)
        if k % 2 == 1:  # Knarzende Stufe
            cd = 0.12
            fr = np.full(N(cd), 90.0 + 20 * k)
            ph = phase(fr)
            pulses = (np.diff(np.floor(ph / (2 * np.pi)), prepend=0) > 0).astype(float)
            add(x, formant(pulses, [(600, 6, 1.0), (1400, 8, 0.6)]) * env_adsr(cd, 0.02, 0.03, 0.7, 0.05), at + 0.04, 0.25 * g)
    # Minutenlicht: Klick und leises Brummen, das abklingt
    add(x, click(r) * 1.5, 1.8)
    hum = (sine(100, 0.7) + 0.4 * sine(200, 0.7)) * env_exp(0.7, 0.25, 0.01)
    add(x, hum, 1.82, 0.12)
    return reverb(x, 1.6, 0.35, 0.02, 2800, r)


# --- Kampf: Waffenklänge in hoher Qualität ---------------------------------
#
# Überarbeitet nach Hörfeedback ("klingt wie Plastik", Bogen = Handschuh).
# Jeder Klang ist aus Schichten gebaut statt aus einzelnen Sinus-Glides:
#   (a) Transient: kurzer Anschlag (Halbsinus-Kontaktpuls + Rauschen), der eine
#       Bank gedämpfter Resonatoren anregt (Modalsynthese, Material-Moden),
#   (b) Körper: tiefer Thump mit Tonhöhenabfall, mit tiefpassgefiltertem
#       Rauschen vermischt (kein reiner Sinus),
#   (c) Textur: Leder, Stoff, Holz, Klinge, Metall als eigene Schicht,
#   (d) Raum: Faltung mit synthetischer Raumantwort (frühe Reflexionen plus
#       kurzer Nachhall, Höhen klingen schneller ab),
#   (e) Mastering: Kompressor, weiche Sättigung, sanfter Tiefpass.
# Diese Klänge werden mit HQ_BITRATE kodiert (siehe `sound_hq`).

HQ = set()


def sound_hq(fn):
    """Wie `sound`, aber mit höherer MP3-Bitrate kodiert."""
    sound(fn)
    HQ.add(fn.__name__.rstrip('_'))
    return fn


def res_bank(exc, modes, rng=None, jitter=0.0):
    """Modalsynthese: Anregung `exc` treibt gedämpfte Zwei-Pol-Resonatoren.
    modes = [(freq, tau_s, gain), ...]; jede Mode wird auf Spitze `gain` normiert."""
    out = np.zeros(len(exc))
    for f, tau, g in modes:
        if rng is not None and jitter:
            f *= 1 + rng.uniform(-jitter, jitter)
        f = min(f, SR * 0.45)
        rr = np.exp(-1.0 / (tau * SR))
        w = 2 * np.pi * f / SR
        # Nullstellen bei 0 Hz und Nyquist: die Mode lässt keinen Gleichanteil der Anregung durch
        y = lfilter([1.0, 0.0, -1.0], [1.0, -2 * rr * np.cos(w), rr * rr], exc)
        m = np.abs(y).max()
        if m > 0:
            out += g * y / m
    return out


def strike(d, contact, rng, grit=0.3, at=0.0):
    """Kontaktpuls: Halbsinus der Dauer `contact` (weich = lang, hart = kurz) plus Rauschen."""
    x = buf(d)
    n = max(2, N(contact))
    p = np.sin(np.pi * np.arange(n) / n)
    p = p * (1 + grit * rng.standard_normal(n))
    add(x, p, at)
    return x


def thump(d, f0, f1, tp, ta, rng, grit=0.35, att=0.0012):
    """Körper: Tonhöhe fällt von f0 nach f1 (Zeitkonstante tp), Amplitude tau ta.
    Grundton + leichter Oberton + Rauschband um die Tonhöhe."""
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t / tp)
    ph = phase(f)
    env = (1 - np.exp(-t / att)) * np.exp(-t / ta)
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph + 0.4) + 0.08 * np.sin(3 * ph + 1.1)
    nz = sweep_bp(rng.standard_normal(N(d)), lambda u: f1 + (f0 - f1) * np.exp(-u * d / tp), None, 0.8)
    nz /= np.abs(nz).max() + 1e-12
    return env * (tone + grit * 1.6 * nz)


def noise_hit(d, rng, tau, lo, hi, att=0.0003):
    """Bandbegrenzter Rauschstoß (lo..hi Hz), Abklingzeit tau."""
    x = noise(d, rng) * env_exp(d, tau, att)
    if lo:
        x = hp(x, lo, 2)
    if hi:
        x = lp(x, hi, 2)
    return x


def whoosh(d, rng, fc, q=1.3, peak=0.4, rise=2.0, fall=3.0):
    """Luftzug: Rauschen durch zwei kaskadierte, gleitende Bandpässe (fc: u -> Hz),
    asymmetrische Hüllkurve mit Maximum bei `peak` (Doppler-artig)."""
    x = sweep_bp(noise(d, rng), fc, None, q)
    x = sweep_bp(x, fc, None, q)
    u = np.linspace(0, 1, N(d))
    e = np.where(u < peak, (u / peak) ** rise, np.exp(-fall * (u - peak) / (1 - peak) * 2.3))
    x = x * e
    return x / (np.abs(x).max() + 1e-12)


def room_ir(rng, rt=0.25, pre=0.003, n_er=7, er_span=0.028, split=2200):
    """Synthetische Raumantwort: frühe Reflexionen (Gewölbe/Kellerraum) plus
    diffuser Nachhall, dessen Höhen schneller abklingen. Energie auf 1 normiert."""
    d = pre + er_span + rt * 1.1
    ir = buf(d)
    for k in range(n_er):
        at = pre + er_span * (k + rng.uniform(0.15, 0.95)) / n_er
        i = int(at * SR)
        ir[i] += 0.9 * (0.72 ** k) * (1 if rng.uniform() < 0.5 else -1)
    ir = lp(ir, 7000, 1)
    t = tt(d)
    nz = rng.standard_normal(N(d))
    t0 = pre + 0.006
    on = np.clip((t - t0) / 0.012, 0, 1)
    tail = lp(nz, split) * np.exp(-6.9 * t / rt) + 0.6 * hp(nz, split) * np.exp(-6.9 * t / (rt * 0.4))
    ir += 0.55 * on * tail * np.sqrt(1.0 / (rt * SR * 0.05))
    ir = lp(ir, 9000)
    return ir / np.sqrt((ir ** 2).sum())


def room(x, rng, rt=0.25, wet=0.15, **kw):
    """Trockensignal + Faltungshall; `wet` = Spitzenpegel des Halls relativ zum Trockensignal."""
    ir = room_ir(rng, rt, **kw)
    x = fade(x, 0.0, 0.008)
    y = np.concatenate([x, np.zeros(len(ir))])
    w = np.zeros(len(y))
    c = fftconvolve(x, ir)[:len(y)]
    w[:len(c)] = c
    return y + wet * w * (np.abs(x).max() / (np.abs(w).max() + 1e-12))


def compress(x, thr_db=-14.0, ratio=3.0, att=0.004, rel=0.07):
    """Einfacher Feed-forward-Kompressor (Spitzen-Hüllkurve), Eingang auf Spitze 1."""
    x = x / (np.abs(x).max() + 1e-12)
    a_c = np.exp(-1.0 / (att * SR))
    r_c = np.exp(-1.0 / (rel * SR))
    thr = db(thr_db)
    env = np.empty(len(x))
    e = 0.0
    for i, v in enumerate(np.abs(x)):
        c = a_c if v > e else r_c
        e = c * e + (1 - c) * v
        env[i] = e
    g = np.ones(len(x))
    m = env > thr
    g[m] = (env[m] / thr) ** (1.0 / ratio - 1.0)
    return x * g


def master(x, drive=1.2, lpf=13000, thr_db=-6.0, ratio=2.0, att=0.002, rel=0.03):
    """Kompression, weiche Sättigung, sanfter Tiefpass gegen digitale Härte."""
    x = compress(x, thr_db, ratio, att, rel)
    x = sat(0.9 * x / (np.abs(x).max() + 1e-12), drive)
    return hp(lp(x, lpf, 2), 30, 2)


def blade_modes(f, taus, gains, beat=0.004):
    """Moden eines frei schwingenden Stabs (Klinge): 1 : 2,76 : 5,40 : 8,93,
    jede Mode als leicht verstimmtes Paar (Schwebung wie bei echtem Metall)."""
    out = []
    for r_, tau, g in zip((1.0, 2.756, 5.404, 8.933), taus, gains):
        out.append((f * r_, tau, g))
        out.append((f * r_ * (1 + beat), tau * 0.85, g * 0.6))
    return out


@sound_hq
def hit(r):
    # Faust/Handschuh, unbewaffnet, generischer Treffer (auch jeder Monster-Treffer):
    # dumpfer Punch. Leder klatscht auf Körper, tiefer Thump, kein Klicken.
    d = 0.24
    x = buf(d)
    exc = strike(d, 0.0035, r, 0.4)                    # weicher Handschuh: langer Kontakt
    add(x, 0.33 * thump(d, 150, 62, 0.015, 0.035, r, 0.4), 0.0)
    add(x, 0.22 * res_bank(exc, [(95, 0.03, 1.0), (178, 0.02, 0.6), (265, 0.015, 0.35)], r, 0.03), 0.0)
    # Leder/Polsterung: mittlere Moden, sehr kurz
    add(x, 0.8 * res_bank(exc, [(430, 0.01, 1.0), (760, 0.007, 0.6), (1180, 0.005, 0.4)], r, 0.03), 0.0)
    # Klatschen: zwei dichte Mikro-Stöße, gebandpasst, keine Höhen-Spitze
    for at, g in ((0.0, 0.7), (0.0035, 1.0)):
        add(x, g * 1.2 * lp(hp(noise(0.05, r) * env_exp(0.05, 0.007, 0.0006), 500), 3800), at)
    add(x, 0.07 * noise_hit(0.04, r, 0.006, 4500, 9000, 0.001), 0.002)
    x = room(x, r, 0.16, 0.10)
    return master(x, 1.3, 9000)


@sound_hq
def hit_slash(r):
    # Klinge: kurzer Luftzug, Schnitt durch Stoff/Haut, leichter metallischer Nachklang
    d = 0.3
    x = buf(d)
    sw = 0.07
    add(x, 0.35 * whoosh(sw, r, lambda u: 900 * (4.5 ** u), 1.4, 0.85, 1.5, 1.0), 0.0)
    t0 = 0.055
    # Schnitt: breitbandiger Riss mit körnigem Anteil
    cut = noise_hit(0.12, r, 0.022, 2200, 11000, 0.0015)
    cut *= 0.6 + 0.8 * grains(0.12, r, 2200, 2500, 9000, glen=(0.0004, 0.002), density_env=lambda u: np.exp(-5 * u)) ** 2 * 6
    add(x, 0.55 * cut, t0)
    add(x, 0.55 * noise_hit(0.08, r, 0.012, 600, 3500, 0.0008), t0)
    add(x, 0.6 * thump(0.2, 135, 70, 0.012, 0.035, r, 0.45), t0)
    # Klinge klingt kurz nach (Stabmoden mit Schwebung), leise
    exc = strike(0.25, 0.0003, r, 0.2)
    add(x, 0.13 * res_bank(exc, blade_modes(2380, (0.05, 0.03, 0.02, 0.012), (1.0, 0.55, 0.3, 0.15)), r, 0.01), t0 + 0.002)
    x = room(x, r, 0.2, 0.12)
    return master(x, 1.3, 13000)


@sound_hq
def hit_stab(r):
    # Stich: spitzer Einstich, kurzes Durchdringen ("tschk"), wenig Körper
    d = 0.22
    x = buf(d)
    exc = strike(d, 0.00025, r, 0.2)
    add(x, 0.18 * res_bank(exc, [(3150, 0.008, 1.0), (4920, 0.005, 0.6), (7300, 0.003, 0.35)], r, 0.02), 0.0)
    add(x, 0.35 * noise_hit(0.02, r, 0.0025, 2500, 12000, 0.0001), 0.0)
    # Durchdringen: Rauschband gleitet schnell nach unten
    pen = sweep_bp(noise(0.08, r), lambda u: 3400 * (0.28 ** u), None, 1.6) * env_exp(0.08, 0.02, 0.003)
    add(x, 1.0 * pen / (np.abs(pen).max() + 1e-12), 0.004)
    add(x, 0.25 * grains(0.07, r, 700, 500, 2200, glen=(0.002, 0.006), density_env=lambda u: np.exp(-4 * u)), 0.012)
    add(x, 0.55 * thump(0.16, 175, 85, 0.01, 0.03, r, 0.4), 0.006)
    x = room(x, r, 0.16, 0.10)
    return master(x, 1.3, 13000)


@sound_hq
def hit_crush(r):
    # Stumpfe Waffe (Keule, Hammer): schwerer, basslastiger Schlag mit Knacken
    d = 0.36
    x = buf(d)
    add(x, 0.45 * thump(d, 118, 46, 0.022, 0.085, r, 0.45), 0.0)
    exc = strike(d, 0.0015, r, 0.4)
    add(x, 0.3 * res_bank(exc, [(82, 0.07, 1.0), (140, 0.05, 0.7), (230, 0.03, 0.4)], r, 0.03), 0.0)
    # Holzkopf der Keule
    add(x, 0.5 * res_bank(exc, [(340, 0.03, 1.0), (790, 0.018, 0.6), (1420, 0.01, 0.35)], r, 0.03), 0.0)
    add(x, 0.9 * noise_hit(0.06, r, 0.01, 150, 3200, 0.0006), 0.0)
    # Knacken: einige breitbandige Mikro-Brüche in den ersten 40 ms
    for k in range(7):
        at = 0.003 + (r.uniform() ** 1.6) * 0.04
        add(x, r.uniform(0.25, 0.6) * noise_hit(0.012, r, r.uniform(0.0008, 0.002), 1300, 9000, 0.0001), at)
    add(x, 0.12 * grains(0.25, r, 250, 700, 4000, glen=(0.002, 0.006), density_env=lambda u: np.exp(-6 * u)), 0.02)
    x = room(x, r, 0.26, 0.14)
    return master(x, 1.6, 11000, -6, 2.5)


@sound_hq
def hit_strong(r):
    # Wuchtiger Treffer (Spezialangriffe, Überraschungsschlag): Aufprall mit Sub-Bass,
    # Knall, Staub/Schutt, deutlich hörbarer Kellerraum
    d = 0.6
    x = buf(d)
    add(x, 0.6 * thump(d, 92, 36, 0.035, 0.15, r, 0.5, 0.002), 0.0)
    exc = strike(d, 0.002, r, 0.5)
    add(x, 0.35 * res_bank(exc, [(58, 0.14, 1.0), (104, 0.09, 0.75), (176, 0.05, 0.5), (290, 0.03, 0.3)], r, 0.03), 0.0)
    for at, g in ((0.0, 0.8), (0.006, 1.0), (0.013, 0.5)):
        add(x, g * 0.8 * noise_hit(0.05, r, 0.009, 90, 6500, 0.0004), at)
    add(x, 0.25 * lp(noise(d, r) * env_exp(d, 0.16, 0.01), 220), 0.0)           # Grollen
    add(x, 0.25 * grains(0.4, r, 320, 900, 6000, glen=(0.002, 0.008), density_env=lambda u: np.exp(-5 * u)), 0.015)
    x = room(x, r, 0.42, 0.2, n_er=9, er_span=0.045)
    return master(x, 1.8, 10000, -8, 2.5, 0.004, 0.06)


@sound_hq
def hit_magic(r):
    # Energie-Einschlag: Entladung mit Knistern und kurzem Druckstoß, kein Spielzeug-Laser
    d = 0.5
    x = buf(d)
    add(x, 0.5 * thump(d, 105, 44, 0.02, 0.07, r, 0.4), 0.0)
    add(x, 0.45 * noise_hit(0.02, r, 0.0015, 1500, 14000, 0.0001), 0.0)
    # Entladung: Rauschen durch Kammfilter mit gleitender Verzögerung (Flanger-"Fssst")
    dd = 0.3
    nz = bp(noise(dd, r), 2600, 0.5)
    u = np.linspace(0, 1, N(dd))
    dly = (0.0009 + 0.0035 * u ** 0.7) * SR
    idx = np.arange(N(dd)) - dly
    comb = nz + 0.85 * np.interp(idx, np.arange(N(dd)), nz, left=0.0)
    add(x, 0.8 * comb / (np.abs(comb).max() + 1e-12) * env_exp(dd, 0.07, 0.001), 0.0)
    # Funken: kurze, harte Knackser, dünner werdend
    add(x, 0.7 * grains(0.4, r, 380, 1800, 11000, glen=(0.0002, 0.0012), density_env=lambda v: np.exp(-5 * v), q=0.8), 0.004)
    # leises Netzbrummen, klingt schnell ab
    hum = sine(100, dd) + 0.5 * sine(200, dd) + 0.3 * sine(300, dd)
    add(x, 0.12 * hum * env_exp(dd, 0.06, 0.004) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 50 * tt(dd)))), 0.0)
    x = room(x, r, 0.3, 0.14)
    return master(x, 1.4, 12000)


@sound_hq
def hit_parry(r):
    # Abgewehrt: Metall auf Metall, harter Anschlag, inharmonisches Klingen mit Schwebung
    d = 0.55
    x = buf(d)
    exc = strike(d, 0.00018, r, 0.3)
    add(x, 0.55 * res_bank(exc, blade_modes(735, (0.085, 0.06, 0.04, 0.025), (1.0, 0.7, 0.45, 0.25), 0.0035), r, 0.005), 0.0)
    add(x, 0.3 * res_bank(exc, blade_modes(1105, (0.065, 0.045, 0.03, 0.02), (1.0, 0.6, 0.35, 0.2), 0.005), r, 0.005), 0.0)
    # dichte hohe Plattenmoden (Funkeln), kurz
    hi = [(r.uniform(2400, 9500), r.uniform(0.012, 0.04), r.uniform(0.3, 1.0)) for _ in range(14)]
    add(x, 0.3 * res_bank(exc, hi), 0.0)
    add(x, 0.6 * noise_hit(0.02, r, 0.0018, 1800, 13000, 0.0001), 0.0)
    # Kratzen der Klingen aneinander
    sc = noise_hit(0.07, r, 0.025, 3000, 7500, 0.004) * (0.6 + 0.4 * np.sin(2 * np.pi * 170 * tt(0.07)))
    add(x, 0.15 * sc, 0.008)
    add(x, 0.45 * thump(0.12, 210, 120, 0.01, 0.022, r, 0.3), 0.0)
    x = room(x, r, 0.3, 0.14)
    return master(x, 1.2, 13000)


@sound_hq
def hit_arrow(r):
    # Pfeil schlägt ein: kurzes Heranzischen, harter, heller "Tock" in Holz/Körper,
    # dann schwirrt der Schaft ("brrr"). Wenig Tiefbass - klar anders als der dumpfe `hit`.
    d = 0.34
    x = buf(d)
    t0 = 0.035
    add(x, 0.2 * whoosh(t0 + 0.01, r, lambda u: 1400 * (2.2 ** u), 1.4, 0.92, 2.5, 1.0), 0.0)
    exc = strike(d, 0.00025, r, 0.3)
    add(x, 0.75 * res_bank(exc, [(960, 0.014, 1.0), (1730, 0.009, 0.65), (2680, 0.006, 0.45), (3950, 0.004, 0.3)], r, 0.02), t0)
    add(x, 0.55 * noise_hit(0.02, r, 0.0012, 2000, 12000, 0.0001), t0)
    add(x, 0.28 * thump(0.12, 200, 120, 0.006, 0.02, r, 0.4), t0)
    # Schaft schwirrt: Rauschband, im Takt der Schaftschwingung (~70 Hz) gepulst
    sd = 0.24
    ts = tt(sd)
    fs = glide(74, 66, sd)
    puls = np.abs(sat(np.sin(phase(fs)), 3.0))
    brr = bp(noise(sd, r), 1000, 0.8) * (0.15 + 0.85 * puls ** 2)
    brr += 0.35 * bp(saw(fs, sd, 12), 600, 0.8)
    add(x, 0.4 * brr / (np.abs(brr).max() + 1e-12) * env_exp(sd, 0.07, 0.012), t0 + 0.006)
    x = room(x, r, 0.18, 0.1)
    return master(x, 1.3, 13000)


@sound_hq
def miss(r):
    # Daneben (auch Wurf-Geräusch, dort höher gepitcht): Luftzug, Doppler-artig
    # erst steigend, dann fallend; kein Aufprall
    d = 0.36
    fc = lambda u: 280 + 950 * np.exp(-((u - 0.38) / 0.22) ** 2) + 200 * (1 - u)
    x = 0.8 * whoosh(d, r, fc, 1.2, 0.4, 2.2, 2.6)
    x += 0.25 * whoosh(d, r, lambda u: 2.1 * fc(u), 1.5, 0.37, 2.4, 3.0)
    u = np.linspace(0, 1, N(d))
    e = np.where(u < 0.4, (u / 0.4) ** 2, np.exp(-5.5 * (u - 0.4)))
    x += 0.5 * lp(noise(d, r), 240) / 2.0 * e
    x *= 1 + 0.12 * np.sin(2 * np.pi * 23 * tt(d))
    return master(x, 1.1, 8000)


def bow_string(f0, d, rng, damp, bright, tau, lpf=None):
    """Gezupfte Sehne: Karplus-Strong mit etwas Sättigung (Sehne schlägt an)."""
    s = ks_pluck(f0, d, rng, damp, bright) * env_exp(d, tau, 0.0004)
    s = sat(s / (np.abs(s).max() + 1e-12), 1.4)
    return lp(s, lpf) if lpf else s


@sound_hq
def atk_spiritbow(r):
    # Bogen schießt (Zugezogene): tiefer Sehnen-Twang mit Holzkörper, dann Pfeil-Luftzug.
    # Tonal (Grundton ~98 Hz) und länger als jeder Treffer - klar anders als `hit`.
    d = 0.42
    x = buf(d)
    exc = strike(d, 0.0005, r, 0.3)
    add(x, 0.35 * res_bank(exc, [(880, 0.012, 1.0), (1650, 0.008, 0.6), (2600, 0.005, 0.35)], r, 0.02), 0.0)  # Sehne an Armschutz
    add(x, 0.22 * noise_hit(0.015, r, 0.0015, 1500, 9000, 0.0001), 0.0)
    add(x, 0.85 * bow_string(98, d, r, 0.99, 0.45, 0.045, 3200), 0.001)
    # Wurfarme aus Holz schwingen mit
    add(x, 0.4 * res_bank(exc, [(142, 0.08, 1.0), (233, 0.05, 0.7), (371, 0.03, 0.4)], r, 0.02), 0.0)
    # Pfeil verlässt den Bogen: Luftzug, der sich entfernt (Mitte fällt)
    wd = 0.3
    w = whoosh(wd, r, lambda u: 2600 * (0.35 ** u), 1.3, 0.12, 1.5, 2.2)
    w *= 1 + 0.3 * np.sin(2 * np.pi * 95 * tt(wd))   # Federn flattern
    add(x, 0.6 * w, 0.02)
    x = room(x, r, 0.22, 0.1)
    return master(x, 1.2, 12000)


@sound_hq
def atk_crossbow(r):
    # Armbrust (auch Wurfpfeile): Abzug klackt metallisch, dann schnappt die straffe
    # Sehne hart an den Anschlag, kurzer Bolzen-Luftzug
    d = 0.4
    x = buf(d)
    for at, f, g in ((0.0, 2900, 0.5), (0.009, 3700, 0.35)):
        e = strike(0.05, 0.00015, r, 0.2)
        add(x, g * res_bank(e, [(f, 0.006, 1.0), (f * 1.53, 0.004, 0.6), (f * 2.21, 0.003, 0.4)], r, 0.02), at)
    t0 = 0.018
    add(x, 0.7 * bow_string(168, 0.3, r, 0.985, 0.9, 0.035), t0)
    exc = strike(0.3, 0.0004, r, 0.4)
    add(x, 0.45 * res_bank(exc, [(460, 0.02, 1.0), (1010, 0.012, 0.6), (1760, 0.007, 0.35)], r, 0.03), t0 + 0.001)
    add(x, 0.45 * noise_hit(0.03, r, 0.003, 500, 8000, 0.0001), t0)
    add(x, 0.7 * thump(0.2, 160, 90, 0.01, 0.03, r, 0.35), t0)
    wd = 0.18
    add(x, 0.18 * whoosh(wd, r, lambda u: 2200 * (0.4 ** u), 1.3, 0.1, 1.5, 2.2), t0 + 0.012)
    x = room(x, r, 0.2, 0.1)
    return master(x, 1.3, 13000)


# --- Warnungen und Gefahr (klar unterscheidbar halten) ---------------------

def heartbeat(r, beats, gap, f=60):
    d = beats[-1][0] + 0.35
    x = buf(d)
    for at, g in beats:
        b = sine(glide(f * 1.3, f * 0.8, 0.25), 0.25) * env_exp(0.25, 0.06, 0.004)
        b += 0.25 * sine(glide(f * 2.6, f * 1.6, 0.25), 0.25) * env_exp(0.25, 0.03, 0.003)
        b += 0.3 * lp(noise(0.25, r) * env_exp(0.25, 0.015), 400)
        add(x, b, at, g)
    return x


@sound
def health_warn(r):
    # Bass vom Nachbarn wummert durch die Wand: Lub-Dub, tief und weich
    return sat(heartbeat(r, [(0.0, 1.0), (0.26, 0.7)], 0.26, 58), 1.4)


@sound
def health_critical(r):
    # Schnelleres Wummern + zweitöniger Kassen-Fehlerpiep
    x = sat(heartbeat(r, [(0.0, 1.0), (0.2, 0.8)], 0.2, 64), 1.6)
    x = np.concatenate([x, np.zeros(N(0.5))])
    add(x, beep(988, 0.09, 3000), 0.46, 0.3)
    add(x, beep(740, 0.13, 3000), 0.58, 0.3)
    return x


@sound
def alert(r):
    # Autoalarmanlage: zwei Heuler, dann Zweiklang-Hupen (weich gefiltert)
    d = 2.3
    x = buf(d)
    for k in range(2):
        wd = 0.42
        f = glide(650, 1350, wd)
        add(x, square(f, wd, 7) * env_adsr(wd, 0.01, 0.05, 0.9, 0.03), k * 0.45)
    for k in range(8):
        f = 1180 if k % 2 == 0 else 880
        add(x, square(f, 0.1, 7) * env_adsr(0.1, 0.005, 0.02, 0.9, 0.015), 0.95 + k * 0.155)
    x = lp(x, 3200, 4)
    return reverb(x, 0.9, 0.25, 0.03, 2500, r)  # Hinterhof-Echo


@sound
def trap(r):
    # Falle: Quietscheente wird zertreten + Plopp
    d = 0.2
    sd = 0.09
    f = glide(1500, 2100, sd) * (1 + 0.03 * np.sin(2 * np.pi * 45 * tt(sd)))
    sq = sat(sine(f, sd), 3.0) * env_adsr(sd, 0.004, 0.02, 0.9, 0.02)
    sq = formant(sq, [(1800, 3, 1.0), (3600, 4, 0.5)])
    x = buf(d)
    add(x, sq, 0.0)
    add(x, sine(glide(520, 160, 0.06), 0.06) * env_exp(0.06, 0.02, 0.001), 0.085, 1.2)
    return x


@sound
def boss(r):
    # Boss erscheint: tiefes Baustellen-Signalhorn in Moll + Rumms
    d = 3.2
    x = buf(d)
    add(x, horn([73.4, 87.3, 110.0], 1.1, r, 1500) * env_adsr(1.1, 0.04, 0.2, 0.8, 0.25), 0.0)
    add(x, horn([65.4, 77.8, 98.0, 130.8], 1.9, r, 1300) * env_adsr(1.9, 0.05, 0.3, 0.8, 0.9), 1.2)
    boom = sine(glide(70, 35, 1.2), 1.2) * env_exp(1.2, 0.35, 0.003)
    add(x, boom, 0.0, 0.8)
    add(x, boom, 1.2, 0.8)
    add(x, lp(noise(1.5, r), 2500) * env_adsr(1.5, 1.0, 0.1, 0.8, 0.4), 1.2, 0.08)
    return reverb(x, 1.4, 0.3, 0.03, 2200, r)


@sound
def challenge(r):
    # Kampfansage: Druckluftfanfare wie im Stadion, kurz-kurz-lang
    d = 3.0
    x = buf(d)
    for at, ln in ((0.0, 0.28), (0.38, 0.28), (0.8, 1.4)):
        h = horn([440.0, 554.4, 659.3], ln, r, 3200, 7, 0.006, 2.2)
        add(x, h * env_adsr(ln, 0.015, 0.05, 0.85, 0.08), at)
    # Kurve jubelt/raunt: gefiltertes Rauschen mit "oh"-Formante
    crowd = formant(noise(1.6, r), vowel('o')) * env_adsr(1.6, 0.4, 0.2, 0.7, 0.8)
    add(x, crowd, 0.9, 0.08)
    return reverb(x, 1.2, 0.25, 0.03, 3000, r)


@sound
def cursed(r):
    # Verflucht: Fehlersummer vom Amt, schwebend tief
    d = 0.5
    x = square(110, d, 15) + 0.8 * square(116.5, d, 15)
    return lp(x, 1600) * env_adsr(d, 0.01, 0.05, 0.9, 0.08)


@sound
def debuff(r):
    # Schwächung: "Bu-dumm", zwei weiche fallende Töne
    d = 1.1
    x = buf(d)
    for at, f in ((0.0, 523.3), (0.22, 392.0)):
        ln = 0.8 if at else 0.3
        fv = glide(f, f * 0.94, ln)
        add(x, (sine(fv, ln) + 0.3 * sine(fv * 2, ln)) * env_exp(ln, 0.18 if at else 0.1, 0.005), at)
    return reverb(x, 0.8, 0.25, rng=r)


@sound
def degrade(r):
    # Etwas geht kaputt: Luft zischt aus dem Fahrradreifen, dazu Wah-Wah abwärts
    d = 2.0
    x = buf(d)
    add(x, bp(noise(1.6, r), 4500, 1.2) * env_adsr(1.6, 0.02, 0.2, 0.6, 1.2) * np.linspace(1, 0.4, N(1.6)), 0.0, 0.5)
    for k, f in enumerate((233.1, 220.0, 207.7)):
        ln = 0.35 if k < 2 else 0.9
        fv = glide(f, f * (0.97 if k < 2 else 0.9), ln)
        tone = saw(fv, ln, 20) * (1 + 0.1 * np.sin(2 * np.pi * 5.5 * tt(ln)))
        tone = sweep_bp(tone, 500, 1400 if k < 2 else 350, 3.0) * env_adsr(ln, 0.03, 0.05, 0.9, 0.1)
        add(x, tone, 0.25 + k * 0.38, 1.2)
    return x


@sound
def death(r):
    # Tod: der Rollladen rattert herunter und knallt auf
    d = 2.0
    x = buf(d)
    t = 0.0
    k = 0
    while t < 1.45:
        gap = 0.028 + 0.035 * (t / 1.45) ** 2
        f = 900 - 350 * t / 1.45
        add(x, mix(metal(f, 0.06, r, 0.018) * 0.6, 0.5 * lp(noise(0.03, r) * env_exp(0.03, 0.005), 2500)), t, 0.5 + 0.2 * r.uniform())
        t += gap * r.uniform(0.9, 1.1)
        k += 1
    add(x, 1.3 * sine(glide(95, 45, 0.5), 0.5) * env_exp(0.5, 0.12, 0.002), 1.5)
    add(x, mix(metal(420, 0.5, r, 0.15), 0.8 * lp(noise(0.3, r) * env_exp(0.3, 0.03), 1500)), 1.5, 0.8)
    return reverb(x, 0.8, 0.2, rng=r)


# --- Gegenstände ------------------------------------------------------------

@sound
def eat(r):
    # Baklava aus der Papiertüte: Knistern, dann zwei knusprige Bissen
    d = 0.9
    x = buf(d)
    add(x, grains(0.3, r, 900, 1500, 6000, glen=(0.002, 0.008), density_env=lambda u: np.sin(np.pi * u)), 0.0, 0.8)
    for at in (0.38, 0.62):
        cr = grains(0.18, r, 1500, 1500, 5000, glen=(0.001, 0.004), density_env=lambda u: np.exp(-4 * u))
        cr += 0.5 * lp(noise(0.18, r) * env_exp(0.18, 0.02), 600)
        add(x, cr, at)
    return x


@sound
def drink(r):
    # Kronkorken-Plopp, Zischen, zwei Schlucke
    d = 0.8
    x = buf(d)
    add(x, mix(sine(glide(1100, 350, 0.03), 0.03) * env_exp(0.03, 0.012, 0.0005), 0.5 * bp(noise(0.01, r), 3000, 1)), 0.0, 0.9)
    fizz = hp(noise(0.5, r), 4000) * env_exp(0.5, 0.18, 0.005)
    fizz += grains(0.5, r, 300, 3000, 8000, density_env=lambda u: np.exp(-3 * u))
    add(x, fizz, 0.02, 0.2)
    for at in (0.35, 0.56):
        g = 0.12
        src = lp(noise(g, r), 800) + sine(glide(260, 380, g), g)
        add(x, reson(src, 330, 5) * env_adsr(g, 0.02, 0.03, 0.7, 0.05), at, 1.2)
    return x


@sound
def read(r):
    # Formular: Blatt umschlagen, Stempel drauf
    d = 0.46
    x = buf(d)
    add(x, sweep_bp(noise(0.16, r), 1500, 4000, 1.2) * env_adsr(0.16, 0.03, 0.05, 0.7, 0.06), 0.0, 0.6)
    add(x, 1.0 * sine(glide(160, 80, 0.2), 0.2) * env_exp(0.2, 0.04, 0.001) + 0.5 * wood(300, 0.2, r, 0.03), 0.22)
    return x


@sound
def lullaby(r):
    # Schlaflied: kleine Spieluhr, eigene Melodie
    notes = [(0.0, 1318.5), (0.24, 1174.7), (0.48, 1046.5), (0.72, 1174.7), (0.96, 784.0), (1.2, 1046.5)]
    x = buf(1.9)
    for at, f in notes:
        tine = modal(0.7, [(f, 0.35, 1.0), (f * 3.9, 0.08, 0.25), (f * 7.2, 0.03, 0.1)], r)
        add(x, tine, at)
    return reverb(x, 0.9, 0.3, rng=r)


@sound_hq
def shatter(r):
    # Flasche/Trank zerbricht (Altglascontainer): dumpfer Aufprall, Krachen,
    # viele einzelne Scherben (je eigene Glasmoden, von Rauschen angeregt), Nachklirren
    d = 0.55
    x = buf(d)
    add(x, 0.45 * thump(0.12, 210, 120, 0.008, 0.02, r, 0.5), 0.0)
    add(x, 0.8 * noise_hit(0.12, r, 0.022, 900, 12000, 0.0003), 0.0)
    for k in range(34):
        at = 0.001 + (r.uniform() ** 2.2) * (0.16 if k < 26 else 0.4)
        f = np.exp(r.uniform(np.log(1600), np.log(8000)))
        dec = r.uniform(0.02, 0.07)
        e = noise(0.004, r) * env_exp(0.004, 0.0008, 0.0001)
        e = np.concatenate([e, np.zeros(N(0.3))])
        sh = res_bank(e, [(f, dec, 1.0), (f * 2.32, dec * 0.6, 0.55), (f * 4.25, dec * 0.35, 0.3)], r, 0.03)
        add(x, sh * r.uniform(0.15, 0.4) * np.exp(-at / 0.09), at)
    add(x, 0.25 * grains(0.3, r, 500, 2500, 10000, glen=(0.0005, 0.002), density_env=lambda u: np.exp(-6 * u)), 0.005)
    x = room(x, r, 0.3, 0.14)
    return master(x, 1.4, 14000, -8, 2.5)


@sound
def zap(r):
    # Elektro-Zap aus dem Zauberstab (Stromkasten-Knistern)
    d = 0.6
    f = glide(180, 70, d)
    buzz = saw(f, d, 30) * (0.5 + 0.5 * (np.sin(2 * np.pi * 55 * tt(d)) > 0))
    x = bp(buzz, 1800, 0.6) * env_exp(d, 0.18, 0.002)
    x += 0.7 * grains(d, r, 500, 2500, 9000, density_env=lambda u: np.exp(-3 * u))
    return sat(x, 1.5)


@sound
def lightning(r):
    # Blitz: scharfer Überschlag, Knistern, kurzes Grollen
    d = 0.5
    x = 1.0 * hp(noise(d, r) * env_exp(d, 0.008, 0.0003), 2000)
    x += 0.8 * grains(d, r, 800, 2000, 10000, density_env=lambda u: np.exp(-6 * u))
    x += 0.5 * lp(noise(d, r) * env_exp(d, 0.12, 0.01), 250)
    return x


@sound
def evoke(r):
    # Aufladen eines Artefakts: elektrisches Anschwellen + Pling
    d = 0.85
    x = buf(d)
    sw = 0.55
    tone = saw(glide(180, 720, sw), sw, 20) * env_adsr(sw, 0.3, 0.1, 0.9, 0.1)
    add(x, bp(tone, 1200, 0.8), 0.0, 0.8)
    add(x, grains(sw, r, 300, 3000, 9000, density_env=lambda u: u), 0.0, 0.4)
    add(x, bell(1760, 0.35, r, 0.15), 0.52, 0.5)
    return x


@sound
def tomb(r):
    # Mülltonnendeckel knallt zu
    d = 0.28
    x = 1.0 * sine(glide(160, 90, d), d) * env_exp(d, 0.05, 0.001)
    x += 0.8 * bp(noise(d, r) * env_exp(d, 0.015, 0.0005), 1100, 0.8)
    x += 0.3 * modal(d, [(380, 0.05, 1), (910, 0.03, 0.5)], r)
    return x


@sound
def meld(r):
    # Wand verschmilzt: tiefes Wuusch wie Bauschaum
    d = 0.5
    x = sine(glide(130, 60, d), d) * env_adsr(d, 0.06, 0.1, 0.6, 0.25)
    x += 0.4 * lp(noise(d, r), 500) * env_adsr(d, 0.1, 0.1, 0.5, 0.25)
    return x


@sound_hq
def blast(r):
    # Explosion: Druckstoß (Friedlander-Welle statt Sinus), Donnern, Schutt, Hinterhof-Echo
    d = 0.95
    x = buf(d)
    t = tt(d)
    T = 0.014
    fw = (1 - t / T) * np.exp(-2.2 * t / T)
    fw[t > 6 * T] = 0
    add(x, 1.2 * lp(fw, 400) / (np.abs(lp(fw, 400)).max() + 1e-12), 0.0)
    add(x, 0.9 * noise_hit(0.05, r, 0.005, 0, 11000, 0.0002), 0.0)
    add(x, 0.8 * lp(noise(d, r) * env_exp(d, 0.08, 0.002), 1400), 0.0)
    add(x, 0.9 * lp(noise(d, r) * env_exp(d, 0.24, 0.006), 170), 0.0)   # Grollen
    add(x, 0.5 * thump(d, 75, 30, 0.04, 0.16, r, 1.0, 0.002), 0.0)
    add(x, 0.35 * grains(0.7, r, 260, 700, 6000, glen=(0.002, 0.01), density_env=lambda u: np.exp(-3.5 * u)) * env_exp(0.7, 0.22, 0.0), 0.03)
    for k in range(6):
        e = strike(0.2, 0.0006, r, 0.5)
        f = r.uniform(300, 1400)
        at = 0.08 + r.uniform() * 0.45
        add(x, r.uniform(0.1, 0.25) * np.exp(-at / 0.2) * res_bank(e, [(f, 0.012, 1.0), (f * 2.3, 0.007, 0.5)], r, 0.05), at)
    x = room(x, r, 0.8, 0.28, n_er=10, er_span=0.12, pre=0.02)
    return master(x, 2.0, 11000, -12, 3.0, 0.004, 0.12)


@sound
def plant(r):
    # Pflanze sprießt: Blumentopf-Plopp mit etwas Erde
    d = 0.26
    x = sine(glide_hold(380, 700, 0.04, d), d) * env_exp(d, 0.03, 0.001)
    x += 0.3 * grains(d, r, 250, 800, 3000, density_env=lambda u: np.exp(-4 * u))
    return x


@sound
def ray(r):
    # Strahl: brummender Elektrostrahl (Oberleitung)
    d = 1.05
    t = tt(d)
    f = 100 * (1 + 0.02 * np.sin(2 * np.pi * 7 * t))
    x = saw(f, d, 40)
    x = sweep_bp(x, lambda u: 700 + 1600 * np.sin(np.pi * u), None, 1.2)
    x *= env_adsr(d, 0.03, 0.1, 0.8, 0.3)
    x += 0.4 * grains(d, r, 250, 3000, 9000, density_env=lambda u: 1 - u)
    return sat(x, 1.4)


@sound
def beacon(r):
    # Leuchtfeuer: Sonar-Ping wie ein Signal aus dem Treppenhaus
    d = 0.9
    x = (sine(1100, d) + 0.25 * sine(2200, d)) * env_exp(d, 0.12, 0.003)
    return echo(x, 0.16, 0.4, 3, 2500)[:N(0.9)]


@sound
def teleport(r):
    # Teleport: U-Bahn-Türen piepen, schließen zischend, weg
    d = 1.3
    x = buf(d)
    for k in range(4):
        add(x, beep(1320, 0.07, 3500, 'sine'), k * 0.13, 0.7)
    add(x, bp(noise(0.3, r), 3000, 0.8) * env_adsr(0.3, 0.02, 0.05, 0.6, 0.2), 0.55, 0.35)
    add(x, mix(wood(140, 0.2, r, 0.06), 0.6 * lp(noise(0.1, r) * env_exp(0.1, 0.02), 900)), 0.78, 0.9)
    wd = 0.45
    add(x, sweep_bp(noise(wd, r), 400, 2400, 1.5) * env_adsr(wd, 0.2, 0.05, 0.7, 0.2), 0.85, 0.5)
    return x


@sound
def charms(r):
    # Bezirzt: Fahrradklingel, zweimal "Ring-ring"
    d = 0.72
    x = buf(d)
    for burst_at in (0.0, 0.3):
        for k in range(5):
            add(x, bell(2150, 0.4, r, 0.18, 0.7), burst_at + k * 0.045, 0.5 if k else 0.8)
    return x


@sound
def mastery(r):
    # Spezialisierung: Stempel "Genehmigt!" + heller Akkord
    d = 0.75
    x = buf(d)
    add(x, 1.0 * sine(glide(150, 75, 0.2), 0.2) * env_exp(0.2, 0.05, 0.001) + 0.5 * wood(280, 0.2, r, 0.03), 0.0)
    for f in (523.3, 659.3, 784.0, 1046.5):
        add(x, bell(f, 0.7, r, 0.35, 0.6), 0.06, 0.35)
    return x


@sound
def puff(r):
    # Rauchwolke: Spraydose schütteln (Kugelklacken) und Psst
    d = 0.45
    x = buf(d)
    for at in (0.0, 0.05):
        add(x, metal(2900, 0.04, r, 0.012), at, 0.4)
    add(x, bp(noise(0.33, r), 5500, 1.0) * env_adsr(0.33, 0.01, 0.05, 0.8, 0.15), 0.1, 1.0)
    return x


@sound
def rocks(r):
    # Bauschutt rutscht in den Container
    d = 1.25
    x = 0.4 * lp(noise(d, r), 900) * env_adsr(d, 0.02, 0.2, 0.5, 0.8)
    t = 0.0
    while t < 1.0:
        f = r.uniform(250, 1400)
        add(x, mix(modal(0.12, [(f, 0.03, 1), (f * 2.3, 0.02, 0.5)], r), 0.5 * lp(noise(0.05, r) * env_exp(0.05, 0.008), 2000)), t, (1 - t) * r.uniform(0.5, 1.0))
        t += r.exponential(0.035 + 0.06 * t)
    return x


@sound
def burning(r):
    # Brennen: Holzkohlegrill knistert, leises Fauchen
    d = 0.8
    x = 0.5 * lp(noise(d, r), 600) * env_adsr(d, 0.08, 0.1, 0.8, 0.3)
    x += grains(d, r, 60, 1500, 6000, glen=(0.001, 0.003))
    return x


@sound
def falling(r):
    # In die A100-Baugrube: Lotusflöte (Zugpfeife) abwärts, dann Plopp
    d = 1.4
    x = buf(d)
    wd = 1.05
    f = glide(1600, 260, wd) * (1 + 0.012 * np.sin(2 * np.pi * 6 * tt(wd)))
    wh = sine(f, wd) + 0.15 * hp(noise(wd, r), 2000) * 0.3
    add(x, wh * env_adsr(wd, 0.05, 0.1, 0.9, 0.08), 0.0, 0.8)
    add(x, mix(1.2 * sine(glide(200, 60, 0.25), 0.25) * env_exp(0.25, 0.06, 0.001), 0.5 * lp(noise(0.2, r) * env_exp(0.2, 0.03), 1200)), 1.1)
    return x


@sound
def ghost(r):
    # Geist: Wind im Hinterhof + gehauchtes "Huuu"
    d = 2.0
    wind = sweep_bp(noise(d, r), lambda u: 500 + 400 * np.sin(2 * np.pi * 1.3 * u), None, 2.0) * 0.5
    f = 260 * (1 + 0.08 * np.sin(np.pi * np.linspace(0, 1, N(d)))) * (1 + 0.01 * np.sin(2 * np.pi * 5 * tt(d)))
    v = formant(0.6 * sine(f, d) + 0.4 * noise(d, r) * 0.3, vowel('u'))
    x = (v + wind) * env_adsr(d, 0.4, 0.2, 0.8, 0.8)
    return reverb(x, 1.2, 0.35, rng=r)


@sound
def secret(r):
    # Geheimnis entdeckt: Pfandflaschen-Glockenspiel aufwärts
    x = buf(1.7)
    for k, f in enumerate((784.0, 987.8, 1174.7, 1568.0)):
        tone = glass(f, 0.8, r, 0.35) + 0.1 * bp(noise(0.8, r), f, 6) * env_exp(0.8, 0.2)
        add(x, tone, k * 0.12, 0.6)
    return reverb(x, 1.1, 0.3, rng=r)


@sound
def bones(r):
    # Knochenhaufen: Pfandflaschen klappern im Kasten
    d = 0.85
    x = buf(d)
    t = 0.0
    while t < 0.55:
        add(x, glass(r.uniform(900, 2200), 0.25, r, r.uniform(0.04, 0.09)), t, r.uniform(0.3, 0.8))
        t += r.exponential(0.06)
    return x


@sound
def bee(r):
    # Bienen: Wespenschwarm am Späti-Kuchen
    d = 1.1
    t = tt(d)
    x = buf(d)
    for f0, ph in ((215, 0), (243, 1.3)):
        f = f0 * (1 + 0.05 * np.sin(2 * np.pi * 3.1 * t + ph) + 0.02 * lp(r.standard_normal(len(t)), 20) * 20)
        z = saw(f, d, 30)
        x += formant(z, [(800, 3, 1.0), (2400, 4, 0.4)]) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.7 * t + ph))
    return x * env_adsr(d, 0.15, 0.1, 0.9, 0.3)


@sound
def mimic(r):
    # Mimic: Sperrmüll-Schrank schnappt zu und knurrt
    d = 0.85
    x = buf(d)
    for at in (0.0, 0.18):
        add(x, mix(wood(150, 0.2, r, 0.06), 0.7 * lp(noise(0.1, r) * env_exp(0.1, 0.015), 1800)), at, 1.0)
    gd = 0.55
    g = saw(glide(95, 70, gd), gd, 30) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * tt(gd)))
    add(x, formant(g, vowel('o')) * env_adsr(gd, 0.05, 0.1, 0.8, 0.2), 0.28, 1.0)
    return x


@sound
def chargeup(r):
    # Aufladen: E-Scooter-Akku summt hoch, Klick bei voll
    d = 1.2
    cd = 1.05
    f = glide(140, 900, cd)
    trem = 0.7 + 0.3 * np.sin(phase(glide(6, 30, cd)))
    x = buf(d)
    add(x, (sine(f, cd) + 0.35 * sine(f * 2, cd) + 0.1 * saw(f, cd, 8)) * trem * env_adsr(cd, 0.1, 0.1, 0.9, 0.03), 0.0)
    add(x, click(r) * 2, 1.06)
    return x


@sound
def gas(r):
    # Gas: Ventil quietscht, dann zischt das Leck
    d = 1.55
    x = buf(d)
    add(x, sat(sine(glide(1300, 1700, 0.08), 0.08), 2) * env_adsr(0.08, 0.01, 0.02, 0.8, 0.02), 0.0, 0.3)
    hd = 1.45
    h = bp(noise(hd, r), 5000, 0.9) * (0.8 + 0.2 * np.sin(2 * np.pi * 3 * tt(hd)))
    add(x, h * env_adsr(hd, 0.05, 0.1, 0.8, 0.7), 0.08)
    return x


@sound
def chains(r):
    # Ketten: Fahrradschloss-Kette rasselt
    d = 0.65
    x = buf(d)
    t = 0.0
    while t < 0.45:
        add(x, metal(r.uniform(2500, 5500), 0.08, r, 0.02), t, r.uniform(0.3, 1.0))
        t += r.exponential(0.022)
    return x


@sound
def scan(r):
    # Scannen: Barcode-Scanner piept, dann tastet ein Sonar-Sweep den Raum ab
    d = 1.7
    x = buf(d)
    add(x, beep(2600, 0.1, 5000, 'sine'), 0.0, 0.5)
    sd = 1.1
    sw = (sine(glide(250, 900, sd), sd) + 0.3 * sine(glide(500, 1800, sd), sd)) * env_adsr(sd, 0.2, 0.2, 0.7, 0.4)
    add(x, sw, 0.18, 0.8)
    return echo(x, 0.18, 0.3, 2, 2000)[:N(d)]


@sound
def sheep(r):
    # Schaf: ein blökendes "Määäh" (Kiez-Ziege aus dem Streichelzoo)
    d = 0.52
    f = glide(420, 360, d) * (1 + 0.006 * np.sin(2 * np.pi * 6 * tt(d)))
    src = glottal(f, d, r) * (0.65 + 0.35 * np.sin(2 * np.pi * 24 * tt(d)))
    return formant(src, vowel('ae')) * env_adsr(d, 0.03, 0.1, 0.8, 0.15)


@sound
def mine(r):
    # Abbau: Spitzhacke auf Beton, Bröckeln
    d = 0.8
    x = metal(880, d, r, 0.12) + 0.6 * bp(noise(d, r) * env_exp(d, 0.006), 3000, 1.0)
    x += 0.6 * lp(noise(d, r) * env_exp(d, 0.03), 800)
    add(x, grains(0.6, r, 250, 600, 4000, glen=(0.003, 0.01), density_env=lambda u: np.exp(-3 * u)), 0.05, 0.6)
    return x


@sound
def badge(r):
    # Erfolg: der Pfandautomat rattert und sagt "Dan-ke" (Roboterstimme)
    d = 1.0
    x = buf(d)
    t = 0.0
    while t < 0.18:
        add(x, glass(r.uniform(1200, 1800), 0.1, r, 0.03), t, 0.2)
        t += 0.03
    a = 0.26
    src = glottal(glide(150, 140, a), a, r, 0.0)
    va = formant(src, vowel('a')) * env_adsr(a, 0.02, 0.05, 0.9, 0.04)
    # "n": nasaler Übergang
    nd = 0.06
    vn = formant(glottal(140, nd, r, 0.0), [(250, 5, 1.0), (2200, 10, 0.1)]) * env_adsr(nd, 0.005, 0.01, 0.8, 0.02)
    kd = 0.03
    k = bp(noise(kd, r) * env_exp(kd, 0.006), 2200, 1.5)
    e = 0.3
    ve = formant(glottal(glide(135, 110, e), e, r, 0.0), vowel('e')) * env_adsr(e, 0.02, 0.05, 0.85, 0.12)
    # "d": kurzer Verschluss
    add(x, lp(noise(0.012, r) * env_exp(0.012, 0.003), 3000), 0.22, 0.3)
    add(x, va, 0.23)
    add(x, vn, 0.23 + a - 0.02)
    add(x, k, 0.23 + a + nd + 0.02, 0.8)
    add(x, ve, 0.23 + a + nd + 0.05)
    # 8-Bit-Automatenklang: leicht vergröbert
    x = np.round(x / np.abs(x).max() * 24) / 24
    return lp(x, 5000)


# ---------------------------------------------------------------------------
# Messen, Pegeln, Kodieren
# ---------------------------------------------------------------------------

def kweight(x, sr):
    x = sosfilt(butter(2, 60, 'high', fs=sr, output='sos'), x)
    # Höhenanhebung ~ +4 dB ab ca. 1,5 kHz (RBJ-High-Shelf)
    f0, g = 1500.0, 4.0
    A = 10 ** (g / 40)
    w = 2 * np.pi * f0 / sr
    al = np.sin(w) / 2 * np.sqrt(2)
    c = np.cos(w)
    b = [A * ((A + 1) + (A - 1) * c + 2 * np.sqrt(A) * al), -2 * A * ((A - 1) + (A + 1) * c),
         A * ((A + 1) + (A - 1) * c - 2 * np.sqrt(A) * al)]
    a = [(A + 1) - (A - 1) * c + 2 * np.sqrt(A) * al, 2 * ((A - 1) - (A + 1) * c),
         (A + 1) - (A - 1) * c - 2 * np.sqrt(A) * al]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x)


def loudness(x, sr):
    """Lautheit eines kurzen Effekts: K-gewichtete Energie der aktiven 20-ms-Frames
    (Frames höchstens 20 dB unter dem lautesten Frame). Einheit dB (relativ zu Vollaussteuerung)."""
    y = kweight(x, sr)
    fl = int(0.02 * sr)
    n = len(y) // fl
    if n == 0:
        return 20 * np.log10(np.sqrt((y ** 2).mean()) + 1e-12)
    e = (y[:n * fl].reshape(n, fl) ** 2).mean(1)
    act = e[e >= e.max() * 0.01]
    return 10 * np.log10(act.mean() + 1e-12)


def centroid(x, sr):
    X = np.abs(np.fft.rfft(x))
    f = np.fft.rfftfreq(len(x), 1 / sr)
    return float((X * f).sum() / (X.sum() + 1e-12))


def band_profile(x, sr):
    """24 log-Bänder (80 Hz-12 kHz), mittlere dB, zur Unterscheidbarkeitsprüfung."""
    X = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    f = np.fft.rfftfreq(len(x), 1 / sr)
    edges = np.geomspace(80, 12000, 25)
    v = np.array([X[(f >= edges[i]) & (f < edges[i + 1])].sum() + 1e-12 for i in range(24)])
    v = 10 * np.log10(v / v.sum())
    return v


def read_audio(path):
    import soundfile as sf
    d, sr = sf.read(path, always_2d=True)
    return d.mean(1), sr


def measure(path):
    x, sr = read_audio(path)
    pk = 20 * np.log10(np.abs(x).max() + 1e-12)
    return dict(dur=len(x) / sr, loud=loudness(x, sr), peak=pk, cent=centroid(x, sr), sr=sr)


def encode_mp3(x, path, bitrate=BITRATE):
    import lameenc
    enc = lameenc.Encoder()
    enc.set_bit_rate(bitrate)
    enc.set_in_sample_rate(SR)
    enc.set_channels(1)
    enc.set_quality(2)
    pcm = np.clip(np.round(x * 32767), -32768, 32767).astype('<i2').tobytes()
    data = enc.encode(pcm) + enc.flush()
    with open(path, 'wb') as fh:
        fh.write(bytes(data))


def level(x, target, name):
    """Auf Ziel-Lautheit bringen; wenn der Peak zu hoch wird, weich begrenzen."""
    x = x - x.mean()
    x = x / (np.abs(x).max() + 1e-12) * 0.5
    for _ in range(6):
        g = db(target - loudness(x, SR))
        x = x * g
        pk = np.abs(x).max()
        lim = db(PEAK_MAX_DB)
        if pk > lim:
            # weicher Limiter: nur die Spitzen werden gestaucht
            thr = lim * 0.7
            over = np.abs(x) > thr
            y = x.copy()
            y[over] = np.sign(x[over]) * (thr + (lim - thr) * np.tanh((np.abs(x[over]) - thr) / (lim - thr)))
            x = y
        if abs(loudness(x, SR) - target) < 0.2:
            break
    return x


def build(name, rng_seed_base=0x4E4B):
    seed = zlib.crc32(('sfx/' + name).encode()) ^ rng_seed_base
    r = np.random.default_rng(seed)
    x = np.asarray(S[name](r), float)
    x = hp(x, 35)
    x = trim(x)
    ref = REF[name]
    # Dauer begrenzen: höchstens 15 % bzw. 0,15 s länger als das Original,
    # ein längerer Hallschwanz wird über das letzte Viertel ausgeblendet.
    cap = N(max(ref[0] * 1.15, ref[0] + 0.15))
    if len(x) > cap:
        x = x[:cap].copy()
        f = cap // 4
        x[-f:] *= np.linspace(1, 0, f) ** 2
    return level(x, ref[1], name)


def encode_leveled(name, x, path):
    """Kodieren und am dekodierten MP3 nachmessen: Lautheit auf +-0,2 dB an die
    Referenz, dekodierter Peak höchstens -1 dBFS."""
    target = REF[name][1]
    br = HQ_BITRATE if name in HQ else BITRATE
    encode_mp3(x, path, br)
    for _ in range(6):
        m = measure(path)
        corr = min(target - m['loud'], -1.05 - m['peak'])
        if abs(corr) < 0.2 and m['peak'] <= -1.0:
            break
        x = x * db(corr)
        encode_mp3(x, path, br)
    return x


_REF_TEXT = """
alert 2.482 -15.32 -1.3
atk_crossbow 0.406 -17.87 -3.4
atk_spiritbow 0.414 -18.49 -4.0
badge 0.993 -30.70 -16.6
beacon 0.888 -23.30 -9.3
bee 1.097 -31.65 -18.3
blast 1.045 -11.91 -0.2
bones 0.862 -26.21 -4.1
boss 3.344 -18.97 -5.3
burning 0.784 -26.97 -12.9
chains 0.675 -20.36 -7.2
challenge 3.600 -13.17 -0.4
chargeup 1.193 -21.39 -8.0
charms 0.705 -24.12 -9.0
click 0.104 -24.72 -15.4
cursed 0.552 -14.83 -3.6
death 2.088 -20.01 -4.6
debuff 1.176 -23.12 -10.4
degrade 2.090 -19.94 -6.5
descend 4.824 -20.35 -3.0
dewdrop 0.481 -19.34 -13.9
door_open 0.392 -34.19 -13.4
drink 0.601 -29.11 -11.9
eat 0.888 -33.13 -16.1
evoke 0.912 -11.87 1.0
falling 1.411 -16.61 -4.5
gas 1.590 -21.19 -7.4
ghost 2.064 -21.94 -8.8
gold 0.287 -17.86 -6.2
grass 0.177 -32.18 -19.1
health_critical 1.019 -13.28 -2.9
health_warn 0.875 -16.43 -4.5
hit 0.299 -15.22 -3.8
hit_arrow 0.365 -17.12 -3.3
hit_crush 0.335 -15.60 -3.0
hit_magic 0.539 -16.11 -3.0
hit_parry 0.441 -13.31 -1.8
hit_slash 0.306 -14.38 -2.7
hit_stab 0.248 -14.58 -2.5
hit_strong 0.671 -18.58 -5.3
item 0.462 -19.69 -13.9
levelup 1.512 -17.77 -4.2
lightning 0.418 -23.79 -3.8
lullaby 1.920 -19.73 -8.0
mastery 0.705 -14.90 -0.2
meld 0.522 -25.31 -14.1
mimic 0.888 -12.04 0.5
mine 0.816 -20.32 -1.1
miss 0.418 -25.82 -0.4
plant 0.261 -39.20 -22.4
puff 0.444 -20.15 -6.3
ray 1.097 -17.73 -0.1
read 0.418 -22.97 -10.7
rocks 1.296 -18.47 -0.4
scan 1.909 -17.77 -6.4
secret 1.776 -23.20 -11.0
shatter 0.549 -12.01 -0.4
sheep 0.529 -23.37 -11.8
step 0.183 -22.59 -7.1
sturdy 0.154 -22.02 -11.9
teleport 1.306 -22.06 -12.0
tomb 0.287 -20.44 -6.0
trample 0.212 -28.78 -13.7
trap 0.131 -17.04 -2.7
unlock 0.549 -29.88 -12.1
water 0.209 -31.67 -15.5
zap 0.705 -21.06 -4.8
"""
for _line in _REF_TEXT.strip().splitlines():
    _n, _d, _l, _p = _line.split()
    REF[_n] = (float(_d), float(_l), float(_p))


# levelup separat definiert (braucht bell)
@sound
def levelup(r):
    # Stufenaufstieg: die Türklingel vom Späti, "Ding-Ding-Dong" aufwärts
    x = buf(1.6)
    for k, f in enumerate((659.3, 784.0, 1046.5)):
        add(x, bell(f, 1.3, r, 0.6 if k < 2 else 0.9), k * 0.16, 0.8 if k < 2 else 1.0)
    return reverb(x, 0.9, 0.2, rng=r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--out', default=SOUND_DIR)
    ap.add_argument('--wav', action='store_true', help='zusätzlich WAV (16 bit) schreiben')
    ap.add_argument('--measure', default='', help='nur die MP3s in DIR messen und REF-Zeilen ausgeben')
    a = ap.parse_args()

    if a.measure:
        for f in sorted(os.listdir(a.measure)):
            if f.endswith('.mp3'):
                m = measure(os.path.join(a.measure, f))
                print(f"{f[:-4]} {m['dur']:.3f} {m['loud']:.2f} {m['peak']:.1f}")
        return

    names = sorted(S) if not a.only else a.only.split(',')
    missing = sorted(set(REF) - set(S))
    if missing:
        sys.exit('Keine Synthese für: ' + ', '.join(missing))
    os.makedirs(a.out, exist_ok=True)
    print(f"{'Sound':16s} {'Dauer':>6s} {'(alt)':>6s} {'Laut':>6s} {'(alt)':>6s} {'Peak':>6s} {'Hz':>6s} {'KB':>5s}")
    for n in names:
        x = build(n)
        path = os.path.join(a.out, n + '.mp3')
        x = encode_leveled(n, x, path)
        if a.wav:
            import soundfile as sf
            sf.write(os.path.join(a.out, n + '.wav'), x, SR, subtype='PCM_16')
        m = measure(path)
        ref = REF[n]
        print(f"{n:16s} {m['dur']:6.2f} {ref[0]:6.2f} {m['loud']:6.1f} {ref[1]:6.1f} {m['peak']:6.1f} {m['cent']:6.0f} {os.path.getsize(path) / 1024:5.1f}")


if __name__ == '__main__':
    main()
