#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Neukölln Pixel Dungeon - prozeduraler Kiez-Techno-Soundtrack.

Erzeugt alle 31 Musikdateien (core/src/main/assets/music/*.ogg) rein per
Synthese mit numpy/scipy: keine Samples, keine Downloads, keine Zitate
bekannter Tracks. Deterministisch (fester Seed pro Track aus CRC32 des Namens).

Aufruf (aus dem Repo-Wurzelverzeichnis):
    python3 tools/generate-kiez-music.py                 # alle Tracks
    python3 tools/generate-kiez-music.py --only sewers_1 # einzelne Tracks
    python3 tools/generate-kiez-music.py --report DIR    # zusätzlich Metriken + PNGs

Abhängigkeiten: pip install --user numpy scipy soundfile [matplotlib]
Details: docs/NEUKOELLN-AUDIO.md
"""
import argparse
import json
import os
import sys
import zlib
from multiprocessing import Pool

import numpy as np
from scipy.signal import fftconvolve, lfilter
import soundfile as sf

SR = 44100
MASTER_SEED = 0x4E4B  # "NK"
XFADE = int(0.06 * SR)  # Crossfade für kontinuierliche Generatoren an der Loop-Naht
VORBIS_LEVEL = 0.9      # soundfile compression_level (0 = beste Qualität, 1 = kleinste Datei)

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MUSIC_DIR = os.path.join(REPO, 'core', 'src', 'main', 'assets', 'music')

# ---------------------------------------------------------------------------
# Grundlagen
# ---------------------------------------------------------------------------

_NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}


def nm(name):
    """'F#2' -> MIDI-Nummer."""
    s = 1 if name[1:2] == '#' else (-1 if name[1:2] == 'b' else 0)
    octave = int(name[2:] if s else name[1:])
    return 12 * (octave + 1) + _NOTE[name[0]] + s


def mtof(m):
    return 440.0 * 2.0 ** ((np.asarray(m, float) - 69.0) / 12.0)


def tarr(n):
    return np.arange(n) / SR


def rng_for(*keys):
    h = zlib.crc32('/'.join(str(k) for k in keys).encode('utf-8'))
    return np.random.default_rng((h ^ MASTER_SEED) & 0xFFFFFFFF)


# ---------------------------------------------------------------------------
# Filter
# ---------------------------------------------------------------------------

def rbj(kind, fc, q=0.707):
    fc = np.clip(fc, 10.0, 0.45 * SR)
    w0 = 2 * np.pi * fc / SR
    c, s = np.cos(w0), np.sin(w0)
    al = s / (2 * q)
    if kind == 'lp':
        b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
    elif kind == 'hp':
        b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
    elif kind == 'bp':
        b = [al, 0 * c, -al]
    else:
        raise ValueError(kind)
    a = [1 + al, -2 * c, 1 - al]
    b = np.array(b, float)
    a = np.array(a, float)
    return b / a[0], a / a[0]


def filt(x, kind, fc, q=0.707):
    b, a = rbj(kind, fc, q)
    return lfilter(b, a, x, axis=-1)


def cfilt(x, kind, fc, q=0.707, pad=None):
    """Zirkulär (loop-nahtlos) filtern: Ende als Vorlauf voranstellen."""
    n = x.shape[-1]
    pad = min(n, pad or SR)
    ext = np.concatenate([x[..., -pad:], x], axis=-1)
    return filt(ext, kind, fc, q)[..., pad:]


def tv_filter(x, fc, q=0.707, kind='lp', block=64):
    """Zeitvariables Biquad (mono), Koeffizienten blockweise."""
    n = len(x)
    fcb = np.asarray(fc, float)
    if fcb.ndim == 0:
        return filt(x, kind, float(fcb), q)
    fcb = fcb[::block]
    fcb = np.clip(fcb, 20.0, 0.45 * SR)
    w0 = 2 * np.pi * fcb / SR
    c, s = np.cos(w0), np.sin(w0)
    al = s / (2 * q)
    a0 = 1 + al
    if kind == 'lp':
        B = np.stack([(1 - c) / 2, 1 - c, (1 - c) / 2], 1) / a0[:, None]
    else:
        B = np.stack([(1 + c) / 2, -(1 + c), (1 + c) / 2], 1) / a0[:, None]
    A = np.stack([a0, -2 * c, 1 - al], 1) / a0[:, None]
    y = np.empty(n)
    zi = np.zeros(2)
    for i in range(len(fcb)):
        s0 = i * block
        y[s0:s0 + block], zi = lfilter(B[i], A[i], x[s0:s0 + block], zi=zi)
    return y


def tv_filter_circ(x, fc, q=0.707, kind='lp', block=256):
    """Zeitvariabler Filter auf Stereo-Bus, loop-nahtlos."""
    n = x.shape[-1]
    pad = SR
    fce = np.concatenate([fc[-pad:], fc])
    out = np.empty_like(x)
    for ch in range(x.shape[0]):
        ext = np.concatenate([x[ch, -pad:], x[ch]])
        out[ch] = tv_filter(ext, fce, q, kind, block)[pad:]
    return out


# ---------------------------------------------------------------------------
# Oszillatoren und Hüllkurven
# ---------------------------------------------------------------------------

def _blep(t, dt):
    y = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    y[m] = x + x - x * x - 1.0
    m = t > 1.0 - dt
    x = (t[m] - 1.0) / dt[m]
    y[m] = x * x + x + x + 1.0
    return y


def _freq(f, n):
    f = np.asarray(f, float)
    return np.full(n, float(f)) if f.ndim == 0 else f[:n]


def saw(f, n, ph0=0.0):
    f = _freq(f, n)
    ph = ph0 + np.cumsum(f) / SR
    t = ph % 1.0
    dt = np.maximum(f / SR, 1e-6)
    return 2 * t - 1 - _blep(t, dt)


def square(f, n, ph0=0.0):
    return 0.5 * (saw(f, n, ph0) - saw(f, n, ph0 + 0.5))


def sine(f, n, ph0=0.0):
    f = _freq(f, n)
    return np.sin(2 * np.pi * (ph0 + np.cumsum(f) / SR))


def env_ad(n, a, d):
    t = tarr(n)
    att = np.clip(t / a, 0, 1) if a > 0 else 1.0
    return att * np.exp(-t / d)


def env_asr(n, a, hold, r):
    t = tarr(n)
    up = 0.5 - 0.5 * np.cos(np.pi * np.clip(t / a, 0, 1))
    dn = 0.5 + 0.5 * np.cos(np.pi * np.clip((t - hold) / r, 0, 1))
    return up * dn


def fade_edges(x, fin=0.001, fout=0.01):
    n = x.shape[-1]
    a = min(n, int(fin * SR))
    b = min(n, int(fout * SR))
    if a > 0:
        x[..., :a] *= np.linspace(0, 1, a)
    if b > 0:
        x[..., n - b:] *= np.linspace(1, 0, b)
    return x


def norm(x, peak=1.0):
    m = np.max(np.abs(x))
    return x * (peak / m) if m > 0 else x


def sat(x, drive):
    return np.tanh(drive * x) / np.tanh(drive)


# ---------------------------------------------------------------------------
# Instrumente (alle synthetisch)
# ---------------------------------------------------------------------------

def kick(rng, f0=48, fstart=150, decay=0.34, hard=0.0, dull=0.5):
    n = int(0.55 * SR)
    t = tarr(n)
    f = f0 + (fstart - f0) * np.exp(-t / 0.032) + 180 * np.exp(-t / 0.004) * hard
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    click = filt(rng.standard_normal(n) * np.exp(-t / 0.0025), 'lp', 3200 - 1800 * dull)
    x = body + (0.22 + 0.25 * hard) * (1 - 0.6 * dull) * click
    if hard > 0:
        x = sat(x, 1 + 3.5 * hard)
    return norm(fade_edges(x, 0.0006, 0.04))


def hat(rng, open_=False, tone=0.0):
    n = int((0.32 if open_ else 0.07) * SR)
    t = tarr(n)
    metal = sum(square(f * (1 + 0.15 * tone), n, rng.random()) for f in (205.3, 304.4, 369.6, 522.7, 540.0, 800.0))
    src = 0.65 * rng.standard_normal(n) + 0.35 * metal / 3
    src = filt(filt(src, 'hp', 5200), 'lp', 8800)
    x = src * env_ad(n, 0.0004, 0.11 if open_ else 0.022)
    return norm(fade_edges(x, 0.0004, 0.01))


def clap(rng, fc=1400):
    n = int(0.32 * SR)
    t = tarr(n)
    e = np.zeros(n)
    for k, d in enumerate((0.0, 0.010, 0.021)):
        e += (t >= d) * np.exp(-np.maximum(t - d, 0) / 0.0045) * (0.8 + 0.1 * k)
    e += (t >= 0.028) * np.exp(-np.maximum(t - 0.028, 0) / 0.09) * 0.7
    x = filt(filt(rng.standard_normal(n), 'bp', fc, 1.1), 'lp', 6500) * e
    return norm(fade_edges(x, 0.0005, 0.02))


def snare(rng, tone=185, bright=3200):
    n = int(0.3 * SR)
    t = tarr(n)
    body = sine(tone * (1 + 0.25 * np.exp(-t / 0.01)), n) * np.exp(-t / 0.055)
    nz = filt(filt(rng.standard_normal(n), 'bp', bright, 0.7), 'lp', 7000) * np.exp(-t / 0.1)
    return norm(fade_edges(0.55 * body + 0.8 * nz, 0.0005, 0.02))


def tom(rng, f):
    n = int(0.4 * SR)
    t = tarr(n)
    x = sine(f * (1 + 0.6 * np.exp(-t / 0.018)), n) * np.exp(-t / 0.16)
    x += 0.15 * filt(rng.standard_normal(n), 'bp', f * 4, 1.5) * np.exp(-t / 0.02)
    return norm(fade_edges(x, 0.0008, 0.03))


def rim(rng, f=820):
    n = int(0.08 * SR)
    t = tarr(n)
    x = sine(f, n) * np.exp(-t / 0.012) + 0.4 * filt(rng.standard_normal(n), 'bp', 1900, 2) * np.exp(-t / 0.006)
    return norm(fade_edges(x, 0.0004, 0.01))


def drip(rng, f0):
    """Wassertropfen: Sinus mit schnellem Tonhöhenanstieg."""
    n = int(0.12 * SR)
    t = tarr(n)
    f = f0 * (1 + 1.6 * np.clip(t / 0.028, 0, 1))
    x = sine(f, n) * env_ad(n, 0.0015, 0.03)
    return norm(fade_edges(x, 0.001, 0.02))


def clink(rng, f0):
    """Flaschenklirren-artiger Metallperk: inharmonische Teiltöne."""
    n = int(0.7 * SR)
    t = tarr(n)
    x = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 0.45), (2.32, 0.45, 0.22), (4.25, 0.18, 0.1), (6.1, 0.06, 0.05)):
        x += a * sine(f0 * r * (1 + 0.002 * rng.standard_normal()), n, rng.random()) * np.exp(-t / d)
    x += 0.2 * filt(rng.standard_normal(n), 'bp', 2500, 1.5) * np.exp(-t / 0.004)
    return norm(fade_edges(x, 0.0008, 0.05))


def bell(rng, f0, decay=1.6, partials=((1.0, 1.0, 1.0), (2.0, 0.32, 0.6), (3.01, 0.14, 0.35), (4.17, 0.07, 0.2)),
         detune_cents=0.0):
    n = int((decay * 2.2) * SR)
    t = tarr(n)
    f0 = f0 * 2 ** (detune_cents / 1200)
    x = np.zeros(n)
    for r, a, d in partials:
        x += a * sine(f0 * r, n, rng.random()) * np.exp(-t / (decay * d))
    x *= np.clip(t / 0.004, 0, 1)
    return norm(fade_edges(x, 0.001, 0.2))


def stamp(rng):
    """Behördenstempel: Rumms + Klick + Papier."""
    n = int(0.25 * SR)
    t = tarr(n)
    x = sine(62 + 70 * np.exp(-t / 0.012), n) * np.exp(-t / 0.05)
    x += 0.35 * filt(rng.standard_normal(n), 'bp', 1800, 1.2) * np.exp(-t / 0.007)
    x += 0.15 * filt(rng.standard_normal(n), 'lp', 2500) * np.exp(-t / 0.03)
    return norm(fade_edges(x, 0.0005, 0.02))


def tick(rng):
    n = int(0.03 * SR)
    t = tarr(n)
    x = filt(rng.standard_normal(n), 'bp', 3000 + 800 * rng.random(), 3) * np.exp(-t / 0.004)
    return norm(fade_edges(x, 0.0003, 0.005))


def jackhammer(rng, dur, rate):
    """Presslufthammer-artige Salve: schnelle, metallisch-dumpfe Schläge."""
    n = int((dur + 0.1) * SR)
    x = np.zeros(n)
    hl = int(0.05 * SR)
    th = tarr(hl)
    hits = int(dur * rate)
    for k in range(hits):
        h = 0.8 * filt(rng.standard_normal(hl), 'bp', 900, 1.3) * np.exp(-th / 0.009)
        h += 0.6 * sine(150, hl) * np.exp(-th / 0.012)
        h += 0.25 * filt(rng.standard_normal(hl), 'bp', 2300, 8) * np.exp(-th / 0.02)
        p = int(k * SR / rate)
        x[p:p + hl] += h * (0.75 + 0.25 * rng.random())
    return norm(fade_edges(x, 0.001, 0.04))


def clank(rng, f0):
    """Angeschlagener Stahlträger."""
    n = int(0.9 * SR)
    t = tarr(n)
    x = np.zeros(n)
    for r, a, d in ((1.0, 1.0, 0.35), (2.71, 0.6, 0.2), (5.13, 0.3, 0.1), (8.3, 0.1, 0.05)):
        x += a * sine(f0 * r, n, rng.random()) * np.exp(-t / d)
    x += 0.3 * filt(rng.standard_normal(n), 'bp', 1200, 1) * np.exp(-t / 0.006)
    return norm(fade_edges(x, 0.0006, 0.05))


def ubahn(rng, spb, beats):
    """U-Bahn-Rumpeln: tiefes Rauschen, Schienenstöße, leises Singen der Schienen."""
    n = int(beats * spb)
    t = tarr(n)
    ph = np.clip(t / t[-1], 0, 1)
    swell = np.sin(np.pi * ph) ** 2
    brown = np.cumsum(rng.standard_normal(n))
    brown = filt(filt(brown, 'hp', 25), 'lp', 110)
    brown = brown / (np.std(brown) + 1e-9)
    x = 0.5 * brown * swell
    whine = sine(260 + 25 * ph, n) * 0.04 * swell
    x += filt(whine, 'lp', 800)
    ln = int(0.25 * SR)
    tl = tarr(ln)
    thump = sine(68, ln) * np.exp(-tl / 0.05)
    for b in np.arange(0.5, beats - 1, 2.0):
        for off in (0.0, 0.2):
            p = int((b + off) * spb)
            g = swell[min(p, n - 1)]
            x[p:p + ln] += 0.6 * g * thump[:max(0, min(ln, n - p))]
    return fade_edges(x, 0.05, 0.3)


def pad_voice(rng, freqs, dur, cutoff=1100, att=0.6, rel=0.9, detune=(-9, 0, 7), q=0.8):
    n = int((dur + rel + 0.05) * SR)
    x = np.zeros(n)
    for f in np.atleast_1d(freqs):
        for c in detune:
            x += saw(f * 2 ** (c / 1200), n, rng.random())
    x = filt(filt(x, 'lp', cutoff, q), 'lp', cutoff * 1.4)
    x *= env_asr(n, att, dur, rel)
    return norm(x)


def stab(rng, freqs, cutoff=900, decay=0.16):
    n = int(0.6 * SR)
    x = np.zeros(n)
    for f in freqs:
        x += saw(f * 1.003, n, rng.random()) + 0.6 * square(f * 0.997, n, rng.random())
    x = filt(filt(x, 'lp', cutoff, 1.2), 'lp', cutoff * 1.5)
    x *= env_ad(n, 0.003, decay)
    return norm(fade_edges(x, 0.002, 0.05))


def bassnote(rng, f, dur, cutoff=260, drive=1.2, att=0.004):
    n = int((dur + 0.06) * SR)
    x = sine(f, n) + 0.35 * saw(f, n)
    x = filt(x, 'lp', cutoff, 0.9)
    x = sat(x, drive) * env_asr(n, att, dur, 0.05)
    return norm(x)


def organ(rng, f, dur, drive=2.5, cutoff=3200):
    n = int((dur + 0.12) * SR)
    t = tarr(n)
    x = np.zeros(n)
    for r, a in ((0.5, 0.6), (1, 1.0), (1.5, 0.4), (2, 0.6), (3, 0.3), (4, 0.25), (6, 0.1), (8, 0.06)):
        if f * r < 7000:
            x += a * sine(f * r * (1 + 0.0015 * np.sin(2 * np.pi * 5.8 * t)), n, rng.random())
    x *= 1 + 0.12 * np.sin(2 * np.pi * 6.3 * t)
    x = filt(sat(x / 2.0, drive), 'lp', cutoff)
    return norm(x * env_asr(n, 0.008, dur, 0.1))


def epiano(rng, f, dur, vel=0.8):
    n = int((dur + 0.4) * SR)
    t = tarr(n)
    idx = 1.6 * vel * np.exp(-t / 0.22) + 0.25
    mod = idx * sine(f, n)
    car = np.sin(2 * np.pi * np.cumsum(np.full(n, f)) / SR + mod)
    x = car * np.exp(-t / 1.4) * (1 + 0.06 * np.sin(2 * np.pi * 4.5 * t))
    x += 0.12 * sine(2 * f, n) * np.exp(-t / 0.4)
    x *= env_asr(n, 0.002, dur, 0.3)
    return norm(x)


def hum(rng, f, dur):
    """Spätileuchte-Summen: gesummte Stimme mit spätem Vibrato und Neon-Anteil."""
    n = int((dur + 0.25) * SR)
    t = tarr(n)
    vib = 1 + 0.007 * np.sin(2 * np.pi * 5.2 * t) * np.clip((t - 0.25) / 0.4, 0, 1)
    fr = f * vib
    x = sine(fr, n) + 0.32 * sine(2 * fr, n) + 0.12 * sine(3 * fr, n)
    x += 0.08 * filt(square(fr / 2, n), 'lp', 900)
    x = filt(x, 'lp', 2200)
    return norm(x * env_asr(n, 0.07, dur, 0.18))


# ---------------------------------------------------------------------------
# Track-Gerüst
# ---------------------------------------------------------------------------

def pan_gains(p):
    a = (p + 1) * np.pi / 4
    return np.cos(a) * np.sqrt(2), np.sin(a) * np.sqrt(2)


class Track:
    def __init__(self, name, bpm, bars):
        self.name, self.bpm, self.bars = name, bpm, bars
        self.spb = 60.0 / bpm * SR
        self.L = int(round(bars * 4 * self.spb))
        self.buses = {}
        self.kicks = []
        self.rng = rng_for(name)

    def bus(self, name):
        if name not in self.buses:
            self.buses[name] = np.zeros((2, self.L))
        return self.buses[name]

    def pos(self, beat):
        return int(round(beat * self.spb)) % self.L

    def place(self, bus, snip, beat, gain=1.0, pan=0.0, rev=0.0, dly=0.0):
        if snip.ndim == 1:
            gl, gr = pan_gains(pan)
            st = np.stack([snip * gl, snip * gr])
        else:
            st = snip
        st = st[:, :self.L] * gain
        p = self.pos(beat)
        for name, g in ((bus, 1.0), ('rev', rev), ('dly', dly)):
            if g <= 0:
                continue
            b = self.bus(name)
            n = st.shape[1]
            end = p + n
            if end <= self.L:
                b[:, p:end] += g * st
            else:
                k = self.L - p
                b[:, p:] += g * st[:, :k]
                b[:, :end - self.L] += g * st[:, k:]

    def kick(self, snip, beat, gain=1.0):
        self.kicks.append(self.pos(beat))
        self.place('kick', snip, beat, gain)

    def continuous(self, bus, render, gain=1.0, pan=0.0, rev=0.0):
        """Kontinuierlichen Generator nahtlos loopen: L+XFADE rendern, Überhang überblenden."""
        x = render(self.L + XFADE)
        w = np.linspace(0, 1, XFADE)
        head = x[..., :XFADE] * w + x[..., self.L:self.L + XFADE] * (1 - w)
        y = np.concatenate([head, x[..., XFADE:self.L]], axis=-1)
        self.place(bus, y, 0, gain, pan, rev)


def fit(arr, bars):
    """Arrangement auf Taktzahl kürzen: vorletzte 8-Takt-Phrase entfernen (Loop-Ende bleibt gleich)."""
    while len(arr) > bars:
        arr = arr[:len(arr) - 16] + arr[len(arr) - 8:]
    assert len(arr) == bars, (len(arr), bars)
    return arr


def arrangement(spec):
    out = []
    for nbars, flags in spec:
        out += [set(flags.split())] * nbars
    return out


# ---------------------------------------------------------------------------
# Effekte und Mix
# ---------------------------------------------------------------------------

def make_ir(rng, rt60, damp, predelay=0.02, width=1.0):
    n = int(min(rt60 * 1.3, 6.0) * SR)
    t = tarr(n)
    nz = rng.standard_normal((2, n))
    nz[1] = width * nz[1] + (1 - width) * nz[0]
    ir = filt(filt(nz, 'lp', damp), 'hp', 180) * 10 ** (-3 * t / rt60)
    ir *= np.clip(t / 0.008, 0, 1)
    pd = int(predelay * SR)
    ir = np.concatenate([np.zeros((2, pd)), ir], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2, axis=1, keepdims=True))


def circ_conv(x, h):
    """Zirkuläre Faltung (Loop-nahtlos): lineare FFT-Faltung, Überhang auf den Anfang falten."""
    L = x.shape[-1]
    h = np.broadcast_to(h, (x.shape[0], h.shape[-1]))
    y = np.stack([fftconvolve(x[c], h[c]) for c in range(x.shape[0])])
    out = y[:, :L].copy()
    tail = y[:, L:]
    out[:, :tail.shape[1]] += tail
    return out


def delay(tr, x, beats, fb=0.5, damp=2500, taps=6, pingpong=True):
    d = int(round(beats * tr.spb))
    y = np.zeros_like(x)
    cur = cfilt(x, 'hp', 200, pad=8192)
    g = 1.0
    for k in range(1, taps + 1):
        cur = cfilt(cur, 'lp', damp, pad=4096)
        g *= fb if k > 1 else 0.8
        tap = np.roll(cur, d * k, axis=-1) * g
        if pingpong and k % 2 == 1:
            tap = tap[::-1]
        y += tap
    return y


def duck_env(tr, depth=0.5, release_beats=0.45):
    imp = np.zeros(tr.L)
    for p in tr.kicks:
        imp[p] = 1.0
    kl = int(release_beats * tr.spb)
    t = np.linspace(0, 1, kl)
    ker = (1 - t) ** 2
    ker[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    c = circ_conv(imp[None, :], ker[None, :])[0]
    return 1 - depth * np.clip(c, 0, 1)


def loudness_db(x):
    """Grobe K-Gewichtung: Hochpass 60 Hz + Höhenanhebung, dann RMS."""
    y = filt(x, 'hp', 60)
    y = y + 0.6 * filt(y, 'hp', 1500)
    return 10 * np.log10(np.mean(y ** 2) + 1e-20)


def soft_limit(x, thr=0.6, ceil=0.84):
    a = np.abs(x)
    over = a > thr
    y = x.copy()
    y[over] = np.sign(x[over]) * (thr + (ceil - thr) * np.tanh((a[over] - thr) / (ceil - thr)))
    return y


BALANCE = dict(kick=2.0, bass=-1.0, drums=-6.5, fx=-9.0, rumble=-4.0)


def finalize(tr, target_lufs=-26.0, rev_rt=2.2, rev_damp=3500, rev_width=1.0, dly_beats=0.75, dly_fb=0.45,
             dly_damp=2600, duck=0.45, music_cut=None, music_q=0.707, balance=None):
    """Effekte, Sidechain, Bus-Balance relativ zur Musik, Master (Filter, RMS/Lautheit, Limiter)."""
    zero = np.zeros((2, tr.L))
    dl = delay(tr, tr.buses['dly'], dly_beats, dly_fb, dly_damp) if 'dly' in tr.buses else zero
    rsend = tr.buses.get('rev', zero) + 0.35 * dl
    rv = circ_conv(rsend, make_ir(rng_for(tr.name, 'ir'), rev_rt, rev_damp, width=rev_width))
    de = duck_env(tr, duck) if tr.kicks else np.ones(tr.L)
    music = tr.buses.get('music', zero) + dl + rv
    if music_cut is not None:
        music = tv_filter_circ(music, music_cut, music_q)
    ref = loudness_db(music)
    bal = dict(BALANCE)
    bal.update(balance or {})
    g = {}
    for k, off in bal.items():
        if k in tr.buses and np.any(tr.buses[k]):
            g[k] = 10 ** ((ref + off - loudness_db(tr.buses[k])) / 20)
        else:
            g[k] = 0.0
    parts = dict(kick=g['kick'] * tr.buses.get('kick', zero),
                 drums=g['drums'] * tr.buses.get('drums', zero),
                 bass=g['bass'] * tr.buses.get('bass', zero) * de,
                 music=music * (0.35 + 0.65 * de),
                 fx=g['fx'] * tr.buses.get('fx', zero) * (0.6 + 0.4 * de),
                 rumble=g['rumble'] * tr.buses.get('rumble', zero) * de,
                 amb=tr.buses.get('amb', zero))
    mix = sum(parts.values())
    if os.environ.get('KIEZ_DEBUG'):
        print(tr.name, ' '.join('%s=%.1f' % (k, loudness_db(v)) for k, v in parts.items() if np.any(v)))
    mix = cfilt(mix, 'hp', 28)
    mix = cfilt(mix, 'lp', 10500, 0.6)  # keine schrillen Höhen
    for _ in range(3):
        mix *= 10 ** ((target_lufs - loudness_db(mix)) / 20)
        mix = soft_limit(mix)
    mix *= 10 ** ((target_lufs - loudness_db(mix)) / 20)
    pk = np.max(np.abs(mix))
    if pk > 0.84:
        mix *= 0.84 / pk
    return mix


# ---------------------------------------------------------------------------
# Muster-Bausteine
# ---------------------------------------------------------------------------

MINOR = [0, 2, 3, 5, 7, 8, 10]
PHRYG = [0, 1, 3, 5, 7, 8, 10]


class Kit:
    def __init__(self, rng, kick_kw=None, hat_tone=0.0, clap_fc=1400, snare_tone=185):
        self.kick = kick(rng, **(kick_kw or {}))
        self.hc = [hat(rng, False, hat_tone) for _ in range(4)]
        self.ho = hat(rng, True, hat_tone)
        self.clap = clap(rng, clap_fc)
        self.snare = snare(rng, snare_tone)
        self.rim = rim(rng)


HAT_VEL = [0.35, 0.18, 0.55, 0.22]


def drums_bar(tr, kit, b, lay, swing=0.0, kick_gain=1.0, hat_gain=0.22, oh_gain=0.26, clap_gain=0.42,
              pan_hat=0.25, clap_rev=0.12):
    t0 = b * 4
    phrase_end = (b % 8) == 7
    if 'k' in lay:
        for q in range(4):
            if phrase_end and q == 3 and 'fill' in lay:
                continue
            tr.kick(kit.kick, t0 + q, kick_gain)
    if 'oh' in lay:
        for q in range(4):
            tr.place('drums', kit.ho, t0 + q + 0.5, oh_gain, -pan_hat * 0.5, rev=0.05)
    if 'ch' in lay:
        for s in range(16):
            off = swing * 0.25 if s % 2 else 0.0
            h = kit.hc[(s + b) % 4]
            tr.place('drums', h, t0 + s * 0.25 + off, hat_gain * HAT_VEL[s % 4] / 0.55, pan_hat)
    if 'cl' in lay:
        for q in (1, 3):
            tr.place('drums', kit.clap, t0 + q, clap_gain, 0.05, rev=clap_rev)
    if 'rim' in lay:
        for s in (3, 6, 11, 14):
            tr.place('drums', kit.rim, t0 + s * 0.25 + (swing * 0.25 if s % 2 else 0), 0.16, -0.3, rev=0.1)


def snare_roll(tr, kit, start_beat, beats=8, gain=0.35, pan=0.0):
    """Snare-Roll: Dichte 8tel -> 16tel -> 32tel, crescendo."""
    s = 0.0
    while s < beats:
        ph = s / beats
        step = 0.5 if ph < 0.4 else (0.25 if ph < 0.8 else 0.125)
        tr.place('drums', kit.snare, start_beat + s, gain * (0.25 + 0.75 * ph), pan, rev=0.08)
        s += step


def section_ramp(tr, arr, lo, hi, phrase=8, shape=2.0):
    """Filterkurve (Hz) pro Sample: steigt in jeder Phrase von lo nach hi."""
    L = tr.L
    beat = np.arange(L) / tr.spb
    ph = (beat / 4 % phrase) / phrase
    return lo * (hi / lo) ** (ph ** shape)


def lfo_curve(tr, lo, hi, period_bars, phase=0.0):
    beat = np.arange(tr.L) / tr.spb
    v = 0.5 - 0.5 * np.cos(2 * np.pi * (beat / 4 / period_bars + phase))
    return lo * (hi / lo) ** v


def acid_pattern(rng, scale, steps=16, density=0.8, rng_oct=0.2):
    pat = []
    degs = [0, 0, 0, 0, 2, 3, 4, 5, 6, -1]
    for s in range(steps):
        if rng.random() > density and s % 4:
            pat.append(None)
            continue
        d = int(rng.choice(degs))
        semi = (scale[d % 7] + 12 * (d // 7)) if d >= 0 else scale[-1] - 12
        if rng.random() < rng_oct:
            semi += 12
        pat.append(dict(semi=semi, acc=rng.random() < 0.3, slide=rng.random() < 0.18))
    return pat


def acid(tr, bars_on, root, pats, cutoff=420, env_mod=2200, reso=7.0, decay=0.17, drive=2.2,
         cut_mult=None, gain=0.34, pan=0.0, rev=0.08):
    """303-artige Linie mit eigenem Synth: Säge, Resonanzfilter mit Hüllkurve, Akzente, Slides."""
    step = tr.spb / 4
    nsteps = int(np.ceil((tr.L + XFADE) / step)) + 1

    def render(n):
        freq = np.full(n, mtof(root))
        amp = np.zeros(n)
        cut = np.full(n, float(cutoff))
        last = mtof(root)
        for s in range(nsteps):
            b = (s // 16) % tr.bars
            if b not in bars_on:
                continue
            p = pats[(s // 16) % len(pats)][s % 16]
            if p is None:
                continue
            st = int(round(s * step))
            if st >= n:
                break
            nxt = pats[((s + 1) // 16) % len(pats)][(s + 1) % 16]
            legato = p['slide'] and nxt is not None
            ln = int(step * (1.02 if legato else 0.55))
            en = min(n, st + ln)
            m = en - st
            f = mtof(root + p['semi'])
            tt = tarr(m)
            if p['slide'] or legato:
                freq[st:en] = f + (last - f) * np.exp(-tt / 0.035)
            else:
                freq[st:en] = f
            freq[en:min(n, en + int(step))] = f
            last = f
            a = 1.0 if p['acc'] else 0.72
            e = np.clip(tt / 0.002, 0, 1) * (0.85 + 0.15 * np.exp(-tt / 0.1))
            e *= np.clip((m - np.arange(m)) / (0.006 * SR), 0, 1)
            amp[st:en] = np.maximum(amp[st:en], a * e)
            cm = 1.0 if cut_mult is None else cut_mult[st % tr.L]
            cut[st:en] = cutoff * cm + env_mod * (1.6 if p['acc'] else 1.0) * cm * np.exp(-tt / decay)
        osc = saw(freq, n)
        y = tv_filter(osc, cut, reso, block=32)
        y = tv_filter(y, cut * 1.2, 0.6, block=32)
        y = sat(y * amp * 0.9, drive)
        return filt(y, 'hp', 60)

    tr.continuous('music', render, gain, pan, rev)


def active(arr, flag):
    return {i for i, l in enumerate(arr) if flag in l}


# ---------------------------------------------------------------------------
# Regionen
# ---------------------------------------------------------------------------

def neon_buzz(tr, gain=0.035, seed='neon'):
    rng = rng_for(tr.name, seed)

    def render(n):
        t = tarr(n)
        x = filt(saw(100.0, n) + 0.5 * saw(100.3, n), 'lp', 500)
        fl = np.ones(n)
        for _ in range(int(n / SR / 3)):
            p = int(rng.random() * n)
            ln = int((0.05 + 0.25 * rng.random()) * SR)
            e = np.sin(np.linspace(0, np.pi, max(2, min(ln, n - p))))
            fl[p:p + len(e)] -= 0.8 * e
        return x * fl * (0.8 + 0.2 * np.sin(2 * np.pi * t / 7.3))

    tr.continuous('amb', render, gain, 0.2)


THEME_MOTIF = [  # (Beat, Note, Dauer) - 2 Takte Frage, 2 Takte Antwort
    [(0, 'E5', 1.5), (1.5, 'D5', 0.5), (2, 'C5', 1), (3, 'D5', 0.75), (3.75, 'E5', 0.25), (4, 'A4', 3)],
    [(0, 'E5', 1.5), (1.5, 'D5', 0.5), (2, 'C5', 1), (3, 'G5', 1), (4, 'E5', 2.5), (6.5, 'D5', 1)],
]


def motif(tr, b0, nbars, transpose=0, gain=0.22, rev=0.3, dly=0.18, speed=1.0):
    rng = rng_for(tr.name, 'hum')
    cache = {}
    for i in range(0, nbars, 2):
        ph = THEME_MOTIF[(i // 2) % 2]
        for bt, note, d in ph:
            m = nm(note) + transpose
            key = (m, d)
            if key not in cache:
                cache[key] = hum(rng, float(mtof(m)), d * 60 / tr.bpm * speed * 0.95)
            tr.place('music', cache[key], (b0 + i) * 4 + bt * speed, gain, -0.1, rev=rev, dly=dly)


def compose_theme(name):
    finale = name == 'theme_finale'
    if finale:
        tr = Track(name, 98, 32)
        arr = arrangement([(8, 'pad mot'), (8, 'pad k2'), (8, 'pad k2 mot bass'), (8, 'pad mot bass')])
    elif name == 'theme_1':
        tr = Track(name, 130, 40)
        arr = arrangement([(8, 'k oh ch pad bass'), (8, 'k oh ch cl pad bass mot'), (8, 'k oh ch cl pad bass rim mot'),
                           (8, 'pad mot'), (8, 'k oh ch cl pad bass mot fill')])
    else:
        tr = Track(name, 128, 40)
        arr = arrangement([(8, 'k ch pad'), (8, 'k oh ch pad bass'), (8, 'pad mot'),
                           (8, 'k oh ch pad bass mot'), (8, 'k oh ch cl pad bass rim fill')])
    rng = tr.rng
    kit = Kit(rng, dict(f0=46, fstart=130, decay=0.38, dull=0.8), hat_tone=-0.2)
    soft = kick(rng, f0=44, fstart=90, decay=0.3, dull=1.0)
    prog = [('A2', [0, 3, 7, 10, 14]), ('F2', [0, 4, 7, 11, 14])] if name != 'theme_2' else \
           [('D2', [0, 3, 7, 10, 14]), ('A2', [0, 3, 7, 10])]
    if finale:
        prog = [('A2', [0, 3, 7, 10, 14]), ('F2', [0, 4, 7, 11]), ('C3', [0, 4, 7, 11, 14]), ('G2', [0, 5, 7, 10])]
    pads = {}
    for b, lay in enumerate(arr):
        drums_bar(tr, kit, b, lay, kick_gain=0.95, hat_gain=0.2)
        if 'k2' in lay:
            for q in range(4):
                tr.kick(soft, b * 4 + q, 0.45)
            for q in range(4):
                tr.place('drums', kit.hc[q], b * 4 + q + 0.5, 0.1, 0.3, rev=0.2)
        ci = (b // (4 if not finale else 2)) % len(prog)
        root, iv = prog[ci]
        if 'pad' in lay and b % (4 if not finale else 2) == 0:
            key = ci
            dur = (4 if not finale else 2) * 4 * 60 / tr.bpm
            if key not in pads:
                pads[key] = pad_voice(rng, mtof([nm(root) + 12 + i for i in iv]), dur, cutoff=700 if finale else 900,
                                      att=1.2 if finale else 0.6, rel=1.5)
            tr.place('music', pads[key], b * 4, 0.3, 0, rev=0.35)
        if 'bass' in lay:
            f = mtof(nm(root) - 12)
            bn = bassnote(rng, f, 0.22 * 60 / tr.bpm * 2)
            if finale:
                tr.place('bass', bassnote(rng, f, 1.8), b * 4, 0.4)
            else:
                for q in range(4):
                    tr.place('bass', bn, b * 4 + q + 0.5, 0.55)
    # Motiv: Spätileuchte-Summen
    for b0 in range(0, tr.bars, 8):
        if 'mot' in arr[b0]:
            motif(tr, b0, 8, transpose=-12 if finale else 0, gain=0.24 if not finale else 0.3,
                  rev=0.45 if finale else 0.3)
    neon_buzz(tr, 0.08 if finale else 0.06)
    return finalize(tr, target_lufs=-27.5 if finale else -26.0, rev_rt=3.5 if finale else 2.4,
                    balance=dict(kick=-5.0, bass=-3.0, drums=-12.0) if finale else None,
                    dly_beats=0.75, duck=0.2 if finale else 0.45)


def compose_sewers(name):
    var = name.split('_', 1)[1]
    bpm = {'1': 120, '2': 120, '3': 118, 'tense': 122, 'boss': 126}[var]
    bars = 40 if var in ('tense', 'boss') else 36
    tr = Track(name, bpm, bars)
    rng = tr.rng
    if var == 'boss':
        kit = Kit(rng, dict(f0=47, fstart=170, decay=0.3, hard=0.6, dull=0.3))
        arr = arrangement([(8, 'k oh ch cl acid stab'), (8, 'k oh ch cl acid rim'), (8, 'k ch acid stab drip'),
                           (8, 'k oh ch cl acid stab rim fill'), (8, 'stab drip clink acid'),
                           (8, 'k oh ch cl acid stab rim fill')])
    else:
        kit = Kit(rng, dict(f0=45, fstart=120, decay=0.4, dull=0.9), hat_tone=-0.3)
        base = 'k oh stab drip'
        arr = arrangement([(8, base + ' sub'), (8, base + ' ch rim sub clink'), (4, 'stab drip clink'),
                           (8, base + ' ch rim sub clink cl'), (8, base + ' ch sub')]) if var != 'tense' else \
            arrangement([(8, base + ' ch sub'), (8, base + ' ch rim sub clink'), (8, base + ' ch sub cl roll'),
                         (8, 'stab drip clink ch roll'), (8, base + ' ch rim sub cl roll'), (8, base + ' ch sub cl roll')])
        if var == '3':
            arr = arrangement([(8, 'k stab drip sub rim'), (8, base + ' sub clink'), (4, 'stab drip clink'),
                               (8, base + ' ch sub clink'), (8, base + ' ch rim sub')])
    arr = fit(arr, bars)
    chords = {'1': [('F3', [0, 3, 7, 10])], '2': [('F3', [0, 3, 7, 10]), ('Db3', [0, 4, 7, 11])],
              '3': [('Bb2', [0, 3, 7, 10]), ('F3', [0, 3, 7, 10])], 'tense': [('F3', [0, 1, 7, 10])],
              'boss': [('F3', [0, 3, 7, 10])]}[var]
    stab_rhythm = {'1': [0.75, 2.5, 3.75], '2': [0.5, 1.75, 3.0], '3': [0.75, 2.25], 'tense': [0.75, 1.5, 2.5, 3.75],
                   'boss': [0.5, 2.75]}[var]
    cut_lfo = lfo_curve(tr, 450, 1500 if var != 'tense' else 2600, 16)
    stabs = {}
    drips = [drip(rng, 500 + 700 * rng.random()) for _ in range(6)]
    clinks = [clink(rng, 1150 + 350 * rng.random()) for _ in range(4)]
    for b, lay in enumerate(arr):
        drums_bar(tr, kit, b, lay, swing=0.08, hat_gain=0.17, oh_gain=0.2, clap_gain=0.3, clap_rev=0.3)
        if 'roll' in lay and b % 8 == 7:
            snare_roll(tr, kit, b * 4, 4, 0.3)
        if 'stab' in lay:
            root, iv = chords[(b // 4) % len(chords)]
            for bt in stab_rhythm:
                pos = int(round((b * 4 + bt) * tr.spb)) % tr.L
                c = int(cut_lfo[pos] // 100) * 100
                key = (root, c)
                if key not in stabs:
                    stabs[key] = stab(rng, mtof([nm(root) + i for i in iv]), c, 0.14)
                tr.place('music', stabs[key], b * 4 + bt, 0.26, -0.15, rev=0.25, dly=0.55)
        if 'sub' in lay and b % 2 == 0:
            root = chords[(b // 4) % len(chords)][0]
            tr.place('bass', bassnote(rng, mtof(nm(root) - 24), 7.5 * 60 / bpm, cutoff=180, att=0.02), b * 4, 0.5)
        if 'drip' in lay:
            for _ in range(2 + int(rng.random() * 3)):
                s = int(rng.random() * 16)
                tr.place('fx', drips[int(rng.random() * 6)], b * 4 + s * 0.25, 0.1 + 0.08 * rng.random(),
                         rng.uniform(-0.7, 0.7), rev=0.5)
        if 'clink' in lay and b % 2 == 1:
            s = int(rng.random() * 12)
            for k in range(1 + int(rng.random() * 3)):
                tr.place('fx', clinks[int(rng.random() * 4)], b * 4 + (s + k) * 0.25 + 0.03 * k,
                         0.09 * (1 - 0.25 * k), rng.uniform(-0.6, 0.6), rev=0.35)
    if var == 'boss':
        on = active(arr, 'acid')
        pats = [acid_pattern(rng_for(name, 'acid', i), MINOR) for i in range(2)]
        acid(tr, on, nm('F2'), pats, cut_mult=lfo_curve(tr, 0.7, 2.2, 16), gain=0.3)
    mc = section_ramp(tr, arr, 1800, 9000) if var == 'tense' else None
    return finalize(tr, target_lufs=-25.5 if var == 'boss' else -26.0, rev_rt=3.2, rev_damp=3000, dly_beats=0.75,
                    dly_fb=0.55,
                    duck=0.35 if var != 'boss' else 0.5, music_cut=mc)


def compose_prison(name):
    var = name.split('_', 1)[1]
    bpm = 128 if var == 'boss' else 124
    bars = 40 if var in ('tense', 'boss') else 36
    tr = Track(name, bpm, bars)
    rng = tr.rng
    kit = Kit(rng, dict(f0=50, fstart=140, decay=0.28, hard=0.5 if var == 'boss' else 0.15, dull=0.6))
    stp = stamp(rng)
    ticks = [tick(rng) for _ in range(5)]
    gong_notes = {'1': [('E5', 0), ('C5', 0.75)], '2': [('G5', 0), ('E5', 0.5), ('C5', 1.0)],
                  '3': [('C5', 0), ('E5', 0.75)], 'tense': [('E5', 0), ('C5', 0.75)],
                  'boss': [('E5', 0), ('C5', 0.75)]}[var]
    gongs = {n: bell(rng, float(mtof(nm(n))), 1.4, detune_cents=(-30 if var == 'tense' else 0)) for n, _ in gong_notes}
    if var == 'boss':
        arr = arrangement([(8, 'k ch cl stamp acid gong'), (8, 'k ch oh cl stamp acid bass'), (8, 'k ch stamp acid tick gong'),
                           (8, 'k ch oh cl stamp acid bass fill'), (8, 'pad gong tick acid'), (8, 'k ch oh cl stamp acid bass gong')])
    elif var == 'tense':
        arr = arrangement([(8, 'k ch stamp bass pad gong tick'), (8, 'k ch oh stamp bass pad gong tick roll'),
                           (8, 'k ch oh cl stamp bass pad gong roll'), (8, 'pad gong tick roll'),
                           (8, 'k ch oh cl stamp bass pad gong roll'), (8, 'k ch oh cl stamp bass pad gong tick roll')])
    else:
        arr = arrangement([(8, 'k ch stamp bass pad gong'), (8, 'k ch oh stamp bass pad gong tick'),
                           (4, 'pad gong tick'), (8, 'k ch oh cl stamp bass pad gong tick'), (8, 'k ch oh stamp bass pad gong fill')])
    arr = fit(arr, bars)
    gong_every = 4 if var == 'tense' else 8
    pads = [pad_voice(rng, mtof([nm('D3'), nm('A3'), nm('Eb4') if var == 'tense' else nm('F4')]), 8 * 60 / bpm * 4,
                      cutoff=750, att=1.0, rel=1.0)]
    if var == '2':
        pads.append(pad_voice(rng, mtof([nm('Bb2'), nm('F3'), nm('D4')]), 8 * 60 / bpm * 4, cutoff=750, att=1.0, rel=1.0))
    bass_pos = [0.75, 1.5, 2.75, 3.5] if var == '2' else [0.5, 1.5, 2.5, 3.5]
    bass_len = 0.18 * 60 / bpm * 2
    bn = {m: bassnote(rng, mtof(m), bass_len, cutoff=320, drive=1.6) for m in (nm('D1'), nm('Eb1'))}
    for b, lay in enumerate(arr):
        drums_bar(tr, kit, b, lay, hat_gain=0.2, oh_gain=0.18, clap_gain=0.3)
        if 'stamp' in lay:
            tr.place('drums', stp, b * 4 + 3.0, 0.45, 0.0, rev=0.08)
            if var == '3':
                tr.place('drums', stp, b * 4 + 1.0, 0.3, -0.2, rev=0.08)
            if b % 4 == 3:
                tr.place('drums', stp, b * 4 + 3.5, 0.3, 0.1, rev=0.08)
        if 'tick' in lay:
            for s in range(16):
                if rng.random() < (0.55 if var == '3' else 0.35):
                    tr.place('fx', ticks[s % 5], b * 4 + s * 0.25 + 0.01 * rng.random(), 0.07, rng.uniform(-0.8, 0.8))
        if 'bass' in lay:
            m = nm('Eb1') if (var == '3' and b % 8 == 7) else nm('D1')
            for bt in bass_pos:
                tr.place('bass', bn[m], b * 4 + bt, 0.55)
        if 'pad' in lay and b % 8 == 0:
            tr.place('music', pads[(b // 8) % len(pads)], b * 4, 0.2, 0, rev=0.3)
        if 'gong' in lay and b % gong_every == 0:
            for n, off in gong_notes:
                tr.place('music', gongs[n], b * 4 + off, 0.22, -0.2, rev=0.4, dly=0.15)
        if 'roll' in lay and b % 8 == 7:
            snare_roll(tr, kit, b * 4, 4, 0.28)
    if var == 'boss':
        pats = [acid_pattern(rng_for(name, 'acid', i), MINOR, density=0.7) for i in range(2)]
        acid(tr, active(arr, 'acid'), nm('D2'), pats, cutoff=380, cut_mult=lfo_curve(tr, 0.7, 2.0, 8), gain=0.3)
    mc = section_ramp(tr, arr, 1600, 8000) if var == 'tense' else None
    return finalize(tr, target_lufs=-25.5 if var == 'boss' else -26.0, rev_rt=1.8, rev_damp=3200, rev_width=0.6,
                    dly_beats=0.5, dly_fb=0.35,
                    duck=0.4, music_cut=mc)


def compose_caves(name):
    var = name.split('_', 1)[1]
    bpm = {'1': 136, '2': 136, '3': 136, 'tense': 138, 'boss': 140, 'boss_finale': 144}[var]
    bars = 48 if var in ('tense', 'boss', 'boss_finale') else 40
    tr = Track(name, bpm, bars)
    rng = tr.rng
    boss = var.startswith('boss')
    kit = Kit(rng, dict(f0=50, fstart=180, decay=0.22, hard=0.8 if boss else 0.45, dull=0.4), hat_tone=0.3,
              clap_fc=1100)
    toms = [tom(rng, f) for f in (95, 128, 160)]
    clanks = [clank(rng, f) for f in (260, 310, 420)]
    if boss:
        arr = arrangement([(8, 'k ch oh tom acid jack'), (8, 'k ch oh cl tom acid rollb'), (8, 'k ch oh tom acid jack clank'),
                           (8, 'ubahn acid clank jack'), (8, 'k ch oh cl tom acid jack rollb'), (8, 'k ch oh cl tom acid clank fill')])
    elif var == 'tense':
        arr = arrangement([(8, 'k ch tom bass jack'), (8, 'k ch oh tom bass jack clank roll'), (8, 'k ch oh cl tom bass jack roll'),
                           (8, 'ubahn jack clank roll'), (8, 'k ch oh cl tom bass jack roll'), (8, 'k ch oh cl tom bass jack clank roll')])
    else:
        arr = arrangement([(8, 'k ch tom bass'), (8, 'k ch oh tom bass jack'), (8, 'k ch oh cl tom bass clank'),
                           (8, 'ubahn clank tom'), (8, 'k ch oh cl tom bass jack fill')])
    tom_pat = {'1': [(0.75, 0), (1.5, 1), (2.75, 0), (3.25, 2)], '2': [(0.5, 1), (1.75, 0), (2.5, 2), (3.75, 0)],
               '3': [(0.25, 0), (1.25, 0), (2.0, 1), (3.5, 2)]}.get(var, [(0.75, 0), (1.5, 1), (2.75, 0), (3.25, 2), (3.75, 1)])
    bcache = {}
    for b, lay in enumerate(arr):
        drums_bar(tr, kit, b, lay, hat_gain=0.2, oh_gain=0.22, clap_gain=0.4, pan_hat=-0.2)
        if 'tom' in lay:
            for bt, i in tom_pat:
                tr.place('drums', toms[i], b * 4 + bt, 0.32, (-0.4, 0.1, 0.4)[i], rev=0.08)
        if 'bass' in lay and var == '2':
            for s in (2, 6, 10, 14):
                m = nm('E1') + (12 if s == 14 else 0) + (1 if (b % 8 == 7 and s >= 10) else 0)
                key = (m, 9)
                if key not in bcache:
                    bcache[key] = bassnote(rng, mtof(m), 0.4 * 60 / bpm, cutoff=300, drive=2.2)
                tr.place('bass', bcache[key], b * 4 + s * 0.25, 0.5)
        elif 'bass' in lay and var == '3':
            for s, st in ((3, 0), (6, 0), (9, 0), (12, 0), (14, 1)):
                key = (nm('E1') + st, 8)
                if key not in bcache:
                    bcache[key] = bassnote(rng, mtof(key[0]), 0.3 * 60 / bpm, cutoff=340, drive=2.2)
                tr.place('bass', bcache[key], b * 4 + s * 0.25, 0.5)
        elif 'bass' in lay:
            for s in range(16):
                if s % 4 == 0:
                    continue
                key = (nm('E1') + (1 if (b % 4 == 3 and s >= 12) else 0), s % 4)
                if key not in bcache:
                    bcache[key] = bassnote(rng, mtof(key[0]), 0.2 * 60 / bpm, cutoff=220 + 260 * (key[1] / 3), drive=2.0)
                tr.place('bass', bcache[key], b * 4 + s * 0.25, 0.45)
        if 'jack' in lay and (b % 2 == 1 or var == '3'):
            start = int(rng.random() * 3)
            dur = (1.0 + (rng.random() < 0.4)) * 60 / bpm
            jh = jackhammer(rng, dur, 4 * bpm / 60 * 2 * 0.75)
            tr.place('fx', jh, b * 4 + start, 0.2, rng.uniform(-0.5, 0.5), rev=0.1)
        if 'clank' in lay and b % 2 == 0:
            tr.place('fx', clanks[int(rng.random() * 3)], b * 4 + 2.5 + 0.25 * int(rng.random() * 4), 0.15,
                     rng.uniform(-0.6, 0.6), rev=0.3, dly=0.2)
        if 'ubahn' in lay and (b == 0 or 'ubahn' not in arr[b - 1]):
            tr.place('rumble', ubahn(rng, tr.spb, 10 * 4), b * 4 - 4, 0.55)
        if ('roll' in lay or 'rollb' in lay) and b % 8 == 7:
            snare_roll(tr, kit, b * 4 - (4 if var == 'boss_finale' else 0), 8 if var == 'boss_finale' else 4, 0.3)
    if boss:
        pats = [acid_pattern(rng_for(name, 'acid', i), PHRYG, density=0.85) for i in range(4 if var == 'boss_finale' else 2)]
        acid(tr, active(arr, 'acid'), nm('E2'), pats, cutoff=380 if var == 'boss' else 480,
             reso=7.5 if var == 'boss' else 9.0, cut_mult=lfo_curve(tr, 0.7, 2.4, 8), gain=0.3, drive=2.6)
    mc = section_ramp(tr, arr, 1800, 9000) if var == 'tense' else None
    return finalize(tr, target_lufs=-25.5 if boss else -26.0, rev_rt=1.6, rev_damp=3000, dly_beats=0.75,
                    dly_fb=0.4, duck=0.5, balance=dict(drums=-4.5), music_cut=mc)


def compose_city(name):
    var = name.split('_', 1)[1]
    bpm = {'1': 122, '2': 122, '3': 122, 'tense': 124, 'boss': 126, 'boss_finale': 128}[var]
    bars = 40 if var in ('tense', 'boss', 'boss_finale') else 36
    tr = Track(name, bpm, bars)
    rng = tr.rng
    boss = var.startswith('boss')
    kit = Kit(rng, dict(f0=48, fstart=120, decay=0.36, hard=0.55 if boss else 0.0, dull=0.7), hat_tone=-0.1,
              clap_fc=1600)
    progs = {'1': [('C3', [0, 3, 7, 10, 14]), ('F3', [0, 3, 7, 10, 14]), ('Ab2', [0, 4, 7, 11, 14]), ('G2', [0, 5, 7, 10, 14])],
             '2': [('Eb3', [0, 4, 7, 11, 14]), ('C3', [0, 3, 7, 10, 14]), ('F3', [0, 3, 7, 10]), ('Bb2', [0, 5, 7, 10])],
             '3': [('F3', [0, 3, 7, 10, 14]), ('Bb2', [0, 4, 7, 10, 14]), ('Eb3', [0, 4, 7, 11]), ('Ab2', [0, 4, 7, 11, 14])]}
    prog = progs.get(var, [('C3', [0, 3, 7, 10, 14]), ('Ab2', [0, 4, 7, 11, 14])])
    rhythm = [(0.0, 0.8), (1.5, 0.35), (2.75, 0.5)] if var != '2' else [(0.5, 0.5), (1.75, 0.5), (3.0, 0.7)]
    if boss:
        arr = arrangement([(8, 'k ch oh cl ep bass acid'), (8, 'k ch oh cl ep bass acid shk chime'),
                           (8, 'k ch oh cl bass acid shk roll'), (8, 'ep drone chime acid'),
                           (8, 'k ch oh cl ep bass acid shk'), (8, 'k ch oh cl ep bass acid shk chime roll fill')])
    elif var == 'tense':
        arr = arrangement([(8, 'k ch oh ep bass drone'), (8, 'k ch oh cl ep bass shk drone roll'),
                           (8, 'k ch oh cl ep bass shk drone chime roll'), (8, 'ep drone roll'),
                           (8, 'k ch oh cl ep bass shk drone roll'), (8, 'k ch oh cl ep bass shk drone chime roll')])
    else:
        arr = arrangement([(8, 'k ch ep bass drone'), (8, 'k ch oh cl ep bass shk chime'), (4, 'ep drone chime'),
                           (8, 'k ch oh cl ep bass shk drone'), (8, 'k ch oh cl ep bass shk chime fill')])
    arr = fit(arr, bars)
    swing = 0.16
    ep_cache = {}
    shaker = [filt(filt(rng.standard_normal(int(0.06 * SR)), 'hp', 4500), 'lp', 8000) * env_ad(int(0.06 * SR), 0.006, 0.015)
              for _ in range(3)]
    chime_notes = ['C5', 'Eb5', 'G5', 'C6']
    chimes = [bell(rng, float(mtof(nm(n))), 1.1, detune_cents=(-38 if i == 3 else 0)) for i, n in enumerate(chime_notes)]
    for b, lay in enumerate(arr):
        drums_bar(tr, kit, b, lay, swing=swing, kick_gain=0.9, hat_gain=0.16, oh_gain=0.18, clap_gain=0.32, clap_rev=0.3)
        root, iv = prog[(b // 2) % len(prog)]
        if 'ep' in lay:
            for bt, dur in rhythm:
                for i in iv:
                    m = nm(root) + i
                    if (m, dur) not in ep_cache:
                        ep_cache[(m, dur)] = epiano(rng, float(mtof(m)), dur * 60 / bpm)
                    tr.place('music', ep_cache[(m, dur)], b * 4 + bt + (swing * 0.25 if (bt * 4) % 2 else 0), 0.08,
                             (i % 5 - 2) * 0.15, rev=0.2, dly=0.1)
        if 'bass' in lay:
            for bt, st in ((0.0, 0), (0.75, 0), (2.5, 7 if b % 2 else 0), (3.5, 12)):
                m = nm(root) - 24 + st
                if ('b', m) not in ep_cache:
                    ep_cache[('b', m)] = bassnote(rng, mtof(m), 0.3 * 60 / bpm, cutoff=240)
                tr.place('bass', ep_cache[('b', m)], b * 4 + bt, 0.55)
        if 'shk' in lay:
            for s in range(16):
                tr.place('drums', shaker[s % 3], b * 4 + s * 0.25 + (swing * 0.25 if s % 2 else 0),
                         0.05 + 0.04 * (s % 2), 0.4)
        if 'chime' in lay and b % 8 == 4:
            for k, c in enumerate(chimes):
                tr.place('music', c, b * 4 + k * 0.5, 0.12, -0.3 + 0.2 * k, rev=0.35, dly=0.2)
        if 'roll' in lay and b % 8 == 7:
            snare_roll(tr, kit, b * 4, 4, 0.22)

    def drone(n):
        t = tarr(n)
        # "Premium" mit verstimmtem Unterton: ~+30 Cent, langsam driftend
        f = mtof(nm('C3')) * 2 ** ((30 + 8 * np.sin(2 * np.pi * t / 23.0)) / 1200)
        x = saw(f, n) + saw(f * 1.5, n) * 0.5
        return filt(x, 'lp', 700) * (0.6 + 0.4 * np.sin(2 * np.pi * t / 11.0) ** 2)

    tr.continuous('music', drone, 0.035, 0.3, rev=0.2)
    if boss:
        pats = [acid_pattern(rng_for(name, 'acid', i), MINOR, density=0.75) for i in range(2 if var == 'boss' else 4)]
        acid(tr, active(arr, 'acid'), nm('C2'), pats, cutoff=360, reso=6.5 if var == 'boss' else 8.0,
             cut_mult=lfo_curve(tr, 0.7, 2.0, 16), gain=0.26)
    mc = section_ramp(tr, arr, 1500, 8500) if var == 'tense' else None
    return finalize(tr, target_lufs=-25.5 if boss else -26.0, rev_rt=2.0, rev_damp=4000, dly_beats=0.75,
                    dly_fb=0.35, duck=0.35, music_cut=mc, balance=dict(kick=1.0, drums=-5.5))


PATERNOSTER = [0, 3, 7, 10, 12, 10, 7, 3]  # endlos umlaufend: rauf, runter, rauf ...


def compose_halls(name):
    var = name.split('_', 1)[1]
    bpm = {'1': 140, '2': 140, '3': 140, 'tense': 142, 'boss': 145, 'boss_finale': 148}[var]
    bars = 48 if var in ('tense', 'boss', 'boss_finale') else 44
    tr = Track(name, bpm, bars)
    rng = tr.rng
    boss = var.startswith('boss')
    kit = Kit(rng, dict(f0=46, fstart=170, decay=0.26, hard=1.0 if boss else 0.75, dull=0.4), hat_tone=0.2,
              clap_fc=1200)
    if boss:
        arr = arrangement([(8, 'k rmb ch oh cl org acid'), (8, 'k rmb ch oh cl org acid'), (8, 'k rmb ch cl acid slam'),
                           (8, 'org glocke acid'), (8, 'k rmb ch oh cl org acid slam'), (8, 'k rmb ch oh cl org acid roll fill')])
    elif var == 'tense':
        arr = arrangement([(8, 'k rmb ch org'), (8, 'k rmb ch oh org slam roll'), (8, 'k rmb ch oh cl org roll'),
                           (8, 'org glocke roll'), (8, 'k rmb ch oh cl org slam roll'), (8, 'k rmb ch oh cl org roll')])
    else:
        arr = arrangement([(8, 'k rmb ch'), (8, 'k rmb ch oh org'), (8, 'k rmb ch oh cl org slam'), (4, 'org glocke'),
                           (8, 'k rmb ch oh cl org'), (8, 'k rmb ch oh cl org slam fill')])
    roots = {'1': ['C3'], '2': ['C3', 'Ab2'], '3': ['F3', 'C3'], 'tense': ['C3', 'Db3'], 'boss': ['C3'],
             'boss_finale': ['C3', 'Ab2', 'Bb2', 'C3']}[var]
    rate = 0.25 if var == 'boss_finale' else 0.5
    org = {}
    glocke = bell(rng, float(mtof(nm('C3'))), 3.0, partials=((0.5, 0.6, 1.2), (1.0, 1.0, 1.0), (1.19, 0.5, 0.7),
                                                             (1.5, 0.35, 0.5), (2.0, 0.3, 0.4), (2.52, 0.15, 0.25)))
    slam = clank(rng, 180)
    rmb = bassnote(rng, mtof(nm('C1')), 60 / bpm * 0.55, cutoff=140, drive=3.0, att=0.03)
    for b, lay in enumerate(arr):
        drums_bar(tr, kit, b, lay, hat_gain=0.2, oh_gain=0.22, clap_gain=0.38)
        if 'rmb' in lay:
            # Rumble: tiefes, verzerrtes Nachdröhnen zwischen den Kicks
            for q in range(4):
                tr.place('bass', rmb, b * 4 + q + 0.25, 0.4)
        if 'org' in lay:
            root = nm(roots[(b // 4) % len(roots)])
            steps = int(4 / rate)
            for s in range(steps):
                i = (b * steps + s) % len(PATERNOSTER)
                m = root + PATERNOSTER[i]
                if m not in org:
                    org[m] = organ(rng, float(mtof(m)), rate * 60 / bpm * 0.8, drive=3.0, cutoff=2600)
                tr.place('music', org[m], b * 4 + s * rate, 0.15, 0.25 * np.sin(i / 8 * 2 * np.pi), rev=0.2, dly=0.08)
        if 'glocke' in lay and b % 4 == 0:
            tr.place('music', glocke, b * 4, 0.3, 0, rev=0.5)
        if 'slam' in lay and b % 4 == 2:
            tr.place('fx', slam, b * 4 + 3.5, 0.18, -0.4, rev=0.3)
        if 'roll' in lay and b % 8 == 7:
            snare_roll(tr, kit, b * 4, 4, 0.32)
    if boss:
        pats = [acid_pattern(rng_for(name, 'acid', i), [0, 1, 3, 5, 6, 8, 10], density=0.85)
                for i in range(2 if var == 'boss' else 4)]
        acid(tr, active(arr, 'acid'), nm('C2'), pats, cutoff=400 if var == 'boss' else 520,
             reso=8.0 if var == 'boss' else 9.5, cut_mult=lfo_curve(tr, 0.7, 2.3, 8), gain=0.28, drive=3.0)
    mc = section_ramp(tr, arr, 1800, 9000) if var == 'tense' else None
    return finalize(tr, target_lufs=-25.5 if boss else -26.0, rev_rt=2.8, rev_damp=2600, dly_beats=0.5,
                    dly_fb=0.3, duck=0.55, balance=dict(kick=3.0, bass=-2.0), music_cut=mc)


TRACKS = (['theme_1', 'theme_2', 'theme_finale']
          + ['sewers_' + v for v in ('1', '2', '3', 'tense', 'boss')]
          + ['prison_' + v for v in ('1', '2', '3', 'tense', 'boss')]
          + ['caves_' + v for v in ('1', '2', '3', 'tense', 'boss', 'boss_finale')]
          + ['city_' + v for v in ('1', '2', '3', 'tense', 'boss', 'boss_finale')]
          + ['halls_' + v for v in ('1', '2', '3', 'tense', 'boss', 'boss_finale')])

COMPOSERS = {'theme': compose_theme, 'sewers': compose_sewers, 'prison': compose_prison, 'caves': compose_caves,
             'city': compose_city, 'halls': compose_halls}

def render(name):
    x = COMPOSERS[name.split('_')[0]](name)
    return x


def write_ogg(path, x, level):
    # In Blöcken schreiben: libsndfile/Vorbis stürzt bei sehr großen Einzel-Writes ab.
    data = np.ascontiguousarray(x.T.astype(np.float32))
    with sf.SoundFile(path, 'w', SR, data.shape[1], format='OGG', subtype='VORBIS',
                      compression_level=level) as fh:
        for i in range(0, len(data), 8192):
            fh.write(data[i:i + 8192])


def render_and_write(args):
    name, outdir, level = args
    x = render(name)
    path = os.path.join(outdir, name + '.ogg')
    write_ogg(path, x, level)
    return name, path


# ---------------------------------------------------------------------------
# Qualitätskontrolle
# ---------------------------------------------------------------------------

def track_bpm(name):
    region, var = name.split('_', 1)
    return {'theme': {'1': 130, '2': 128, 'finale': 98},
            'sewers': {'1': 120, '2': 120, '3': 118, 'tense': 122, 'boss': 126},
            'prison': {'1': 124, '2': 124, '3': 124, 'tense': 124, 'boss': 128},
            'caves': {'1': 136, '2': 136, '3': 136, 'tense': 138, 'boss': 140, 'boss_finale': 144},
            'city': {'1': 122, '2': 122, '3': 122, 'tense': 124, 'boss': 126, 'boss_finale': 128},
            'halls': {'1': 140, '2': 140, '3': 140, 'tense': 142, 'boss': 145, 'boss_finale': 148}}[region][var]


def onset_curve(x, hop=128):
    m = x.mean(axis=1) if x.ndim == 2 else x
    lo = filt(m, 'lp', 150)
    n = len(lo) // hop
    e = np.sqrt(np.mean(lo[:n * hop].reshape(n, hop) ** 2, axis=1))
    o = np.maximum(np.diff(e, prepend=e[0]), 0)
    return o, SR / hop


def estimate_bpm(x):
    """Tempo aus Autokorrelation der Tiefband-Onsets (1, 2 und 4 Schläge)."""
    o, fps = onset_curve(x)
    o = o - o.mean()
    ac = np.fft.irfft(np.abs(np.fft.rfft(o, 2 * len(o))) ** 2)[:len(o)]

    def at(lag):
        i = int(lag)
        return ac[i] * (1 - (lag - i)) + ac[i + 1] * (lag - i)

    best, bb = -1e99, 0
    for bpm10 in range(900, 1600):
        lag = fps * 60 / (bpm10 / 10)
        v = at(lag) + 0.5 * at(2 * lag) + 0.25 * at(4 * lag)
        if v > best:
            best, bb = v, bpm10 / 10
    return bb


def bar_lock(x, bpm):
    """Raster-Check: Korrelation der Tiefband-Hüllkurve mit sich selbst um 1 und 2 Takte verschoben.
    Gesucht wird das Maximum im Bereich Soll-BPM +-5 %; liegt es bei der Soll-BPM, sitzt der Track im Raster.
    Rückgabe: (BPM mit maximaler Takt-Korrelation, Korrelation dort)."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    lo = filt(m, 'lp', 150) ** 2
    hop = 32
    n = len(lo) // hop
    e = np.sqrt(lo[:n * hop].reshape(n, hop).mean(axis=1))
    e = e - e.mean()
    fps = SR / hop
    best = (0.0, -1.0)
    for b in np.arange(bpm * 0.95, bpm * 1.05, 0.05):
        cs = []
        for bars in (1, 2):
            lag = bars * 4 * 60 / b * fps
            i = int(lag)
            fr = lag - i
            a = e[:n - i - 1]
            sh = e[i:n - 1] * (1 - fr) + e[i + 1:n] * fr
            cs.append(np.dot(a, sh) / np.sqrt(np.dot(a, a) * np.dot(sh, sh)))
        c = float(np.mean(cs))
        if c > best[1]:
            best = (round(float(b), 2), round(c, 3))
    return best


def analyze(path, name):
    x, sr = sf.read(path)
    if x.ndim == 1:
        x = x[:, None]
    m = x.mean(axis=1)
    pk = 20 * np.log10(np.max(np.abs(x)))
    rms = 20 * np.log10(np.sqrt(np.mean(x ** 2)))
    lud = loudness_db(x.T)
    # Spektralschwerpunkt (Mittel über Frames, energiegewichtet)
    fr = 4096
    nfr = len(m) // fr
    F = np.abs(np.fft.rfft(m[:nfr * fr].reshape(nfr, fr) * np.hanning(fr), axis=1))
    freqs = np.fft.rfftfreq(fr, 1 / sr)
    cent = float(np.sum(F * freqs) / np.sum(F))
    hf = float(np.sum(F[:, freqs > 8000] ** 2) / np.sum(F ** 2))
    # Loop-Naht: Sprung letzter->erster Sample vs. größter Sample-Schritt in +-50 ms um die Naht
    jump = float(np.max(np.abs(x[0] - x[-1])))
    w = int(0.05 * sr)
    around = np.concatenate([x[-w:], x[:w]])
    steps = np.abs(np.diff(around, axis=0)).max(axis=1)
    typ = float(np.max(np.delete(steps, w - 1)))
    bpm = track_bpm(name)
    bars = len(m) / sr / (4 * 60 / bpm)
    return dict(name=name, dur=round(len(m) / sr, 2), peak_db=round(pk, 2), rms_db=round(rms, 2),
                loud_db=round(lud, 2), centroid_hz=round(cent), hf_share_8k=round(hf, 5), seam_jump=round(jump, 5),
                seam_local_max_step=round(typ, 5), bpm_target=bpm, bpm_est=estimate_bpm(x),
                bar_lock=bar_lock(x, bpm), bars=round(bars, 3),
                size_kb=round(os.path.getsize(path) / 1024))


def png_overview(region, paths, outdir):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    n = len(paths)
    fig, axes = plt.subplots(n, 2, figsize=(14, 2.1 * n), squeeze=False)
    for r, (name, p) in enumerate(paths):
        x, sr = sf.read(p)
        m = x.mean(axis=1)
        t = np.arange(len(m)) / sr
        ax = axes[r, 0]
        step = max(1, len(m) // 4000)
        seg = m[:len(m) // step * step].reshape(-1, step)
        ax.fill_between(t[::step][:len(seg)], seg.min(1), seg.max(1), color='#335', lw=0)
        ax.set_ylim(-1, 1)
        ax.set_title(name + ' - Wellenform', fontsize=8)
        ax.tick_params(labelsize=6)
        ax = axes[r, 1]
        ax.specgram(m, NFFT=2048, Fs=sr, noverlap=1024, cmap='magma', vmin=-120)
        ax.set_ylim(0, 12000)
        ax.set_title(name + ' - Spektrogramm (0-12 kHz)', fontsize=8)
        ax.tick_params(labelsize=6)
    fig.tight_layout()
    out = os.path.join(outdir, region + '.png')
    fig.savefig(out, dpi=70)
    plt.close(fig)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', nargs='*', help='nur diese Tracks (ohne .ogg)')
    ap.add_argument('--out', default=MUSIC_DIR, help='Zielordner (Standard: core/src/main/assets/music)')
    ap.add_argument('--level', type=float, default=VORBIS_LEVEL, help='Vorbis compression_level 0..1')
    ap.add_argument('--jobs', type=int, default=min(4, os.cpu_count() or 1))
    ap.add_argument('--report', help='Ordner für Metriken (JSON) und PNG-Übersichten')
    ap.add_argument('--analyze-only', action='store_true', help='nicht rendern, nur vorhandene Dateien prüfen')
    a = ap.parse_args()
    names = a.only or TRACKS
    for n in names:
        if n not in TRACKS:
            sys.exit('Unbekannter Track: ' + n)
    os.makedirs(a.out, exist_ok=True)
    jobs = [(n, a.out, a.level) for n in names]
    if a.analyze_only:
        res = [(n, os.path.join(a.out, n + '.ogg')) for n in names]
    elif a.jobs > 1:
        with Pool(a.jobs) as pool:
            res = pool.map(render_and_write, jobs, chunksize=1)
    else:
        res = [render_and_write(j) for j in jobs]
    for n, p in res:
        print('analysiert' if a.analyze_only else 'geschrieben', p, os.path.getsize(p) // 1024, 'KB')
    if a.report:
        os.makedirs(a.report, exist_ok=True)
        stats = [analyze(p, n) for n, p in res]
        for s in stats:
            print(json.dumps(s, ensure_ascii=False))
        with open(os.path.join(a.report, 'metrics.json'), 'w') as fh:
            json.dump(stats, fh, indent=1, ensure_ascii=False)
        try:
            by = {}
            for n, p in res:
                by.setdefault(n.split('_')[0], []).append((n, p))
            for region, lst in by.items():
                print('PNG', png_overview(region, lst, a.report))
        except ImportError:
            print('matplotlib fehlt, keine PNGs')


if __name__ == '__main__':
    main()
