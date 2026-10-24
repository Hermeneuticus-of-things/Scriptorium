import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store.cjs');
const history = require('../lib/history.cjs');
const { importScriv } = require('../lib/scrivImport.cjs');
const compile = require('../lib/compile.cjs');

const U = {
  draft: 'AAAAAAAA-0000-0000-0000-000000000001',
  ch1: 'AAAAAAAA-0000-0000-0000-000000000002',
  s1: 'AAAAAAAA-0000-0000-0000-000000000003',
  s2: 'AAAAAAAA-0000-0000-0000-000000000004',
  group: 'AAAAAAAA-0000-0000-0000-000000000005',
  child: 'AAAAAAAA-0000-0000-0000-000000000006',
  research: 'AAAAAAAA-0000-0000-0000-000000000007',
  img: 'AAAAAAAA-0000-0000-0000-000000000008',
  pdf: 'AAAAAAAA-0000-0000-0000-000000000009',
  trash: 'AAAAAAAA-0000-0000-0000-00000000000A',
  untitled: 'AAAAAAAA-0000-0000-0000-00000000000B',
  cmt: 'CCCCCCCC-0000-0000-0000-000000000001',
  fn: 'CCCCCCCC-0000-0000-0000-000000000002',
  orphan: 'CCCCCCCC-0000-0000-0000-000000000003',
};

let tmp;
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scriv3-'));
});

