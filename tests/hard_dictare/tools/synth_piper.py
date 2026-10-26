#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generează audio sintetic (Piper RO, vocea ro_RO-mihai-medium) pentru setul greu.

NU rulează motorul D&TED. Doar produce WAV 16 kHz mono + gold + manifest.
Rulat pe box (Linux):  python3 tools/synth_piper.py --piper /workspace/piper-venv/bin/piper \
      --voice /workspace/piper-voices/ro_RO-mihai-medium.onnx
Necesită: piper-tts, numpy, ffmpeg.
"""
import argparse, json, os, re, subprocess, sys, tempfile, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from samples_ro import SAMPLES  # noqa: E402
from samples_ro_extra import EXTRA_SAMPLES  # noqa: E402
ALL_SAMPLES = SAMPLES + EXTRA_SAMPLES

SR = 16000


def run(cmd, **kw):
    subprocess.run(cmd, check=True, **kw)


def tts(piper, voice, text, out_wav, length_scale=1.0, silence=0.45, seed_noise=0.667):
    with tempfile.TemporaryDirectory() as td:
        txt = os.path.join(td, "in.txt")
        # o propoziție pe linie => Piper inserează --sentence-silence între ele
        sents = re.split(r"(?<=[.?!])\s+", text.strip())
        with open(txt, "w", encoding="utf-8") as f:
            f.write(" ".join(sents))
        raw = os.path.join(td, "raw.wav")
        run([piper, "-m", voice, "-i", txt, "-f", raw, "--length-scale", str(length_scale),
             "--sentence-silence", str(silence), "--noise-scale", str(seed_noise)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-ac", "1", "-ar", str(SR),
             "-sample_fmt", "s16", out_wav])


def read_wav(p):
    with wave.open(p) as w:
        assert w.getframerate() == SR and w.getnchannels() == 1
        return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def write_wav(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-12)


def pink_noise(n, rng):
    white = rng.standard_normal(n)
    f = np.fft.rfft(white)
    k = np.arange(len(f)); k[0] = 1
    return np.fft.irfft(f / np.sqrt(k), n).astype(np.float32)


def make_noisy(piper, voice, sample, clean_wav, out_wav, rng):
    main = read_wav(clean_wav)
    # al doilea vorbitor: aceeași voce, ridicată cu ~3 semitonuri (1.189x), durată păstrată
    sents = re.split(r"(?<=[.?!])\s+", sample["interferer"].strip())
    mix = main.copy()
    n = len(main)
    # ferestre de suprapunere distribuite pe durată
    starts = np.linspace(0.08, 0.80, len(sents)) * n
    with tempfile.TemporaryDirectory() as td:
        for i, (s, st) in enumerate(zip(sents, starts)):
            a = os.path.join(td, f"i{i}.wav"); b = os.path.join(td, f"i{i}p.wav")
            tts(piper, voice, s, a, length_scale=0.9, silence=0.1)
            run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-af",
                 f"asetrate={SR}*1.189,aresample={SR},atempo={1/1.189:.4f}", "-ac", "1", b])
            x = read_wav(b)
            x = x / rms(x) * rms(main) * 10 ** (-12 / 20)   # -12 dB față de vorbitorul principal
            st = int(st); e = min(n, st + len(x))
            mix[st:e] += x[: e - st]
    noise = pink_noise(n, rng)
    noise = noise / rms(noise) * rms(main) * 10 ** (-10 / 20)  # SNR ~10 dB
    t = np.arange(n) / SR
    hum = 0.5 * rms(main) * 10 ** (-20 / 20) * np.sin(2 * np.pi * 50 * t) * np.sqrt(2)
    mix = mix + noise + hum
    peak = np.max(np.abs(mix))
    if peak > 0.97:
        mix *= 0.97 / peak
    write_wav(out_wav, mix.astype(np.float32))


def make_dialogue(piper, voice, turns, out_wav, gap=0.5):
    """Vorbitor A = vocea de bază; B = aceeași voce, pitch +3 semitonuri (SINTETIC)."""
    parts = []
    with tempfile.TemporaryDirectory() as td:
        for i, (spk, text) in enumerate(turns):
            a = os.path.join(td, f"t{i}.wav")
            tts(piper, voice, text, a)
            if spk != "A":
                b = os.path.join(td, f"t{i}p.wav")
                run(["ffmpeg", "-y", "-loglevel", "error", "-i", a, "-af",
                     f"asetrate={SR}*1.189,aresample={SR},atempo={1/1.189:.4f}", "-ac", "1", b])
                a = b
            parts.append(read_wav(a)); parts.append(np.zeros(int(gap * SR), np.float32))
    write_wav(out_wav, np.concatenate(parts))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--piper", default="piper")
    ap.add_argument("--voice", required=True)
    ap.add_argument("--only", nargs="*", help="regenerează doar aceste id-uri; restul manifestului se păstrează")
    args = ap.parse_args()
    rng = np.random.default_rng(20261026)
    manifest = []
    old = {}
    mp = os.path.join(ROOT, "manifest.json")
    if args.only and os.path.isfile(mp):
        old = {e["id"]: e for e in json.load(open(mp, encoding="utf-8"))["samples"]}
    for s in ALL_SAMPLES:
        sid = s["id"]
        if args.only and sid not in args.only:
            if sid in old:
                manifest.append(old[sid])
            continue
        gold_p = os.path.join(ROOT, "gold", sid + ".txt")
        with open(gold_p, "w", encoding="utf-8") as f:
            f.write(s["gold"].strip() + "\n")
        tts_text = ("\n".join(f"[{a}] {t}" for a, t in s["turns"]) if s.get("turns") else None) or s["tts"] or s["gold"]
        with open(os.path.join(ROOT, "tts_text", sid + ".txt"), "w", encoding="utf-8") as f:
            f.write(tts_text.strip() + "\n")
        with open(os.path.join(ROOT, "facts", sid + ".json"), "w", encoding="utf-8") as f:
            json.dump(s["facts"], f, ensure_ascii=False, indent=2)
        audio_rel = f"audio/{sid}.wav"
        clean = os.path.join(ROOT, audio_rel)
        if s["category"] == "noisy_overlap":
            clean = os.path.join(ROOT, "audio", sid + "_curat_control.wav")
            tts(args.piper, args.voice, tts_text, clean)
            make_noisy(args.piper, args.voice, s, clean, os.path.join(ROOT, audio_rel), rng)
            with open(os.path.join(ROOT, "tts_text", sid + "_interferent.txt"), "w", encoding="utf-8") as f:
                f.write(s["interferer"].strip() + "\n")
        elif s.get("turns"):
            make_dialogue(args.piper, args.voice, s["turns"], clean)
        else:
            tts(args.piper, args.voice, tts_text, clean)
        dur = len(read_wav(os.path.join(ROOT, audio_rel))) / SR
        entry = {"id": sid, "category": s["category"], "audio": audio_rel,
                 "duration_sec": round(dur, 2), "gold": f"gold/{sid}.txt",
                 "tts_text": f"tts_text/{sid}.txt", "facts": f"facts/{sid}.json",
                 "hyp": f"hyp/{sid}.txt", "summary": f"hyp/{sid}.summary.txt",
                 "dted_log": f"hyp/{sid}.dted.jsonl",
                 "source": "synthetic: Piper ro_RO-mihai-medium" +
                           (" (speaker B = same voice, pitch +3 st)" if s.get("turns") else ""),
                 "notes": s["notes"]}
        if s.get("focus_marks"):
            entry["focus_marks"] = s["focus_marks"]
        if s["category"] == "noisy_overlap":
            entry["control_clean_audio"] = f"audio/{sid}_curat_control.wav"
            entry["control_clean_duration_sec"] = round(len(read_wav(clean)) / SR, 2)
        manifest.append(entry)
        print(f"{sid:28s} {dur:7.2f}s")
    with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"version": 1, "language": "ro", "sample_rate": SR,
                   "do_not_run_without_user_ok": True, "samples": manifest},
                  f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
