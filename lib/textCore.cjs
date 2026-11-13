'use strict';
// O singură implementare HTML→text și numărare de cuvinte pentru procesul main.
// Înainte: două clone (store.cjs, rag.cjs) cu liste de tag-uri divergente — risc de drift.
// Lista union (toate tag-urile de bloc pe care le serializează editorul): newline-urile nu
// schimbă numărul de cuvinte, iar RAG câștigă segmentare corectă pe paragrafe.
const BLOCK_RE = /<\/(p|h[1-6]|li|blockquote|div|td|th|tr|pre|dt|dd|figcaption)>/gi;

function htmlToText(html) {
  return String(html || '')
    .replace(BLOCK_RE, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function countWords(text) {
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return words ? words.length : 0;
}

function wordCount(html) {
  return countWords(htmlToText(html));
}

module.exports = { htmlToText, countWords, wordCount };
