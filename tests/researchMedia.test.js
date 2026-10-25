// Q12: research files in the editor pane (viewer kind, PDF address, zoom, timestamps, annotations, web copy).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import {
  mediaKind, pdfViewUrl, stepZoom, fitScale, formatTimestamp, parseTimestamp, timestampHtml,
  addAnnotation, removeAnnotation, updateAnnotation, annotationsHtml, pdfPageCount, dataUrlBytes, dragHasFiles,
} from '../src/lib/researchMedia.js';
import { uiRo, uiEn } from '../src/lib/i18n-ui.js';
const require = createRequire(import.meta.url);
const { buildWebArchive } = require('../lib/importers.cjs');

describe('researchMedia', () => {
  it('picks the viewer by type', () => {
    expect(mediaKind({ mime: 'application/pdf' })).toBe('pdf');
    expect(mediaKind({ mime: 'image/png' })).toBe('image');
    expect(mediaKind({ mime: 'audio/wav' })).toBe('audio');
    expect(mediaKind({ mime: 'video/mp4' })).toBe('video');
    expect(mediaKind({ mime: 'text/html' })).toBe('web');
    expect(mediaKind({ mime: 'application/octet-stream', name: 'x.webarchive' })).toBe('web');
    expect(mediaKind({ mime: 'application/zip' })).toBe('other');
    expect(mediaKind(null)).toBe('other');
  });
  it('builds the PDF viewer address (page, zoom, search)', () => {
    expect(pdfViewUrl('blob:x#old', { page: 3, zoom: 150, search: 'cabană veche' })).toBe('blob:x#page=3&zoom=150&search=caban%C4%83%20veche');
    expect(pdfViewUrl('blob:x', { page: 0, zoom: 'width' })).toBe('blob:x#page=1&view=FitH');
    expect(pdfViewUrl('blob:x', { zoom: 'fit' })).toBe('blob:x#page=1&view=Fit');
    expect(pdfViewUrl('', {})).toBe('');
  });
  it('steps and fits zoom', () => {
    expect(stepZoom(100, 1)).toBe(110);
    expect(stepZoom(100, -1)).toBe(90);
    expect(stepZoom(400, 1)).toBe(400);
    expect(stepZoom(25, -1)).toBe(25);
    expect(stepZoom(103, -1)).toBe(100);
    expect(fitScale(2000, 1000, 1000, 1000)).toBe(0.5);
    expect(fitScale(100, 100, 1000, 1000)).toBe(1);
    expect(fitScale(0, 0, 10, 10)).toBe(1);
  });
  it('formats and parses timestamps', () => {
    expect(formatTimestamp(75.4)).toBe('01:15');
    expect(formatTimestamp(3725)).toBe('1:02:05');
    expect(formatTimestamp(-3)).toBe('00:00');
    expect(parseTimestamp('[01:15]')).toBe(75);
    expect(parseTimestamp('1:02:05')).toBe(3725);
    expect(parseTimestamp('x')).toBeNull();
    expect(timestampHtml(75, 'A<b>')).toBe('<p><strong>[01:15]</strong> <em>A&lt;b&gt;</em> </p>');
  });
  it('keeps annotations sorted by page; empty ones are ignored', () => {
    let list = addAnnotation([], { page: 3, kind: 'highlight', text: ' citat ' }, 1000);
    list = addAnnotation(list, { page: 1, note: 'idee' }, 2000);
    expect(addAnnotation(list, { page: 2 })).toBe(list);
    expect(list.map((a) => [a.page, a.kind, a.text || a.note])).toEqual([[1, 'note', 'idee'], [3, 'highlight', 'citat']]);
    const id = list[1].id;
    expect(updateAnnotation(list, id, { note: 'n', id: 'other' })[1]).toMatchObject({ id, note: 'n' });
    expect(removeAnnotation(list, id)).toHaveLength(1);
    const html = annotationsHtml(list, 'Arhiva');
    expect(html).toContain('<blockquote><p>citat</p></blockquote>');
    expect(html).toContain('Arhiva, p. 3');
    expect(annotationsHtml([])).toBe('');
  });
  it('counts PDF pages and decodes data addresses', () => {
    expect(pdfPageCount('<< /Type /Pages /Count 2 >> << /Type /Page >> << /Type/Page >>')).toBe(2);
    expect(pdfPageCount('<< /Count 7 >>')).toBe(7);
    expect(pdfPageCount('')).toBe(0);
    const d = dataUrlBytes(`data:text/html;base64,${Buffer.from('<p>ă</p>').toString('base64')}`);
    expect(d.mime).toBe('text/html');
    expect(new TextDecoder().decode(d.bytes)).toBe('<p>ă</p>');
    expect(new TextDecoder().decode(dataUrlBytes('data:text/plain,a%20b').bytes)).toBe('a b');
    expect(dataUrlBytes('nope')).toBeNull();
    expect(dragHasFiles({ types: ['Files'] })).toBe(true);
    expect(dragHasFiles({ types: ['text/plain'] })).toBe(false);
  });
  it('web archive: standalone page, no scripts, source kept', () => {
    const html = buildWebArchive({ title: 'T <x>', url: 'https://e.org/a?b=1&c', html: '<p>ok</p><script>alert(1)</script><img src="data:image/png;base64,AA">' }, new Date('2026-01-02T00:00:00Z'));
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).not.toContain('<script');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('<title>T &lt;x&gt;</title>');
    expect(html).toContain('https://e.org/a?b=1&amp;c · 2026-01-02');
    expect(html).toContain('<img src="data:image/png;base64,AA">');
  });
  it('every rmedia string exists in Romanian and English; viewers use only known keys', () => {
    const ro = Object.keys(uiRo).filter((k) => k.startsWith('ui.rmedia.'));
    const en = Object.keys(uiEn).filter((k) => k.startsWith('ui.rmedia.'));
    expect(ro.length).toBeGreaterThan(30);
    expect(en.sort()).toEqual(ro.sort());
    const src = ['MediaView', 'PdfViewer', 'ImageViewer', 'MediaPlayerView', 'WebArchiveView'].map((f) => fs.readFileSync(new URL(`../src/components/${f}.jsx`, import.meta.url), 'utf8')).join('\n') + fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
    for (const k of src.match(/ui\.rmedia\.[a-z_]+/g)) expect(uiRo[k], k).toBeTruthy();
  });
  it('the desktop bridge exposes the new research calls', () => {
    const preload = fs.readFileSync(new URL('../electron/preload.cjs', import.meta.url), 'utf8');
    const main = fs.readFileSync(new URL('../electron/main.cjs', import.meta.url), 'utf8');
    expect(preload).toContain("addMediaData: (dir, name, bytes) => call('media:addData'");
    expect(preload).toContain("archiveWebPage: (dir, url) => call('research:archiveWeb'");
    expect(main).toContain("handle('media:addData'");
    expect(main).toContain("handle('research:archiveWeb'");
  });
});
