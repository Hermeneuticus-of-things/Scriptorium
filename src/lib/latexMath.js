// LaTeX (common subset) → MathML, own converter, no dependency.
// Supported: numbers, letters, operators, groups {…}, ^ _ (sub/sup, combined),
// \frac \dfrac \tfrac, \sqrt[n]{…}, Greek letters, \sum \prod \int \oint \lim (with limits),
// function names (\sin \cos \log \ln \exp …), relations and arrows, \left…\right,
// \text{…}, \mathbf \mathit \mathrm, accents (\hat \bar \vec \dot \tilde \overline \underline),
// spacing (\, \; \quad \qquad), \begin{matrix|pmatrix|bmatrix|cases} … \end{…} with & and \\.

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ',
  iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ', sigma: 'σ', varsigma: 'ς',
  tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};
const OPS = {
  cdot: '⋅', times: '×', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆', circ: '∘', bullet: '∙',
  leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡', sim: '∼', simeq: '≃', cong: '≅', propto: '∝',
  ll: '≪', gg: '≫', in: '∈', notin: '∉', ni: '∋', subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇', cup: '∪', cap: '∩',
  setminus: '∖', emptyset: '∅', varnothing: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', wedge: '∧', vee: '∨',
  to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', mapsto: '↦',
  implies: '⟹', iff: '⟺', uparrow: '↑', downarrow: '↓', perp: '⊥', parallel: '∥', angle: '∠', mid: '∣',
  ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', dots: '…', prime: '′', degree: '°',
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', lbrace: '{', rbrace: '}', vert: '|', Vert: '‖',
};
const IDENT = { infty: '∞', partial: '∂', nabla: '∇', hbar: 'ℏ', ell: 'ℓ', Re: 'ℜ', Im: 'ℑ', aleph: 'ℵ' };
const BIG = { sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭', oint: '∮', bigcup: '⋃', bigcap: '⋂' };
const LIMIT_FUNCS = new Set(['lim', 'max', 'min', 'sup', 'inf', 'limsup', 'liminf', 'det', 'gcd']);
const FUNCS = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'lg', 'exp', 'arg', 'deg', 'dim', 'ker', 'hom', ...LIMIT_FUNCS]);
const ACCENTS = { hat: '^', widehat: '^', bar: '¯', overline: '¯', vec: '→', dot: '˙', ddot: '¨', tilde: '~', widetilde: '~' };
const SPACES = { ',': '0.1667em', ':': '0.2222em', ';': '0.2778em', ' ': '0.25em', quad: '1em', qquad: '2em', '!': '-0.1667em' };
const FENCES = { matrix: ['', ''], pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'], vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], cases: ['{', ''] };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function tokenize(src) {
  const out = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([A-Za-z]+|.)/.exec(src.slice(i));
      if (!m) { i++; continue; }
      out.push({ t: 'cmd', v: m[1] });
      i += m[0].length;
    } else if (/\s/.test(c)) {
      if (out.length && out[out.length - 1].t !== 'sp') out.push({ t: 'sp', v: ' ' });
      i++;
    } else if (/[0-9.]/.test(c)) {
      const m = /^[0-9]*\.?[0-9]+|^[0-9]+\.?/.exec(src.slice(i));
      out.push({ t: 'num', v: m[0] });
      i += m[0].length;
    } else {
      out.push({ t: 'ch', v: c });
      i++;
    }
  }
  return out;
}

