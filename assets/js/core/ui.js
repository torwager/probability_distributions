// UI helpers: KaTeX rendering, a tiny state store, the parameter panel, number formatting,
// an accessible modal dialog, toggles and segmented controls, and small DOM helpers.

import { roundTo, niceStep } from './math.js';

// ---------------------------------------------------------------- DOM helpers

/**
 * h('div', {class: 'x', onclick: fn}, child1, 'text', ...) -> HTMLElement
 * Attributes starting with "on" become event listeners; `html` sets innerHTML (trusted content only).
 */
export function h(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'class') e.className = v;
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    e.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return e;
}

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------- KaTeX

const katexOpts = { throwOnError: false, strict: 'ignore', trust: false, output: 'html' };

/** Render TeX into an element (inline by default). Falls back to showing the source if KaTeX is missing. */
export function renderTex(target, tex, displayMode = false) {
  if (window.katex) {
    try { window.katex.render(tex, target, { ...katexOpts, displayMode }); return target; }
    catch (err) { console.warn('KaTeX error', err, tex); }
  }
  target.textContent = tex;
  target.classList.add('tex-fallback');
  return target;
}

/** TeX to an HTML string. */
export function texToHtml(tex, displayMode = false) {
  if (window.katex) {
    try { return window.katex.renderToString(tex, { ...katexOpts, displayMode }); }
    catch (err) { console.warn('KaTeX error', err, tex); }
  }
  return `<code class="tex-fallback">${escapeHtml(tex)}</code>`;
}

/** A <span> with rendered inline TeX. */
export function tex(texSrc, displayMode = false) {
  const s = document.createElement(displayMode ? 'div' : 'span');
  renderTex(s, texSrc, displayMode);
  return s;
}

/**
 * Convert "rich text" to HTML: the string is trusted HTML in which $...$ marks inline TeX and
 * $$...$$ display TeX. Write a literal dollar sign as \$.
 */
export function richToHtml(text) {
  if (text === undefined || text === null) return '';
  const s = String(text);
  let out = '', i = 0;
  while (i < s.length) {
    if (s[i] === '\\' && s[i + 1] === '$') { out += '$'; i += 2; continue; }
    if (s[i] === '$') {
      const display = s[i + 1] === '$';
      const open = display ? 2 : 1;
      let j = i + open;
      while (j < s.length) {
        if (s[j] === '\\') { j += 2; continue; }
        if (s[j] === '$' && (!display || s[j + 1] === '$')) break;
        j++;
      }
      if (j >= s.length) { out += s.slice(i); break; }
      const src = s.slice(i + open, j);
      const math = texToHtml(src, display);
      i = j + open;
      // keep punctuation that follows short inline math on the same line as the math ("$1-p$." never wraps
      // the "."); long inline formulas keep their own line breaks
      const punct = display || src.length > 40 ? null : /^[.,;:!?)\]]+/.exec(s.slice(i));
      if (punct) { out += `<span class="nowrap">${math}${punct[0]}</span>`; i += punct[0].length; }
      else out += math;
      continue;
    }
    out += s[i++];
  }
  return out;
}

/**
 * The first sentence of a rich-text string. Periods inside $...$ and in "e.g." / "i.e." do not end a sentence.
 */
export function firstSentence(text) {
  const s = String(text ?? '');
  let inTex = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') { i++; continue; }
    if (c === '$') { inTex = !inTex; continue; }
    if (inTex || !'.!?'.includes(c)) continue;
    if (i + 1 < s.length && !/\s/.test(s[i + 1])) continue;
    if (/\b(e\.g|i\.e|etc|vs|cf)$/i.test(s.slice(Math.max(0, i - 4), i))) continue;
    return s.slice(0, i + 1);
  }
  return s;
}

/** Split rich text into sentences (same rules as firstSentence). Returns the sentences with their spacing trimmed. */
export function sentences(text) {
  const out = [];
  let rest = String(text ?? '').trim();
  while (rest) {
    const s = firstSentence(rest);
    out.push(s.trim());
    rest = rest.slice(s.length).trim();
  }
  return out;
}

