'use strict';
// Live stats for the dictation engines (ADL §12 — feedback at the cause, quiet): CPU% and RAM of
// the engine processes (DTED.exe / whisper-server.exe), plus GPU/VRAM from nvidia-smi when an
// NVIDIA driver is present. Pure parsers exported for tests; process/net probing injected.

/** CPU% between two samples of a process's total CPU seconds: Δcpu / Δwall × 100.
 * A multi-threaded engine (whisper on N threads) can legitimately exceed 100. */
function computeCpuPct(prevCpuSec, cpuSec, wallDeltaSec) {
  const d = Number(wallDeltaSec);
  if (!(d > 0) || prevCpuSec == null || cpuSec == null || !isFinite(prevCpuSec) || !isFinite(cpuSec)) return 0;
  return Math.max(0, Math.round(((cpuSec - prevCpuSec) / d) * 100));
}

/** tasklist /FO CSV /NH row: `"whisper-server.exe","1234","Console","1","1 234 567 K"` → {id, ramMB}. */
function parseTasklistRow(row) {
  const cells = String(row || '').match(/"([^"]*)"/g);
  if (!cells || cells.length < 5) return null;
  const name = cells[0].slice(1, -1);
  const id = Number(cells[1].slice(1, -1));
  const kb = Number(cells[4].slice(1, -1).replace(/[^\d]/g, '')); // „1 048 576 K” → 1048576
  if (!name || !isFinite(id) || id <= 0 || !isFinite(kb)) return null;
  return { name, id, ramMB: Math.round(kb / 1024) };
}

/**
 * Aggregates tasklist CSV output (multi-line) for the engine image names:
 * [{name, pids, ramMB}] — RAM summed over the processes of the same image.
 */
function aggregateTasklist(csv, images = []) {
  const wanted = images.map((i) => String(i));
  const byName = new Map();
  for (const row of String(csv || '').split(/\r?\n/)) {
    const p = parseTasklistRow(row);
    if (!p) continue;
    const hitIdx = wanted.findIndex((w) => p.name.toLowerCase() === w.toLowerCase() || `${p.name.toLowerCase()}.exe` === w.toLowerCase());
    if (hitIdx < 0) continue;
    const hit = wanted[hitIdx];
    const key = hit.toLowerCase();
    const cur = byName.get(key) || { name: hit, pids: [], ramMB: 0 };
    cur.pids.push(p.id);
    cur.ramMB += p.ramMB;
    byName.set(key, cur);
  }
  return [...byName.values()].map((x) => ({ ...x, ramMB: Math.round(x.ramMB) }));
}

/** nvidia-smi --query-gpu=... --format=csv,noheader,nounits row: `1234, 8192, 45` → VRAM/GB + util%. */
function parseNvidiaSmi(csv) {
  const line = String(csv || '').split(/\r?\n/).find((l) => l.trim());
  if (!line) return null;
  const parts = line.split(',').map((x) => Number(x.trim()));
  if (parts.length < 3 || parts.some((x) => !isFinite(x))) return null;
  const [usedMB, totalMB, util] = parts;
  if (totalMB <= 0) return null;
  return { vramUsedGB: Math.round((usedMB / 1024) * 10) / 10, vramTotalGB: Math.round((totalMB / 1024) * 10) / 10, gpuUtilPct: Math.max(0, Math.min(100, Math.round(util))) };
}

module.exports = { computeCpuPct, parseTasklistRow, aggregateTasklist, parseNvidiaSmi };
