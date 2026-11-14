// Tipul cărții (directivă autor 2026-11-10): AI „vede" ce fel de carte este — taxonomia
// completă se alege în Setări AI proiect, e vizibilă în fereastra AI și intră în contextul
// editorial. Id-urile sunt stabile (persistate în project.bookType).
export const BOOK_TYPES = [
  // Ficțiune — Roman
  { id: 'novel-general', group: 'fiction', label: 'Roman (general)', labelEn: 'Novel (general)', hint: 'Arc narativ coerent, progresie a tensiunii, voce constantă a naratorului.' },
  { id: 'novel-crime', group: 'fiction', label: 'Roman polițist / thriller / suspans', labelEn: 'Crime / thriller / suspense novel', hint: 'Piste clare și echitabile, ritm al revelațiilor, consecvență a cronologiei și a indiciilor.' },
  { id: 'novel-romance', group: 'fiction', label: 'Roman de dragoste (romance)', labelEn: 'Romance novel', hint: 'Arc emoțional credibil, tensiune romantică,, voce distincte ale celor doi protagoniști.' },
  { id: 'novel-sf', group: 'fiction', label: 'Science-fiction', labelEn: 'Science fiction', hint: 'Consecvență a regulilor lumii, terminologie tehnică unitară, implicații logice ale premiselor.' },
  { id: 'novel-fantasy', group: 'fiction', label: 'Fantasy', labelEn: 'Fantasy', hint: 'Reguli ale magiei și ale lumii respectate, nume proprii unitare, construcție graduală a lumii.' },
  { id: 'novel-horror', group: 'fiction', label: 'Horror', labelEn: 'Horror', hint: 'Construcție a tensiunii și a ritualului de amenințare, senzații concrete, ritm al eliberării.' },
  { id: 'novel-historical', group: 'fiction', label: 'Roman istoric', labelEn: 'Historical novel', hint: 'Anacronisme de evitat, vocabular epocal moderat, fapte istorice respectate acolo unde sunt invocate.' },
  { id: 'novel-adventure', group: 'fiction', label: 'Roman de aventuri', labelEn: 'Adventure novel', hint: 'Scopuri clare per secvență, obstacole și miză crescânde, acțiune cu spațialitate lizibilă.' },
  { id: 'novel-psychological', group: 'fiction', label: 'Roman psihologic', labelEn: 'Psychological novel', hint: 'Motivații interioare consecvente, subtext, showing al stărilor fără etichetare excesivă.' },
  { id: 'novel-social', group: 'fiction', label: 'Roman social / politic', labelEn: 'Social / political novel', hint: 'Context social coerent, argumente ambalate în scene, evită pamphletul direct.' },
  { id: 'novel-comingofage', group: 'fiction', label: 'Roman de formare (Bildungsroman)', labelEn: 'Coming-of-age novel', hint: 'Progresie a maturizării, întoarceri cronologice marcate clar, voce care evoluează.' },
  { id: 'novel-dystopia', group: 'fiction', label: 'Distopie / Utopie', labelEn: 'Dystopia / utopia', hint: 'Reguli ale societății alternative consistente, terminologie instituțională unitară.' },
  { id: 'novel-gothic', group: 'fiction', label: 'Roman gotic', labelEn: 'Gothic novel', hint: 'Atmosferă susținută, decor ca personaj, registru arhaic moderat și constant.' },
  // Ficțiune — alte forme
  { id: 'short-prose', group: 'fiction', label: 'Nuvele și povestiri (proză scurtă)', labelEn: 'Short stories / novellas', hint: 'Economie narativă, un singur efect dominant per piesă, finaluri fără explicații în plus.' },
  { id: 'poetry', group: 'fiction', label: 'Poezie', labelEn: 'Poetry', hint: 'Nu normaliza registru, rimă sau versificație; propuneri doar la limba și claritatea imagistică.' },
  { id: 'drama', group: 'fiction', label: 'Teatru / Dramaturgie', labelEn: 'Drama / stage plays', hint: 'Replici în registru de personaj constant, didascalii separate de text, conflict vizibil.' },
  { id: 'comics', group: 'fiction', label: 'Benzi desenate / Roman grafic', labelEn: 'Comics / graphic novel', hint: 'Balanță replică/descriere de cadru, numerotare de panouri consecventă, descrieri concise.' },
  // Non-ficțiune
  { id: 'nonfiction-memoir', group: 'nonfiction', label: 'Biografie / Autobiografie / Memorii', labelEn: 'Biography / autobiography / memoir', hint: 'Cronologie consecventă, distincție memorie/ document, drepturile și intimitatea persoanelor reale.' },
  { id: 'nonfiction-history', group: 'nonfiction', label: 'Carte de istorie', labelEn: 'History book', hint: 'Date și surse verificabile, distincție fapt/ interpretare, contextualizare a erelor.' },
  { id: 'nonfiction-science', group: 'nonfiction', label: 'Știință (popularizare științifică)', labelEn: 'Popular science', hint: 'Acuratețe la nivel de concept, analogii marcate ca atare, terminologie explicată la prima apariție.' },
  { id: 'nonfiction-selfhelp', group: 'nonfiction', label: 'Dezvoltare personală / self-help', labelEn: 'Self-help', hint: 'Promisiuni măsurate, exerciții acționabile, evită garanții și limbaj vindecător absolut.' },
  { id: 'nonfiction-business', group: 'nonfiction', label: 'Business / Leadership / Educație financiară', labelEn: 'Business / leadership / finance', hint: 'Exemple numerice consistente, definiții financiare corecte, recomandări cu limite declarate.' },
  { id: 'nonfiction-essays', group: 'nonfiction', label: 'Eseuri și critică literară', labelEn: 'Essays and literary criticism', hint: 'Teză per ese vizibilă, citate integrate corect, ton argumentativ susținut.' },
  { id: 'nonfiction-philosophy', group: 'nonfiction', label: 'Filosofie', labelEn: 'Philosophy', hint: 'Distincții conceptuale precise, argumentare pas cu pas, terminologie de școală unitară.' },
  { id: 'nonfiction-spirituality', group: 'nonfiction', label: 'Religie și spiritualitate', labelEn: 'Religion and spirituality', hint: 'Respect pentru tradiție și termeni canonici, distincție între învățătură și comentariu personal.' },
  { id: 'nonfiction-psychology', group: 'nonfiction', label: 'Cărți de psihologie', labelEn: 'Psychology books', hint: 'Termeni clinici folosiți corect, fără diagnostic formulat despre persoane reale, studii citate cu limite.' },
  { id: 'nonfiction-journalism', group: 'nonfiction', label: 'Jurnalism / Reportaj / Non-ficțiune narativă (true crime)', labelEn: 'Journalism / narrative nonfiction', hint: 'Faptele se separă explicit de narativ, atribuire a surselor, presupunere de nevinovăție în cazuri reale.' },
  { id: 'nonfiction-technical', group: 'nonfiction', label: 'Carte tehnică / profesională', labelEn: 'Technical / professional book', hint: 'Precizie terminologică, pași reproductibili, convenții de notare constante, exemple verificabile.' },
  { id: 'nonfiction-practical', group: 'nonfiction', label: 'Cărți practice: bucate, grădinărit, călătorii, sănătate', labelEn: 'Practical books: cooking, gardening, travel, health', hint: 'Instrucțiuni pas cu pas, cantități și timpi exacți, avertismente de siguranță păstrate.' },
  { id: 'nonfiction-academic', group: 'nonfiction', label: 'Academic: teză, studiu, manual', labelEn: 'Academic: thesis, study, textbook', hint: 'Registru academic, citare consecventă, obiective de învățare clare, fără ton conversațional.' },
];

