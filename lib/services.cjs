'use strict';
// Accounts for outside services (DeepL, Google Translate, LanguageTool, Zotero) and a list of
// other logins (name, site, user, password). Stored in settings.json; every secret is encrypted
// with Electron safeStorage like the AI keys (lib/aiKeys.cjs) and never sent to the renderer.
// Pure functions over a settings object; `safeStorage` is injected (tests).
//   settings.services = { [id]: { [field]: { enc, plain? } | string } }
//   settings.accounts = [{ id, name, url, username, password: { enc, plain? } }]

// Optional account login (email + password), kept encrypted like the keys. Some services are
// used in the app through their API key; the email/password here are stored for your convenience
// (e.g. a service you also log into on its website) and are not what drives that API.
const LOGIN = [
  { id: 'email', label: 'Email cont', secret: false },
  { id: 'password', label: 'Parolă cont', secret: true },
];

const SERVICES = {
  deepl: {
    label: 'DeepL',
    help: 'Traducere direct în program. Cheia o iei din contul DeepL (gratuit până la 500.000 de caractere pe lună).',
    url: 'https://www.deepl.com/your-account/keys',
    fields: [{ id: 'apiKey', label: 'Cheie API', secret: true }, ...LOGIN],
  },
  googleTranslate: {
    label: 'Google Cloud Translation',
    help: 'Traducere direct în program, cu o cheie Google Cloud. Activează „Cloud Translation API" pe proiect și, la cheie, nu o restricționa de la acest API (altfel Google o blochează cu „API_KEY_SERVICE_BLOCKED").',
    url: 'https://console.cloud.google.com/apis/credentials',
    fields: [{ id: 'apiKey', label: 'Cheie API', secret: true }, ...LOGIN],
  },
  languagetool: {
    label: 'LanguageTool',
    help: 'Verificarea gramaticii. Merge și fără cont (versiunea gratuită); cu un cont Premium pui e-mailul și cheia API.',
    url: 'https://languagetool.org/editor/settings/access-tokens',
    fields: [
      { id: 'username', label: 'E-mail cont', secret: false },
      { id: 'apiKey', label: 'Cheie API', secret: true },
      { id: 'password', label: 'Parolă cont', secret: true },
    ],
  },
  speechify: {
    label: 'Speechify',
    help: 'Citire cu voce tare cu vocile Speechify (bara „Citește”). Citirea folosește cheia API (din consola Speechify, console.sws.speechify.com/api-keys) și vocea (un ID, de exemplu „george”). Email/parola sunt doar pentru păstrarea contului.',
    url: 'https://console.sws.speechify.com/api-keys',
    fields: [
      { id: 'apiKey', label: 'Cheie API', secret: true },
      { id: 'voiceId', label: 'Voce (ID)', secret: false },
      ...LOGIN,
    ],
  },
  zotero: {
    label: 'Zotero',
    help: 'Bibliografia din contul tău Zotero.',
    url: 'https://www.zotero.org/settings/keys',
    fields: [
      { id: 'userId', label: 'ID utilizator', secret: false },
      { id: 'apiKey', label: 'Cheie API', secret: true },
      ...LOGIN,
    ],
  },
  github: {
    label: 'GitHub (actualizări)',
    help: 'Token cu drept de citire, folosit doar cât timp depozitul programului e privat, ca actualizatorul să vadă versiunile noi. Lasă gol dacă depozitul e public.',
    url: 'https://github.com/settings/tokens',
    fields: [{ id: 'token', label: 'Token', secret: true }],
  },
};

function seal(value, safeStorage) {
  const v = String(value);
  if (safeStorage && safeStorage.isEncryptionAvailable()) return { enc: safeStorage.encryptString(v).toString('base64') };
  return { enc: Buffer.from(v, 'utf8').toString('base64'), plain: true };
}

function unseal(entry, safeStorage) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry;
  if (!entry.enc) return '';
  const buf = Buffer.from(entry.enc, 'base64');
  try {
    return entry.plain ? buf.toString('utf8') : safeStorage.decryptString(buf);
  } catch {
    return ''; // encrypted on another machine / user profile
  }
}

/** New settings with the given fields of service `id` set; an empty value deletes the field. */
function setService(settings, id, values, safeStorage) {
  const def = SERVICES[id];
  if (!def) throw new Error(`Serviciu necunoscut: ${id}`);
  const s = { ...(settings || {}) };
  const all = { ...(s.services || {}) };
  const cur = { ...(all[id] || {}) };
  for (const f of def.fields) {
    if (!values || !(f.id in values)) continue;
    const v = String(values[f.id] ?? '').trim();
    if (!v) delete cur[f.id];
    else cur[f.id] = f.secret ? seal(v, safeStorage) : v;
  }
  if (Object.keys(cur).length) all[id] = cur;
  else delete all[id];
  s.services = all;
  return s;
}

/** Decrypted values of service `id` (main process only). */
function getService(settings, id, safeStorage) {
  const def = SERVICES[id];
  const cur = ((settings && settings.services) || {})[id] || {};
  const out = {};
  if (!def) return out;
  for (const f of def.fields) out[f.id] = unseal(cur[f.id], safeStorage);
  return out;
}

