# Extracts (source English, translation Romanian, context) from a Qt .qm translation catalogue.
# This is OBSERVATION of the interface inventory (every menu/label/dialog/setting string), as text —
# not a copy of code or resources. Used to drive building parity in Scribner's own (Electron/React) code.
# Usage: python -I extract-qm.py <file.qm> <out.tsv>
import sys, struct

def read_u32(b, i): return struct.unpack('>I', b[i:i+4])[0], i+4

def parse_messages(block):
    # Each message is a run of sub-records ending at Tag_End (0x01).
    # Tags: 3=Translation(UTF-16-BE), 6=SourceText(UTF-8), 7=Context(UTF-8), 8=Comment(UTF-8).
    out, i, n = [], 0, len(block)
    cur = {}
    while i < n:
        tag = block[i]; i += 1
        if tag == 0x01:  # End of one message
            if cur.get('src') or cur.get('tr'):
                out.append((cur.get('ctx', ''), cur.get('src', ''), cur.get('tr', '')))
            cur = {}
            continue
        if i + 4 > n: break
        ln, i = read_u32(block, i)
        if ln == 0xffffffff:
            continue
        if i + ln > n: break
        data = block[i:i+ln]; i += ln
        try:
            if tag == 0x03:   cur['tr'] = data.decode('utf-16-be', 'replace')
            elif tag == 0x06: cur['src'] = data.decode('utf-8', 'replace')
            elif tag == 0x07: cur['ctx'] = data.decode('utf-8', 'replace')
            elif tag == 0x08: cur.setdefault('comment', data.decode('utf-8', 'replace'))
        except Exception:
            pass
    if cur.get('src') or cur.get('tr'):
        out.append((cur.get('ctx', ''), cur.get('src', ''), cur.get('tr', '')))
    return out

def main():
    path, out = sys.argv[1], sys.argv[2]
    b = open(path, 'rb').read()
    i = 16  # skip 16-byte magic
    best = b''
    while i < len(b):
        if i + 5 > len(b): break
        tag = b[i]; ln, j = read_u32(b, i+1)
        start = j; end = j + ln
        if ln <= 0 or end > len(b): break
        block = b[start:end]
        # The Messages block is the one whose records parse into the most (src,tr) pairs.
        try:
            msgs = parse_messages(block)
        except Exception:
            msgs = []
        if len(msgs) > 0 and len(block) > len(best):
            best = block
        i = end
    msgs = parse_messages(best) if best else []
    # Dedupe by (ctx, src)
    seen, rows = set(), []
    for ctx, src, tr in msgs:
        src = (src or '').replace('\n', ' ').strip()
        tr = (tr or '').replace('\n', ' ').strip()
        if not src and not tr: continue
        k = (ctx, src)
        if k in seen: continue
        seen.add(k)
        rows.append((ctx, src, tr))
    with open(out, 'w', encoding='utf-8') as f:
        for ctx, src, tr in rows:
            f.write(f"{ctx}\t{src}\t{tr}\n")
    print(f"{len(rows)} intrari -> {out}")

if __name__ == '__main__':
    main()