class Parser {
  constructor(tokens) {
    this.tk = tokens;
    this.i = 0;
  }
  // Spaces only matter inside \text{…}: skipped everywhere else.
  peek() {
    while (this.tk[this.i] && this.tk[this.i].t === 'sp') this.i++;
    return this.tk[this.i];
  }
  next() {
    this.peek();
    return this.tk[this.i++];
  }
  // Raw text until the matching }, for \text{…} (tokens rejoined).
  rawGroup() {
    const t = this.peek();
    if (!t || t.v !== '{' || t.t !== 'ch') return t ? (this.next(), t.v) : '';
    this.next();
    let depth = 1;
    let s = '';
    while (this.tk[this.i]) {
      const x = this.tk[this.i++];
      if (x.t === 'ch' && x.v === '{') depth++;
      if (x.t === 'ch' && x.v === '}' && --depth === 0) break;
      s += x.t === 'cmd' ? (x.v.length === 1 ? x.v : `\\${x.v} `) : x.v;
    }
    return s;
  }
  // A list of atoms until a stop token (`}`, `&`, `\\`, `\right`, `\end`, `]` when inOpt).
  list(stop) {
    const items = [];
    for (;;) {
      const t = this.peek();
      if (!t || stop(t)) break;
      items.push(this.scripted());
    }
    return items.length === 1 ? items[0] : `<mrow>${items.join('')}</mrow>`;
  }
  // Atom followed by ^ / _ scripts.
  scripted() {
    const t = this.peek();
    const isBig = t && t.t === 'cmd' && (BIG[t.v] || LIMIT_FUNCS.has(t.v));
    const under = isBig && !/^i*int$|^oint$/.test(t.v);
    const base = this.atom();
    let sub = null;
    let sup = null;
    for (;;) {
      const n = this.peek();
      if (n && n.t === 'ch' && n.v === '_' && sub === null) { this.next(); sub = this.atom(); continue; }
      if (n && n.t === 'ch' && n.v === '^' && sup === null) { this.next(); sup = this.atom(); continue; }
      if (n && n.t === 'ch' && n.v === "'") { this.next(); sup = (sup || '') + '<mo>′</mo>'; continue; }
      break;
    }
    if (sub === null && sup === null) return base;
    if (under) {
      if (sub !== null && sup !== null) return `<munderover>${base}${sub}${sup}</munderover>`;
      return sub !== null ? `<munder>${base}${sub}</munder>` : `<mover>${base}${sup}</mover>`;
    }
    if (sub !== null && sup !== null) return `<msubsup>${base}${sub}${wrapRow(sup)}</msubsup>`;
    return sub !== null ? `<msub>${base}${sub}</msub>` : `<msup>${base}${wrapRow(sup)}</msup>`;
  }
  group() {
    const t = this.peek();
    if (t && t.t === 'ch' && t.v === '{') {
      this.next();
      const inner = this.list((x) => x.t === 'ch' && x.v === '}');
      this.next();
      return inner === '<mrow></mrow>' ? '<mrow/>' : inner;
    }
    return this.atom();
  }
  atom() {
    const t = this.next();
    if (!t) return '<mrow/>';
    if (t.t === 'num') return `<mn>${t.v}</mn>`;
    if (t.t === 'ch') {
      if (t.v === '{') { this.i--; return this.group(); }
      if (/[A-Za-z]/.test(t.v)) return `<mi>${t.v}</mi>`;
      if (t.v === '}') return '<mrow/>';
      if (t.v === '~') return '<mspace width="0.25em"/>';
      return `<mo>${esc(t.v)}</mo>`;
    }
    const v = t.v;
    if (SPACES[v]) return `<mspace width="${SPACES[v]}"/>`;
    if (v === '\\') return '<mspace linebreak="newline"/>';
    if ('{}%$#&_|'.includes(v) && v.length === 1) return `<mo>${esc(v)}</mo>`;
    if (GREEK[v]) return /^[A-Z]/.test(v) ? `<mi mathvariant="normal">${GREEK[v]}</mi>` : `<mi>${GREEK[v]}</mi>`;
    if (IDENT[v]) return `<mi>${IDENT[v]}</mi>`;
    if (OPS[v]) return `<mo>${esc(OPS[v])}</mo>`;
    if (BIG[v]) return `<mo largeop="true">${BIG[v]}</mo>`;
    if (FUNCS.has(v)) return `<mi>${v}</mi>`;
    if (v === 'frac' || v === 'dfrac' || v === 'tfrac' || v === 'binom') {
      const a = this.group();
      const b = this.group();
      return v === 'binom' ? `<mrow><mo>(</mo><mfrac linethickness="0">${a}${b}</mfrac><mo>)</mo></mrow>` : `<mfrac>${a}${b}</mfrac>`;
    }
    if (v === 'sqrt') {
      const n = this.peek();
      if (n && n.t === 'ch' && n.v === '[') {
        this.next();
        const idx = this.list((x) => x.t === 'ch' && x.v === ']');
        this.next();
        return `<mroot>${this.group()}${idx}</mroot>`;
      }
      return `<msqrt>${this.group()}</msqrt>`;
    }
    if (v === 'text' || v === 'mathrm' || v === 'textrm' || v === 'operatorname') {
      const s = this.rawGroup();
      return v === 'text' || v === 'textrm' ? `<mtext>${esc(s)}</mtext>` : `<mi mathvariant="normal">${esc(s)}</mi>`;
    }
    if (v === 'mathbf' || v === 'boldsymbol') return `<mstyle mathvariant="bold">${this.group()}</mstyle>`;
    if (v === 'mathit') return `<mstyle mathvariant="italic">${this.group()}</mstyle>`;
    if (v === 'mathbb') return `<mi mathvariant="double-struck">${esc(this.rawGroup())}</mi>`;
    if (v === 'mathcal') return `<mi mathvariant="script">${esc(this.rawGroup())}</mi>`;
    if (ACCENTS[v]) return `<mover accent="true">${this.group()}<mo>${ACCENTS[v]}</mo></mover>`;
    if (v === 'underline') return `<munder>${this.group()}<mo>_</mo></munder>`;
    if (v === 'left' || v === 'right' || v === 'big' || v === 'Big' || v === 'bigg' || v === 'Bigg') {
      if (v !== 'left') return this.delim();
      const open = this.delim();
      const inner = this.list((x) => x.t === 'cmd' && x.v === 'right');
      this.next();
      const close = this.delim();
      return `<mrow>${open}${inner}${close}</mrow>`;
    }
    if (v === 'begin') return this.env(this.rawGroup());
    return `<mi mathvariant="normal">\\${esc(v)}</mi>`;
  }
  delim() {
    const t = this.next();
    if (!t) return '';
    if (t.t === 'ch' && t.v === '.') return '';
    const ch = t.t === 'cmd' ? (OPS[t.v] || (t.v === '{' || t.v === '}' ? t.v : t.v === '|' ? '‖' : '')) : t.v;
    return ch ? `<mo fence="true" stretchy="true">${esc(ch)}</mo>` : '';
  }
  env(name) {
    const rows = [];
    let cells = [];
    for (;;) {
      const cell = this.list((x) => (x.t === 'ch' && x.v === '&') || (x.t === 'cmd' && (x.v === '\\' || x.v === 'end')));
      cells.push(cell);
      const t = this.next();
      if (!t || (t.t === 'cmd' && t.v === 'end')) break;
      if (t.t === 'cmd' && t.v === '\\') { rows.push(cells); cells = []; }
    }
    this.rawGroup();
    if (cells.length && !(cells.length === 1 && cells[0] === '<mrow></mrow>')) rows.push(cells);
    const table = `<mtable${name === 'cases' ? ' columnalign="left"' : ''}>${rows.map((r) => `<mtr>${r.map((c) => `<mtd>${c}</mtd>`).join('')}</mtr>`).join('')}</mtable>`;
    const [l, r] = FENCES[name] || ['', ''];
    if (!l && !r) return table;
    return `<mrow>${l ? `<mo fence="true">${esc(l)}</mo>` : ''}${table}${r ? `<mo fence="true">${esc(r)}</mo>` : ''}</mrow>`;
  }
}

const wrapRow = (x) => x;

/** LaTeX → `<math>` MathML string. display: block layout (centered, big operators). */
export function latexToMathML(latex, { display = false } = {}) {
  const src = String(latex || '').trim().replace(/^\$\$?|\$\$?$/g, '').trim();
  const p = new Parser(tokenize(src));
  const parts = [];
  while (p.peek()) parts.push(p.list((x) => x.t === 'ch' && x.v === '}')), p.peek() && p.next();
  const body = parts.join('');
  return `<math xmlns="http://www.w3.org/1998/Math/MathML"${display ? ' display="block"' : ''}><semantics><mrow>${body}</mrow><annotation encoding="application/x-tex">${esc(src)}</annotation></semantics></math>`;
}

/** The LaTeX source kept in an equation image's alt text ("$…$"), or null. */
export function latexFromAlt(alt) {
  const m = /^\$([\s\S]+)\$$/.exec(String(alt || ''));
  return m ? m[1] : null;
}