/**
 * A short summary from longer rich text: the first sentence, plus the second one when both together
 * stay within `maxChars` (default 300). Used when a module has no `summary` field.
 */
export function leadSentences(text, maxChars = 300) {
  const ss = sentences(text);
  if (!ss.length) return '';
  let out = ss[0];
  if (ss.length > 1 && out.length < 150 && (out + ' ' + ss[1]).length <= maxChars) out += ' ' + ss[1];
  return out;
}

/**
 * A disclosure: a button that shows and hides a region (aria-expanded + aria-controls; the region uses `hidden`).
 *   const d = disclosure({ id: 'about-more', label: 'More about this distribution', labelOpen: 'Show less' });
 *   head.append(d.button); later.append(d.region);   d.set(true) opens it.
 */
export function disclosure({ id, label, labelOpen = label, open = false, regionClass = '', buttonClass = '', onToggle = null }) {
  const text = h('span', { class: 'disclosure-text' }, open ? labelOpen : label);
  const button = h('button', { type: 'button', class: 'disclosure' + (buttonClass ? ' ' + buttonClass : ''), 'aria-expanded': String(open), 'aria-controls': id },
    text, h('span', { class: 'disclosure-chev', 'aria-hidden': 'true' }));
  const region = h('div', { id, class: 'disclosure-region' + (regionClass ? ' ' + regionClass : '') });
  region.hidden = !open;
  const set = on => {
    button.setAttribute('aria-expanded', String(on));
    text.textContent = on ? labelOpen : label;
    region.hidden = !on;
    if (onToggle) onToggle(on);
  };
  button.addEventListener('click', () => set(button.getAttribute('aria-expanded') !== 'true'));
  return { button, region, set, isOpen: () => button.getAttribute('aria-expanded') === 'true' };
}

/**
 * Shrink a rendered display formula (down to `minScale` of its size) when it is a little too wide for its
 * box; anything wider still scrolls sideways inside the box. Call again after a resize.
 */
export function fitFormula(box, minScale = 0.8) {
  for (const disp of box.querySelectorAll('.katex-display')) {
    const k = disp.querySelector(':scope > .katex');
    if (!k) continue;
    k.style.fontSize = '';
    const avail = disp.clientWidth, need = disp.scrollWidth;
    if (need > avail + 1 && avail > 0) {
      const base = parseFloat(getComputedStyle(k).fontSize);
      k.style.fontSize = (base * Math.max(minScale, (avail - 2) / need)).toFixed(2) + 'px';
    }
  }
}

/**
 * Scroll to the element named in the address (#id) once the page has been built. Plots resize while the fonts
 * load and the explorer fits itself to the screen, which moves everything below them, so the target is kept in
 * view until the page has settled (about 2.5 s), unless the reader scrolls or clicks first.
 */
export function scrollToHash() {
  if (!location.hash || location.hash.length < 2) return;
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
  const go = () => { const t = document.getElementById(id); if (t) t.scrollIntoView({ block: 'start', behavior: 'instant' }); };
  go();
  const ac = new AbortController();
  const stop = () => ac.abort();
  for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown']) window.addEventListener(ev, stop, { passive: true, once: true, signal: ac.signal });
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (!ac.signal.aborted) go(); }) : null;
  if (ro) ro.observe(document.getElementById('main') || document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => requestAnimationFrame(() => { if (!ac.signal.aborted) go(); }));
  setTimeout(() => { if (ro) ro.disconnect(); ac.abort(); }, 2500);
}

/** Fill an element with rich text (see richToHtml). */
export function renderRich(target, text) { target.innerHTML = richToHtml(text); return target; }
/** Element of the given tag with rich-text content. */
export function rich(tag, text, attrs = {}) { const e = h(tag, attrs); return renderRich(e, text); }

/**
 * Split a long TeX statement into separate lines at top-level sentence breaks
 * (".\ ", ";\quad", ";\ ") so that long relationship statements stay readable.
 */
