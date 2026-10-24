// .scriv import from files shaped as Scrivener itself writes them (not via our exporter),
// plus the 'v04:exportScriv' handler wiring (snapshots + writing history).
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const registerV04 = require('../electron/v04Handlers.cjs');

const U = {
  draft: 'B0000000-0000-4000-8000-000000000001',
  ch: 'B0000000-0000-4000-8000-000000000002',
  sc: 'B0000000-0000-4000-8000-000000000003',
  web: 'B0000000-0000-4000-8000-000000000004',
  stChapter: '6A1F4C2E-1111-4A2B-9C3D-000000000001',
  stScene: '6A1F4C2E-1111-4A2B-9C3D-000000000002',
  cmt: 'D0000000-0000-4000-8000-000000000001',
  fn: 'D0000000-0000-4000-8000-000000000002',
  pnA: 'F0000000-0000-4000-8000-00000000000A',
  pnB: '10000000-0000-4000-8000-00000000000B',
};

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scriv-real-'));
});

function makeProject() {
  const scriv = path.join(tmp, 'Real.scriv');
  const data = path.join(scriv, 'Files', 'Data');
  const put = (uuid, file, content) => {
    fs.mkdirSync(path.join(data, uuid), { recursive: true });
    fs.writeFileSync(path.join(data, uuid, file), content);
  };
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(scriv, 'Files', 'version.txt'), '23');
  fs.writeFileSync(
    path.join(scriv, 'Real.scrivx'),
    `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject Template="No" Version="2.0" Identifier="X" Creator="SCRMAC-3.3">
 <Binder>
  <BinderItem UUID="${U.draft}" Type="DraftFolder"><Title>Draft</Title><Children>
   <BinderItem UUID="${U.ch}" Type="Folder"><Title>Capitol</Title>
     <MetaData><IncludeInCompile>Yes</IncludeInCompile><SectionType>${U.stChapter.toLowerCase()}</SectionType></MetaData>
     <Children>
      <BinderItem UUID="${U.sc}" Type="Text"><Title>Scenă</Title>
        <MetaData><SectionType>
          ${U.stScene}
        </SectionType></MetaData>
        <Bookmarks><Bookmark Type="External" URL="https://ex.ro/b" Title="Sursă"/><Bookmark Type="Internal" UUID="${U.web}"/><Bookmark Type="Internal" UUID="${U.ch}" Title="Capitolul"/></Bookmarks>
      </BinderItem>
     </Children>
   </BinderItem>
  </Children></BinderItem>
  <BinderItem UUID="${U.web}" Type="ResearchFolder"><Title>Research</Title></BinderItem>
 </Binder>
 <SectionTypes>
  <SectionType ID="${U.stChapter}"><Title>Chapter Heading</Title></SectionType>
  <SectionType ID="${U.stScene}"><Title>Scene</Title></SectionType>
 </SectionTypes>
 <ProjectBookmarks><Bookmark Type="Internal" UUID="${U.sc}" Title="Aici"/><Bookmark Type="External" URL="https://ex.ro/p"/><Bookmark Type="Internal" UUID="${U.ch}"/></ProjectBookmarks>
 <ProjectNotes><ProjectNote UUID="${U.pnA}"><Title>Personaje</Title></ProjectNote><ProjectNote UUID="${U.pnB}"><Title>Lume</Title></ProjectNote></ProjectNotes>
</ScrivenerProject>`,
  );
  fs.writeFileSync(
    path.join(scriv, 'Files', 'styles.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerStyles Version="1.0">
  <Style ID="S-0" Name="Heading 1" Type="Paragraph" Index="0"/>
  <Style ID="S-1" Name="Accent" Type="Character" Index="1"><Bold>Yes</Bold></Style>
  <Style ID="S-2" Name="Scrisoare" Type="Paragraph" Index="2"><Alignment>Justified</Alignment></Style>
  <Style ID="S-3" Name="Code Span" Type="Character" Index="3"/>
</ScrivenerStyles>`,
  );
  put(
    U.sc,
    'content.rtf',
    String.raw`{\rtf1\ansi\ansicpg1252\cocoartf2709\uc1
{\fonttbl\f0\fnil\fcharset0 Palatino-Roman;}
{\colortbl;\red255\green255\blue255;}
\pard\pardirnatural\partightenfactor0
\f0\fs26 <$Scr_Ps::0>Titlu<!$Scr_Ps::0>\
<$Scr_Ps::2>Dragă Ana, <$Scr_Cs::1>atenție<!$Scr_Cs::1> la <$Scr_Cs::3>x()<!$Scr_Cs::3>.<!$Scr_Ps::2>\
Text{\Scrv_fn=\uc0 Not\u259  \end_Scrv_fn} cu {\field{\*\fldinst{HYPERLINK "scrivcmt://${U.cmt}"}}{\fldrslt ancor\u259?}} \u351?i {\field{\*\fldinst{HYPERLINK "scrivfnt://${U.fn}"}}{\fldrslt surs\u259?}}.\
{\scaps Ion Creang\u259?}\
}`,
  );
  put(
    U.sc,
    'content.comments',
    `<?xml version="1.0" encoding="UTF-8"?>
<Comments Version="1.0">
<Comment ID="${U.cmt}" Footnote="No" Color="1.0 0.5 0.0" Date="2024-05-06 07:08:09 +0300"><![CDATA[{\\rtf1\\ansi Comentariu}]]></Comment>
<Comment ID="${U.fn}" Footnote="Yes"><![CDATA[{\\rtf1\\ansi Not\\u259? legat\\u259?}]]></Comment>
</Comments>`,
  );
  fs.mkdirSync(path.join(scriv, 'Files', 'ProjectNotes'), { recursive: true });
  // file-name order (1… before F…) differs from the .scrivx order: the .scrivx order wins
  fs.writeFileSync(path.join(scriv, 'Files', 'ProjectNotes', `${U.pnA}.rtf`), String.raw`{\rtf1\ansi Ana, Ion}`);
  fs.writeFileSync(path.join(scriv, 'Files', 'ProjectNotes', `${U.pnB}.rtf`), String.raw`{\rtf1\ansi Moldova}`);
  return scriv;
}

const find = (tree, title) => {
  let f = null;
  store.walk(tree, (n) => {
    if (n.title === title) f = n;
  });
  return f;
};

describe('.scriv import, real file shapes', () => {
  it('section types by UUID (case and whitespace tolerant)', () => {
    const { project } = importScriv(makeProject(), tmp, { keepOriginal: false });
    expect(find(project.tree, 'Capitol').sectionType).toBe('Chapter Heading');
    expect(find(project.tree, 'Scenă').sectionType).toBe('Scene');
  });

  it('named styles from styles.xml markers, notes, comments and caps', () => {
    const { dir, project, stats } = importScriv(makeProject(), tmp, { keepOriginal: false });
    const html = store.readDoc(dir, find(project.tree, 'Scenă').id);
    expect(html).toContain('<h1>Titlu</h1>');
    expect(html).toContain('<p data-style="scrisoare">Dragă Ana, <span data-char-style="accent">atenție</span> la <span data-char-style="code-span">x()</span>.</p>');
    expect(project.styles).toEqual([
      { id: 'accent', name: 'Accent', type: 'char', bold: true },
      { id: 'scrisoare', name: 'Scrisoare', type: 'para', align: 'justify' },
      { id: 'code-span', name: 'Code Span', type: 'char' },
    ]);
    expect(html).toContain('Text<span data-footnote="Notă" class="footnote"></span> cu ');
    expect(html).toContain('<span data-comment="Comentariu" data-color="#ff8000" data-comment-date="2024-05-06T04:08:09.000Z" class="comment">ancoră</span> şi ');
    expect(html).toContain('<span data-linked-footnote="Notă legată" class="linked-footnote">sursă</span>.');
    expect(html).toContain('<span data-caps="small">Ion Creangă</span>');
    expect(html).not.toContain('?');
    expect(stats.footnotes).toBe(2);
  });

  it('bookmarks keep titles and order; project notes keep their tabs', () => {
    const { dir, project } = importScriv(makeProject(), tmp, { keepOriginal: false });
    const ch = find(project.tree, 'Capitol');
    const sc = find(project.tree, 'Scenă');
    expect(sc.bookmarks).toEqual([{ url: 'https://ex.ro/b', title: 'Sursă' }, { id: 'research' }, { id: ch.id, title: 'Capitolul' }]);
    expect(project.bookmarks).toEqual([{ id: sc.id, title: 'Aici' }, { url: 'https://ex.ro/p' }, { id: ch.id }]);
    expect(project.projectNotes).toEqual([{ id: 'project-notes', title: 'Personaje' }, { id: 'pn-2', title: 'Lume' }]);
    expect(store.readDoc(dir, 'project-notes', 'notes')).toBe('<p>Ana, Ion</p>');
    expect(store.readDoc(dir, 'pn-2', 'notes')).toBe('<p>Moldova</p>');
  });
});

describe("'v04:exportScriv' handler", () => {
  it('exports snapshots and writing history from the open project', async () => {
    const dir = path.join(tmp, 'P.scribner');
    const project = store.createProject(dir, 'P');
    const n = store.newNode('text', 'Doc');
    project.tree[0].children = [n];
    store.saveProject(dir, project);
    store.writeDoc(dir, n.id, 'docs', '<p>Acum</p>');
    store.addSnapshot(dir, n.id, { name: 'Veche', date: '2024-01-01T00:00:00.000Z', html: '<p>Înainte</p>' });
    fs.writeFileSync(path.join(dir, 'history.json'), JSON.stringify({ days: { '2024-05-01': { draftStart: 10, draftEnd: 60, totalStart: 10, totalEnd: 80 } } }));
    const out = path.join(tmp, 'out');
    fs.mkdirSync(out);
    const handlers = {};
    registerV04({
      handle: (name, fn) => (handlers[name] = fn),
      dialog: { showOpenDialog: async () => ({ canceled: false, filePaths: [out] }) },
      BrowserWindow: { fromWebContents: () => null },
      store,
      assertOpened: () => {},
      noteSelfWrite: () => {},
    });
    const res = await handlers['v04:exportScriv']({ sender: {} }, dir, project);
    expect(res.snapshots).toBe(1);
    expect(fs.readFileSync(path.join(res.dir, 'Files', 'writing.history'), 'utf8')).toContain('<Day dwc="50" owc="20"');
    const back = importScriv(res.dir, path.join(tmp, 'back'), { keepOriginal: false });
    const doc = find(back.project.tree, 'Doc');
    expect(store.listSnapshots(back.dir, doc.id).map((s) => [s.name, store.htmlToText(s.html).trim()])).toEqual([['Veche', 'Înainte']]);
  });
});