function makeProject() {
  const scriv = path.join(tmp, 'Karma.scriv');
  const data = path.join(scriv, 'Files', 'Data');
  const put = (uuid, file, content) => {
    fs.mkdirSync(path.join(data, uuid), { recursive: true });
    fs.writeFileSync(path.join(data, uuid, file), content);
  };
  fs.mkdirSync(path.join(scriv, 'Settings'), { recursive: true });
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(scriv, 'Files', 'version.txt'), '23');
  fs.writeFileSync(path.join(scriv, 'Settings', 'compile.xml'), '<Compile/>');
  fs.writeFileSync(
    path.join(scriv, 'Karma.scrivx'),
    `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject Identifier="X" Version="2.0" Creator="SCRWIN-3.1" Author="Ion Pop">
 <Binder>
  <BinderItem UUID="${U.draft}" Type="DraftFolder" Created="2024-01-02 10:00:00 +0200"><Title>Manuscris</Title><Children>
   <BinderItem UUID="${U.ch1}" Type="Folder"><Title>Cap 1</Title><Children>
    <BinderItem UUID="${U.s1}" Type="Text" Created="2024-01-03 09:15:00 +0200" Modified="2024-02-01 18:00:00 +0200">
      <Title>Sub 1.1</Title>
      <MetaData><LabelID>1</LabelID><StatusID>2</StatusID><IncludeInCompile>Yes</IncludeInCompile><IconFileName>Flag</IconFileName>
        <CustomMetaData><MetaDataItem><FieldID>pov</FieldID><Value>o2</Value></MetaDataItem><MetaDataItem><FieldID>gata</FieldID><Value>Yes</Value></MetaDataItem></CustomMetaData>
      </MetaData>
      <TextSettings><Target Type="Words">1500</Target></TextSettings>
      <Keywords><KeywordID>10</KeywordID><KeywordID>11</KeywordID></Keywords>
      <Bookmarks><Bookmark Type="Internal" UUID="${U.s2}"/></Bookmarks>
    </BinderItem>
    <BinderItem UUID="${U.s2}" Type="Text"><Title>Sub 1.2</Title><MetaData><IncludeInCompile>No</IncludeInCompile></MetaData></BinderItem>
    <BinderItem UUID="${U.group}" Type="Text"><Title>Grup</Title><Children>
      <BinderItem UUID="${U.child}" Type="Text"><Title>Copil</Title></BinderItem>
    </Children></BinderItem>
    <BinderItem UUID="${U.untitled}" Type="Text"/>
   </Children></BinderItem>
  </Children></BinderItem>
  <BinderItem UUID="${U.research}" Type="ResearchFolder"><Title>Cercetare</Title><Children>
   <BinderItem UUID="${U.img}" Type="Image"><Title>Hartă</Title><MetaData><FileExtension>png</FileExtension></MetaData></BinderItem>
   <BinderItem UUID="${U.pdf}" Type="PDF"><Title>Sursă</Title><MetaData><FileExtension>pdf</FileExtension></MetaData></BinderItem>
  </Children></BinderItem>
  <BinderItem UUID="${U.trash}" Type="TrashFolder"><Title>Coș</Title></BinderItem>
 </Binder>
 <Collections><Collection Type="Arbitrary" ID="c1" Color="1 0 0"><Title>De revizuit</Title><BinderUUIDs>${U.s1},${U.s2}</BinderUUIDs></Collection></Collections>
 <LabelSettings><Title>POV</Title><Labels><Label ID="-1">No Label</Label><Label ID="1" Color="0.2 0.4 0.8">Doctrină</Label></Labels></LabelSettings>
 <StatusSettings><StatusItems><Status ID="2">Revizuit</Status></StatusItems></StatusSettings>
 <Keywords><Keyword ID="10" Color="0 0.5 0"><Title>karman</Title></Keyword><Keyword ID="11"><Title>vipāka</Title></Keyword></Keywords>
 <CustomMetaDataSettings>
  <MetaDataField Type="List" ID="pov"><Title>Voce</Title><ListOptions><Option ID="o1">primară</Option><Option ID="o2">secundară</Option></ListOptions></MetaDataField>
  <MetaDataField Type="Checkbox" ID="gata"><Title>Gata</Title></MetaDataField>
 </CustomMetaDataSettings>
 <ProjectTargets><DraftTarget Type="Words">90000</DraftTarget><SessionTarget Type="Words">1200</SessionTarget><Deadline>2026-12-31 00:00:00 +0200</Deadline></ProjectTargets>
 <ProjectProperties><ProjectTitle>Karma: Arhitectura Subtilă a Destinului</ProjectTitle><FullName>Ion Pop</FullName></ProjectProperties>
</ScrivenerProject>`,
  );
  put(
    U.s1,
    'content.rtf',
    String.raw`{\rtf1\ansi\ansicpg1252\cocoartf2639{\fonttbl\f0 Georgia;}{\colortbl;\red255\green255\blue255;}
\pard\qc Titlu centrat\par
\pard Fapta {\field{\*\fldinst{HYPERLINK "scrivcmt://${U.cmt}"}}{\fldrslt comentată}} și nota{\field{\*\fldinst{HYPERLINK "scrivcmt://${U.fn}"}}{\fldrslt  }}.\par
Vezi {\field{\*\fldinst{HYPERLINK "scrivlnk://${U.s2}"}}{\fldrslt Sub 1.2}} și{\Scrv_fn=nota inline\end_Scrv_fn} {\Scrv_annot \color={\R=0\G=0\B=1}\text=de rescris\end_Scrv_annot}.\par
{\pict\pngblip 89504e470d0a1a0a}}`,
  );
  put(
    U.s1,
    'content.comments',
    `<?xml version="1.0" encoding="UTF-8"?><Comments>
<Comment ID="${U.cmt}" Footnote="No" Author="Editor" Color="1 0.84 0.4"><![CDATA[{\\rtf1\\ansi Verifică sursa}]]></Comment>
<Comment ID="${U.fn}" Footnote="Yes"><![CDATA[{\\rtf1\\ansi Tattvārtha Sūtra 8.1}]]></Comment>
<Comment ID="${U.orphan}" Footnote="No"><![CDATA[{\\rtf1\\ansi Comentariu fără ancoră}]]></Comment>
</Comments>`,
  );
  put(U.s1, 'notes.rtf', String.raw`{\rtf1\ansi Notă pentru 1.1}`);
  put(U.s1, 'synopsis.txt', 'Fapta lasă urmă.');
  fs.mkdirSync(path.join(data, U.s1, 'snapshots'), { recursive: true });
  fs.writeFileSync(path.join(data, U.s1, 'snapshots', '2024-01-10-12-00-00.rtf'), String.raw`{\rtf1\ansi Versiunea veche}`);
  fs.writeFileSync(
    path.join(data, U.s1, 'snapshots', 'index.xml'),
    `<?xml version="1.0"?><SnapshotIndexes><Snapshot Date="2024-01-10 12:00:00 +0200"><Title>Prima ciornă</Title><File>2024-01-10-12-00-00.rtf</File></Snapshot></SnapshotIndexes>`,
  );
  put(U.s2, 'content.rtf', String.raw`{\rtf1\ansi Text exclus}`);
  put(U.group, 'content.rtf', String.raw`{\rtf1\ansi Textul grupului}`);
  put(U.child, 'content.rtf', String.raw`{\rtf1\ansi Textul copilului}`);
  put(U.untitled, 'content.rtf', String.raw`{\rtf1\ansi Primul rând devine titlu\par al doilea}`);
  put(U.img, 'content.png', Buffer.from('89504e470d0a1a0a', 'hex'));
  put(U.pdf, 'content.pdf', Buffer.from('%PDF-1.4\n'));
  fs.writeFileSync(
    path.join(scriv, 'Files', 'writing.history'),
    `<?xml version="1.0"?><WritingHistory><Day dwc="850" dcc="5000" owc="120" occ="700" s="1000">2024-01-03</Day><Day dwc="400" owc="0">2024-01-04</Day></WritingHistory>`,
  );
  fs.mkdirSync(path.join(scriv, 'Files', 'ProjectNotes'), { recursive: true });
  fs.writeFileSync(path.join(scriv, 'Files', 'ProjectNotes', 'N1.rtf'), String.raw`{\rtf1\ansi Plan general}`);
  return scriv;
}