export function splitTexLines(src) {
  const lines = [];
  let depth = 0, start = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      // keep "\{" and "\}" (escaped braces) and commands intact
      i++; continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (depth === 0 && (c === '.' || c === ';')) {
      const rest = src.slice(i + 1);
      const m = rest.match(/^\\(?:quad|qquad|\s|,)\s*/) || (c === '.' && rest.match(/^\s+(?=\\text)/));
      if (m) {
        lines.push(src.slice(start, c === ';' ? i : i + 1).trim());
        start = i + 1 + m[0].length;
        i = start - 1;
      }
    }
  }
  lines.push(src.slice(start).trim());
  return lines.filter(Boolean);
}

/** Render a TeX statement as one display line per sentence. */
export function renderTexLines(target, src) {
  target.textContent = '';
  for (const line of splitTexLines(src)) {
    const d = document.createElement('div');
    d.className = 'formula-line';
    d.dataset.tex = line;
    renderTex(d, line, true);
    target.appendChild(d);
  }
  return target;
}

/**
 * Fit the lines made by renderTexLines to their box: a line that is a little too wide is shrunk (fitFormula);
 * a line that is still too wide (long statements with words, on a phone) is set as inline math, which wraps
 * after relations and operators instead of scrolling sideways. Call again after a resize.
 */
export function fitTexLines(target, minScale = 0.72) {
  for (const d of target.querySelectorAll('.formula-line')) {
    if (!d.dataset.tex) continue;
    if (d.classList.contains('formula-line-wrap')) { d.classList.remove('formula-line-wrap'); renderTex(d, d.dataset.tex, true); }
    fitFormula(d, minScale);
    const disp = d.querySelector('.katex-display');
    if (disp && disp.scrollWidth > disp.clientWidth + 1) { d.classList.add('formula-line-wrap'); renderTex(d, breakableText(d.dataset.tex), false); }
  }
}

/**
 * Split a display formula at its top level (outside braces, brackets, parentheses and environments) for a
 * narrow screen: first at wide spaces (",\qquad", ",\quad", "\qquad"), which separate a formula from its
 * conditions; with `atEquals`, also before every "=" after the first. Returns the pieces (one per line).
 */
export function splitFormula(src, atEquals = false) {
  const cuts = [];
  let depth = 0, env = 0, firstEq = true;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(src.slice(i));
      const name = m ? m[1] : '';
      if (name === 'begin') env++;
      else if (name === 'end') env--;
      else if (name === 'left') depth++;
      else if (name === 'right') depth--;
      else if ((name === 'qquad' || name === 'quad') && depth === 0 && env === 0) {
        // the separator and a comma or semicolon just before it
        let a = i; while (a > 0 && /\s/.test(src[a - 1])) a--;
        let b = i + m[0].length; while (b < src.length && /\s/.test(src[b])) b++;
        if (/^\\q?quad/.test(src.slice(b))) { const m2 = /^\\q?quad\s*/.exec(src.slice(b)); b += m2[0].length; }
        if (a > 0 && b < src.length) cuts.push([a, b]);
        i = b - 1; continue;
      }
      i += (m ? m[0].length : 1) - 1;
      if (name === 'left' || name === 'right') i++;   // skip the delimiter after \left / \right
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (atEquals && c === '=' && depth === 0 && env === 0) { if (firstEq) firstEq = false; else cuts.push([i, i]); }
  }
  const out = [];
  let start = 0;
  for (const [a, b] of cuts.sort((x, y) => x[0] - y[0])) { out.push(src.slice(start, a).trim()); start = b; }
  out.push(src.slice(start).trim());
  return out.filter(Boolean);
}

/**
 * Fit a display formula (TeX in box.dataset.tex) to its box: shrink it a little (down to `minScale`); on a
 * narrow screen (at most `narrow` px wide, where the formulas are stacked), a formula that would have to
 * shrink below `splitBelow` is first split into lines
 * (see splitFormula); what is still too wide scrolls sideways inside the box. Call again after a resize.
 */
