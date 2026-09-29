#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Neukölln Pixel Dungeon - Klangbett für die Bilder-Intro (IntroScene).

Erzeugt fünf Ogg-Vorbis-Dateien in core/src/main/assets/music/:

    intro_1.ogg       Loop    Seite 1: Regen an der Bushaltestelle, ferne Stadt, leises Theme-Pad mit Motiv
    intro_2.ogg       einmal  Seite 2: Bus schließt die Tür, Druckluftbremse, Diesel fährt davon, danach Regen
                              (IntroScene spielt danach intro_1 als Loop weiter)
    intro_3.ogg       Loop    Seite 3: Treppenhaus-Hall, Minutenlicht-Klick, Schritte auf Stein, Regen gedämpft
    intro_4.ogg       einmal  Seite 4: Brandschutztür RUMS, Kellerhall, dann Stille, Tropfen, ferner Clubbass
    intro_keller.ogg  Loop    nach intro_4: Keller-Stille mit Tropfen und fernem Bass

Qualitätsregel (Projektinhaber, 2026-09-29: synthetische SFX klangen „billig, wie Plastik“):
Nur rauschbasierte Klänge (Regen, Reifenzischen, Stadtrauschen, Druckluft, Dieselbrummen aus
Rauschimpulsen, Schritte, Klicks, Türschlag über rauschangeregte Resonatoren), dazu Faltungshall,
leichte Sättigung, Tiefpass für Entfernung und Luftdämpfung. Keine reinen Sinus-Klänge. Musik nur
als leises Pad aus verstimmten Sägezähnen (Theme-1-Akkorde Am9/Fmaj7) und ein sehr leises Motiv.

Deterministisch (Seeds aus CRC32 der Namen). Aufruf aus dem Repo-Wurzelverzeichnis:
    python3 tools/generate-kiez-intro-audio.py                    # alle fünf Dateien
    python3 tools/generate-kiez-intro-audio.py --report DIR       # dazu Metriken (JSON) + Spektrogramme (PNG)
    python3 tools/generate-kiez-intro-audio.py --analyze-only --report DIR

