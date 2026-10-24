// @vitest-environment jsdom
// Bug: Paste and Match Style with Windows (CRLF) or old Mac (CR) line ends left "\r" inside paragraphs.
import { it, expect } from 'vitest';
import { textToHtml } from '../src/lib/text.js';
it('CRLF / CR split into paragraphs without stray \\r', () => {
  expect(textToHtml('a\r\nb\r\n\r\nc')).toBe('<p>a</p><p>b</p><p>c</p>');
  expect(textToHtml('a\rb')).toBe('<p>a</p><p>b</p>');
});
