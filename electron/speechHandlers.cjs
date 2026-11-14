// Dictare online (compatibil OpenAI) + Speechify TTS: canalele IPC pentru motoarele online.
// Directivă autor 2026-11-10: variante online pentru calculatoare slabe unde modelele locale
// nu pot rula. Cheile vin din registry-ul de servicii (criptat cu safeStorage).
const { getService } = require('../lib/services.cjs');
const { speechifySpeak } = require('../lib/translate.cjs');

const STT_DEFAULTS = { baseUrl: 'https://api.openai.com/v1', model: 'whisper-1' };

const sttUrl = (baseUrl) => {
  const base = String(baseUrl || STT_DEFAULTS.baseUrl).trim().replace(/\/+$/, '');
  return /\/v\d+$/.test(base) ? base + '/audio/transcriptions' : base + '/v1/audio/transcriptions';
};

module.exports = function registerSpeechHandlers({ handle, getSettings, net, safeStorage }) {
  handle('stt:configured', () => {
    const v = getService(getSettings(), 'stt', safeStorage);
    return Boolean(v && v.apiKey);
  });
  handle('stt:transcribeOnline', async (e, { b64, mime, lang } = {}) => {
    const v = getService(getSettings(), 'stt', safeStorage);
    if (!v || !v.apiKey) throw new Error('Pune cheia pentru dictarea online în Setări → Servicii și conturi.');
    const url = sttUrl(v.baseUrl);
    const form = new FormData();
    const buffer = Buffer.from(String(b64 || ''), 'base64');
    const ext = String(mime || '').includes('webm') ? 'webm' : String(mime || '').includes('ogg') ? 'ogg' : 'wav';
    form.append('file', new Blob([buffer], { type: mime || 'audio/webm' }), 'dictare.' + ext);
    form.append('model', String(v.model || STT_DEFAULTS.model).trim());
    if (lang) form.append('language', String(lang));
    const res = await (net ? net.fetch : fetch)(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${String(v.apiKey).trim()}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Serviciul online a răspuns ${res.status}: ${await res.text().catch(() => '')}`.slice(0, 300));
    const data = await res.json();
    return { text: String(data.text || '') };
  });
  handle('speech:speechify', async (e, text) => {
    const v = getService(getSettings(), 'speechify', safeStorage);
    if (!v || !v.apiKey || !v.voiceId) throw new Error('Pune cheia și vocea Speechify în Setări → Servicii și conturi.');
    return speechifySpeak({ apiKey: v.apiKey, voiceId: v.voiceId, text, fetchImpl: net ? net.fetch : fetch });
  });
};
module.exports.sttUrl = sttUrl;
