// Shared scanner: finds Romanian-looking string literals in JSX sources (used by tests/i18nStrings.test.js).
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';

const DIACRITICS = /[ăâîșşțţĂÂÎȘŞȚŢ]/;
const RO_WORDS = /\b(aliniere|antet|ascunde|aspect|autor|blocat|categorie|caut|centrat|coloane|comentarii|compunere|creat|cronologia|cronologie|descriere|detalii|dimensiune|ecran|exterior|foldere|formate|forme|fraze|furnizor|imagine|interior|istoric|istoricul|liber|linii|litere|luna|lunar|lungime|majuscule|manuscris|manuscrisul|metadate|metadatele|modificat|normale|notele|numele|orientare|partajare|peisaj|pioneze|portret|potrivire|prenume|previzualizare|procent|progres|punct|raport|recente|reindexez|runda|salt|salvat|semnale|sesiune|subliniat|subsol|sufix|sursa|umple|unitate|vezi|voce|zile|zilnic|amestec|gen|oricare|feminin|masculin|anterior|teleologie|pasive|lexic|editare|vizualizare|navigare|unelte|ajutor|orizontal|vertical|deschide|deschis|favorit|anulat|erori|importat|ritm|claritate|aici|acum|inapoi|inainte|lipsa|alege|adauga|cauta|filtru|eticheta|culori|altul|alta|alte|niciunul|unde|cand|care|pentru|dupa|fiecare|nimic|mai|foarte|bine|rapid|lent|mic|mare|mici|mari|mediu|medii|sus|jos|stanga|dreapta|centru|carte|personal|automat|activ|inactiv|vizibil|ascuns|si|sau|este|sunt|pentru|niciun|nicio|cu|din|pe|la|ca|un|una|doar|tot|toate|toti|titlu|titlul|etichet[ae]|etichete|sinopsis|cuvinte|cuvant|dosar|dosare|dosarul|documente|documentul|documentele|proiect|proiectul|nou|noua|gata|setari|cautare|rezultate|nimic|eroare|implicit|culoare|marime|pagina|pagini|caractere|data|ora|nume|tip|tipul|textul|note|nota|referinte|cercetare|sablon|sabloane|colectie|colectii|carte|capitol|scena|scene|personaj|personaje|loc|locuri|mod|stil|stiluri|lista|optiuni|avansat|simplu|copie|exemplu|separatoare|statusuri|evenimente|eveniment|selectie|fisier|fisiere|tinta|stare|stari|filtre|campuri|camp|cuprins|deschis|inchis|gol|goala|nimic|niciuna)\b/i;
// lower-case single words that are unmistakably Romanian UI text (not ids, classes or English)
const RO_SINGLE = /^(cuvinte|caractere|pagini|documente|dosare|erori|zile|minute|ore|secunde|scene|termeni|rezultate|fisiere|copii|implicit|gol|nimic|toate|selectie|activ|inactiv)[.:,…]?$/i;

export function looksRomanian(s) {
  const v = s.trim();
  if (!v || !/[a-zA-ZăâîșțĂÂÎȘȚ]/.test(v)) return false;
  if (/^\s*[.#@][\w-]+\s*\{|\{[^}]*:[^}]*;/.test(v) && !DIACRITICS.test(v.replace(/<[^>]*>|\{[^}]*\}/g, ''))) return false; // CSS
  if (/^\[|^[\w-]*\[data-|^tr\[/.test(v)) return false; // CSS selectors
  if (DIACRITICS.test(v)) return true;
  if (/\b(the|and|of|to|is|are|with|for|from|you|your|this|when|in the)\b/i.test(v)) return false; // English
  if (/^(Text|Format|Font|Status|Separator|Document|Editor|Inspector|Corkboard|Outline|Binder|OK|Zoom|Snapshot|Snapshots|Backup|Scrivenings|Split|Merge|Layout)$/.test(v)) return false; // same in English
  // no diacritics: look for common Romanian UI words (case-insensitive, whole words), but only in
  // prose-like strings (contain a space or start with a capital), never in class names / ids.
  if (!/\s/.test(v) && !/^[A-Z]/.test(v)) return RO_SINGLE.test(v);
  return RO_WORDS.test(v);
}

function walk(node, visit, parent, key) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parent, key);
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'extra' || k === 'leadingComments' || k === 'trailingComments') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, visit, node, k));
    else if (v && typeof v.type === 'string') walk(v, visit, node, k);
  }
}

/** Returns [{file, line, text}] of Romanian-looking literals not routed through t(). */
export function scanFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const ast = parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  const out = [];
  walk(ast.program, (n, parent, key) => {
    let text = null;
    if (n.type === 'JSXText') text = n.value;
    else if (n.type === 'StringLiteral') {
      // skip import sources, object keys, and args of t()/cmdLabel()/console.*
      if (parent && (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration')) return;
      if (parent && parent.type === 'ObjectProperty' && key === 'key') return;
      if (parent && parent.type === 'CallExpression' && parent.callee.type === 'Identifier' && ['t', 'cmdLabel'].includes(parent.callee.name) && parent.arguments[0] === n) return;
      if (parent && parent.type === 'CallExpression' && parent.callee.type === 'MemberExpression' && parent.callee.object.name === 'console') return;
      text = n.value;
    } else if (n.type === 'TemplateLiteral') text = n.quasis.map((q) => q.value.cooked ?? q.value.raw).join(' X ');
    if (text != null && looksRomanian(text)) out.push({ file, line: n.loc.start.line, text: text.trim().replace(/\s+/g, ' ').slice(0, 80) });
  });
  return out;
}

export function scanDir(dir) {
  const res = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) res.push(...scanDir(p));
    else if (p.endsWith('.jsx')) res.push(...scanFile(p));
  }
  return res;
}
