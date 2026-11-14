import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const { SERVICES, serviceStatus } = req('../lib/services.cjs');
const { speechifySpeak } = req('../lib/translate.cjs');
const { sttUrl } = req('../electron/speechHandlers.cjs');

// Dictare + voce ONLINE (directivă autor 2026-11-10): serviciul cloud de transcriere
// pentru calculatoare slabe + vocile Speechify ca motor de redare online.
describe('serviciul „Dictare online (compatibil OpenAI)"', () => {
  it('existe în registry cu cheie criptată, adresă de bază și model', () => {
    const def = SERVICES.stt;
    expect(def).toBeTruthy();
    const ids = def.fields.map((f) => f.id);
    expect(ids).toEqual(['apiKey', 'baseUrl', 'model']);
    expect(def.fields[0].secret).toBe(true);
    expect(def.help).toContain('compatibil OpenAI');
  });
  it('configurat = cheie API setată (verificat în runtime-ul real al main-ului)', () => {
    const { execFileSync } = require('child_process');
    const parts = [
      'const { serviceStatus } = require("./lib/services.cjs");',
      'const ss = { decryptString: (b) => b.toString("utf8"), isEncryptionAvailable: () => true };',
      'const st = serviceStatus({ services: { stt: { apiKey: "k1", model: "large-v3" } } }, ss);',
      'const off = serviceStatus({ services: { stt: { baseUrl: "https://x" } } }, ss);',
      'console.log(JSON.stringify({ on: st.stt.configured, off: off.stt.configured, model: st.stt.fields.find((f) => f.id === "model").value }));',
    ];
    const out = JSON.parse(execFileSync(process.execPath, ['-e', parts.join('')], { cwd: process.cwd(), encoding: 'utf8' }));
    expect(out.on).toBe(true);
    expect(out.off).toBe(false);
    expect(out.model).toBe('large-v3');
  });});

describe('endpoint-ul de transcriere online (normalizare URL)', () => {
  it('adaugă /v1/audio/transcriptions când baza nu are versiune', () => {
    const norm = sttUrl;
    expect(norm('https://api.openai.com/v1')).toBe('https://api.openai.com/v1/audio/transcriptions');
    expect(norm('https://api.groq.com/openai/v1/')).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(norm('https://server.local')).toBe('https://server.local/v1/audio/transcriptions');
    expect(norm(undefined)).toBe('https://api.openai.com/v1/audio/transcriptions');
  });
});

describe('motorul de voce online Speechify', () => {
  it('fără cheie → eroare cu îndrumare către Setări', async () => {
    await expect(speechifySpeak({ apiKey: '', text: 'Salut.', voiceId: 'george' })).rejects.toThrow('Servicii');
  });
  it('cu cheie fixture → chunkuri mp3 base64 (fără rețea: fetchImpl fixture)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ audio_data: 'YWJj' }) }));
    const res = await speechifySpeak({ apiKey: 'k', voiceId: 'george', text: ' Prima propoziție. A doua. ', fetchImpl });
    expect(res.format).toBe('mp3');
    expect(res.chunks.length).toBeGreaterThan(0);
    expect(res.chunks.every((c) => typeof c === 'string')).toBe(true);
    expect(fetchImpl.mock.calls.length).toBeGreaterThan(0);
  });
});