const byId = new Map(BOOK_TYPES.map((t) => [t.id, t]));
const GROUPS = { fiction: 'Ficțiune', nonfiction: 'Non-ficțiune' };

export function bookTypeById(id) {
  return byId.get(String(id || '')) || null;
}

export function bookTypeLabel(id, lang = 'ro') {
  const bt = byId.get(String(id || ''));
  if (!bt) return '';
  return lang === 'en' ? bt.labelEn : bt.label;
}

export function bookTypeOptions(lang = 'ro') {
  return BOOK_TYPES.map((t) => ({ id: t.id, group: GROUPS[t.group] || t.group, label: (lang === 'en' ? t.labelEn : t.label) }));
}

export function bookTypeGuidance(id, lang = 'ro') {
  return byId.get(String(id || ''))?.hint || '';
}

// Instrucțiunea de detecție: modelul primește un eșantion și răspunde DOAR cu un id din listă.
export function bookTypeDetectPrompt() {
  return 'Identifică tipul cărții din eșantionul de text. Răspunde DOAR cu id-ul potrivit din această listă, fără alt text: '
    + BOOK_TYPES.map((t) => t.id + ' = ' + t.label).join('; ') + '.';
}

// Extrage primul id valid din răspunsul modelului (tolerant la ghilimele, punctuație, explicații).
export function bookTypeFromReply(text) {
  const reply = String(text || '');
  const ids = BOOK_TYPES.map((t) => t.id).sort((a, b) => b.length - a.length);
  for (const id of ids) {
    if (new RegExp('(^|[^\\w-])' + id.replace(/[-]/g, '\\-') + '([^\\w-]|$)', 'i').test(reply)) return id;
  }
  return null;
}
