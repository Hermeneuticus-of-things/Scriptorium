// Named styles (Scrivener "Styles"): paragraph styles set data-style on a paragraph,
// character styles wrap text in span[data-char-style]. The look is plain data so
// the same definition drives the editor, the compiled HTML/EPUB and DOCX.

export const DEFAULT_STYLES = [
  { id: 'ilustratie', name: 'Ilustrație', type: 'char', italic: true },
  { id: 'accent', name: 'Accent', type: 'char', bold: true },
  { id: 'sanscrit', name: 'Termen sanscrit', type: 'char', italic: true },
  { id: 'citat-bloc', name: 'Citat bloc', type: 'para', italic: true, indent: 2 },
  { id: 'motto', name: 'Motto', type: 'para', italic: true, align: 'right', size: 90 },
  { id: 'scrisoare', name: 'Scrisoare', type: 'para', indent: 1.5, size: 95 },
  { id: 'centrat', name: 'Centrat', type: 'para', align: 'center' },
  { id: 'separator', name: 'Separator de scenă', type: 'para', align: 'center', spacing: 1 },
];

export function stylesOf(project) {
  return project && Array.isArray(project.styles) && project.styles.length ? project.styles : DEFAULT_STYLES;
}

function decl(st) {
  const d = [];
  if (st.bold) d.push('font-weight: 700');
  if (st.italic) d.push('font-style: italic');
  if (st.smallCaps) d.push('font-variant: small-caps');
  if (st.underline) d.push('text-decoration: underline');
  if (st.color) d.push(`color: ${st.color}`);
  if (st.size && st.size !== 100) d.push(`font-size: ${st.size}%`);
  if (st.type === 'para') {
    if (st.align) d.push(`text-align: ${st.align}`);
    if (st.indent) d.push(`margin-left: ${st.indent}em`, `margin-right: ${st.indent}em`);
    if (st.spacing) d.push(`margin-top: ${st.spacing}em`, `margin-bottom: ${st.spacing}em`);
    if (st.align === 'center' || st.align === 'right') d.push('text-indent: 0');
  }
  return d.join('; ');
}

// CSS for the given scope selector (".prose" in the editor, "body" in compiled output).
export function styleCss(styles, scope = '.prose') {
  return styles
    .map((st) => {
      const sel = st.type === 'para' ? `${scope} [data-style="${st.id}"]` : `${scope} [data-char-style="${st.id}"]`;
      return `${sel} { ${decl(st)} }`;
    })
    .join('\n');
}
