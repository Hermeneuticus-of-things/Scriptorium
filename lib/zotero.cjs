'use strict';
// Bibliography straight from a Zotero account (Web API v3), with the user id and key saved in
// Settings → Servicii și conturi. Items come as CSL-JSON and go through the same parser as a file
// import (lib/bibliography.cjs). `fetchImpl` is injected for tests.
const { parseCslJson } = require('./bibliography.cjs');

const PAGE = 100;
const MAX_ITEMS = 5000;

// Zotero ids look like "1234567/ABCD2345"; a readable citation key is built when the item has none.
function citationKey(raw, entry, used) {
  const given = raw['citation-key'] || raw.citationKey;
  let base = given || `${(entry.authors[0] && (entry.authors[0].family || entry.authors[0].literal)) || 'anon'}${entry.year || ''}`;
  base = String(base).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_:-]/g, '') || 'ref';
  let key = base;
  for (let n = 2; used.has(key); n++) key = `${base}${String.fromCharCode(96 + Math.min(n, 26))}`;
  used.add(key);
  return key;
}

async function fetchZoteroLibrary({ userId, apiKey, collection, fetchImpl = fetch, signal } = {}) {
  const id = String(userId || '').trim();
  if (!/^\d+$/.test(id) || !apiKey) throw new Error('Pune ID-ul de utilizator Zotero (un număr) și cheia în Setări → Servicii și conturi.');
  const base = collection ? `https://api.zotero.org/users/${id}/collections/${encodeURIComponent(collection)}/items/top` : `https://api.zotero.org/users/${id}/items/top`;
  const raw = [];
  for (let start = 0; start < MAX_ITEMS; start += PAGE) {
    const res = await fetchImpl(`${base}?format=csljson&limit=${PAGE}&start=${start}`, {
      headers: { 'Zotero-API-Key': String(apiKey).trim(), 'Zotero-API-Version': '3' },
      signal,
    });
    if (res.status === 403) throw new Error('Zotero: cheia nu are acces la această bibliotecă. Verifică ID-ul și cheia (citire).');
    if (res.status === 404) throw new Error('Zotero: biblioteca nu există. Verifică ID-ul de utilizator (numărul din zotero.org/settings/keys).');
    if (res.status === 429) throw new Error('Zotero: prea multe cereri. Încearcă din nou peste un minut.');
    if (!res.ok) throw new Error(`Zotero: eroare ${res.status}.`);
    const data = await res.json();
    const items = Array.isArray(data) ? data : (data && data.items) || [];
    raw.push(...items);
    const total = Number((res.headers && res.headers.get && res.headers.get('Total-Results')) || 0);
    if (items.length < PAGE || (total && raw.length >= total)) break;
  }
  const used = new Set();
  return parseCslJson(raw).map((e, i) => ({ ...e, key: citationKey(raw[i], e, used) }));
}

const { mergeBibliography } = require('../src/lib/bibMerge.js');

module.exports = { fetchZoteroLibrary, mergeBibliography, citationKey };
