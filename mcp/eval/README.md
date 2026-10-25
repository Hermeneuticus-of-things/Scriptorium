# Evaluarea serverului MCP Scribner

1. Construiește cartea de test: `node mcp/eval/fixture.cjs <folder>` (creează „Drumul spre munte.scribner”).
2. Pornește serverul pe ea, doar citire: `node mcp/server.mjs --project "<folder>/Drumul spre munte.scribner" --read-only`
   (instalat pe Windows: `cmd /c %LOCALAPPDATA%\Programs\Scribner\scribner-mcp.cmd --project "…" --read-only`).
3. Dă întrebările din `evaluation.xml` unui client AI conectat la server și compară răspunsurile cu `<answer>`.

`tests/mcpEval.test.js` verifică la fiecare rulare că fiecare răspuns se poate găsi cu uneltele de citire.
