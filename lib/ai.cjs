'use strict';
// Writing assistant backed by Claude. Runs in the Electron main process so the
// API key never reaches the renderer.
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = 'claude-opus-5-5';

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

function textOf(message) {
  return message.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

// Editorial passes (I-REP / I-EDIT): the renderer builds the system prompt and the
// instruction from the project's editorial profile.
async function runEditorial({ apiKey, system, prompt, effort = 'high' }) {
  if (!apiKey) throw new Error('Setează cheia API Anthropic în Setări.');
  const client = new Anthropic({ apiKey });
  const message = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort },
      system,
      messages: [{ role: 'user', content: prompt }],
    })
    .finalMessage();
  if (message.stop_reason === 'refusal') throw new Error('Modelul a refuzat cererea.');
  if (message.stop_reason === 'max_tokens') throw new Error('Textul e prea lung pentru o singură trecere. Lucrează pe un document mai scurt.');
  return { text: textOf(message), stopReason: message.stop_reason };
}

async function runAction({ apiKey, action, text, question, context, system, prompt, effort }) {
  if (action === 'editorial') return runEditorial({ apiKey, system, prompt, effort });
  if (!apiKey) throw new Error('Setează cheia API Anthropic în Setări.');
  const def = ACTIONS[action];
  if (!def) throw new Error(`Acțiune necunoscută: ${action}`);
  const client = new Anthropic({ apiKey });

  const parts = [];
  if (context) parts.push(`<note_proiect>\n${context}\n</note_proiect>`);
  parts.push(`<text>\n${text}\n</text>`);
  parts.push(action === 'ask' ? question || '' : def.prompt);

  const message = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      thinking: { type: 'adaptive' },
      output_config: { effort: action === 'proofread' || action === 'summarize' ? 'low' : 'medium' },
      system: SYSTEM,
      messages: [{ role: 'user', content: parts.join('\n\n') }],
    })
    .finalMessage();

  if (message.stop_reason === 'refusal') {
    throw new Error('Modelul a refuzat cererea.');
  }
  return { text: textOf(message), stopReason: message.stop_reason };
}

function friendlyError(err) {
  if (err instanceof Anthropic.AuthenticationError) return 'Cheie API invalidă.';
  if (err instanceof Anthropic.RateLimitError) return 'Prea multe cereri. Încearcă din nou peste câteva secunde.';
  if (err instanceof Anthropic.APIConnectionError) return 'Nu mă pot conecta la Anthropic. Verifică internetul.';
  if (err instanceof Anthropic.APIError) return `Eroare API ${err.status}: ${err.message}`;
  return err.message || String(err);
}

module.exports = { MODEL, ACTIONS, runAction, runEditorial, friendlyError };
