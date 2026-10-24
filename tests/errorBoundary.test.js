// @vitest-environment jsdom
// A render error shows a recover screen (not a white window) and is written to the error log.
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import ErrorBoundary from '../src/components/ErrorBoundary.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Boom() {
  throw new Error('test render failure');
}

describe('ErrorBoundary', () => {
  it('arată ecranul de recuperare și scrie eroarea în jurnal', async () => {
    const logError = vi.fn(() => Promise.resolve());
    const div = document.createElement('div');
    document.body.appendChild(div);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const root = createRoot(div);
    await act(async () => {
      root.render(React.createElement(ErrorBoundary, { api: { logError } }, React.createElement(Boom)));
    });
    spy.mockRestore();
    expect(div.querySelector('.crash-screen')).not.toBeNull();
    expect(div.textContent).toContain('test render failure');
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({ kind: 'render', message: 'test render failure' }));
    root.unmount();
  });
});
