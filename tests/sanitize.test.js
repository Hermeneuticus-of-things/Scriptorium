// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../src/lib/sanitize.js';
describe('sanitizeHtml', () => {
  it('keeps formatting, drops scripts, forms, refresh and unsafe links', () => {
    const out = sanitizeHtml('<p><strong>a</strong> <a href="https://x.ro">ok</a> <a href="javascript:alert(1)">no</a><img src="http://evil/x.png" onerror="x()"></p><form action="https://evil"><button>b</button></form><meta http-equiv="refresh" content="0;url=https://evil"><script>x()</script>');
    expect(out).toContain('<strong>a</strong>');
    expect(out).toContain('href="https://x.ro"');
    expect(out).toContain('target="_blank"');
    expect(out).not.toMatch(/javascript:|onerror|<form|<meta|<script|http:\/\/evil/);
  });
});
