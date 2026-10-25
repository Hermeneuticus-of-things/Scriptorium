// Pacing analysis (Analiză de ritm) per scene, without AI. Pure module.
import { sceneNodes, scenePlain } from './scenes.js';

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
const words = (s) => (s.match(WORD_RE) || []).length;

/** Words inside dialogue: „…”, "…", «…», or paragraphs starting with a dash (— / – / -). */
export function dialogueWords(text) {
  let n = 0;
  for (const para of String(text || '').split(/\n+/)) {
    if (/^\s*[—–-]\s*\S/.test(para)) { n += words(para); continue; }
    for (const m of para.match(/„[^”"]*[”"]|"[^"]*"|«[^»]*»|“[^”]*”/g) || []) n += words(m);
  }
  return n;
}

export function analyzeText(text) {
  const t = String(text || '');
  const w = words(t);
  const sentences = t.split(/(?<=[.!?…])\s+|\n+/u).filter((s) => /[\p{L}\p{N}]/u.test(s));
  const paras = t.split(/\n+/).filter((p) => /[\p{L}\p{N}]/u.test(p));
  const dw = Math.min(w, dialogueWords(t));
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    words: w,
    sentences: sentences.length,
    paragraphs: paras.length,
    dialogueRatio: w ? Math.round((dw / w) * 1000) / 1000 : 0,
    avgSentence: sentences.length ? r1(w / sentences.length) : 0,
    avgParagraph: paras.length ? r1(w / paras.length) : 0,
  };
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

/**
 * @returns {{scenes:Array, summary:{count,totalWords,meanWords,stdDev,cv,meanDialogue,meanSentence}}}
 * Each scene gets z (word-count z-score) and flags: 'lung', 'scurt', 'fără dialog', 'fraze lungi'.
 */
export function analyzePacing(project, docs, { scope = 'draft' } = {}) {
  const scenes = sceneNodes(project, { scope }).map(({ node }) => ({ id: node.id, title: node.title, ...analyzeText(scenePlain(docs, node.id)) }));
  const ws = scenes.map((s) => s.words);
  const m = mean(ws);
  const sd = Math.sqrt(mean(ws.map((x) => (x - m) ** 2)));
  const meanSent = mean(scenes.filter((s) => s.sentences).map((s) => s.avgSentence));
  for (const s of scenes) {
    s.z = sd ? Math.round(((s.words - m) / sd) * 100) / 100 : 0;
    s.flags = [];
    if (s.z >= 1.5) s.flags.push('lung');
    if (s.z <= -1.5) s.flags.push('scurt');
    if (s.words >= 300 && s.dialogueRatio === 0) s.flags.push('fără dialog');
    if (meanSent && s.avgSentence > meanSent * 1.5) s.flags.push('fraze lungi');
  }
  return {
    scenes,
    summary: {
      count: scenes.length,
      totalWords: ws.reduce((a, b) => a + b, 0),
      meanWords: Math.round(m),
      stdDev: Math.round(sd),
      cv: m ? Math.round((sd / m) * 100) / 100 : 0,
      meanDialogue: Math.round(mean(scenes.map((s) => s.dialogueRatio)) * 1000) / 1000,
      meanSentence: Math.round(meanSent * 10) / 10,
    },
  };
}
