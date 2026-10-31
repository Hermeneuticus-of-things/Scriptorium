// Google OAuth Desktop (loopback): URL de consimțământ, server loopback, schimb de cod, refresh.
import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ga = require('../lib/googleAuth.cjs');

const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

describe('consentUrl', () => {
  it('construiește URL-ul cu client_id, loopback redirect, offline access și state', () => {
    const u = new URL(ga.consentUrl({ clientId: 'CID.apps.googleusercontent.com', port: 12777, state: 'S1', loginHint: 'a@b.ro' }));
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(u.searchParams.get('client_id')).toBe('CID.apps.googleusercontent.com');
    expect(u.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:12777');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('access_type')).toBe('offline');
    expect(u.searchParams.get('state')).toBe('S1');
    expect(u.searchParams.get('login_hint')).toBe('a@b.ro');
    expect(u.searchParams.get('scope')).toContain('cloud-translation');
  });
});

describe('loopbackServer + desktopFlow', () => {
  it('prima cerere cu code și state corect închide serverul și dă codul', async () => {
    const p = ga.loopbackServer({ port: 0 ? undefined : undefined, port: 0 && undefined } && { port: 12987, state: 'OK1' });
    await vi.waitFor(async () => {
      await fetch('http://127.0.0.1:12987/callback?code=C9&state=OK1').catch(() => {});
    }, { timeout: 3000 });
    await expect(p).resolves.toBe('C9');
  });
  it('state greșit → respinge (CSRF)', async () => {
    const p = ga.loopbackServer({ port: 12988, state: 'BUN' });
    await vi.waitFor(async () => { await fetch('http://127.0.0.1:12988/cb?code=X&state=ALT').catch(() => {}); }, { timeout: 3000 });
    await expect(p).rejects.toThrow(/CSRF/);
  });
  it('desktopFlow: deschide browserul, primește redirectul, schimbă codul pe token-uri', async () => {
    const opened = [];
    const fetchImpl = async (url, opts) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        expect(String(opts.body)).toContain('grant_type=authorization_code');
        expect(String(opts.body)).toContain('code=C7');
        return res(200, { access_token: 'AT', expires_in: 3600, refresh_token: 'RT' });
      }
      return res(400);
    };
    const flow = ga.desktopFlow({
      clientId: 'CID', fetchImpl,
      openExternal: (u) => { opened.push(u); const port = new URL(u).searchParams.get('redirect_uri').split(':').pop(); setTimeout(() => { fetch(`http://127.0.0.1:${port}/ok?code=C7&state=${new URL(u).searchParams.get('state')}`).catch(() => {}); }, 50); },
    });
    const t = await flow;
    expect(t.refresh_token).toBe('RT');
    expect(opened[0]).toContain('accounts.google.com');
  });
});

describe('exchangeCode + refreshAccessToken', () => {
  it('exchange fără refresh_token → eroare cu îndrumare', async () => {
    await expect(ga.exchangeCode({ clientId: 'C', code: 'X', port: 1, fetchImpl: async () => res(200, { access_token: 'a' }) }))
      .rejects.toThrow(/refresh_token/);
  });
  it('refresh reușit și eșuat cu status', async () => {
    const ok = await ga.refreshAccessToken({ clientId: 'C', refreshToken: 'R', fetchImpl: async () => res(200, { access_token: 'NOU', expires_in: 3500 }) });
    expect(ok.access_token).toBe('NOU');
    const bad = ga.refreshAccessToken({ clientId: 'C', refreshToken: 'R', fetchImpl: async () => res(400) });
    await expect(bad).rejects.toMatchObject({ status: 400 });
  });
});
