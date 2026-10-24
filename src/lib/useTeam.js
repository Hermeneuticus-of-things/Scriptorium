import { useCallback, useEffect, useRef, useState } from 'react';
import { PRESENCE_EVERY_MS, appendLog, logRow, publishPresence, readLogs, readPeers, teamFiles, teamIdentity } from './team.js';

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

  const refresh = useCallback(async () => {
    const w = whoRef.current;
    if (!w || !dir) return;
    try {
      await publishPresence(api, dir, w, { doc: docRef.current, locks: locksRef.current });
      const files = await teamFiles(api, dir);
      setState({ ...readPeers(files, { self: w.machine }), log: readLogs(files) });
    } catch {
      /* folder offline: the next round tries again */
    }
  }, [api, dir]);

  // Opening the project: this computer's own locks come back from its presence file.
  useEffect(() => {
    setState({ live: [], locks: {}, log: [] });
    setMyLocks([]);
    if (!key || !dir) return undefined;
    let stop = false;
    (async () => {
      try {
        const files = await teamFiles(api, dir);
        const own = files[`presence-${whoRef.current.machine}.json`];
        if (!stop && own) setMyLocks(JSON.parse(own).locks || []);
      } catch {
        /* no presence yet */
      }
      if (!stop) refresh();
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

  return { who, ...state, myLocks, toggleLock, record, refresh };
}
