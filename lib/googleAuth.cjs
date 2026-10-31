'use strict';
// Google OAuth Desktop (loopback) — ruta oficială pentru aplicații instalate, fără backend web:
// consimțământul se dă în browserul extern, codul se întoarce pe http://127.0.0.1:<port> și se
// schimbă pe token-uri. Se stochează DOAR refresh_token (cu celelalte secrete, safeStorage) —
// parola userului nu e niciodată atinsă. Totul injectabil pentru teste.
const http = require('http');
const { randomBytes } = require('crypto');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
// cloud-translation acoperă Translate API; țin și cloud-platform pentru servicii viitoare.
const SCOPE = 'https://www.googleapis.com/auth/cloud-translation https://www.googleapis.com/auth/userinfo.email';

function consentUrl({ clientId, port, state, scope = SCOPE, loginHint = '' } = {}) {
  const u = new URL(AUTH_URL);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', `http://127.0.0.1:${port}`);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', scope);
  u.searchParams.set('access_type', 'offline'); // ne trebuie refresh_token
  u.searchParams.set('prompt', 'consent');
  if (loginHint) u.searchParams.set('login_hint', loginHint);
  u.searchParams.set('state', state);
  return u.toString();
}

/** Serverul loopback: prima cerere cu ?code=<...>&state=<...> închide serverul și dă codul. */
function loopbackServer({ port, state, timeoutMs = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const u = new URL(req.url, `http://127.0.0.1:${port}`);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body style="font:15px sans-serif;text-align:center;padding-top:40px"><p>Autorizarea s-a terminat — te poți întoarce la Pneuma Sofer.</p><script>setTimeout(()=>window.close(),700)</script></body></html>');
        const code = u.searchParams.get('code');
        const st = u.searchParams.get('state');
        const err = u.searchParams.get('error');
        server.close();
        if (err) reject(new Error(`Google a refuzat autorizarea (${err}).`));
        else if (st !== state) reject(new Error('Starea OAuth nu se potrivește (posibil CSRF).'));
        else if (!code) reject(new Error('Google nu a trimis codul de autorizare.'));
        else resolve(code);
      } catch (e) {
        try { server.close(); } catch { /* deja închis */ }
        reject(e);
      }
    });
    server.on('error', (e) => reject(new Error(`Portul ${port} nu a putut fi deschis: ${e.message}`)));
    server.listen(port, '127.0.0.1');
    if (timeoutMs) setTimeout(() => { try { server.close(); } catch { /* închis */ } reject(new Error('Timpul de autorizare a expirat (nu am primit redirectul).')); }, timeoutMs).unref?.();
  });
}

/** Schimbă codul pe token-uri: {access_token, expires_in, refresh_token}. */
async function exchangeCode({ clientId, code, port, clientSecret = '', fetchImpl = fetch } = {}) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      code,
      redirect_uri: `http://127.0.0.1:${port}`,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Schimbul de token a eșuat (${res.status}).`);
  const t = await res.json();
  if (!t.refresh_token) throw new Error('Google nu a întors refresh_token — reconectează contul (consimțământ complet).');
  return t;
}

/** Nou access_token din refresh_token: {access_token, expires_in}. */
async function refreshAccessToken({ clientId, refreshToken, clientSecret = '', fetchImpl = fetch } = {}) {
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    const e = new Error(`Reîmprospătarea token-ului a eșuat (${res.status}) — reconectează contul Google.`);
    e.status = res.status;
    throw e;
  }
  return res.json();
}

/** Fluxul complet: consimțământ în browserul extern + schimbul de cod. Întoarce token-urile. */
async function desktopFlow({ clientId, clientSecret = '', loginHint = '', openExternal = () => {}, fetchImpl = fetch, timeoutMs = 180000 } = {}) {
  if (!clientId) throw new Error('Lipsește Client ID-ul OAuth. În Google Cloud Console creează un „OAuth client ID" de tip Desktop app și pune-l în Setări.');
  const port = 12700 + Math.floor(randomBytes(2).readUInt16BE(0) % 800); // 12700–13499
  const state = randomBytes(12).toString('hex');
  const openP = loopbackServer({ port, state, timeoutMs });
  openExternal(consentUrl({ clientId, port, state, loginHint }));
  const code = await openP;
  return exchangeCode({ clientId, code, port, clientSecret, fetchImpl });
}

module.exports = { AUTH_URL, TOKEN_URL, SCOPE, consentUrl, loopbackServer, exchangeCode, refreshAccessToken, desktopFlow };
