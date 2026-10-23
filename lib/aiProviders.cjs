'use strict';
// Provider layer for the writing assistant. Runs in the Electron main process only.
//   complete({provider, model, apiKey, baseUrl, system, prompt, maxTokens, effort, signal}) -> text
// anthropic: @anthropic-ai/sdk (adaptive thinking, streaming finalMessage), unchanged from lib/ai.cjs.
// openai:    any OpenAI-compatible server, POST `${baseUrl}/chat/completions` with a Bearer key.
// gemini:    Google Generative Language REST `models/{model}:generateContent?key=...`.
// `fetch` can be injected (tests); defaults to the global fetch of Electron / Node 18+.
const Anthropic = require('@anthropic-ai/sdk');
const PRESETS = require('./aiPresets.json');

const DEFAULT_PROVIDER = 'anthropic';
const ANTHROPIC_MODEL = PRESETS.anthropic.defaultModel;
// Output cap sent to non-Anthropic servers. Large values are rejected by many models,
// so bigger requests are left to the server default.
const SAFE_MAX_TOKENS = 8192;

class ProviderError extends Error {
  constructor(message, { status, provider, code } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
    this.provider = provider;
    this.code = code;
  }
}

const preset = (provider) => PRESETS[provider] || PRESETS.custom;
const providerLabel = (provider) => (PRESETS[provider] ? PRESETS[provider].label : provider || 'AI');

/** Fills model/baseUrl from the preset; strips a trailing slash from the base URL. */
function resolveConfig({ provider = DEFAULT_PROVIDER, model, apiKey, baseUrl } = {}) {
  const p = PRESETS[provider] ? provider : 'custom';
  const pre = preset(p);
  return {
    provider: p,
    kind: pre.kind,
    model: String(model || '').trim() || pre.defaultModel,
    apiKey: apiKey || '',
    // Users often paste the full endpoint; keep only the base so the path isn't doubled.
    baseUrl: String(baseUrl || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '') || pre.baseUrl,
    needsKey: pre.needsKey,
    label: pre.label,
  };
}

function missingKeyMessage(provider) {
  return provider === 'anthropic' ? 'Setează cheia API Anthropic în Setări.' : `Setează cheia API ${providerLabel(provider)} în Setări.`;
}

// ---------------------------------------------------------------------------
// anthropic (moved from lib/ai.cjs)

function textOf(message) {
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

async function anthropicMessage({ model, apiKey, system, prompt, maxTokens, effort, signal }) {
  const client = new Anthropic({ apiKey });
  const body = {
    model: model || ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    thinking: { type: 'adaptive' },
    output_config: { effort },
    system,
    messages: [{ role: 'user', content: prompt }],
  };
  const stream = signal ? client.beta.messages.stream(body, { signal }) : client.beta.messages.stream(body);
  const message = await stream.finalMessage();
  return { text: textOf(message), stopReason: message.stop_reason };
}

// ---------------------------------------------------------------------------
// HTTP helpers

async function readError(res) {
  let detail = '';
  try {
    const body = await res.text();
    try {
      const j = JSON.parse(body);
      const e = Array.isArray(j) ? j[0] && j[0].error : j.error;
      detail = (e && (e.message || (typeof e === 'string' ? e : ''))) || j.message || body;
    } catch {
      detail = body;
    }
  } catch {
    /* no body */
  }
  return String(detail || res.statusText || '').slice(0, 300);
}

async function postJson(fetchImpl, url, headers, body, signal, provider) {
  let res;
  try {
    res = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    throw new ProviderError((err && err.message) || 'fetch failed', { provider, code: 'network' });
  }
  if (!res.ok) throw new ProviderError(await readError(res), { status: res.status, provider });
  try {
    return await res.json();
  } catch {
    throw new ProviderError('Răspuns invalid (nu e JSON).', { status: res.status, provider, code: 'bad_response' });
  }
}

// ---------------------------------------------------------------------------
// OpenAI-compatible

function openaiRequest({ model, apiKey, baseUrl, system, prompt, maxTokens }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });
  const body = { model, messages };
  if (maxTokens && maxTokens <= SAFE_MAX_TOKENS) body.max_tokens = maxTokens;
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  return { url: `${baseUrl}/chat/completions`, headers, body };
}

function openaiText(json) {
  const choice = json && json.choices && json.choices[0];
  if (!choice) throw new ProviderError('Răspuns fără conținut.', { code: 'bad_response' });
  if (choice.finish_reason === 'content_filter') throw new ProviderError('Modelul a refuzat cererea.', { code: 'refusal' });
  const c = choice.message && choice.message.content;
  // Content may be an array of parts; reasoning/thinking parts are not part of the answer.
  const isAnswer = (p) => typeof p === 'string' || !p.type || p.type === 'text' || p.type === 'output_text';
  const text = (Array.isArray(c) ? c.filter((p) => p && isAnswer(p)).map((p) => (typeof p === 'string' ? p : p.text || '')).join('') : String(c || '')).trim();
  if (!text && choice.finish_reason !== 'length') throw new ProviderError('Modelul a întors un răspuns gol.', { code: 'bad_response' });
  return { text, stopReason: choice.finish_reason || '' };
}

