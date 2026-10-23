'use strict';
// Writing assistant (any provider, see lib/aiProviders.cjs). Runs in the Electron main process so the
// API key never reaches the renderer.
const Anthropic = require('@anthropic-ai/sdk');

const providers = require('./aiProviders.cjs');

const MODEL = providers.ANTHROPIC_MODEL;

const SYSTEM = `Ești asistentul de scriere din Scribner, un program pentru scriitori de cărți.
Lucrezi pe textul autorului cu respect pentru vocea, stilul și limba lui (implicit română).
Răspunzi direct, fără introduceri sau încheieri de politețe. Când rescrii text, întorci doar textul rescris.`;

const ACTIONS = {
  proofread: {
    label: 'Corectură',
    prompt: 'Corectează greșelile de ortografie, gramatică și punctuație din textul de mai jos. Nu schimba stilul sau conținutul. Întoarce doar textul corectat.',
  },
  summarize: {
    label: 'Sinopsis',
    prompt: 'Scrie un sinopsis de 2-3 propoziții pentru scena/capitolul de mai jos, potrivit pentru o fișă de pe corkboard.',
  },
  continue: {
    label: 'Continuă',
    prompt: 'Continuă textul de mai jos cu 1-3 paragrafe, în aceeași voce și același stil. Întoarce doar continuarea.',
  },
  feedback: {
    label: 'Critică',
    prompt: 'Dă feedback editorial concret pe textul de mai jos: ritm, claritate, dialog, tensiune, repetiții. Maxim 8 observații, fiecare cu exemplu și sugestie.',
  },
  consistency: {
    label: 'Consistență',
    prompt: 'Verifică textul de mai jos față de notele proiectului (personaje, locuri, cronologie). Listează contradicțiile găsite, cu citat și explicație. Dacă nu găsești, spune asta într-o propoziție.',
  },
  ask: {
    label: 'Întrebare',
    prompt: '',
  },
};

// Editorial passes (I-REP / I-EDIT): the renderer builds the system prompt and the
// instruction from the project's editorial profile.
// Provider config ({provider, model, baseUrl, apiKey}) comes from the main process settings;
// without `provider` the call goes to Anthropic exactly as before.
async function runEditorial({ apiKey, provider, model, baseUrl, system, prompt, effort = 'high', signal }) {
  const cfg = providers.resolveConfig({ provider, model, apiKey, baseUrl });
  if (cfg.needsKey && !apiKey) throw new Error(providers.missingKeyMessage(cfg.provider));
  const { text, stopReason } = await providers.completeFull({ ...cfg, system, prompt, maxTokens: 64000, effort, signal });
  if (stopReason === 'refusal') throw new Error('Modelul a refuzat cererea.');
  if (stopReason === 'max_tokens' || stopReason === 'length' || stopReason === 'MAX_TOKENS') {
    throw new Error('Textul e prea lung pentru o singură trecere. Lucrează pe un document mai scurt.');
  }
  return { text, stopReason };
}

async function runAction({ apiKey, provider, model, baseUrl, action, text, question, context, system, prompt, effort, signal }) {
  if (action === 'editorial') return runEditorial({ apiKey, provider, model, baseUrl, system, prompt, effort, signal });
  const cfg = providers.resolveConfig({ provider, model, apiKey, baseUrl });
  if (cfg.needsKey && !apiKey) throw new Error(providers.missingKeyMessage(cfg.provider));
  const def = ACTIONS[action];
  if (!def) throw new Error(`Acțiune necunoscută: ${action}`);

  const parts = [];
  if (context) parts.push(`<note_proiect>\n${context}\n</note_proiect>`);
  parts.push(`<text>\n${text}\n</text>`);
  parts.push(action === 'ask' ? question || '' : def.prompt);

  const res = await providers.completeFull({
    ...cfg,
    system: SYSTEM,
    prompt: parts.join('\n\n'),
    maxTokens: 32000,
    effort: action === 'proofread' || action === 'summarize' ? 'low' : 'medium',
    signal,
  });
  if (res.stopReason === 'refusal') {
    throw new Error('Modelul a refuzat cererea.');
  }
  return { text: res.text, stopReason: res.stopReason };
}

function friendlyError(err) {
  const p = providers.friendlyProviderError(err);
  if (p) return p;
  if (err instanceof Anthropic.AuthenticationError) return 'Cheie API invalidă.';
  if (err instanceof Anthropic.RateLimitError) return 'Prea multe cereri. Încearcă din nou peste câteva secunde.';
  if (err instanceof Anthropic.APIConnectionError) return 'Nu mă pot conecta la Anthropic. Verifică internetul.';
  if (err instanceof Anthropic.APIError) return `Eroare API ${err.status}: ${err.message}`;
  return err.message || String(err);
}

module.exports = { MODEL, ACTIONS, runAction, runEditorial, friendlyError };