export function fitDisplayFormula(box, { minScale = 0.72, splitBelow = 0.8, narrow = 760 } = {}) {
  const src = box.dataset.tex;
  if (!src) { fitFormula(box, minScale); return; }
  if (box.dataset.split) { delete box.dataset.split; renderTex(box, src, true); }
  const disp = box.querySelector('.katex-display');
  const avail = disp ? disp.clientWidth : 0, need = disp ? disp.scrollWidth : 0;
  if (!disp || avail === 0 || need <= avail + 1 || window.innerWidth > narrow || avail / need >= splitBelow) { fitFormula(box, minScale); return; }
  let parts = splitFormula(src);
  const render = ps => {
    box.textContent = '';
    for (const part of ps) { const d = document.createElement('div'); d.className = 'formula-line'; renderTex(d, part, true); box.appendChild(d); }
    box.dataset.split = '1';
  };
  const tooWide = () => [...box.querySelectorAll('.katex-display')].some(d => d.clientWidth > 0 && d.clientWidth / d.scrollWidth < splitBelow);
  if (parts.length > 1) render(parts);
  if (parts.length < 2 || tooWide()) {
    const finer = parts.flatMap(p => splitFormula(p, true));
    if (finer.length > parts.length) { parts = finer; render(parts); }
  }
  fitFormula(box, minScale);
}

/** Let inline TeX wrap between the words of its \text{...} pieces (KaTeX only breaks after relations otherwise). */
function breakableText(src) {
  return src.replace(/\\text\{([^{}]*)\}/g, (m, body) => {
    const words = body.split(/(?<=\s)/);
    return words.length < 2 ? m : words.map(w => `\\text{${w}}`).join('\\allowbreak ');
  });
}

// ---------------------------------------------------------------- numbers

/**
 * Format a number for readouts: 4 significant digits by default, true minus sign,
 * '∞' for infinities and 'undefined' for NaN / undefined.
 */
