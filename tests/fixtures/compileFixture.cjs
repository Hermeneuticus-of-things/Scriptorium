'use strict';
// Rich compile fixture: every construct the editor can produce, used by tests/compileValid.test.js
// and by manual validation runs (see dumpAll).

// 2x2 red PNG
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==';

function project(extra = {}) {
  return {
    title: 'Drumul „lung” — ediție',
    author: 'Ștefan Țăranu',
    titleAbbreviation: 'DRUM',
    sectionTypes: [
      { id: 'st0', title: 'Parte' },
      { id: 'st1', title: 'Capitol' },
      { id: 'st2', title: 'Scenă' },
      { id: 'st3', title: 'Pagină de titlu' },
      { id: 'st4', title: 'Secțiune' },
      { id: 'st5', title: 'Capitol cu text' },
    ],
    sectionTypeLevels: { folders: 'st1', containers: null, files: 'st2' },
    tree: [
      {
        id: 'draft', root: 'draft', type: 'folder', title: 'Manuscris', children: [
          { id: 'tp', type: 'text', title: 'Titlu', sectionType: 'st3', includeInCompile: true },
          { id: 'p1', type: 'folder', title: 'Începuturi', sectionType: 'st0', includeInCompile: true, children: [
            { id: 'c1', type: 'folder', title: 'Plecarea', includeInCompile: true, children: [
              { id: 's1', type: 'text', title: 'Gara', includeInCompile: true },
              { id: 's2', type: 'text', title: 'Trenul', includeInCompile: true },
            ] },
            { id: 'c2', type: 'folder', title: 'Sosirea', sectionType: 'st5', includeInCompile: true, children: [
              { id: 's3', type: 'text', title: 'Peronul', includeInCompile: true },
              { id: 's4', type: 'text', title: 'Secțiunea', sectionType: 'st4', includeInCompile: true },
            ] },
          ] },
        ],
      },
      {
        id: 'research', root: 'research', type: 'folder', title: 'Cercetare', children: [
          { id: 'fm', type: 'folder', title: 'Front', children: [{ id: 'ded', type: 'text', title: 'Dedicație' }] },
          { id: 'bm', type: 'folder', title: 'Back', children: [{ id: 'ack', type: 'text', title: 'Mulțumiri' }] },
          { id: 'imgnode', type: 'file', title: 'Harta', media: { file: 'harta.png', mime: 'image/png' } },
        ],
      },
    ],
    ...extra,
  };
}

const DOCS = {
  tp: '<p style="text-align: center">Pagina de titlu: &lt;$t&gt;</p>',
  c2: '<p>Text de capitol cu diacritice: ăâîșț ĂÂÎȘȚ.</p>',
  s1:
    '<p>Era „noapte” -- iar trenul <span data-comment="verifică ora" class="comment">întârzia</span>.<span data-footnote="Gara de Nord, București." class="footnote"></span></p>' +
    '<p>Capitolul &lt;$n:roman&gt; (secțiunea &lt;$n&gt;) are &lt;$wc&gt; cuvinte în „&lt;$t&gt;”.</p>' +
    '<p><strong>Îndrăzneț</strong>, <em>înclinat</em>, <u>subliniat</u>, <s>tăiat</s>, H<sub>2</sub>O, x<sup>2</sup>, <span data-caps="small">Majuscule Mici</span> — linie.</p>' +
    '<h2>Subtitlu intern</h2>' +
    '<ul><li><p>Mere</p><ul><li><p>Ionatan</p></li><li><p>Golden</p></li></ul></li><li><p>Pere</p></li></ul>' +
    '<ol><li><p>Primul</p></li><li><p>Al doilea</p><ol><li><p>Sub-unu</p></li></ol></li><li><p>Al treilea</p></li></ol>' +
    '<blockquote><p>Citat cu &amp; și &lt;unghiuri&gt;.</p></blockquote>',
  s2:
    '<p>Vezi <a href="https://example.com/a?b=1&amp;c=2">site-ul extern</a> și <a href="scribner://doc/s1">gara</a>.</p>' +
    '<table><tbody><tr><th><p>Oraș</p></th><th><p>Populație</p></th></tr><tr><td><p>Iași</p></td><td><p>290.000</p></td></tr><tr><td><p>Brașov</p></td><td><p>250.000</p></td></tr></tbody></table>' +
    '<p>După tabel.<span data-footnote="Notă cu „ghilimele” și &amp;." class="footnote"></span></p>' +
    '<hr>' +
    '<p>După ruptura de pagină.</p>',
  s3: '<p>Imagine: <img src="data:image/png;base64,' + PNG + '" alt="punct roșu"> aici, plus &lt;$img:Harta&gt;.<span data-footnote="Notă trei." class="footnote"></span></p>',
  s4: '<p>Sfârșit {acolade} \\ backslash $ 100% #1 _x_ ^ ~ șir.</p>',
  ded: '<p>Pentru mama.</p>',
  ack: '<p>Mulțumesc tuturor.</p>',
};

const read = (id) => DOCS[id] || '';
const media = { 'harta.png': { data: Buffer.from(PNG, 'base64'), mime: 'image/png' } };
const readMedia = (file) => media[file] || null;

const FORMATS = ['docx', 'pdf', 'epub', 'html', 'rtf', 'odt', 'md', 'mmd', 'txt', 'fountain', 'fdx', 'tex'];

function options(F, presetId = 'manuscris', extra = {}) {
  const f = JSON.parse(JSON.stringify(F.PRESETS.find((p) => p.id === presetId)));
  f.transforms = { ...f.transforms, smartQuotes: true, dashes: true };
  return { format: f, frontMatterId: 'fm', backMatterId: 'bm', toc: true, titlePage: true, readMedia, ...extra };
}

// Strings every textual output must contain (after decoding).
const EXPECTED = ['Plecarea', 'Sosirea', 'Era', 'întârzia', 'ăâîșț', 'ĂÂÎȘȚ', 'Iași', 'Brașov', 'Populație', 'Pentru mama', 'Mulțumesc tuturor', 'Ionatan', 'Sub-unu', 'Sfârșit'];

module.exports = { PNG, project, DOCS, read, readMedia, FORMATS, options, EXPECTED };