/** Safe for the renderer: which services are set up, and their non-secret fields only. */
function serviceStatus(settings, safeStorage) {
  return Object.fromEntries(
    Object.entries(SERVICES).map(([id, def]) => {
      const v = getService(settings, id, safeStorage);
      return [id, {
        label: def.label,
        help: def.help,
        url: def.url,
        // Set up as soon as any field is filled (a key, or just the account login).
        configured: def.fields.some((f) => Boolean(v[f.id])),
        fields: def.fields.map((f) => ({ id: f.id, label: f.label, secret: f.secret, set: Boolean(v[f.id]), value: f.secret ? '' : v[f.id] || '' })),
      }];
    }),
  );
}

// ---------------------------------------------------------------- other accounts
const newId = () => `acc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Adds or updates an account. `password` undefined keeps the old one; '' deletes it. */
function setAccount(settings, account, safeStorage) {
  const s = { ...(settings || {}) };
  const list = [...(s.accounts || [])];
  const name = String((account && account.name) || '').trim();
  if (!name) throw new Error('Numele contului lipsește.');
  const url = String(account.url || '').trim();
  if (url && !/^https?:\/\//i.test(url)) throw new Error('Adresa trebuie să înceapă cu https://');
  const i = account.id ? list.findIndex((a) => a.id === account.id) : -1;
  const prev = i >= 0 ? list[i] : {};
  const next = { id: prev.id || newId(), name, url, username: String(account.username || '').trim() };
  if (account.password === undefined) {
    if (prev.password) next.password = prev.password;
  } else if (String(account.password)) next.password = seal(account.password, safeStorage);
  if (i >= 0) list[i] = next;
  else list.push(next);
  s.accounts = list;
  return { settings: s, id: next.id };
}

function deleteAccount(settings, id) {
  const s = { ...(settings || {}) };
  s.accounts = (s.accounts || []).filter((a) => a.id !== id);
  return s;
}

/** Accounts without passwords (renderer). */
function listAccounts(settings) {
  return ((settings && settings.accounts) || []).map((a) => ({ id: a.id, name: a.name, url: a.url || '', username: a.username || '', hasPassword: Boolean(a.password) }));
}

function accountPassword(settings, id, safeStorage) {
  const a = ((settings && settings.accounts) || []).find((x) => x.id === id);
  return a ? unseal(a.password, safeStorage) : '';
}

// Labels of the native editor context menu (electron/main.cjs setupSpelling), in the UI language.
const CTX_LABELS = {
  ro: {
    noSuggestions: 'Nicio sugestie', addToDict: (w) => `Adaugă „${w}” în dicționar`, ignore: (w) => `Ignoră „${w}”`,
    inAppDeepl: 'În program: DeepL', inAppGoogle: 'În program: Google', translate: 'Tradu',
    grammar: 'Verifică gramatica (LanguageTool)', dictionaries: 'Dicționare', research: 'Cercetare pe web',
    ai: 'Asistent AI', aiResearch: 'Cercetare', aiDefine: 'Explică termenul', aiProofread: 'Corectează', aiTranslate: 'Tradu',
    inProject: 'În proiect', findSel: 'Caută selecția în proiect', researchSel: 'Caută în cercetarea proiectului',
    researchAsk: 'AI: răspunde din cercetarea proiectului', glossaryAdd: 'Adaugă în glosar', notebookLm: 'Întreabă NotebookLM',
    extend: 'Extinde selecția', toSentence: 'La frază', toParagraph: 'La paragraf',
    cut: 'Taie', copy: 'Copiază', paste: 'Lipește', pastePlain: 'Lipește fără formatare', selectAll: 'Selectează tot', recheck: 'Verifică ortografia acum',
  },
  en: {
    noSuggestions: 'No suggestions', addToDict: (w) => `Add “${w}” to dictionary`, ignore: (w) => `Ignore “${w}”`,
    inAppDeepl: 'In the app: DeepL', inAppGoogle: 'In the app: Google', translate: 'Translate',
    grammar: 'Check grammar (LanguageTool)', dictionaries: 'Dictionaries', research: 'Web research',
    ai: 'AI assistant', aiResearch: 'Research', aiDefine: 'Explain the term', aiProofread: 'Proofread', aiTranslate: 'Translate',
    inProject: 'In the project', findSel: 'Find the selection in the project', researchSel: 'Search the project research',
    researchAsk: 'AI: answer from the project research', glossaryAdd: 'Add to glossary', notebookLm: 'Ask NotebookLM',
    extend: 'Extend selection', toSentence: 'To sentence', toParagraph: 'To paragraph',
    cut: 'Cut', copy: 'Copy', paste: 'Paste', pastePlain: 'Paste without formatting', selectAll: 'Select all', recheck: 'Check spelling now',
  },
};
const contextMenuLabels = (lang) => CTX_LABELS[lang] || CTX_LABELS.ro;

module.exports = { contextMenuLabels, SERVICES, setService, getService, serviceStatus, setAccount, deleteAccount, listAccounts, accountPassword };