export function fmt(v, digits = 4) {
  if (typeof v === 'string') return v;
  if (v === undefined || v === null || Number.isNaN(v)) return 'undefined';
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  if (v === 0) return '0';
  const av = Math.abs(v);
  let s;
  if (av >= 1e6 || av < 1e-4) {
    s = v.toExponential(digits - 1).replace(/\.?0+e/, 'e');
    const [m, e] = s.split('e');
    s = `${m}×10${superscript(e)}`;
  } else if (Number.isInteger(v)) s = String(v);
  else {
    s = String(Number(v.toPrecision(digits)));
    if (s.includes('e')) s = v.toFixed(Math.max(0, digits - 1 - Math.floor(Math.log10(av))));
  }
  return s.replace(/-/g, '−');
}
const SUP = { '-': '⁻', '+': '', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function superscript(s) { return String(s).split('').map(c => SUP[c] ?? c).join(''); }

/** Format a parameter value for an input box (ASCII minus, up to 6 significant digits). */
export function fmtInput(v, param) {
  if (!Number.isFinite(v)) return '';
  if (param && param.integer) return String(Math.round(v));
  return String(Number(v.toPrecision(6)));
}

/** Parse user input; accepts the unicode minus sign. Returns NaN if not a number. */
export function parseNumber(s) {
  const t = String(s).trim().replace(/[−–]/g, '-').replace(/,/g, '.');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
  return Number(t);
}

/** Resolution used when a parameter is changed by dragging (values snap to multiples of this). */
export function dragResolution(param) {
  if (param.integer) return 1;
  if (param.dragStep) return param.dragStep;
  return niceStep((param.max - param.min) / 500);
}
/** Step used by the keyboard (arrow keys) and the input box arrow keys. */
export function keyStep(param) {
  if (param.integer) return 1;
  if (param.step) return param.step;
  return niceStep((param.max - param.min) / 100);
}
/** Whether a parameter's slider should be log-scaled. */
export function isLogParam(param) {
  if (param.log !== undefined) return param.log;
  return param.min > 0 && param.max / param.min >= 50;
}

// ---------------------------------------------------------------- store

/**
 * Minimal observable store.
 *   const s = createStore({ p: {...} });
 *   s.get(); s.set({ p: {...} }); const off = s.subscribe((state, prev) => ...);
 */
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const prev = state;
      const next = typeof patch === 'function' ? patch(state) : patch;
      state = { ...state, ...next };
      for (const fn of subs) fn(state, prev);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

// ---------------------------------------------------------------- parameter panel

/**
 * Build a parameter panel.
 * @param {HTMLElement} container
 * @param {Array} params   param specs ({key, sym, name, meaning, min, max, integer, ...})
 * @param {object} opts
 *   get(): current params object
 *   apply(key, value): apply a validated typed value (called live while typing)
 *   check(key, value): extra validation, returns an error message or null
 *   onReset(): reset to defaults
 *   sliders: true to show a slider under each box (default true)
 * @returns {{update(p), el}}
 */
export function paramPanel(container, params, opts) {
  const root = h('div', { class: 'param-panel' });
  const rows = new Map();
  for (const prm of params) {
    if (prm.hidden) continue;
    const id = `param-${prm.key}-${Math.random().toString(36).slice(2, 7)}`;
    const msgId = id + '-msg';
    const symEl = h('span', { class: 'param-sym' });
    renderTex(symEl, prm.sym);
    // the "i" button shows the parameter's meaning (rich text, so symbols render) on hover, focus or tap
    const tipId = id + '-tip';
    const info = h('button', { type: 'button', class: 'info-tip', 'aria-label': `About ${prm.name}`, 'aria-describedby': tipId, 'aria-expanded': 'false' }, 'i');
    const tip = rich('span', prm.meaning, { class: 'param-tip', id: tipId, role: 'tooltip', hidden: true });
    const showTip = on => { tip.hidden = !on; info.setAttribute('aria-expanded', String(on)); };
    let pinned = false;
    info.addEventListener('mouseenter', () => showTip(true));
    info.addEventListener('mouseleave', () => { if (!pinned) showTip(false); });
    info.addEventListener('focus', () => showTip(true));
    info.addEventListener('blur', () => { pinned = false; showTip(false); });
    info.addEventListener('click', () => { pinned = !pinned; showTip(pinned); });
    info.addEventListener('keydown', e => { if (e.key === 'Escape') { pinned = false; showTip(false); } });
    const input = h('input', {
      id, type: 'text', inputmode: prm.integer ? 'numeric' : 'decimal', autocomplete: 'off', spellcheck: 'false',
      class: 'param-input', 'aria-describedby': msgId, 'data-param': prm.key,
    });
    const msg = h('div', { class: 'param-msg', id: msgId, role: 'status', 'aria-live': 'polite' });
    const label = h('label', { for: id, class: 'param-label' }, symEl, h('span', { class: 'param-name' }, prm.name));
    let slider = null;
    const log = isLogParam(prm);
    if (opts.sliders !== false) {
      slider = h('input', { type: 'range', class: 'param-slider', min: 0, max: 1000, step: 1, 'aria-label': `${prm.name} slider`, 'data-param': prm.key, tabindex: '-1' });
    }
    const toSlider = v => {
      const t = log ? Math.log(v / prm.min) / Math.log(prm.max / prm.min) : (v - prm.min) / (prm.max - prm.min);
      return Math.round(1000 * Math.max(0, Math.min(1, t)));
    };
    const fromSlider = s => {
      const t = s / 1000;
      let v = log ? prm.min * Math.pow(prm.max / prm.min, t) : prm.min + t * (prm.max - prm.min);
      v = prm.integer ? Math.round(v) : roundTo(v, log ? niceStep(v / 200) : dragResolution(prm));
      return Math.max(prm.min, Math.min(prm.max, v));
    };
    const row = h('div', { class: 'param-row' },
      h('div', { class: 'param-head' }, label, info, tip),
      h('div', { class: 'param-ctl' }, input, slider),
      msg);
    root.appendChild(row);

    const validate = raw => {
      const v = parseNumber(raw);
      if (raw.trim() === '') return { error: 'Enter a number.' };
      if (Number.isNaN(v)) return { error: 'Enter a number, for example ' + fmtInput(prm.default, prm) + '.' };
      if (prm.integer && !Number.isInteger(v)) return { error: 'Enter a whole number.' };
      if (v < prm.min || v > prm.max) return { error: `Enter a value from ${fmtInput(prm.min, prm)} to ${fmtInput(prm.max, prm)}.` };
      const extra = opts.check ? opts.check(prm.key, v) : null;
      if (extra) return { error: extra };
      return { value: v };
    };
    const setMsg = text => {
      msg.textContent = text || '';
      row.classList.toggle('invalid', !!text);
      row.classList.remove('reverted');
      input.setAttribute('aria-invalid', text ? 'true' : 'false');
    };
    input.addEventListener('input', () => {
      const r = validate(input.value);
      if (r.error) { setMsg(r.error); return; }
      setMsg('');
      opts.apply(prm.key, r.value);
    });
    input.addEventListener('blur', () => {
      // on leaving the box, show the value actually in use; if the typed text was not accepted,
      // keep a short note saying so (it disappears with the next edit)
      const wasInvalid = row.classList.contains('invalid');
      const typed = input.value.trim();
      const why = msg.textContent;
      setMsg('');
      const used = fmtInput(opts.get()[prm.key], prm);
      input.value = used;
      if (wasInvalid) {
        msg.textContent = `${typed ? `“${typed}” was not used. ` : ''}${why} The value in use is ${used.replace(/-/g, '−')}.`;
        row.classList.add('reverted');
      }
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { input.blur(); return; }
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const cur = opts.get()[prm.key];
      const st = keyStep(prm) * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
      let v = prm.integer ? Math.round(cur + st) : roundTo(cur + st, keyStep(prm));
      v = Math.max(prm.min, Math.min(prm.max, v));
      const extra = opts.check ? opts.check(prm.key, v) : null;
      if (extra) { setMsg(extra); return; }
      setMsg('');
      opts.apply(prm.key, v);
      input.value = fmtInput(opts.get()[prm.key], prm);
    });
    if (slider) {
      slider.addEventListener('input', () => {
        const v = fromSlider(Number(slider.value));
        const extra = opts.check ? opts.check(prm.key, v) : null;
        if (extra) { setMsg(extra); return; }
        setMsg('');
        opts.apply(prm.key, v);
      });
    }
    rows.set(prm.key, { input, slider, prm, toSlider, setMsg });
  }
  const actions = h('div', { class: 'param-actions' },
    h('button', { type: 'button', class: 'btn small-btn', onclick: () => { for (const r of rows.values()) r.setMsg(''); opts.onReset && opts.onReset(); } }, 'Reset parameters'));
  root.appendChild(actions);
  container.appendChild(root);

  function update(p) {
    for (const [key, r] of rows) {
      const v = p[key];
      if (document.activeElement !== r.input) r.input.value = fmtInput(v, r.prm);
      if (r.slider && document.activeElement !== r.slider) r.slider.value = r.toSlider(v);
    }
  }
  update(opts.get());
  return { update, el: root };
}

// ---------------------------------------------------------------- toggles

/** An accessible on/off switch. Returns {el, set(on)}. */
export function toggleSwitch(labelText, on, onChange) {
  const btn = h('button', { type: 'button', role: 'switch', class: 'switch', 'aria-checked': String(!!on) },
    h('span', { class: 'switch-track', 'aria-hidden': 'true' }, h('span', { class: 'switch-thumb' })),
    h('span', { class: 'switch-label' }, labelText));
  btn.addEventListener('click', () => {
    const v = btn.getAttribute('aria-checked') !== 'true';
    btn.setAttribute('aria-checked', String(v));
    onChange(v);
  });
  return { el: btn, set: v => btn.setAttribute('aria-checked', String(!!v)) };
}

/** A segmented control (radio group). options: [{value, label}]. Returns {el, set(value)}. */
export function segmented(options, value, onChange, ariaLabel = 'Options') {
  const root = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': ariaLabel });
  const btns = options.map(o => {
    const b = h('button', { type: 'button', role: 'radio', 'aria-checked': String(o.value === value), 'data-value': o.value }, o.label);
    b.addEventListener('click', () => { set(o.value); onChange(o.value); });
    b.addEventListener('keydown', e => {
      const i = options.findIndex(x => x.value === o.value);
      let j = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % options.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + options.length) % options.length;
      if (j === null) return;
      e.preventDefault();
      set(options[j].value); onChange(options[j].value); btns[j].focus();
    });
    root.appendChild(b);
    return b;
  });
  function set(v) { btns.forEach((b, i) => { const on = options[i].value === v; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; }); }
  set(value);
  return { el: root, set };
}

