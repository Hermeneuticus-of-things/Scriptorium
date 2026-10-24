#!/usr/bin/env node
// A fake whisper-server (whisper.cpp) for tests: GET / answers, POST /inference returns verbose_json
// whose text tells how many seconds of 16 kHz audio arrived.
const http = require('http');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]);
http
  .createServer((req, res) => {
    if (req.method === 'GET') return res.end('ok');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const i = body.indexOf('data', body.indexOf('RIFF'));
      const bytes = i >= 0 ? body.readUInt32LE(i + 4) : 0;
      const sec = Math.round((bytes / 2 / 16000) * 10) / 10;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ text: ` Am auzit ${sec} secunde.`, segments: [{ start: 0, end: sec, text: ` Am auzit ${sec} secunde.` }] }));
    });
  })
  .listen(port, '127.0.0.1');
