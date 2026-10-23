'use strict';
// Project templates: initial binder structure for a new project.
const T = (title, html = '<p></p>', extra = {}) => ({ type: 'text', title, html, ...extra });
const F = (title, children = [], extra = {}) => ({ type: 'folder', title, children, ...extra });

const CHARACTER = '<h2>Nume</h2><p></p><h2>Vârstă, aspect</h2><p></p><h2>Ce vrea</h2><p></p><h2>De ce se teme</h2><p></p><h2>Arc în poveste</h2><p></p>';
const PLACE = '<h2>Descriere</h2><p></p><h2>Atmosferă (sunete, mirosuri)</h2><p></p><h2>Ce se întâmplă aici</h2><p></p>';

const TEMPLATES = {
  blank: { name: 'Gol', draft: [T('Document nou')], research: [] },
  novel: {
    name: 'Roman',
    draft: [F('Capitolul 1', [T('Scena 1')]), F('Capitolul 2', [T('Scena 1')]), F('Capitolul 3', [T('Scena 1')])],
    research: [
      F('Personaje', [T('Protagonist', CHARACTER, { label: 'Personaj' }), T('Antagonist', CHARACTER, { label: 'Personaj' })]),
      F('Locuri', [T('Loc principal', PLACE, { label: 'Loc' })]),
      F('Intrigă', [T('Sinopsis', '<p>Povestea în cinci propoziții.</p>'), T('Cronologie')]),
      F('Șabloane', [T('Fișă personaj', CHARACTER), T('Fișă loc', PLACE)], { template: true }),
    ],
  },
  parts: {
    name: 'Roman cu părți',
    draft: [F('Partea întâi', [F('Capitolul 1', [T('Scena 1')])]), F('Partea a doua', [F('Capitolul 2', [T('Scena 1')])])],
    research: [F('Personaje', []), F('Locuri', []), F('Șabloane', [T('Fișă personaj', CHARACTER), T('Fișă loc', PLACE)], { template: true })],
  },
  stories: {
    name: 'Volum de povestiri',
    draft: [F('Povestirea 1', [T('Text')]), F('Povestirea 2', [T('Text')])],
    research: [F('Idei', [])],
  },
  nonfiction: {
    name: 'Non-ficțiune',
    draft: [T('Introducere'), F('Capitolul 1', [T('Secțiunea 1')]), F('Capitolul 2', [T('Secțiunea 1')]), T('Concluzii')],
    research: [F('Surse', []), F('Citate', []), F('Schiță', [T('Plan', '<p>Teza cărții și argumentele pe capitole.</p>')])],
  },
};

function listTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name }));
}

module.exports = { TEMPLATES, listTemplates };
