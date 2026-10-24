import { describe, it, expect } from 'vitest';
const { importWebPage, localizeImages, makeImageFetcher, bestSrcset, sanitizeHtml } = require('../lib/importers.cjs');

const PNG = Buffer.from('png-bytes');
const res = (body, { status = 200, type = 'image/png', url } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  url,
  headers: { get: (h) => (h.toLowerCase() === 'content-type' ? type : null) },
  text: async () => String(body),
  arrayBuffer: async () => (Buffer.isBuffer(body) ? body : Buffer.from(String(body))),
});

function fakeFetch(routes) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const r = routes[url];
    if (!r) return res('', { status: 404, type: 'text/html' });
    if (r instanceof Error) throw r;
    return typeof r === 'function' ? r() : r;
  };
  fn.calls = calls;
  return fn;
}

const saver = () => {
  const saved = [];
  const saveMedia = ({ ext, name, url }) => {
    saved.push(url);
    const id = `m${saved.length}`;
    return { id, title: name, file: `${id}.${ext}`, mime: `image/${ext}`, name };
  };
  return { saved, saveMedia };
};

describe('srcset', () => {
  it('picks the largest candidate', () => {
    expect(bestSrcset('a.jpg 480w, b.jpg 1080w, c.jpg 720w')).toBe('b.jpg');
    expect(bestSrcset('a.jpg 1x, b.jpg 2x')).toBe('b.jpg');
    expect(bestSrcset('only.jpg')).toBe('only.jpg');
    expect(bestSrcset('')).toBe('');
  });
  it('sanitize prefers srcset / data-src over a placeholder src and resolves relative URLs', () => {
    const h = sanitizeHtml('<img src="data:image/gif;base64,R0" data-src="lazy.png" srcset="s.png 1x, l.png 2x" alt="x">', 'https://ex.ro/a/');
    expect(h).toBe('<img src="https://ex.ro/a/l.png" alt="x">');
    expect(sanitizeHtml('<img data-src="/z.png">', 'https://ex.ro/a/')).toBe('<img src="https://ex.ro/z.png">');
    expect(sanitizeHtml('<img src="data:image/png;base64,AA">')).toBe('<img src="data:image/png;base64,AA">');
  });
});

describe('importWebPage (offline images)', () => {
  const page = `<html><head><title>T</title></head><body><article>
    <p>text</p><img src="img/a.png" alt="A"><img src="/img/a.png?x=1" alt="dup-different">
    <img src="img/a.png" alt="again"><img srcset="small.jpg 300w, big.jpg 900w" alt="B">
    <img src="broken.png" alt="Rupt"><img src="page.png" alt="html"><img src="data:image/png;base64,QUJD" alt="inline">
    <script>alert(1)</script><img src="javascript:alert(1)"></article></body></html>`;

  it('downloads, dedupes, rewrites to data: + data-media, keeps failures as links', async () => {
    const fetch = fakeFetch({
      'https://ex.ro/dir/p': res(page, { type: 'text/html', url: 'https://ex.ro/dir/p' }),
      'https://ex.ro/dir/img/a.png': res(PNG),
      'https://ex.ro/img/a.png?x=1': res(PNG, { type: 'image/png; charset=binary' }),
      'https://ex.ro/dir/big.jpg': res(PNG, { type: 'image/jpeg' }),
      'https://ex.ro/dir/broken.png': new Error('ECONNRESET'),
      'https://ex.ro/dir/page.png': res('<html>', { type: 'text/html' }),
    });
    const { saved, saveMedia } = saver();
    const r = await importWebPage('https://ex.ro/dir/p', { fetch, saveMedia });
    expect(fetch.calls.filter((u) => u === 'https://ex.ro/dir/img/a.png')).toHaveLength(1);
    expect(saved).toEqual(['https://ex.ro/dir/img/a.png', 'https://ex.ro/img/a.png?x=1', 'https://ex.ro/dir/big.jpg']);
    expect(r.media.map((m) => m.file)).toEqual(['m1.png', 'm2.png', 'm3.jpg']);
    expect(r.html.match(/data-media="m1\.png"/g)).toHaveLength(2);
    expect(r.html).toContain(`<img src="data:image/jpeg;base64,${PNG.toString('base64')}" data-media="m3.jpg" alt="B">`);
    expect(r.html).toContain('<img src="https://ex.ro/dir/broken.png" alt="Rupt">');
    expect(r.html).toContain('<img src="https://ex.ro/dir/page.png" alt="html">');
    expect(r.html).toContain('<img src="data:image/png;base64,QUJD" alt="inline">');
    expect(r.html).not.toMatch(/script|javascript:/);
    expect(fetch.calls.some((u) => u.startsWith('data:'))).toBe(false);
  });

  it('without saveMedia returns the page with remote images', async () => {
    const fetch = fakeFetch({ 'https://ex.ro/p': res('<body><img src="a.png"></body>', { type: 'text/html' }) });
    const r = await importWebPage('https://ex.ro/p', { fetch });
    expect(r.html).toContain('<img src="https://ex.ro/a.png">');
    expect(r.media).toBeUndefined();
    expect(fetch.calls).toEqual(['https://ex.ro/p']);
  });

  it('rejects bad URLs and HTTP errors', async () => {
    await expect(importWebPage('file:///etc/passwd', { fetch: fakeFetch({}) })).rejects.toThrow(/http/);
    await expect(importWebPage('nu e url', { fetch: fakeFetch({}) })).rejects.toThrow(/invalid/);
    await expect(importWebPage('https://ex.ro/x', { fetch: fakeFetch({}) })).rejects.toThrow(/404/);
  });
});

