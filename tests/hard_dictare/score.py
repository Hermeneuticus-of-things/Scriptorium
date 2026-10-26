#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Scorer pentru setul greu de dictare D&TED (ASR eek + rezumator OpenLLM-Ro).

NU pornește DTED.exe și NU transcrie nimic. Compară fișiere text deja produse.

Mod manifest (toate probele):
    python score.py --manifest manifest.json
Mod o singură probă:
    python score.py --ref gold/01_idei_lungi.txt --hyp hyp/01_idei_lungi.txt
    python score.py --ref gold/02_autocorectari.txt --hyp hyp/02_autocorectari.txt \
        --summary hyp/02_autocorectari.summary.txt --dted-log hyp/02_autocorectari.dted.jsonl
Opțiuni utile: --normalize-numbers  --thresholds thresholds.json  --out results/last_score.json
Doar stdlib Python 3.8+. Folosește jiwer doar dacă e instalat (verificare încrucișată WER).
"""
import argparse, json, os, re, sys, unicodedata
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------- normalizare
_CEDILLA = str.maketrans({"ş": "ș", "Ş": "Ș", "ţ": "ț", "Ţ": "Ț"})

# Aceeași listă de cuvinte funcționale ca în cpp/summarizer/src/text_ro.cpp
STOPWORDS = set("""a acea aceasta această aceea acei aceia acel acela acele acelea acest acesta aceste
acestea acestei acestor acestui acolo acum adică ai aia aici al ale alt alta altă alte altul am apoi
ar are aș ați au avea aveau avem aveți avut azi băi c ca că căci care cărei căror cărui cât câte câți
către ce cea cei cel cele celor celui ceva chiar cine cineva cu cum cumva d da dacă dar de deci deja
deoarece deși despre din dintr dintre doar după e ea ei el ele era erau este eu fi fie fiecare fiind
fost fără i ia iar ii îi îl îmi împotriva în înainte încât încă între într îți l la le li lor lui m
mai mă mea mei mele mereu meu mi mie mine mult multă mulți n na ne nici nimic noi nostru noastră nu o
or ori oricare orice pe pentru peste poate pot prea prin printr s sa să sau se său sale sânt sunt
suntem sunteți sub și îs t ta tale te ți tot toată toate toți tu tău un una unde unei unor unui unul
v va vă voi vom vor vreo vreun fiindcă totuși astfel foarte atunci când decât până""".split())

PUNCT_CLASS = {".": "period", "…": "period", "!": "exclam", "?": "question",
               ",": "comma", ";": "comma", ":": "comma"}
SENT_END = {"period", "exclam", "question"}

WORD_RE = re.compile(
    r"\d+(?:[.,:]\d+)*"                       # 13:15  2,5  1.500
    r"|[^\W\d_]+(?:[-'’][^\W\d_]+)*",          # cuvinte, cu cratimă (s-a, Cluj-Napoca)
    re.UNICODE)


def norm_word(w):
    w = unicodedata.normalize("NFC", w).translate(_CEDILLA).lower().replace("’", "'")
    return w


# ------------------------------------------------------- numere -> cuvinte (RO)
_U = ["zero", "unu", "doi", "trei", "patru", "cinci", "șase", "șapte", "opt", "nouă", "zece",
      "unsprezece", "doisprezece", "treisprezece", "paisprezece", "cincisprezece", "șaisprezece",
      "șaptesprezece", "optsprezece", "nouăsprezece"]
_T = {2: "douăzeci", 3: "treizeci", 4: "patruzeci", 5: "cincizeci", 6: "șaizeci", 7: "șaptezeci",
      8: "optzeci", 9: "nouăzeci"}


def _lt1000(n):
    out = []
    h, r = divmod(n, 100)
    if h:
        out += ["o", "sută"] if h == 1 else [("două" if h == 2 else _U[h]), "sute"]
    if r:
        if r < 20:
            out.append(_U[r])
        else:
            t, u = divmod(r, 10)
            out.append(_T[t])
            if u:
                out += ["și", _U[u]]
    return out


def _scale(n, one, many):
    if n == 1:
        return one
    w = _lt1000(n)
    w = ["două" if x == "doi" and i == len(w) - 1 else x for i, x in enumerate(w)]
    if n % 100 >= 20 or (n % 100 == 0 and n >= 100):
        w.append("de")
    return w + [many]


def num_words(n):
    if n == 0:
        return ["zero"]
    out = []
    m, r = divmod(n, 1_000_000)
    if m:
        out += _scale(m, ["un", "milion"], "milioane")
    k, r = divmod(r, 1000)
    if k:
        out += _scale(k, ["o", "mie"], "mii")
    if r:
        out += _lt1000(r)
    return out


def expand_number(tok):
    """'13:15' -> treisprezece și cincisprezece; '2,5' -> doi virgulă cinci; '0721' -> zero ..."""
    if ":" in tok:
        parts = tok.split(":")
        res = []
        for i, p in enumerate(parts):
            if i:
                res.append("și")
            res += num_words(int(p)) if p.strip("0") else ["zero"]
        return res
    if "," in tok:
        a, b = tok.split(",", 1)
        return expand_number(a) + ["virgulă"] + expand_number(b.replace(",", ""))
    if "." in tok:                              # 1.500 = mii
        return expand_number(tok.replace(".", ""))
    if len(tok) > 1 and tok.startswith("0"):    # telefon: 0721 -> zero șapte sute douăzeci și unu
        rest = tok.lstrip("0")
        return ["zero"] * (len(tok) - len(rest)) + (num_words(int(rest)) if rest else [])
    if len(tok) > 9:
        return [_U[int(c)] for c in tok]
    return num_words(int(tok))


# forme echivalente după gen (aplicate pe ambele părți)
_CANON = {"două": "doi", "una": "unu", "douăsprezece": "doisprezece", "unul": "unu"}


def tokenize(text, normalize_numbers=False):
    """Returnează listă de (word_norm, punct_class|None). Punctuația se atașează cuvântului dinainte."""
    text = unicodedata.normalize("NFC", text)
    toks = []
    pos = 0
    for m in WORD_RE.finditer(text):
        # punctuația dintre cuvântul anterior și acesta aparține cuvântului anterior
        if toks:
            gap = text[pos:m.start()]
            toks[-1][1] = _punct_of(gap) or toks[-1][1]
        w = norm_word(m.group(0))
        if normalize_numbers and w[0].isdigit():
            ws = expand_number(w)
            for x in ws:
                toks.append([_CANON.get(x, x), None])
        else:
            toks.append([_CANON.get(w, w) if normalize_numbers else w, None])
        pos = m.end()
    if toks:
        toks[-1][1] = _punct_of(text[pos:]) or toks[-1][1]
    return [tuple(t) for t in toks]


def _punct_of(gap):
    """Clasa celui mai „puternic” semn din gap: question > exclam > period > comma."""
    found = [PUNCT_CLASS[c] for c in gap if c in PUNCT_CLASS]
    if not found:
        if "..." in gap:
            return "period"
        return None
    for cls in ("question", "exclam", "period", "comma"):
        if cls in found:
            return cls
    return None


# ----------------------------------------------------------------- aliniere
def align(ref, hyp):
    """Levenshtein pe cuvinte; întoarce listă de (op, i_ref, j_hyp), op în C/S/D/I."""
    n, m = len(ref), len(hyp)
    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i
    for j in range(m + 1):
        d[0][j] = j
    for i in range(1, n + 1):
        ri = ref[i - 1]
        row, prev = d[i], d[i - 1]
        for j in range(1, m + 1):
            c = prev[j - 1] + (0 if ri == hyp[j - 1] else 1)
            row[j] = min(c, prev[j] + 1, row[j - 1] + 1)
    ops = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + (0 if ref[i - 1] == hyp[j - 1] else 1):
            ops.append(("C" if ref[i - 1] == hyp[j - 1] else "S", i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and d[i][j] == d[i - 1][j] + 1:
            ops.append(("D", i - 1, None)); i -= 1
        else:
            ops.append(("I", None, j - 1)); j -= 1
    ops.reverse()
    return ops


def lev_ratio(a, b):
    if a == b:
        return 1.0
    n, m = len(a), len(b)
    if not n or not m:
        return 0.0
    prev = list(range(m + 1))
    for i in range(1, n + 1):
        cur = [i] + [0] * m
        for j in range(1, m + 1):
            cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
        prev = cur
    return 1.0 - prev[m] / max(n, m)


def fuzzy_in(w, vocab, thr=0.90):
    if w in vocab:
        return True
    if w[0].isdigit():
        return False
    return any(abs(len(v) - len(w)) <= max(len(v), len(w)) * (1 - thr) and lev_ratio(w, v) >= thr
               for v in vocab)


# ----------------------------------------------------------------- ASR scoring
def score_asr(ref_text, hyp_text, normalize_numbers=False, sent_lenient_wer=0.15,
              interferer_text=None):
    R = tokenize(ref_text, normalize_numbers)
    H = tokenize(hyp_text, normalize_numbers)
    rw, hw = [t[0] for t in R], [t[0] for t in H]
    ops = align(rw, hw)
    cnt = Counter(op for op, _, _ in ops)
    S, D, I = cnt["S"], cnt["D"], cnt["I"]
    wer = (S + D + I) / max(1, len(rw))

    # propoziții de referință
    sent_of = []
    sid = 0
    for w, p in R:
        sent_of.append(sid)
        if p in SENT_END:
            sid += 1
    n_sent = (sent_of[-1] + 1) if sent_of else 0

    ref_vocab = set(rw)
    per_sent = defaultdict(lambda: {"S": 0, "D": 0, "I": 0, "invented": 0, "n": 0,
                                    "end_ref": None, "end_hyp": None, "missing": [], "wrong": [],
                                    "extra": []})
    for i, (w, p) in enumerate(R):
        per_sent[sent_of[i]]["n"] += 1
    last_ref = 0
    punct_pairs = []
    halluc_tokens = []
    halluc_spans = []
    cur_span = []
    for op, i, j in ops:
        if op != "I" and cur_span:
            halluc_spans.append(" ".join(cur_span)); cur_span = []
        if op in ("C", "S"):
            s = per_sent[sent_of[i]]
            last_ref = i
            punct_pairs.append((R[i][1], H[j][1]))
            if op == "S":
                s["S"] += 1; s["wrong"].append(f"{R[i][0]}→{H[j][0]}")
            if i == len(R) - 1 or sent_of[i + 1] != sent_of[i]:
                s["end_ref"], s["end_hyp"] = R[i][1], H[j][1]
        elif op == "D":
            s = per_sent[sent_of[i]]
            last_ref = i
            s["D"] += 1; s["missing"].append(R[i][0])
            punct_pairs.append((R[i][1], None))
            if i == len(R) - 1 or sent_of[i + 1] != sent_of[i]:
                s["end_ref"], s["end_hyp"] = R[i][1], "<deleted>"
        else:  # I
            s = per_sent[sent_of[last_ref]] if sent_of else per_sent[0]
            s["I"] += 1; s["extra"].append(H[j][0])
            if not fuzzy_in(H[j][0], ref_vocab):
                s["invented"] += 1
                halluc_tokens.append(H[j][0])
                cur_span.append(H[j][0])
            elif cur_span:
                halluc_spans.append(" ".join(cur_span)); cur_span = []
            if H[j][1] is not None:
                punct_pairs.append((None, H[j][1]))
    if cur_span:
        halluc_spans.append(" ".join(cur_span))

    # rezultat per propoziție
    sentences = []
    ok_strict = ok_len = 0
    ref_sents_text = _split_ref_sentences(R, sent_of)
    for k in range(n_sent):
        s = per_sent[k]
        errs = s["S"] + s["D"] + s["I"]
        swer = errs / max(1, s["n"])
        punct_ok = s["end_ref"] == s["end_hyp"]
        reasons = []
        if s["D"]:
            reasons.append("missing_words")
        if s["S"]:
            reasons.append("wrong_words")
        if s["I"] - s["invented"]:
            reasons.append("extra_words")
        if s["invented"]:
            reasons.append("invented_content")
        if not punct_ok:
            reasons.append("bad_punctuation")
        strict = errs == 0 and punct_ok
        lenient = swer <= sent_lenient_wer and punct_ok and s["invented"] == 0
        ok_strict += strict; ok_len += lenient
        sentences.append({"idx": k, "ref": ref_sents_text[k], "wer": round(swer, 4),
                          "pass_strict": strict, "pass_lenient": lenient,
                          "end_punct_ref": s["end_ref"], "end_punct_hyp": s["end_hyp"],
                          "fail_reasons": reasons, "missing": s["missing"], "wrong": s["wrong"],
                          "extra": s["extra"]})

    # punctuație
    classes = ["comma", "period", "question", "exclam"]
    tp = Counter(); fp = Counter(); fn = Counter()
    exact = sum(1 for a, b in punct_pairs if a == b)
    relevant = [(a, b) for a, b in punct_pairs if a or b]
    for a, b in punct_pairs:
        if a == b and a:
            tp[a] += 1
        else:
            if a:
                fn[a] += 1
            if b:
                fp[b] += 1
    per_cls = {}
    for c in classes:
        p = tp[c] / (tp[c] + fp[c]) if tp[c] + fp[c] else None
        r = tp[c] / (tp[c] + fn[c]) if tp[c] + fn[c] else None
        f = 2 * p * r / (p + r) if p and r else (0.0 if (p is not None and r is not None) else None)
        per_cls[c] = {"ref": tp[c] + fn[c], "hyp": tp[c] + fp[c], "precision": _r(p),
                      "recall": _r(r), "f1": _r(f)}
    T, P_, N_ = sum(tp.values()), sum(fp.values()), sum(fn.values())
    micro_p = T / (T + P_) if T + P_ else 0.0
    micro_r = T / (T + N_) if T + N_ else 0.0
    micro_f = 2 * micro_p * micro_r / (micro_p + micro_r) if micro_p + micro_r else 0.0

    out = {
        "ref_words": len(rw), "hyp_words": len(hw),
        "wer": round(wer, 4), "substitutions": S, "deletions": D, "insertions": I,
        "sentences": n_sent,
        "sentence_success_strict": _r(ok_strict / n_sent if n_sent else None),
        "sentence_success_lenient": _r(ok_len / n_sent if n_sent else None),
        "sentence_fail_rate_strict": _r(1 - ok_strict / n_sent if n_sent else None),
        "punctuation": {
            "accuracy_on_punct_positions": _r(sum(1 for a, b in relevant if a == b) / len(relevant)
                                              if relevant else None),
            "accuracy_all_positions": _r(exact / len(punct_pairs) if punct_pairs else None),
            "micro_precision": _r(micro_p), "micro_recall": _r(micro_r), "micro_f1": _r(micro_f),
            "per_class": per_cls,
        },
        "hallucination": {
            "invented_tokens": len(halluc_tokens),
            "rate_vs_hyp_words": _r(len(halluc_tokens) / max(1, len(hw))),
            "spans": halluc_spans,
        },
        "sentence_detail": sentences,
    }
    if interferer_text:
        iv = set(t[0] for t in tokenize(interferer_text, normalize_numbers)) - ref_vocab
        leaked = [w for w in hw if w in iv]
        out["interferer_leak"] = {"tokens": len(leaked), "words": leaked[:50]}
    try:
        import jiwer  # opțional
        out["wer_jiwer_crosscheck"] = round(jiwer.wer(" ".join(rw), " ".join(hw)), 4)
    except Exception:
        pass
    return out


def _split_ref_sentences(R, sent_of):
    res = defaultdict(list)
    for (w, p), s in zip(R, sent_of):
        res[s].append(w)
    return {k: " ".join(v) for k, v in res.items()}


def _r(x, n=4):
    return None if x is None else round(x, n)


# ----------------------------------------------------------------- entități
def _contains(text_norm_words, phrase, normalize_numbers, exact=False):
    pw = [t[0] for t in tokenize(phrase, normalize_numbers)]
    if not pw:
        return False
    L = len(pw)

    def eq(t, e):  # toleranță la articol/flexiune: Brașov ~ Brașovul, Iași ~ Iașiul
        return t == e or (not exact and not e[0].isdigit() and len(e) >= 4 and t.startswith(e) and len(t) - len(e) <= 3)
    return any(all(eq(text_norm_words[i + k], pw[k]) for k in range(L))
               for i in range(len(text_norm_words) - L + 1))


def score_facts(facts, text, normalize_numbers):
    words = [t[0] for t in tokenize(text, normalize_numbers)]
    ents = facts.get("entities", [])
    found = [e for e in ents if _contains(words, e, normalize_numbers)]
    sup = [e for e in facts.get("superseded", []) if _contains(words, e, normalize_numbers, exact=True)]
    return {"entities_total": len(ents), "entities_found": len(found),
            "entity_recall": _r(len(found) / len(ents)) if ents else None,
            "entities_missing": [e for e in ents if e not in found],
            "superseded_present": sup}


# ----------------------------------------------------------------- rezumat (oglindă verify C++)
def _content_tokens(text):
    out = []
    for w, p in tokenize(text, False):
        numeric = w[0].isdigit()
        if numeric or w not in STOPWORDS:
            out.append((w, numeric, p))
    return out


def score_summary(summary, source, dted_log_text=None, gate_threshold=0.90, fuzzy=0.90,
                  unigram_weight=0.75):
    """Oglindește măsurile [2] verify / [3] spans / [4] gate din cpp/summarizer (verify.cpp)."""
    src = _content_tokens(source)
    uni = set(w for w, _, _ in src)
    bi = set(f"{a[0]} {b[0]}" for a, b in zip(src, src[1:]))
    toks = _content_tokens(summary)
    matched = []
    for w, numeric, _ in toks:
        if w in uni:
            matched.append(w)
        elif numeric:
            matched.append("")
        else:
            best, br = "", 0.0
            for v in uni:
                if v[0].isdigit() or abs(len(v) - len(w)) > max(len(v), len(w)) * (1 - fuzzy) + 1:
                    continue
                r = lev_ratio(w, v)
                if r >= fuzzy and r > br:
                    best, br = v, r
            matched.append(best)
    n = len(toks)
    sup = sum(1 for m in matched if m)
    nb = max(0, n - 1)
    sb = sum(1 for k in range(1, n) if matched[k - 1] and matched[k] and
             f"{matched[k-1]} {matched[k]}" in bi)
    u = sup / n if n else 0.0
    b = sb / nb if nb else u
    overlap = unigram_weight * u + (1 - unigram_weight) * b if n else 0.0
    spans, cur = [], []
    for (w, numeric, p), m in zip(toks, matched):
        if not m:
            cur.append(w)
            if p:
                spans.append(" ".join(cur)); cur = []
        elif cur:
            spans.append(" ".join(cur)); cur = []
    if cur:
        spans.append(" ".join(cur))
    invented_numbers = [w for (w, numeric, _), m in zip(toks, matched) if numeric and not m]

    gate_logged, branch, reason = None, None, None
    if dted_log_text:
        for line in dted_log_text.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                j = json.loads(line)
                if j.get("component") == "dted_summarizer" or "branch" in j:
                    branch, reason = j.get("branch"), j.get("reason")
                    continue
            except Exception:
                pass
            mm = re.search(r"ramura=(\S+)(?:\s+motiv=(\S+))?", line) or \
                re.search(r"branch[=:]\s*\"?(\w+)\"?", line)
            if mm:
                branch = mm.group(1); reason = mm.group(2) if mm.lastindex and mm.lastindex > 1 else reason
        if branch is not None:
            gate_logged = branch.startswith("verbatim_tail")
    return {
        "content_tokens": n, "supported_tokens": sup,
        "unigram_score": _r(u), "bigram_score": _r(b), "overlap_score": _r(overlap),
        "hallucination_rate": _r((n - sup) / n) if n else None,
        "unverified_spans": spans, "invented_numbers": invented_numbers,
        "gate_predicted": overlap < gate_threshold,
        "gate_logged": gate_logged, "logged_branch": branch, "logged_reason": reason,
        "gate_triggered": bool(gate_logged) if gate_logged is not None else overlap < gate_threshold,
        "log_vs_mirror_mismatch": (gate_logged is not None and gate_logged != (overlap < gate_threshold)),
    }


# ----------------------------------------------------------------- verdict
DEFAULT_THRESHOLDS = {
    "default": {"max_wer": 0.10, "min_sentence_success_lenient": 0.80, "min_punct_f1": 0.75,
                "max_asr_hallucination_rate": 0.0, "min_entity_recall": 1.0,
                "min_question_recall": None},
    "questions_rising": {"min_question_recall": 0.80},
    "numbers_names": {"min_entity_recall": 1.0},
    "noisy_overlap": {"max_wer": 0.25, "min_sentence_success_lenient": 0.50, "min_punct_f1": 0.60,
                      "max_asr_hallucination_rate": 0.02, "min_entity_recall": 1.0},
    "summary": {"max_hallucination_rate": 0.0, "gate_is_failure": True,
                "superseded_is_failure": True},
}


def thresholds_for(cat, T):
    t = dict(T["default"]); t.update(T.get(cat, {}))
    return t


def verdict(res, cat, T):
    t = thresholds_for(cat, T)
    a = res.get("asr")
    reasons = []
    if a:
        if a["deletions"] and a["wer"] > t["max_wer"]:
            reasons.append("missing_words")
        if a["substitutions"] and a["wer"] > t["max_wer"]:
            reasons.append("wrong_words")
        if a["wer"] > t["max_wer"]:
            reasons.append(f"wer>{t['max_wer']}")
        if (a["sentence_success_lenient"] or 0) < t["min_sentence_success_lenient"]:
            reasons.append("sentence_success_low")
        if a["punctuation"]["micro_f1"] < t["min_punct_f1"]:
            reasons.append("bad_punctuation")
        q = t.get("min_question_recall")
        qr = a["punctuation"]["per_class"]["question"]["recall"]
        if q is not None and (qr is None or qr < q):
            reasons.append("question_marks_missed")
        if a["hallucination"]["rate_vs_hyp_words"] > t["max_asr_hallucination_rate"]:
            reasons.append("invented_content")
    f = res.get("facts_asr")
    if f and f["entity_recall"] is not None and f["entity_recall"] < t["min_entity_recall"]:
        reasons.append("entity_lost")
    s = res.get("summary")
    if s:
        st = T["summary"]
        if s["gate_triggered"] and st.get("gate_is_failure", True):
            reasons.append("gate_triggered")
        if (s["hallucination_rate"] or 0) > st["max_hallucination_rate"] or s["invented_numbers"]:
            reasons.append("summary_invented_content")
        fs = res.get("facts_summary")
        if fs and fs["superseded_present"] and st.get("superseded_is_failure", True):
            reasons.append("summary_superseded_asserted")
    return {"pass": not reasons, "fail_reasons": reasons}


# ----------------------------------------------------------------- I/O
def read(p):
    with open(p, encoding="utf-8-sig") as f:
        return f.read()


def maybe(p):
    return read(p) if p and os.path.isfile(p) else None


def score_one(sid, cat, ref, hyp, summary, source, log, facts, interferer, args, T):
    res = {"id": sid, "category": cat}
    if hyp is None and summary is None:
        res["status"] = "missing_hyp"
        return res
    if hyp is not None:
        res["asr"] = score_asr(ref, hyp, args.normalize_numbers, args.sent_lenient_wer, interferer)
        if facts:
            res["facts_asr"] = score_facts(facts, hyp, args.normalize_numbers)
    if summary is not None:
        src = source if source is not None else (hyp if hyp is not None else ref)
        res["summary_source"] = "explicit" if source is not None else ("asr_hyp" if hyp is not None else "gold")
        res["summary"] = score_summary(summary, src, log, args.gate_threshold)
        if facts:
            res["facts_summary"] = score_facts(facts, summary, args.normalize_numbers)
    res["status"] = "scored"
    res["verdict"] = verdict(res, cat, T)
    return res


def print_table(results):
    hdr = f"{'id':26s} {'WER':>6s} {'S/D/I':>11s} {'sentOK':>7s} {'punF1':>6s} {'?rec':>5s} " \
          f"{'hall':>6s} {'ent':>5s} {'sumOv':>6s} {'gate':>5s}  verdict"
    print(hdr); print("-" * len(hdr))
    for r in results:
        if r.get("status") != "scored":
            print(f"{r['id']:26s} {'— lipsește ipoteza (hyp) —':>40s}"); continue
        a = r.get("asr") or {}
        p = a.get("punctuation", {})
        q = p.get("per_class", {}).get("question", {}).get("recall") if p else None
        f = r.get("facts_asr") or {}
        s = r.get("summary") or {}
        v = r["verdict"]
        fmt = lambda x, w=6: (f"{x:{w}.3f}" if isinstance(x, (int, float)) else f"{'-':>{w}s}")
        sdi = f"{a.get('substitutions','-')}/{a.get('deletions','-')}/{a.get('insertions','-')}" if a else "-"
        print(f"{r['id']:26s} {fmt(a.get('wer'))} {sdi:>11s} {fmt(a.get('sentence_success_lenient'),7)} "
              f"{fmt(p.get('micro_f1'))} {fmt(q,5)} {fmt((a.get('hallucination') or {}).get('rate_vs_hyp_words'))} "
              f"{fmt(f.get('entity_recall'),5)} {fmt(s.get('overlap_score'))} "
              f"{('DA' if s.get('gate_triggered') else 'nu') if s else '-':>5s}  "
              f"{'PASS' if v['pass'] else 'FAIL: ' + ','.join(v['fail_reasons'])}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest")
    ap.add_argument("--hyp-dir", help="suprascrie directorul cu ipoteze (implicit căile din manifest)")
    ap.add_argument("--only", nargs="*", help="doar aceste id-uri")
    ap.add_argument("--ref"); ap.add_argument("--hyp"); ap.add_argument("--summary")
    ap.add_argument("--source", help="textul sursă pt. verificarea rezumatului (implicit: hyp ASR)")
    ap.add_argument("--dted-log", help="log JSONL/text D&TED cu branch=... / ramura=...")
    ap.add_argument("--facts"); ap.add_argument("--category", default="default")
    ap.add_argument("--normalize-numbers", action="store_true",
                    help="cifre -> cuvinte RO pe ambele părți (13:15 == treisprezece și cincisprezece)")
    ap.add_argument("--sent-lenient-wer", type=float, default=0.15)
    ap.add_argument("--gate-threshold", type=float, default=0.90)
    ap.add_argument("--thresholds", default=os.path.join(HERE, "thresholds.json"))
    ap.add_argument("--out", default=os.path.join(HERE, "results", "last_score.json"))
    ap.add_argument("--quiet", action="store_true")
    args = ap.parse_args()

    T = json.loads(json.dumps(DEFAULT_THRESHOLDS))
    if args.thresholds and os.path.isfile(args.thresholds):
        for k, v in json.loads(read(args.thresholds)).items():
            if not k.startswith("_"):
                T.setdefault(k, {}).update(v)

    results = []
    if args.manifest:
        base = os.path.dirname(os.path.abspath(args.manifest))
        man = json.loads(read(args.manifest))
        J = lambda p: os.path.join(base, p) if p else None
        for s in man["samples"]:
            if args.only and s["id"] not in args.only:
                continue
            hyp_p = J(s.get("hyp")); sum_p = J(s.get("summary")); log_p = J(s.get("dted_log"))
            if args.hyp_dir:
                hd = os.path.abspath(args.hyp_dir)
                hyp_p = os.path.join(hd, s["id"] + ".txt")
                sum_p = os.path.join(hd, s["id"] + ".summary.txt")
                log_p = os.path.join(hd, s["id"] + ".dted.jsonl")
            facts = json.loads(read(J(s["facts"]))) if s.get("facts") and os.path.isfile(J(s["facts"])) else None
            interf = maybe(J(f"tts_text/{s['id']}_interferent.txt"))
            results.append(score_one(s["id"], s["category"], read(J(s["gold"])), maybe(hyp_p),
                                     maybe(sum_p), None, maybe(log_p), facts, interf, args, T))
    elif args.ref and (args.hyp or args.summary):
        facts = json.loads(read(args.facts)) if args.facts else None
        sid = os.path.splitext(os.path.basename(args.hyp or args.summary))[0]
        results.append(score_one(sid, args.category, read(args.ref), maybe(args.hyp),
                                 maybe(args.summary), maybe(args.source), maybe(args.dted_log),
                                 facts, None, args, T))
    else:
        ap.error("dați --manifest sau --ref împreună cu --hyp/--summary")

    scored = [r for r in results if r.get("status") == "scored"]
    agg = {}
    asr = [r["asr"] for r in scored if r.get("asr")]
    if asr:
        tw = sum(a["ref_words"] for a in asr)
        agg["wer_pooled"] = round(sum(a["substitutions"] + a["deletions"] + a["insertions"] for a in asr) / max(1, tw), 4)
        ns = sum(a["sentences"] for a in asr)
        agg["sentence_success_strict_pooled"] = _r(sum(a["sentence_success_strict"] * a["sentences"] for a in asr) / ns) if ns else None
        agg["sentence_success_lenient_pooled"] = _r(sum(a["sentence_success_lenient"] * a["sentences"] for a in asr) / ns) if ns else None
        agg["asr_invented_tokens"] = sum(a["hallucination"]["invented_tokens"] for a in asr)
    sm = [r["summary"] for r in scored if r.get("summary")]
    if sm:
        agg["summaries"] = len(sm)
        agg["gate_triggered"] = sum(1 for s in sm if s["gate_triggered"])
        agg["summary_hallucination_rate_mean"] = _r(sum(s["hallucination_rate"] or 0 for s in sm) / len(sm))
    agg["samples_total"] = len(results); agg["samples_scored"] = len(scored)
    agg["samples_pass"] = sum(1 for r in scored if r["verdict"]["pass"])
    out = {"tool": "dted-hard-test/score.py", "normalize_numbers": args.normalize_numbers,
           "thresholds": T, "aggregate": agg, "results": results}
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    if not args.quiet:
        print_table(results)
        print("\nAgregat:", json.dumps(agg, ensure_ascii=False))
        print("Detalii:", os.path.abspath(args.out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