Abhängigkeiten: numpy, scipy, soundfile [matplotlib]. Nutzt Bausteine aus tools/generate-kiez-music.py.
Details: docs/NEUKOELLN-AUDIO.md, Abschnitt „Intro-Klangbett“.
"""
import argparse
import importlib.util
import json
import os
import sys
import zlib

import numpy as np
from scipy.signal import fftconvolve, lfilter
import soundfile as sf

_here = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('kiezmusic', os.path.join(_here, 'generate-kiez-music.py'))
M = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(M)

SR = M.SR
filt, rbj, norm, sat, tarr = M.filt, M.rbj, M.norm, M.sat, M.tarr
MUSIC_DIR = M.MUSIC_DIR
VORBIS_LEVEL = 0.6   # etwas höhere Qualität als der Soundtrack: Rauschen verträgt starke Kompression schlecht

# Lautheit (grobe K-Gewichtung wie im Soundtrack; der Soundtrack liegt bei -26,0 dB)
TARGET_OUTDOOR = -27.0   # intro_1 (Loop); intro_2 bekommt dieselbe Verstärkung, damit der Regen gleich laut bleibt
TARGET_HALL = -28.5      # intro_3
TARGET_CELLAR = -31.0    # intro_keller (Loop); intro_4 bekommt dieselbe Verstärkung (Stille bleibt Stille)

CLUB_BPM = 124.0
CLUB_BAR = 4 * 60.0 / CLUB_BPM


def seed(*keys):
    h = zlib.crc32(('intro/' + '/'.join(str(k) for k in keys)).encode('utf-8'))
    return np.random.default_rng(h)


def S(sec):
    return int(round(sec * SR))


# ---------------------------------------------------------------------------
# Grundbausteine
# ---------------------------------------------------------------------------

def smooth_noise(rng, n, rate_hz, lo=0.0, hi=1.0):
    """Langsame Zufallskurve zwischen lo und hi (für Böen, Pegelschwankungen)."""
    k = max(4, int(n / SR * rate_hz) + 4)
    pts = rng.random(k)
    x = np.interp(np.linspace(0, k - 3, n), np.arange(k), pts)
    x = filt(filt(x - 0.5, 'lp', max(rate_hz, 0.05)), 'lp', max(rate_hz, 0.05)) + 0.5
    x = (x - x.min()) / max(1e-9, x.max() - x.min())
    return lo + (hi - lo) * x


def bp(x, fc, q):
    return filt(x, 'bp', fc, q)


def band(x, lo, hi, order=2):
    for _ in range(order):
        x = filt(filt(x, 'hp', lo), 'lp', hi)
    return x


def tv_bp(x, fc, q, block=32):
    """Zeitvariabler Bandpass (mono), Koeffizienten blockweise."""
    n = len(x)
    fcb = np.clip(np.asarray(fc, float)[::block], 30.0, 0.45 * SR)
    y = np.empty(n)
    zi = np.zeros(2)
    for i in range(len(fcb)):
        b, a = rbj('bp', fcb[i], q)
        s0 = i * block
        y[s0:s0 + block], zi = lfilter(b, a, x[s0:s0 + block], zi=zi)
    return y


def tv_lp(x, fc, q=0.707, block=64):
    return M.tv_filter(x, np.asarray(fc, float), q, 'lp', block)


def burst(rng, n, att, dec):
    """Rauschimpuls mit Anstieg/Abklingen (Sekunden)."""
    t = tarr(n)
    e = np.clip(t / max(att, 1e-5), 0, 1) * np.exp(-np.maximum(t - att, 0) / dec)
    return rng.standard_normal(n) * e


def mode(rng, exc, fc, tau):
    """Rauschangeregter Resonator: Bandpass mit Güte aus Abklingzeit, auf Spitze 1 normiert."""
    q = max(0.7, np.pi * fc * tau)
    return norm(bp(exc, fc, q))


def pan_st(x, p):
    gl, gr = M.pan_gains(p)
    return np.stack([x * gl, x * gr])


def place(buf, snip, t, gain=1.0, pan=0.0):
    """Mono oder Stereo linear einfügen (ab Sekunde t), Überhang wird abgeschnitten."""
    st = pan_st(snip, pan) if snip.ndim == 1 else snip
    p = S(t)
    if p >= buf.shape[1]:
        return
    k = min(st.shape[1], buf.shape[1] - p)
    if p < 0:
        st, k, p = st[:, -p:], k + p, 0
    buf[:, p:p + k] += gain * st[:, :k]


def make_room(name, rt60, damp, predelay, er=(), er_gain=0.0, width=1.0):
    """Impulsantwort: diffuser Nachhall (wie im Soundtrack) plus frühe Reflexionen (Wände, Treppe)."""
    ir = M.make_ir(seed(name, 'ir'), rt60, damp, predelay, width)
    rng = seed(name, 'er')
    for i, d in enumerate(er):
        p = S(d)
        g = er_gain * (0.85 ** i) * (0.7 + 0.3 * rng.random())
        ch = i % 2
        if p < ir.shape[1]:
            ir[ch, p] += g
            ir[1 - ch, min(ir.shape[1] - 1, p + S(0.0007))] += 0.6 * g
    return ir


def reverb(x, ir):
    return np.stack([fftconvolve(x[c], ir[c])[:x.shape[1]] for c in range(2)])


def reverb_circ(x, ir):
    return M.circ_conv(x, ir)


def loop_continuous(render, L, pre=3.0, xf=0.6):
    """Kontinuierliches Signal loop-nahtlos: mit Vorlauf rendern (Filter/Hall eingeschwungen),
    Überhang am Ende mit gleicher Leistung auf den Anfang überblenden (unkorreliertes Rauschen)."""
    P, X = S(pre), S(xf)
    y = render(L + P + X)[:, P:]
    w = np.linspace(0, np.pi / 2, X)
    head = y[:, :X] * np.sin(w) + y[:, L:L + X] * np.cos(w)
    return np.concatenate([head, y[:, X:L]], axis=1)


def fold(y, L):
    """Ereignisbus der Länge L+Nachlauf zirkulär falten (Nachlauf auf den Anfang addieren)."""
    out = y[:, :L].copy()
    tail = y[:, L:]
    while tail.shape[1] > 0:
        k = min(L, tail.shape[1])
        out[:, :k] += tail[:, :k]
        tail = tail[:, k:]
    return out


def gain_to(x, target):
    return 10 ** ((target - M.loudness_db(x)) / 20)


def master(x):
    x = filt(x, 'hp', 25)
    x = filt(x, 'lp', 11000, 0.6)
    return x


def master_circ(x):
    x = M.cfilt(x, 'hp', 25)
    x = M.cfilt(x, 'lp', 11000, 0.6)
    return x


def limit(x, ceil_db=-1.5):
    c = 10 ** (ceil_db / 20)
    thr = 0.75 * c
    x = M.soft_limit(x, thr, c)
    pk = np.max(np.abs(x))
    return x * (c / pk) if pk > c else x


# ---------------------------------------------------------------------------
# Außen: Regen, Stadt, Autos
# ---------------------------------------------------------------------------

RAIN_BANDS = ((700, 1.6, 60), (1100, 1.8, 110), (1700, 2.0, 190), (2600, 2.2, 260), (3900, 2.4, 260),
              (5600, 2.4, 140), (7400, 2.0, 50))  # (Mitte Hz, Güte, Tropfen/s je Kanal)


def rain(rng, n, intensity=1.0, shelter=True, gust_rate=0.12):
    """Regen: Grundrauschen + Tropfen-Prasseln in Bändern + Aufschläge aufs Haltestellendach + Rinnsal."""
    out = np.zeros((2, n))
    gust = smooth_noise(rng, n, gust_rate, 0.78, 1.18)
    # 1) diffuses Rauschen (weit entfernte Tropfen), leicht rosa
    w = rng.standard_normal((2, n))
    hiss = band(w, 350, 5200, 1)
    hiss = hiss + 0.5 * filt(hiss, 'lp', 1400)
    out += 0.34 * hiss * gust
    # 2) Prasseln: Poisson-Impulse, je Band ein kurzer Rauschkern, dann Bandpass
    kern_n = S(0.012)
    for fc, q, rate in RAIN_BANDS:
        for ch in range(2):
            cnt = rng.poisson(rate * intensity * n / SR)
            imp = np.zeros(n)
            pos = rng.integers(0, n, cnt)
            amp = (rng.pareto(2.6, cnt) + 0.25) * rng.choice([-1, 1], cnt)
            np.add.at(imp, pos, amp)
            k = burst(rng, kern_n, 0.0002, 0.0012 + 0.0018 * rng.random())
            y = fftconvolve(imp, k)[:n]
            out[ch] += 0.11 * bp(y, fc * (0.95 + 0.1 * rng.random()), q) * gust
    # 3) Aufschläge auf dem Plexiglasdach der Haltestelle (hart, hell, nah)
    if shelter:
        for ch in range(2):
            cnt = rng.poisson(22 * intensity * n / SR)
            imp = np.zeros(n)
            np.add.at(imp, rng.integers(0, n, cnt), (rng.pareto(3.0, cnt) + 0.3) * rng.choice([-1, 1], cnt))
            k = burst(rng, S(0.03), 0.0002, 0.004)
            y = fftconvolve(imp, k)[:n]
            y = 0.6 * bp(y, 1850, 5.0) + 0.4 * bp(y, 3100, 3.0) + 0.25 * bp(y, 900, 2.5)
            out[ch] += 0.16 * y
    # 4) Rinnsal im Rinnstein: Bandpass mit wandernder Mitte, blubbernd amplitudenmoduliert
    for ch, p in ((0, -0.5), (1, 0.4)):
        fc = smooth_noise(rng, n, 3.0, 380, 900)
        am = smooth_noise(rng, n, 9.0, 0.0, 1.0) ** 2
        tr = tv_bp(rng.standard_normal(n), fc, 5.0) * am
        out[ch] += 0.09 * tr
    return out


def city_far(rng, n):
    """Ferne Stadt: tiefes, langsam atmendes Verkehrsrauschen, keine Töne."""
    w = rng.standard_normal((2, n))
    brown = np.cumsum(w, axis=1)
    brown = filt(filt(brown, 'hp', 32), 'hp', 32)
    rumble = filt(filt(brown, 'lp', 260), 'lp', 260)
    rumble /= np.std(rumble) + 1e-9
    mid = band(rng.standard_normal((2, n)), 280, 1300, 1)
    mid /= np.std(mid) + 1e-9
    breathe = smooth_noise(rng, n, 0.08, 0.6, 1.2)
    return (0.5 * rumble + 0.12 * mid) * breathe


def car_pass(rng, dur, direction=1, d_min=9.0, speed=11.0, wet=1.0):
    """Auto auf nasser Straße: Reifenzischen + Abrollrumpeln, Entfernung/Pan/Luftdämpfung über die Zeit."""
    n = S(dur)
    t = tarr(n) - dur / 2
    x = speed * t * direction
    d = np.sqrt(d_min ** 2 + x ** 2)
    g = (d_min / d) ** 1.15
    pan = np.clip(x / np.sqrt(x ** 2 + d_min ** 2), -1, 1) * 0.9
    hiss = band(rng.standard_normal(n), 500, 6000, 1)
    hiss = 0.7 * hiss + 0.5 * bp(rng.standard_normal(n), 2300, 1.2) * wet
    roll = filt(filt(rng.standard_normal(n), 'lp', 140), 'lp', 140)
    roll /= np.std(roll) + 1e-9
    hiss /= np.std(hiss) + 1e-9
    src = 0.55 * hiss + 0.5 * roll
    cut = np.clip(9500 * (d_min / d) ** 0.7, 900, 9500)
    y = tv_lp(src, cut) * g
    y *= M.fade_edges(np.ones(n), 0.2, 0.2)
    a = (pan + 1) * np.pi / 4
    return np.stack([y * np.cos(a) * np.sqrt(2), y * np.sin(a) * np.sqrt(2)])


# ---------------------------------------------------------------------------
# Bus: Diesel aus Rauschimpulsen, Druckluft, Tür
# ---------------------------------------------------------------------------

def keyframes(n, pts):
    """[(sek, wert), ...] -> Kurve (weich interpoliert)."""
    ts = np.array([p[0] for p in pts]) * SR
    vs = np.array([p[1] for p in pts], float)
    c = np.interp(np.arange(n), ts, vs)
    return filt(filt(c, 'lp', 3.0), 'lp', 3.0) if n > SR else c


def diesel(rng, n, rpm, load):
    """Sechszylinder-Diesel: Zündimpulse als Rauschstöße (Rate = rpm/20), Karosserie-/Auspuffresonanzen,
    Nageln im Hochton, Sättigung. rpm/load: Kurven der Länge n."""
    f = rpm / 20.0  # 6 Zylinder, Viertakt: 3 Zündungen je Umdrehung
    ph = np.cumsum(f) / SR
    idx = np.nonzero(np.diff(np.floor(ph)) > 0)[0]
    exc = np.zeros(n)
    kn = S(0.02)
    bank = [burst(rng, kn, 0.0006, 0.004) for _ in range(12)]
    for j, p in enumerate(idx):
        p2 = p + int(rng.normal(0, 0.00035 * SR))
        if p2 < 0 or p2 >= n:
            continue
        a = (0.75 + 0.25 * rng.random()) * (0.45 + 0.75 * load[p]) * (0.9 if j % 6 == 2 else 1.0)
        k = bank[rng.integers(0, len(bank))] * a
        m = min(kn, n - p2)
        exc[p2:p2 + m] += k[:m]
    body = 0.9 * bp(exc, 95, 2.2) + 0.7 * bp(exc, 185, 2.0) + 0.35 * bp(exc, 420, 1.8)
    body += 0.6 * filt(filt(exc, 'lp', 160), 'lp', 160)
    body = sat(body / (np.std(body) * 3 + 1e-9), 1.8)
    clatter = band(exc, 1800, 5200, 1)
    clatter /= np.std(clatter) * 3 + 1e-9
    turbo = band(rng.standard_normal(n), 2200, 4500, 1) * (0.02 + 0.08 * load) * (rpm / 1500) ** 2
    y = body + (0.1 + 0.08 * load) * clatter + turbo
    return y


def air_hiss(rng, dur, lo=1300, hi=7500, att=0.004, hold=0.25, rel=0.7, sweep=0.5, crack=1.0):
    """Druckluft ablassen: breitbandiges Zischen, harter Einsatz, Spektrum sinkt beim Abklingen."""
    n = S(dur)
    t = tarr(n)
    e = np.clip(t / att, 0, 1) * np.where(t < att + hold, 1.0, np.exp(-(t - att - hold) / rel))
    src = band(rng.standard_normal(n), lo, hi, 1)
    cut = hi * (1 - sweep * np.clip(t / (hold + 2 * rel), 0, 1))
    y = tv_lp(src, cut) * e
    y += crack * 0.8 * band(burst(rng, n, 0.0005, 0.012), 900, 9000, 1)
    y += 0.12 * bp(rng.standard_normal(n), 3400, 6.0) * e  # leichte Ventil-Resonanz, verrauscht
    return norm(M.fade_edges(y, 0.0005, 0.05))


def door_thud(rng, heavy=0.6):
    n = S(0.35)
    lo = filt(filt(burst(rng, n, 0.001, 0.05), 'lp', 220), 'lp', 220)
    rub = bp(burst(rng, n, 0.0005, 0.018), 700, 1.5)
    rattle = band(burst(rng, n, 0.0003, 0.006), 1500, 5000, 1)
    y = norm(lo) * heavy + 0.35 * norm(rub) + 0.12 * norm(rattle)
    return norm(sat(y, 1.5))


def spatial(rng, mono, x_path, y_off, ref=5.0, pan_scale=0.95, lp_ref=10000.0, lp_min=600.0):
    """Mono-Quelle entlang x_path (Meter, Kurve) bei seitlichem Abstand y_off: Pegel ~1/d, Luftdämpfung, Pan."""
    d = np.sqrt(x_path ** 2 + y_off ** 2)
    g = np.minimum(1.0, ref / d)
    cut = np.clip(lp_ref * (ref / d) ** 0.65, lp_min, lp_ref)
    y = tv_lp(mono, cut) * g
    pan = np.clip(x_path / d, -1, 1) * pan_scale
    a = (pan + 1) * np.pi / 4
    return np.stack([y * np.cos(a) * np.sqrt(2), y * np.sin(a) * np.sqrt(2)]), d


# ---------------------------------------------------------------------------
# Innen: Schritte, Klicks, Lampenbrummen, Tür, Tropfen, ferner Club
# ---------------------------------------------------------------------------

def footstep(rng, bright=1.0, weight=1.0):
    """Schuh auf Steinstufe: Absatz, dumpfer Körper, Abrollen, Schleifen mit Sandkörnern."""
    n = S(0.32)
    heel = filt(filt(burst(rng, n, 0.0003, 0.005), 'lp', 2800 * bright), 'hp', 90)
    body = filt(filt(burst(rng, n, 0.001, 0.028), 'lp', 230), 'lp', 230)
    y = norm(heel) * 0.9 + norm(body) * 0.8 * weight
    toe_t = 0.055 + 0.03 * rng.random()
    toe = filt(burst(rng, n, 0.0003, 0.004), 'lp', 2000 * bright)
    p = S(toe_t)
    y[p:] += 0.35 * norm(toe)[:n - p]
    # Schleifen + Körnung
    t = tarr(n)
    sc0, scl = 0.02 + 0.03 * rng.random(), 0.05 + 0.07 * rng.random()
    e = np.clip((t - sc0) / 0.015, 0, 1) * np.exp(-np.maximum(t - sc0 - 0.015, 0) / scl)
    scuff = bp(rng.standard_normal(n), 2600 * bright, 0.8) * e
    grit = np.zeros(n)
    cnt = rng.poisson(35)
    pos = rng.integers(S(sc0), min(n - 1, S(sc0 + 3 * scl)), cnt)
    grit[pos] = rng.standard_normal(cnt)
    grit = filt(grit, 'hp', 3000) * e
    y += 0.10 * norm(scuff) + 0.07 * norm(grit)
    return norm(M.fade_edges(sat(y, 1.3), 0.0003, 0.05))


def click(rng, fc=2600, ring=1150, body=0.5):
    """Plastik-/Relaisklick: harter Rauschtransient + kurze Gehäuseresonanz + zweiter Kontakt."""
    n = S(0.12)
    exc = burst(rng, n, 0.0001, 0.0009)
    y = norm(bp(exc, fc, 1.2)) + 0.5 * mode(rng, exc, ring, 0.008)
    y += body * norm(filt(filt(burst(rng, n, 0.0005, 0.012), 'lp', 260), 'lp', 260))
    p = S(0.011 + 0.004 * rng.random())
    y[p:] += 0.45 * norm(bp(burst(rng, n - p, 0.0001, 0.0006), fc * 0.8, 1.5))
    return norm(M.fade_edges(y, 0.0001, 0.02))


def lamp_buzz(rng, n):
    """Altes Treppenhauslicht: 100-Hz-Brummen aus gepulstem Rauschen (kein Sinus), leicht flackernd."""
    t = tarr(n)
    gate = (0.5 + 0.5 * np.cos(2 * np.pi * 100 * t)) ** 10
    y = band(rng.standard_normal(n) * gate, 90, 2200, 1)
    y += 0.3 * filt(rng.standard_normal(n) * gate, 'lp', 400)
    y *= smooth_noise(rng, n, 1.5, 0.75, 1.0)
    return norm(y)


def fire_door(rng):
    """T30-Brandschutztür fällt ins Schloss: Luftzug, schwerer Schlag (rauschangeregte Blechmoden, gedämpft
    durch Mineralwolle), Druckwelle, Schlossfalle, Nachrappeln der Zarge. Rückgabe: (mono, Einschlag-Sek.)."""
    pre = 0.28
    n = S(pre + 1.6)
    y = np.zeros(n)
    # Luftzug vor dem Schlag
    t = tarr(S(pre))
    sw = band(rng.standard_normal(len(t)), 180, 1400, 1) * (t / pre) ** 2.5
    y[:len(t)] += 0.10 * norm(sw)
    p0 = S(pre)
    m = n - p0
    exc = burst(rng, m, 0.0004, 0.009)
    modes = ((58, 0.075, 1.0), (91, 0.11, 0.95), (143, 0.10, 0.75), (214, 0.085, 0.55), (318, 0.07, 0.42),
             (471, 0.055, 0.3), (690, 0.04, 0.22), (1040, 0.03, 0.14), (1570, 0.022, 0.09))
    metal = sum(a * mode(rng, exc, f * (1 + 0.01 * rng.standard_normal()), tau) for f, tau, a in modes)
    boom = norm(filt(filt(burst(rng, m, 0.002, 0.07), 'lp', 85), 'lp', 85))
    crack = norm(band(burst(rng, m, 0.0002, 0.012), 350, 4000, 1))
    hit = 0.9 * norm(metal) + 1.0 * boom + 0.45 * crack
    y[p0:] += norm(sat(hit, 1.4))
    # Schlossfalle rastet ein
    for dt, g, fc in ((0.052, 0.40, 2400), (0.066, 0.22, 3300)):
        q = p0 + S(dt)
        e2 = burst(rng, n - q, 0.0001, 0.0012)
        y[q:] += g * (norm(bp(e2, fc, 2.5)) + 0.6 * mode(rng, e2, fc * 0.72, 0.025))
    # Zarge rappelt nach
    for dt, g in ((0.13, 0.10), (0.19, 0.07), (0.27, 0.04), (0.38, 0.02)):
        q = p0 + S(dt + 0.01 * rng.random())
        e2 = burst(rng, n - q, 0.0001, 0.002)
        y[q:] += g * norm(bp(e2, 900 + 900 * rng.random(), 3.0))
    return norm(M.fade_edges(y, 0.001, 0.2)), pre


def drip(rng, f0=950, rise=1.7):
    """Wassertropfen in Pfütze: Auftreffklick + rauschangeregte Blasenresonanz mit steigender Tonhöhe."""
    n = S(0.15)
    t = tarr(n)
    exc = burst(rng, n, 0.0001, 0.0015)
    fc = f0 * (1 + (rise - 1) * np.clip(t / 0.022, 0, 1))
    y = norm(tv_bp(exc + 0.03 * rng.standard_normal(n) * np.exp(-t / 0.02), fc, 13.0, block=8))
    y *= np.exp(-t / 0.028)
    y += 0.35 * norm(band(burst(rng, n, 0.0001, 0.0006), 2500, 8000, 1))
    return norm(M.fade_edges(y, 0.0002, 0.03))


def club_kicks(rng, n, t_end=None, bpm=CLUB_BPM):
    """Ferner Club hinter Beton: nur Kick und Offbeat-Bass kommen durch (steiler Tiefpass bei 95 Hz).
    Schläge nur bis t_end (für Loops: der Nachlauf wird danach auf den Anfang gefaltet)."""
    spb = 60.0 / bpm
    t_end = n / SR if t_end is None else t_end
    y = np.zeros(n)
    kk = M.kick(rng, f0=47, fstart=120, decay=0.3, dull=1.0)
    thump = filt(filt(burst(rng, len(kk), 0.002, 0.06), 'lp', 120), 'lp', 120)
    kk = norm(kk + 0.6 * norm(thump))
    bass = M.bassnote(rng, float(M.mtof(M.nm('A1'))), 0.18, cutoff=180, drive=1.5)
    b = 0
    while b * spb < t_end - 1e-6:
        tb = b * spb
        p = S(tb)
        m = min(len(kk), n - p)
        y[p:p + m] += kk[:m] * (0.95 + 0.1 * rng.random())
        pb = S(tb + spb / 2)
        m = min(len(bass), n - pb)
        if m > 0:
            y[pb:pb + m] += 0.35 * bass[:m]
        b += 1
    y = filt(filt(filt(y, 'lp', 95), 'lp', 95), 'hp', 28)
    return y / 3.0


def structure_noise(rng, n):
    """Körperschall: tiefes Rauschen, das mit dem Haus mitschwingt."""
    s = filt(filt(rng.standard_normal(n), 'lp', 70), 'lp', 70)
    return s / (np.std(s) * 4 + 1e-9)


def room_tone(rng, n, lp=220, air=0.15):
    w = rng.standard_normal((2, n))
    brown = np.cumsum(w, axis=1)
    brown = filt(filt(brown, 'hp', 25), 'hp', 25)
    lo = filt(filt(brown, 'lp', lp), 'lp', lp)
    lo /= np.std(lo) + 1e-9
    hi = band(rng.standard_normal((2, n)), 400, 3500, 1)
    hi /= np.std(hi) + 1e-9
    return lo + air * hi


# ---------------------------------------------------------------------------
# Musik: Theme-1-Pad (Am9 / Fmaj7) und Motiv, nur als leiser Untergrund
# ---------------------------------------------------------------------------

AM9 = ('A2', [0, 3, 7, 10, 14])
FMAJ7 = ('F2', [0, 4, 7, 11, 14])


def pad(rng, chord, dur, cutoff=800, att=2.5, rel=3.0, octave=12):
    root, iv = chord
    fr = M.mtof([M.nm(root) + octave + i for i in iv])
    return M.pad_voice(rng, fr, dur, cutoff=cutoff, att=att, rel=rel, detune=(-11, 0, 8), q=0.7)


def motif_line(rng, spb, transpose=-12, cutoff=1300):
    """Theme-Motiv (Spätileuchte-Summen) als weiche, gefilterte Sägezahnlinie (keine Sinusstimme)."""
    notes = []
    for ph_i, ph in enumerate(M.THEME_MOTIF):
        for bt, note, d in ph:
            notes.append((ph_i * 8 + bt, M.nm(note) + transpose, d))
    total = 16 * spb + 3.0
    y = np.zeros(S(total))
    for bt, m, d in notes:
        v = M.pad_voice(rng, [float(M.mtof(m))], d * spb * 0.95, cutoff=cutoff, att=0.18, rel=0.9,
                        detune=(-7, 5), q=0.6)
        p = S(bt * spb)
        k = min(len(v), len(y) - p)
        y[p:p + k] += v[:k]
    return y


# ---------------------------------------------------------------------------
# Seiten
# ---------------------------------------------------------------------------

def outdoor_room():
    return make_room('street', 0.9, 4200, 0.012, er=(0.018, 0.031, 0.047, 0.066), er_gain=0.45)


def outdoor_bed(rng, n, room, rain_int=1.0):
    r = rain(rng, n, rain_int)
    c = city_far(rng, n)
    dry = r + 0.10 * c
    return dry + 0.22 * reverb(r, room)


def music_bed(rng, name, L, tail, spb, with_motif=True, chords=(AM9, FMAJ7, AM9, FMAJ7)):
    """Pad-Akkorde je 8 Beats + Motiv in der zweiten Hälfte, weit weg und gedämpft."""
    y = np.zeros((2, L + tail))
    step = 8 * spb
    for i, ch in enumerate(chords):
        v = pad(rng, ch, step, cutoff=750, att=2.8, rel=3.2)
        place(y, v, i * step, 0.55, -0.15 if i % 2 else 0.15)
    if with_motif:
        mo = motif_line(rng, spb)
        place(y, mo, 16 * spb, 0.33, -0.1)
    y = filt(y, 'lp', 1900)
    hall = make_room(name + '-music', 3.6, 2400, 0.04, width=1.0)
    return 0.55 * y + 0.8 * reverb(y, hall)


def page1():
    """Loop, 32 s bei 60 BPM: Regen an der Haltestelle, zwei Autos auf nasser Straße, Pad + Motiv."""
    name = 'intro_1'
    L, tail, spb = S(32.0), S(8.0), 1.0
    rng = seed(name)
    room = outdoor_room()
    amb = loop_continuous(lambda n: outdoor_bed(seed(name, 'bed'), n, room), L)
    ev = np.zeros((2, L + tail))
    place(ev, car_pass(seed(name, 'car1'), 7.0, 1, 10.0, 12.0), 3.5, 0.55)
    place(ev, car_pass(seed(name, 'car2'), 8.0, -1, 13.0, 9.5), 18.0, 0.40)
    ev = ev + 0.25 * reverb(ev, room)
    mus = music_bed(rng, name, L, tail, spb)
    return amb, fold(ev, L), fold(mus, L), L


def page2():
    """Einmalig, 36 s: Tür zu, Druckluftbremse, Bus fährt nach rechts davon, hält fern an einer Ampel
    (Druckluft zischt entfernt), fährt weiter; danach nur Regen, das Pad kehrt zurück."""
    name = 'intro_2'
    N = S(36.0)
    rng = seed(name)
    room = outdoor_room()
    amb = outdoor_bed(seed(name, 'bed'), N, room)
    # Fahrt: Geschwindigkeit (m/s), Position integrieren
    v = keyframes(N, [(0, 0), (2.7, 0), (3.2, 1.2), (6.0, 5.5), (6.4, 5.2), (10.0, 10.0), (10.4, 9.6),
                      (13.5, 12.0), (15.5, 9.0), (17.2, 0.0), (21.5, 0.0), (23.0, 3.0), (28.0, 10.0), (36, 12.0)])
    v = np.maximum(v, 0)
    x = 2.0 + np.cumsum(v) / SR
    rpm = keyframes(N, [(0, 610), (2.7, 610), (3.0, 800), (6.0, 1550), (6.3, 1050), (10.0, 1500), (10.4, 1120),
                        (13.5, 1380), (15.0, 900), (17.0, 620), (21.5, 620), (22.5, 1100), (28, 1500), (36, 1400)])
    load = keyframes(N, [(0, 0.2), (2.8, 0.2), (3.1, 0.95), (6.0, 0.9), (6.3, 0.5), (6.6, 0.85), (10.0, 0.8),
                         (10.4, 0.5), (10.7, 0.75), (13.5, 0.6), (14.5, 0.15), (21.5, 0.15), (22.3, 0.9),
                         (28, 0.7), (36, 0.5)])
    eng = diesel(seed(name, 'diesel'), N, rpm, load)
    tires = band(rng.standard_normal(N), 600, 5000, 1)
    tires = tires / (np.std(tires) * 3) * (v / 12.0) ** 1.4
    src = 0.5 * eng / (np.std(eng[:S(2.5)]) * 3 + 1e-9) + 0.55 * tires
    bus, d = spatial(seed(name, 'sp'), src, x, 4.5, ref=5.0)
    bus *= M.fade_edges(np.ones(N), 0.25, 3.0)
    ev = np.zeros((2, N))
    ev += 1.9 * bus
    # Tür: Druckluft kurz + Schlag (nah, rechts), dann Bremse lösen: lautes Zischen
    place(ev, air_hiss(seed(name, 'door'), 0.9, 1500, 6000, 0.01, 0.18, 0.2, 0.3, crack=0.3), 0.85, 0.9, 0.35)
    place(ev, door_thud(seed(name, 'thud'), 0.8), 1.28, 1.6, 0.35)
    place(ev, air_hiss(seed(name, 'brake'), 2.2, 1100, 8000, 0.003, 0.28, 0.55, 0.55, crack=1.0), 2.25, 1.9, 0.45)
    # entfernte Druckluftbremse an der Ampel (~110 m): leise, dumpf, viel Hall
    far = air_hiss(seed(name, 'far'), 2.5, 900, 5000, 0.01, 0.35, 0.6, 0.4, crack=0.4)
    far = filt(filt(far, 'lp', 2200), 'lp', 2200)
    df = float(d[S(17.4)])
    place(ev, far, 17.4, 1.9 * min(1.0, 5.0 / df) * 5.0, 0.85)
    hall_far = make_room('intro_2-far', 1.8, 2500, 0.05)
    ev = ev + 0.22 * reverb(ev, room) + 0.25 * reverb(filt(ev, 'lp', 3000), hall_far)
    # Pad kehrt nach dem Bus zurück (endet dort, wo intro_1 wieder beginnt: Am9)
    mus = np.zeros((2, N))
    v1 = pad(seed(name, 'pad'), FMAJ7, 9.0, cutoff=700, att=5.0, rel=3.0)
    v2 = pad(seed(name, 'pad2'), AM9, 8.0, cutoff=750, att=3.0, rel=3.0)
    place(mus, v1, 22.0, 0.5, -0.1)
    place(mus, v2, 30.0, 0.5, 0.1)
    mus = filt(mus, 'lp', 1900)
    mus = 0.55 * mus + 0.8 * reverb(mus, make_room('intro_1-music', 3.6, 2400, 0.04))
    # Stimmung aus Seite 1 läuft weiter: Motiv entfällt, Pad in den ersten Sekunden als Ausklang
    tail1 = pad(seed(name, 'pad0'), AM9, 1.0, cutoff=750, att=0.05, rel=3.5)
    place(mus, filt(tail1, 'lp', 1900), 0.0, 0.3, 0.1)
    return amb, ev, mus, N


def stair_room():
    return make_room('stairs', 1.7, 4800, 0.006, er=(0.009, 0.014, 0.021, 0.029, 0.037, 0.052), er_gain=0.55,
                     width=0.9)


def page3():
    """Loop, 24 s: Minutenlicht an (Klick, Relais, Lampenbrummen), Schritte die Steintreppe hinab mit zwei
    Absätzen, gedämpfter Regen von draußen; bei 21 s geht das Licht wieder aus (Relais-Klick)."""
    name = 'intro_3'
    L, tail = S(24.0), S(6.0)
    rng = seed(name)
    room = stair_room()

    def bed(n):
        r = seed(name, 'bed')
        outside = rain(r, n, 0.9, shelter=False)
        outside = filt(filt(outside, 'lp', 520), 'lp', 520)
        rt = room_tone(r, n, 180, 0.08)
        return 0.2 * outside + 0.025 * rt

    amb = loop_continuous(bed, L)
    ev = np.zeros((2, L + tail))
    # Licht an: Taster, dann Relais im Keller-/Flurverteiler
    place(ev, click(seed(name, 'btn'), 3200, 1500, 0.2), 0.25, 0.22, -0.35)
    place(ev, click(seed(name, 'rel'), 1900, 820, 0.8), 0.42, 0.16, 0.25)
    bz = lamp_buzz(seed(name, 'buzz'), S(20.6))
    bz = M.fade_edges(bz, 0.015, 0.01)
    place(ev, bz, 0.43, 0.012, 0.1)
    # Schritte: 9 Stufen, Absatz (zwei kurze Drehschritte), 9 Stufen, Absatz, 6 Stufen
    t = 1.25
    k = 0
    for flight, count in enumerate((9, 9, 6)):
        for i in range(count):
            depth = (k / 24.0)
            st = footstep(seed(name, 'step', k), bright=1.0 - 0.35 * depth, weight=0.9 + 0.2 * (k % 2))
            pan = (-0.25 if k % 2 else 0.1) + 0.3 * (0.5 - depth)
            place(ev, st, t + rng.normal(0, 0.015), 0.34 * (0.85 + 0.15 * rng.random()) * (1 - 0.35 * depth), pan)
            t += 0.5 + 0.04 * rng.random()
            k += 1
        if flight < 2:
            for j in range(2):
                st = footstep(seed(name, 'turn', flight, j), bright=0.8, weight=0.6)
                place(ev, st, t + 0.15 + 0.32 * j, 0.18, 0.2 if j else -0.2)
            t += 1.05
    # Licht aus
    place(ev, click(seed(name, 'off'), 1800, 780, 0.9), 21.05, 0.16, 0.25)
    ev = 0.75 * ev + 0.55 * reverb(ev, room)
    # dunkles Pad, kaum hörbar (Am, eine Oktave tiefer, stark gefiltert)
    mus = np.zeros((2, L + tail))
    v = pad(seed(name, 'pad'), AM9, 24.0 - 3.0, cutoff=420, att=3.0, rel=3.0, octave=0)
    place(mus, v, 0.0, 0.5, 0.0)
    mus = 0.6 * mus + 0.7 * reverb(mus, room)
    return amb, fold(ev, L), fold(mus, L), L


def cellar_room():
    return make_room('cellar', 2.7, 1800, 0.018, er=(0.011, 0.019, 0.031, 0.047, 0.063), er_gain=0.5)


DRIP_SPOTS = ((820, 1.8, -0.55, 1.0), (1180, 1.6, 0.4, 0.7), (660, 2.0, 0.75, 0.5))  # (Hz, Anstieg, Pan, Pegel)


def drips(rng, ev, t_from, t_to, min_gap=1.3, max_gap=3.6):
    t = t_from
    while t < t_to:
        f0, rise, pan, g = DRIP_SPOTS[rng.integers(0, len(DRIP_SPOTS))]
        d = drip(rng, f0 * (0.97 + 0.06 * rng.random()), rise)
        place(ev, d, t, 0.12 * g * (0.7 + 0.3 * rng.random()), pan)
        t += min_gap + (max_gap - min_gap) * rng.random()


def cellar_bed(rng, n, room):
    rt = room_tone(rng, n, 200, 0.05)
    club = pan_st(club_kicks(seed('club'), n) + 0.25 * structure_noise(rng, n), 0.2)
    return 0.004 * rt + 0.07 * club + 0.028 * reverb(club, room)


def page4():
    """Einmalig, 12 Takte zu 124 BPM (23,2 s): RUMS, Kellerhall, Stille; Raumton, Tropfen und ferner Bass
    blenden ein. Endet auf einer Taktgrenze, danach läuft intro_keller im selben Raster."""
    name = 'intro_4'
    N = S(12 * CLUB_BAR)
    rng = seed(name)
    room = cellar_room()
    bed = cellar_bed(seed(name, 'bed'), N, room)
    t = tarr(N)
    fade_in = np.clip((t - 4.0) / 9.0, 0, 1) ** 1.5
    amb = bed * fade_in
    ev = np.zeros((2, N))
    door, pre = fire_door(seed(name, 'door'))
    place(ev, door, 0.0, 0.105, -0.45)
    # Nachhall-Druck: tiefes Rumpeln im Beton
    drips(seed(name, 'drips'), ev, 4.2, N / SR - 1.0)
    ev = 0.8 * ev + 0.6 * reverb(ev, room)
    mus = np.zeros((2, N))
    v = pad(seed(name, 'pad'), AM9, N / SR - 8.0, cutoff=330, att=5.0, rel=2.0, octave=0)
    place(mus, v, 8.0, 0.35, 0.0)
    mus = 0.5 * mus + 0.7 * reverb(mus, room)
    return amb, ev, mus, N


def keller():
    """Loop, 16 Takte zu 124 BPM (31,0 s): Raumton, Tropfen, ferner Clubbass, kaum hörbares Pad."""
    name = 'intro_keller'
    L, tail = S(16 * CLUB_BAR), S(6.0)
    room = cellar_room()
    # Club-Raster muss bei 0 beginnen und nahtlos loopen: 16 ganze Takte, Rauschanteile per Überblendung
    rng = seed(name)
    rt = loop_continuous(lambda n: 0.004 * room_tone(seed(name, 'rt'), n, 200, 0.05)
                         + 0.07 * 0.25 * pan_st(structure_noise(seed(name, 'st'), n), 0.2), L)
    club = pan_st(club_kicks(seed('club'), L + tail, t_end=L / SR), 0.2)
    club = fold(0.07 * club + 0.028 * reverb(club, room), L)
    amb = rt + club
    ev = np.zeros((2, L + tail))
    drips(seed(name, 'drips'), ev, 0.6, L / SR - 0.2)
    ev = 0.8 * ev + 0.6 * reverb(ev, room)
    mus = np.zeros((2, L + tail))
    v = pad(seed(name, 'pad'), AM9, L / SR - 5.0, cutoff=330, att=5.0, rel=5.0, octave=0)
    place(mus, v, 0.0, 0.35, 0.0)
    mus = 0.5 * mus + 0.7 * reverb(mus, room)
    return amb, fold(ev, L), fold(mus, L), L


# Balance je Seite: (Ambience, Ereignisse, Musik) in dB relativ zur jeweiligen Summe vor der Normierung
MUSIC_DB = {'intro_1': -9.0, 'intro_2': -9.0, 'intro_3': -14.0, 'intro_4': -12.0, 'intro_keller': -12.0}


def balance(name, amb, ev, mus):
    """Musik relativ zur Ambience einpegeln (Ambience + Ereignisse bleiben physikalisch zueinander)."""
    ref = M.loudness_db(amb)
    g = 10 ** ((ref + MUSIC_DB[name] - M.loudness_db(mus)) / 20) if np.any(mus) else 0.0
    return amb + ev + g * mus


def render_all(names):
    out = {}
    need = set(names)
    if need & {'intro_1', 'intro_2'}:
        a, e, m, L = page1()
        x1 = master_circ(balance('intro_1', a, e, m))
        g_out = gain_to(x1, TARGET_OUTDOOR)
        out['intro_1'] = limit(x1 * g_out)
        if 'intro_2' in need:
            a, e, m, N = page2()
            # gleiche Musikverstärkung wie Seite 1: Ambience-Referenz aus Seite 1
            x2 = master(balance_ref(a, e, m, page_ref=('intro_1',)))
            x2 = x2 * g_out
            x2 = M.fade_edges(x2, 0.25, 0.35)
            out['intro_2'] = limit(x2)
    if 'intro_3' in need:
        a, e, m, L = page3()
        x3 = master_circ(balance('intro_3', a, e, m))
        out['intro_3'] = limit(x3 * gain_to(x3, TARGET_HALL))
    if need & {'intro_4', 'intro_keller'}:
        a, e, m, L = keller()
        xk = master_circ(balance('intro_keller', a, e, m))
        g_c = gain_to(xk, TARGET_CELLAR)
        out['intro_keller'] = limit(xk * g_c)
        if 'intro_4' in need:
            a, e, m, N = page4()
            x4 = master(balance('intro_4', a, e, m)) * g_c
            x4 = M.fade_edges(x4, 0.0005, 0.25)
            out['intro_4'] = limit(x4, -1.5)
    return {k: v for k, v in out.items() if k in need}


_MUS_GAIN_CACHE = {}


def balance_ref(amb, ev, mus, page_ref):
    """Seite 2: Musik mit derselben Verstärkung wie auf Seite 1 (Pad soll gleich laut zurückkommen)."""
    # Seite 1 ist auf Ambience-Referenz -9 dB gepegelt; Seite 2 nutzt die eigene Regen-Referenz,
    # die physikalisch identisch erzeugt wird. Ergebnis: gleiche Relation Regen : Pad.
    ref = M.loudness_db(amb)
    g = 10 ** ((ref + MUSIC_DB['intro_2'] - M.loudness_db(mus[:, S(22):])) / 20)
    return amb + ev + g * mus


NAMES = ['intro_1', 'intro_2', 'intro_3', 'intro_4', 'intro_keller']
LOOPS = {'intro_1', 'intro_3', 'intro_keller'}


# ---------------------------------------------------------------------------
# Prüfung
# ---------------------------------------------------------------------------

def analyze(path, name):
    x, sr = sf.read(path)
    m = x.mean(axis=1)
    pk = 20 * np.log10(np.max(np.abs(x)))
    lud = M.loudness_db(x.T)
    fr = 4096
    nfr = len(m) // fr
    F = np.abs(np.fft.rfft(m[:nfr * fr].reshape(nfr, fr) * np.hanning(fr), axis=1))
    freqs = np.fft.rfftfreq(fr, 1 / sr)
    cent = float(np.sum(F * freqs) / np.sum(F))
    hf = float(np.sum(F[:, freqs > 8000] ** 2) / np.sum(F ** 2))
    # Kurzzeit-Lautheit (3 s Fenster): Dynamikumfang
    win = 3 * sr
    st = [M.loudness_db(x[i:i + win].T) for i in range(0, len(m) - win, sr)]
    res = dict(name=name, dur=round(len(m) / sr, 2), peak_db=round(pk, 2), loud_db=round(lud, 2),
               short_loud_min=round(min(st), 1), short_loud_max=round(max(st), 1),
               centroid_hz=round(cent), hf_share_8k=round(hf, 5), size_kb=round(os.path.getsize(path) / 1024))
    if name in LOOPS:
        w = int(0.05 * sr)
        around = np.concatenate([x[-w:], x[:w]])
        steps = np.abs(np.diff(around, axis=0)).max(axis=1)
        res['seam_jump'] = round(float(np.max(np.abs(x[0] - x[-1]))), 5)
        res['seam_local_max_step'] = round(float(np.max(np.delete(steps, w - 1))), 5)
    return res


def png_overview(paths, outdir):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    n = len(paths)
    fig, axes = plt.subplots(n, 2, figsize=(15, 2.4 * n), squeeze=False,
                             gridspec_kw=dict(width_ratios=[1, 2]))
    for r, (name, p) in enumerate(paths):
        x, sr = sf.read(p)
        m = x.mean(axis=1)
        t = np.arange(len(m)) / sr
        ax = axes[r][0]
        ax.plot(t[::20], x[::20, 0], lw=0.3, color='#446')
        ax.plot(t[::20], x[::20, 1], lw=0.3, color='#a64', alpha=0.6)
        ax.set_ylim(-1, 1)
        ax.set_title(name, fontsize=9)
        ax = axes[r][1]
        ax.specgram(m, NFFT=2048, Fs=sr, noverlap=1024, cmap='magma', vmin=-125, vmax=-40)
        ax.set_yscale('symlog', linthresh=200)
        ax.set_ylim(20, 16000)
        ax.set_title(name + ' (Spektrogramm)', fontsize=9)
    fig.tight_layout()
    out = os.path.join(outdir, 'intro_audio.png')
    fig.savefig(out, dpi=90)
    plt.close(fig)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--only', nargs='*', help='nur diese Dateien (ohne .ogg)')
    ap.add_argument('--out', default=MUSIC_DIR)
    ap.add_argument('--level', type=float, default=VORBIS_LEVEL, help='Vorbis compression_level 0..1')
    ap.add_argument('--report', help='Ordner für Metriken (JSON) und Spektrogramm-PNG')
    ap.add_argument('--analyze-only', action='store_true')
    ap.add_argument('--wav', action='store_true', help='zusätzlich WAV (unkomprimiert) in --report ablegen')
    a = ap.parse_args()
    names = a.only or NAMES
    for n in names:
        if n not in NAMES:
            sys.exit('Unbekannt: ' + n)
    os.makedirs(a.out, exist_ok=True)
    paths = [(n, os.path.join(a.out, n + '.ogg')) for n in names]
    if not a.analyze_only:
        audio = render_all(names)
        for n, p in paths:
            M.write_ogg(p, audio[n], a.level)
            print('geschrieben', p, os.path.getsize(p) // 1024, 'KB')
            if a.wav and a.report:
                os.makedirs(a.report, exist_ok=True)
                sf.write(os.path.join(a.report, n + '.wav'), audio[n].T.astype(np.float32), SR)
    if a.report:
        os.makedirs(a.report, exist_ok=True)
        stats = [analyze(p, n) for n, p in paths]
        for s in stats:
            print(json.dumps(s, ensure_ascii=False))
        with open(os.path.join(a.report, 'intro_metrics.json'), 'w') as fh:
            json.dump(stats, fh, indent=1, ensure_ascii=False)
        try:
            print('PNG', png_overview(paths, a.report))
        except ImportError:
            print('matplotlib fehlt, keine PNGs')


if __name__ == '__main__':
    main()
