import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCK_STALE_MS, PRESENCE_EVERY_MS, appendLog, lockFor, logRow, publishPresence, readLogs, readPeers, seenTimes, teamFiles, teamIdentity } from './team.js';

// Team work in the open project (src/lib/team.js): publishes this computer's presence and locks,
// reads the other computers' and the change log. Inactive (nothing written) without a team name.
export function useTeam({ api, dir, settings, docId }) {
  const who = teamIdentity(settings);
  const key = who ? `${who.name}|${who.color}|${who.machine}` : '';
  const [state, setState] = useState({ live: [], locks: {}, log: [] });
  const [myLocks, setMyLocks] = useState([]);
  const docRef = useRef(docId);
  docRef.current = docId;
  const locksRef = useRef(myLocks);
  locksRef.current = myLocks;
  const whoRef = useRef(who);
  whoRef.current = who;
  const dirRef = useRef(dir);
  dirRef.current = dir;
  // Nothing is published for a project until this computer's own locks were read back from its
  // presence file (else a first publish could wipe them).
  const ready = useRef('');
  // When each other computer's presence last changed, by this computer's clock (clock skew).
  const seen = useRef(new Map());
  const lastWho = useRef(null);

  const refresh = useCallback(async () => {
    const w = whoRef.current;
    const d = dir;
    if (!w || !d || ready.current !== d) return;
    try {
      await publishPresence(api, d, w, { doc: docRef.current, locks: locksRef.current });
      const files = await teamFiles(api, d);
      if (dirRef.current !== d) return; // another project opened meanwhile
      setState({ ...readPeers(seenTimes(files, seen.current), { self: w.machine }), log: readLogs(files) });
    } catch {
      /* folder offline: the next round tries again */
    }
  }, [api, dir]);

  // Opening the project: this computer's own locks come back from its presence file.
  useEffect(() => {
    setState({ live: [], locks: {}, log: [] });
    setMyLocks([]);
    locksRef.current = [];
    ready.current = '';
    seen.current = new Map();
    if (!dir) return undefined;
    // Team work turned off: the presence left behind is marked old, so the others drop it and its
    // locks at once instead of after the lock timeout.
    if (!key) {
      const w = lastWho.current;
      lastWho.current = null;
      if (w) publishPresence(api, dir, w, { now: Date.now() - 2 * LOCK_STALE_MS }).catch(() => {});
      return undefined;
    }
    lastWho.current = whoRef.current;
    let stop = false;
    (async () => {
      try {
        const files = await teamFiles(api, dir);
        const own = files[`presence-${whoRef.current.machine}.json`];
        const locks = own ? JSON.parse(own).locks || [] : [];
        if (stop) return;
        locksRef.current = locks;
        setMyLocks(locks);
      } catch {
        /* no presence yet */
      }
      if (stop) return;
      ready.current = dir;
      refresh();
    })();
    const t = setInterval(refresh, PRESENCE_EVERY_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [api, dir, key, refresh]);

  // Another document opened, a lock changed: tell the others now.
  useEffect(() => {
    if (key && dir) refresh();
  }, [docId, myLocks, key, dir, refresh]);

  const toggleLock = useCallback((id) => setMyLocks((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id])), []);
  // The lock that keeps `id` read-only here (null when free here); see lockFor.
  const lockOf = useCallback((id) => lockFor(state.locks, myLocks, whoRef.current, id), [state.locks, myLocks]);

  // Hand edits of this writer, from the I-EDIT commit ({id, title, chunks}).
  const record = useCallback(
    (events) => {
      const w = whoRef.current;
      if (!w || !dir || !events.length) return;
      const rows = events.map((e) => logRow({ who: w, doc: e.id, title: e.title, chunks: e.chunks }));
      appendLog(api, dir, w, rows)
        .then(() => setState((s) => ({ ...s, log: [...s.log, ...rows] })))
        .catch(() => {});
    },
    [api, dir],
  );

  return { who, ...state, myLocks, toggleLock, lockOf, record, refresh };
}