describe('image limits', () => {
  it('skips oversize images (declared or streamed) and non-image types', async () => {
    const big = Buffer.alloc(50);
    const fetchImage = makeImageFetcher(
      fakeFetch({
        'https://x/declared.png': { ...res(PNG), headers: { get: (h) => (h === 'content-type' ? 'image/png' : '999') } },
        'https://x/big.png': res(big),
        'https://x/ok.png': res(PNG),
        'https://x/svg': res('<svg/>', { type: 'image/svg+xml' }),
        'https://x/js.png': res('x', { type: 'application/javascript' }),
      }),
      { maxBytes: 20 },
    );
    expect(await fetchImage('https://x/declared.png')).toBeNull();
    expect(await fetchImage('https://x/big.png')).toBeNull();
    expect(await fetchImage('https://x/js.png')).toBeNull();
    expect(await fetchImage('https://x/missing.png')).toBeNull();
    expect((await fetchImage('https://x/ok.png')).mime).toBe('image/png');
    expect((await fetchImage('https://x/svg')).mime).toBe('image/svg+xml');
  });

  it('stops a streamed body past the cap', async () => {
    let cancelled = false;
    const chunks = [new Uint8Array(15), new Uint8Array(15), new Uint8Array(15)];
    const body = { getReader: () => ({ read: async () => (chunks.length ? { done: false, value: chunks.shift() } : { done: true }), cancel: async () => (cancelled = true) }) };
    const fetchImage = makeImageFetcher(async () => ({ ...res(''), body }), { maxBytes: 20 });
    expect(await fetchImage('https://x/s.png')).toBeNull();
    expect(cancelled).toBe(true);
    expect(chunks).toHaveLength(1);
  });

  it('caps the count, times out slow images and aborts them', async () => {
    const html = '<img src="https://x/1.png"><img src="https://x/slow.png"><img src="https://x/3.png"><img src="https://x/4.png">';
    let aborted = false;
    const fetchImage = (url, { signal }) => {
      if (url.includes('slow')) {
        signal.addEventListener('abort', () => (aborted = true));
        return new Promise(() => {});
      }
      return Promise.resolve({ data: PNG, mime: 'image/png' });
    };
    const { saved, saveMedia } = saver();
    const r = await localizeImages(html, { fetchImage, saveMedia, maxImages: 3, timeoutMs: 20 });
    expect(aborted).toBe(true);
    expect(saved).toEqual(['https://x/1.png', 'https://x/3.png']);
    expect(r.html).toContain('<img src="https://x/slow.png">');
    expect(r.html).toContain('<img src="https://x/4.png">');
  });

  it('respects the total byte budget', async () => {
    const { saved, saveMedia } = saver();
    await localizeImages('<img src="https://x/a.png"><img src="https://x/b.png"><img src="https://x/c.png">', {
      fetchImage: async () => ({ data: Buffer.alloc(10), mime: 'image/png' }),
      saveMedia,
      totalBytes: 25,
    });
    expect(saved).toEqual(['https://x/a.png', 'https://x/b.png']);
  });
});