// ---------------------------------------------------------------- modal dialog

/**
 * Open an accessible modal dialog.
 * @param {{title: string, body: Node|string, wide?: boolean, footer?: Node, initialFocus?: Element|function}} o
 *   body string is rich text; initialFocus is the element focused when the dialog opens (default: the close button)
 * @returns {function} close
 */
export function openModal({ title, body, wide = false, footer = null, titleTex = false, initialFocus = null }) {
  const prevFocus = document.activeElement;
  const titleId = 'modal-title-' + Math.random().toString(36).slice(2, 8);
  const closeBtn = h('button', { type: 'button', class: 'modal-close', 'aria-label': 'Close' }, '×');
  const heading = h('h2', { id: titleId, class: 'modal-title' });
  if (titleTex) renderRich(heading, title); else heading.textContent = title;
  const content = h('div', { class: 'modal-body' });
  if (typeof body === 'string') renderRich(content, body); else if (body) content.appendChild(body);
  const dialog = h('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' },
    h('div', { class: 'modal-head' }, heading, closeBtn), content, footer ? h('div', { class: 'modal-foot' }, footer) : null);
  const backdrop = h('div', { class: 'modal-backdrop' }, dialog);
  document.body.appendChild(backdrop);
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => backdrop.classList.add('in'));

  const focusables = () => [...dialog.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent !== null);
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) { e.preventDefault(); dialog.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    backdrop.classList.remove('in');
    document.body.classList.remove('modal-open');
    setTimeout(() => backdrop.remove(), 180);
    if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', onKey, true);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('mousedown', e => { if (e.target === backdrop) close(); });
  // focus `initialFocus` (an element inside the dialog, or a function returning one) if given, else the first focusable
  setTimeout(() => {
    let target = typeof initialFocus === 'function' ? initialFocus(dialog) : initialFocus;
    if (!(target && dialog.contains(target))) target = focusables()[0] || dialog;
    target.focus({ preventScroll: true });
  }, 30);
  return close;
}