const find = (tree, title) => {
  let f = null;
  const walk = (ns) => ns.forEach((n) => {
    if (n.title === title) f = n;
    if (n.children) walk(n.children);
  });
  walk(tree);
  return f;
};

describe('lossless Scrivener 3 import', () => {
  it('imports everything and reports it', () => {
    const { dir, project, stats } = importScriv(makeProject(), tmp);

    expect(project.title).toBe('Karma: Arhitectura Subtilă a Destinului');
    expect(project.author).toBe('Ion Pop');
    expect(project.targets).toMatchObject({ draft: 90000, session: 1200 });
    expect(project.targets.deadline).toMatch(/^2026-12-30T22:00/);
    expect(project.labelTitle).toBe('POV');
    expect(project.labels.find((l) => l.name === 'Doctrină').color).toBe('#3366cc');
    expect(project.keywordDefs.map((k) => k.name)).toEqual(['karman', 'vipāka']);
    expect(project.customFields.map((f) => [f.title, f.type])).toEqual([['Voce', 'list'], ['Gata', 'checkbox']]);

    const s1 = find(project.tree, 'Sub 1.1');
    const s2 = find(project.tree, 'Sub 1.2');
    expect(s1.label).toBe('Doctrină');
    expect(s1.status).toBe('Revizuit');
    expect(s1.icon).toBe('Flag');
    expect(s1.keywords).toEqual(['karman', 'vipāka']);
    expect(s1.custom).toEqual({ Voce: 'secundară', Gata: true });
    expect(s1.target).toBe(1500);
    expect(s1.created).toBe('2024-01-03T07:15:00.000Z');
    expect(s1.synopsis).toBe('Fapta lasă urmă.');
    expect(s1.bookmarks).toEqual([{ id: s2.id }]);
    expect(s2.includeInCompile).toBe(false);

    const html = store.readDoc(dir, s1.id);
    expect(html).toContain('<p style="text-align: center">Titlu centrat</p>');
    expect(html).toContain('data-comment="Verifică sursa"');
    expect(html).toContain('data-author="Editor"');
    // Footnote="Yes" comment = Scrivener linked footnote over its anchor
    expect(html).toContain('nota<span data-linked-footnote="Tattvārtha Sūtra 8.1" class="linked-footnote"> </span>.');
    expect(html).toContain(`<a href="scribner://doc/${s2.id}" class="internal-link">Sub 1.2</a>`);
    expect(html).toContain('data-footnote="nota inline"');
    expect(html).toContain('data-annotation="de rescris"');
    expect(html).toContain('data-annotation="Comentariu fără ancoră"');
    expect(html).toContain('<img src="data:image/png;base64,');
    expect(store.readDoc(dir, s1.id, 'notes')).toContain('Notă pentru 1.1');

    const snaps = store.listSnapshots(dir, s1.id);
    expect(snaps).toHaveLength(1);
    expect(snaps[0].name).toBe('Prima ciornă');
    expect(snaps[0].html).toContain('Versiunea veche');

    const group = find(project.tree, 'Grup');
    expect(group.type).toBe('text');
    expect(group.children.map((c) => c.title)).toEqual(['Copil']);
    expect(find(project.tree, 'Primul rând devine titlu')).toBeTruthy();

    const img = find(project.tree, 'Hartă');
    expect(img.type).toBe('file');
    expect(img.media.mime).toBe('image/png');
    expect(store.readMedia(dir, img.media.file).data.length).toBe(8);
    expect(find(project.tree, 'Sursă').media.mime).toBe('application/pdf');

    expect(project.collections).toHaveLength(1);
    expect(project.collections[0].ids).toEqual([s1.id, s2.id]);
    expect(store.readDoc(dir, 'project-notes', 'notes')).toContain('Plan general');

    const rows = history.summarize(history.readHistory(dir));
    expect(rows[0]).toMatchObject({ date: '2024-01-03', draft: 850, total: 970, imported: true });

    expect(fs.existsSync(path.join(dir, 'scrivener-original', 'Karma.scrivx'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'scrivener-original', 'Settings', 'compile.xml'))).toBe(true);

    expect(stats).toMatchObject({ documents: 5, media: 2, comments: 1, footnotes: 2, annotations: 2, snapshots: 1, links: 1, collections: 1, historyDays: 2, projectNotes: true });
    // Many small file writes (import + copy of the original .scriv): slow Windows runners need more than 5 s.
  }, 30000);

  it('compiles the imported project: text groups included, excluded docs and annotations dropped', () => {
    const { dir, project } = importScriv(makeProject(), tmp);
    const out = compile.compileHtml(project, (id) => store.readDoc(dir, id));
    expect(out).toContain('Textul grupului');
    expect(out).toContain('Textul copilului');
    expect(out).not.toContain('Text exclus');
    expect(out).not.toContain('de rescris');
    expect(out).toContain('Tattvārtha Sūtra 8.1');
    expect(out).not.toContain('Hartă');
  });
});
