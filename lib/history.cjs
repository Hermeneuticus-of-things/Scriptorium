'use strict';
// Writing history: per day, the first and last word counts seen for the
// manuscript and the whole project. Written = end - start (net words).
const fs = require('fs');
const path = require('path');

function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function readHistory(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'history.json'), 'utf8'));
  } catch {
    return { days: {} };
  }
}

// draftChars / totalChars are optional (older callers pass words only).
function recordHistory(dir, { draft, total, draftChars, totalChars }, date = new Date()) {
  const hasChars = Number.isFinite(draftChars) && Number.isFinite(totalChars);
  const h = readHistory(dir);
  const key = dayKey(date);
  const day = h.days[key];
  if (!day) {
    // Start of a new day continues from the last known count, so words
    // written before the first save of the day are not lost.
    // Days imported from Scrivener carry only daily totals, no running counts.
    const prev = Object.keys(h.days).sort().pop();
    const last = prev ? h.days[prev] : null;
    const known = last && last.draftEnd !== undefined;
    h.days[key] = {
      draftStart: known ? last.draftEnd : draft,
      totalStart: known ? last.totalEnd : total,
      draftEnd: draft,
      totalEnd: total,
    };
    if (hasChars) {
      const knownC = last && last.draftCharsEnd !== undefined;
      Object.assign(h.days[key], { draftCharsStart: knownC ? last.draftCharsEnd : draftChars, totalCharsStart: knownC ? last.totalCharsEnd : totalChars, draftCharsEnd: draftChars, totalCharsEnd: totalChars });
    }
  } else {
    if (hasChars) {
      if (day.draftCharsStart === undefined) {
        day.draftCharsStart = draftChars;
        day.totalCharsStart = totalChars;
      }
      day.draftCharsEnd = draftChars;
      day.totalCharsEnd = totalChars;
    }
    if (day.draftStart === undefined) {
      day.draftStart = draft;
      day.totalStart = total;
    }
    day.draftEnd = draft;
    day.totalEnd = total;
  }
  fs.writeFileSync(path.join(dir, 'history.json'), JSON.stringify(h, null, 1));
  return h;
}

// Net words per day = words imported from Scrivener for that day (if any)
// + words measured by Pneuma Sofer (end - start).
function summarize(history) {
  return Object.keys(history.days)
    .sort()
    .map((date) => {
      const d = history.days[date];
      const measured = d.draftEnd !== undefined && d.draftStart !== undefined;
      return {
        date,
        draft: (d.draftWritten || 0) + (measured ? d.draftEnd - d.draftStart : 0),
        total: (d.totalWritten || 0) + (measured ? d.totalEnd - d.totalStart : 0),
        draftWords: d.draftEnd ?? null,
        imported: Boolean(d.imported),
        ...(d.draftCharsEnd !== undefined ? { draftChars: d.draftCharsEnd - d.draftCharsStart, totalChars: d.totalCharsEnd - d.totalCharsStart } : {}),
      };
    });
}

module.exports = { readHistory, recordHistory, summarize, dayKey };