// ---------------------------------------------------------------- page sections

/** A page section with an id, an h2 and optional intro text. Returns {section, body}. */
export function section(id, title, intro) {
  const body = h('div', { class: 'section-body' });
  const sec = h('section', { class: 'doc-section', id, 'aria-labelledby': id + '-h' },
    h('h2', { id: id + '-h' }, title),
    intro ? rich('p', intro, { class: 'section-intro' }) : null,
    body);
  return { section: sec, body };
}

/** A definition-style glossary list: items [{sym (TeX), meaning (rich text)}]. */
export function glossaryList(items, title = 'What the symbols mean') {
  const dl = h('dl', { class: 'glossary' });
  for (const it of items || []) {
    const dt = h('dt'); renderTex(dt, it.sym);
    dl.appendChild(dt);
    dl.appendChild(rich('dd', it.meaning));
  }
  return h('div', { class: 'glossary-block' }, h('h3', { class: 'glossary-title' }, title), dl);
}

/** A list of references [{text, url}]. */
export function referenceList(refs) {
  const ol = h('ul', { class: 'refs' });
  for (const r of refs || []) {
    const li = rich('li', r.text);
    if (r.url) {
      li.appendChild(document.createTextNode(' '));
      li.appendChild(h('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.urlLabel || linkLabel(r.url)));
    }
    ol.appendChild(li);
  }
  return ol;
}
function linkLabel(url) {
  try { const u = new URL(url); return u.hostname.replace(/^www\./, ''); } catch (_) { return 'link'; }
}

/** Map a TeX parameter symbol to a short unicode label for SVG text (e.g. '\\sigma' -> 'σ'). */
export function texLabel(sym) {
  const G = { alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', rho: 'ρ', sigma: 'σ', tau: 'τ', theta: 'θ', pi: 'π', eta: 'η' };
  const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
  return String(sym).replace(/\\([a-zA-Z]+)/g, (m, w) => G[w] ?? w).replace(/_\{?([0-9]+)\}?/g, (m, d) => d.split('').map(c => SUB[c]).join('')).replace(/[{}]/g, '');
}
