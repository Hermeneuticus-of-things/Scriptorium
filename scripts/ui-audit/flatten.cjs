// Flattens a UI dump (uia-dump.ps1 JSON, or pneuma-capture.cjs JSON) into one line per element:
// "<indent><role> | <name> | <shortcut> | off? | checked?" so two programs can be diffed line by line.
// Usage: node scripts/ui-audit/flatten.cjs <file.json> [--menu]   (--menu keeps only menu items)
const fs = require('fs');

const KEEP = /MenuItem|Button|CheckBox|RadioButton|ComboBox|Edit|Tab|TabItem|ListItem|TreeItem|Text|Slider|Spinner|Separator|Menu$/;
function line(n, d) {
  const parts = [n.role, (n.name || '').replace(/\s+/g, ' ').trim()];
  const key = n.key || n.accelerator || '';
  if (key) parts.push(key);
  if (n.enabled === false) parts.push('off');
  if (n.toggle === 'On' || n.checked === true) parts.push('checked');
  if (n.value) parts.push(`= ${String(n.value).slice(0, 60)}`);
  return '  '.repeat(d) + parts.join(' | ');
}
function flatten(n, { menu = false } = {}, d = 0, out = []) {
  const role = n.role || '';
  const keep = menu ? /MenuItem|Separator/.test(role) : KEEP.test(role) && (n.name || role === 'Separator');
  if (keep) out.push(line(n, d));
  for (const c of n.children || []) flatten(c, { menu }, keep ? d + 1 : d, out);
  return out;
}
module.exports = { flatten, line };
if (require.main === module) {
  const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^﻿/, ''));
  console.log(flatten(j, { menu: process.argv.includes('--menu') }).join('\n'));
}
