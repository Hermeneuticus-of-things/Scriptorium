'use strict';
// Writing history: per day, the first and last word counts seen for the
// manuscript and the whole project. Written = end - start (net words).
const fs = require('fs');
const path = require('path');

function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// A missing file is an empty history; an unreadable one is set aside (never overwritten with only
// today's entry) and recording stops until it is looked at.
function readHistory(dir, { forWrite = false } = {}) {
  const file = path.join(dir, 'history.json');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { days: {} };
  }
  try {
    const h = JSON.parse(text);
    if (!h || typeof h !== 'object' || Array.isArray(h)) throw new Error('not an object');
    if (!h.days || typeof h.days !== 'object') h.days = {};
    return h;
  } catch {
    if (forWrite) {
      try {
        fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
      } catch {
        /* best effort */
      }
    }
    return { days: {} };
  }
}

// draftChars / totalChars are optional (older callers pass words only).
function recordHistory(dir, { draft, total, draftChars, totalChars }, date = new Date()) {
  const hasChars = Number.isFinite(draftChars) && Number.isFinite(totalChars);
  const h = readHistory(dir, { forWrite: true });
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
    // Words added and deleted separately (gross), measured between successive recordings.
    const fromDraft = h.days[key].draftStart;
    if (draft > fromDraft) h.days[key].draftAdded = draft - fromDraft;
    else if (draft < fromDraft) h.days[key].draftDeleted = fromDraft - draft;
  } else {
    if (day.draftEnd !== undefined) {
      const d = draft - day.draftEnd;
      if (d > 0) day.draftAdded = (day.draftAdded || 0) + d;
      else if (d < 0) day.draftDeleted = (day.draftDeleted || 0) - d;
    }
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
  // Through a temporary file: a crash mid-write never leaves a cut history.json.
  const file = path.join(dir, 'history.json');
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(h, null, 1));
  fs.renameSync(tmp, file);
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
        // Gross words: added and deleted separately (days recorded before this was kept have only the net).
        draftAdded: d.draftAdded !== undefined || d.draftDeleted !== undefined ? (d.draftWritten > 0 ? d.draftWritten : 0) + (d.draftAdded || 0) : undefined,
        draftDeleted: d.draftAdded !== undefined || d.draftDeleted !== undefined ? d.draftDeleted || 0 : undefined,
        ...(d.draftCharsEnd !== undefined ? { draftChars: d.draftCharsEnd - d.draftCharsStart, totalChars: d.totalCharsEnd - d.totalCharsStart } : {}),
      };
    });
}

// Deletes the given days (YYYY-MM-DD), or the whole history when `dates` is null. Returns the days left.
function deleteHistory(dir, dates) {
  const h = readHistory(dir, { forWrite: true });
  if (dates == null) h.days = {};
  else for (const d of dates) delete h.days[String(d)];
  const file = path.join(dir, 'history.json');
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(h, null, 1));
  fs.renameSync(tmp, file);
  return Object.keys(h.days).length;
}

module.exports = { readHistory, recordHistory, summarize, dayKey, deleteHistory };
