'use strict';
// "Test connection" for a service account: a minimal, real call with the stored credentials, so the
// user sees whether the key/login is accepted. Resolves on success; throws a friendly error otherwise.
// The functional APIs authenticate with a key — so the test checks the API key (and username where the
// service uses one). A service set up with only an email/password login has no API to test against.
const translate = require('./translate.cjs');

async function testService(id, creds = {}, { fetchImpl = fetch } = {}) {
  switch (id) {
    case 'deepl':
      await translate.deeplTranslate({ apiKey: creds.apiKey, text: 'test', from: 'en', to: 'ro', fetchImpl });
      return { ok: true };
    case 'googleTranslate':
      await translate.googleTranslate({ apiKey: creds.apiKey, text: 'test', to: 'ro', fetchImpl });
      return { ok: true };
    case 'languagetool':
      await translate.languageToolCheck({ username: creds.username, apiKey: creds.apiKey, text: 'a test', language: 'en-US', fetchImpl });
      return { ok: true };
    case 'speechify':
      await translate.speechifySpeak({ apiKey: creds.apiKey, voiceId: creds.voiceId, text: 'Salut.', fetchImpl });
      return { ok: true };
    case 'zotero': {
      if (!creds.userId || !creds.apiKey) throw new Error('Pune ID-ul de utilizator și cheia Zotero.');
      const res = await fetchImpl(`https://api.zotero.org/users/${encodeURIComponent(creds.userId)}/items?limit=1`, { headers: { 'Zotero-API-Key': creds.apiKey } });
      if (res.status === 403) throw new Error('Zotero: cheia nu e acceptată (verifică ID-ul și cheia).');
      if (!res.ok) throw new Error(`Zotero a răspuns cu ${res.status}.`);
      return { ok: true };
    }
    case 'github': {
      if (!creds.token) throw new Error('Pune tokenul GitHub.');
      const res = await fetchImpl('https://api.github.com/user', { headers: { Authorization: `Bearer ${creds.token}`, 'User-Agent': 'pneuma', Accept: 'application/vnd.github+json' } });
      if (res.status === 401) throw new Error('GitHub: tokenul nu e acceptat.');
      if (!res.ok) throw new Error(`GitHub a răspuns cu ${res.status}.`);
      return { ok: true };
    }
    default:
      throw new Error('Acest serviciu nu are test de conexiune.');
  }
}

// Which services can be tested (the ones with a functional API).
const TESTABLE = new Set(['deepl', 'googleTranslate', 'languagetool', 'speechify', 'zotero', 'github']);

module.exports = { testService, TESTABLE };