// ---------------------------------------------------------------------------
// Google Gemini

function geminiRequest({ model, apiKey, baseUrl, system, prompt, maxTokens }) {
  const id = String(model).replace(/^models\//, '');
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }] };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (maxTokens && maxTokens <= SAFE_MAX_TOKENS) body.generationConfig = { maxOutputTokens: maxTokens };
  return { url: `${baseUrl}/models/${encodeURIComponent(id)}:generateContent?key=${encodeURIComponent(apiKey)}`, headers: {}, body };
}

function geminiText(json) {
  if (json && json.promptFeedback && json.promptFeedback.blockReason) throw new ProviderError('Modelul a refuzat cererea.', { code: 'refusal' });
  const cand = json && json.candidates && json.candidates[0];
  if (!cand) throw new ProviderError('Răspuns fără conținut.', { code: 'bad_response' });
  if (['SAFETY', 'PROHIBITED_CONTENT', 'RECITATION', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY'].includes(cand.finishReason)) throw new ProviderError('Modelul a refuzat cererea.', { code: 'refusal' });
  // Thinking models return `thought: true` parts alongside the answer.
  const text = ((cand.content && cand.content.parts) || []).filter((p) => p && !p.thought).map((p) => p.text || '').join('').trim();
  if (!text && cand.finishReason !== 'MAX_TOKENS') throw new ProviderError('Modelul a întors un răspuns gol.', { code: 'bad_response' });
  return { text, stopReason: cand.finishReason || '' };
}

// ---------------------------------------------------------------------------

/** Like complete() but returns {text, stopReason}. */
async function completeFull(opts = {}, { fetch: fetchImpl = globalThis.fetch } = {}) {
  const cfg = resolveConfig(opts);
  const { system = '', prompt = '', maxTokens = 32000, effort = 'medium', signal } = opts;
  if (cfg.needsKey && !cfg.apiKey) throw new Error(missingKeyMessage(cfg.provider));
  if (cfg.kind === 'anthropic') {
    return anthropicMessage({ model: cfg.model, apiKey: cfg.apiKey, system, prompt, maxTokens, effort, signal });
  }
  if (!cfg.model) throw new Error(`Alege modelul pentru ${cfg.label} în Setări.`);
  if (!cfg.baseUrl) throw new Error('Completează adresa serverului (URL de bază) în Setări.');
  const build = cfg.kind === 'gemini' ? geminiRequest : openaiRequest;
  const parse = cfg.kind === 'gemini' ? geminiText : openaiText;
  const req = build({ ...cfg, system, prompt, maxTokens });
  const json = await postJson(fetchImpl, req.url, req.headers, req.body, signal, cfg.provider);
  try {
    return parse(json);
  } catch (err) {
    if (err instanceof ProviderError) err.provider = cfg.provider;
    throw err;
  }
}

async function complete(opts, deps) {
  return (await completeFull(opts, deps)).text;
}

/** Romanian message for errors from any provider; null when the error isn't a provider error. */
function friendlyProviderError(err) {
  if (!(err instanceof ProviderError)) return null;
  const who = providerLabel(err.provider);
  if (err.code === 'network') return `Nu mă pot conecta la ${who}. Verifică internetul, adresa serverului sau că serverul local rulează.`;
  if (err.code === 'refusal') return 'Modelul a refuzat cererea.';
  if (err.code === 'bad_response') return `${who}: ${err.message}`;
  switch (err.status) {
    case 401: return `Cheie API invalidă pentru ${who}.`;
    case 403: return `Cheia API ${who} nu are acces la acest model sau serviciu.`;
    case 404: return `${who}: modelul sau adresa nu există. Verifică id-ul modelului și URL-ul de bază.`;
    case 429: return `${who}: prea multe cereri sau cotă depășită. Încearcă din nou peste câteva secunde.`;
    default:
      if (err.status >= 500) return `${who} are o problemă temporară (${err.status}). Încearcă din nou.`;
      return err.status ? `Eroare API ${who} ${err.status}: ${err.message}` : `${who}: ${err.message}`;
  }
}

module.exports = {
  PRESETS, DEFAULT_PROVIDER, ANTHROPIC_MODEL, SAFE_MAX_TOKENS, ProviderError,
  providerLabel, resolveConfig, missingKeyMessage, complete, completeFull, friendlyProviderError,
  openaiRequest, openaiText, geminiRequest, geminiText,
};
