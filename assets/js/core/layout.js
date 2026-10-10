// Shared header and footer, theme toggle, mobile navigation and active-link highlighting.
// Every page includes:  <div id="site-header"></div> ... <div id="site-footer"></div>
// and  <script type="module" src="assets/js/core/layout.js"></script>

import { DISTRIBUTIONS, GROUP_ORDER } from '../catalog.js';

const REPO = 'https://github.com/torwager/probability_distributions';

export const BRAND_SVG = `<svg class="brand-mark" viewBox="0 0 40 24" aria-hidden="true">
  <path d="M2 21 C10 21 12 3 20 3 C28 3 30 21 38 21 Z" fill="var(--amber)" opacity=".9"/>
  <path d="M2 21 C10 21 12 3 20 3 C28 3 30 21 38 21" fill="none" stroke="var(--steel-deep)" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="1" y1="21.5" x2="39" y2="21.5" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
</svg>`;

function groupLabel(g) {
  const map = {
    'uniform': 'Uniform', 'counting / Bernoulli trials': 'Counts and trials', 'categorical / multivariate counts': 'Categories',
    'waiting times / positive continuous': 'Waiting times and positive values', 'normal family / sampling distributions': 'Normal family and test statistics',
    'heavy-tailed / symmetric / extreme value': 'Heavy tails and extremes', 'Bayesian priors': 'Priors', 'response times and circular data': 'Response times and angles',
  };
  return map[g] || g;
}
export { groupLabel };

function distMenu() {
  const cols = GROUP_ORDER.map(g => {
    const items = DISTRIBUTIONS.filter(d => d.group === g)
      .map(d => `<a href="distribution.html?d=${d.id}" data-dist="${d.id}">${d.name}</a>`).join('');
    return items ? `<div class="menu-group"><span class="menu-group-title">${groupLabel(g)}</span>${items}</div>` : '';
  }).join('');
  return `<div class="menu menu-dists"><a href="distributions.html" class="menu-btn" aria-haspopup="true" aria-expanded="false">Distributions <span aria-hidden="true">▾</span></a>
    <div class="menu-list menu-wide"><a class="menu-all" href="distributions.html">All distributions, by family</a><div class="menu-grid">${cols}</div></div></div>`;
}

const header = () => `<header class="site-header solid"><div class="wrap">
  <a class="brand" href="index.html">${BRAND_SVG}<span><b>Probability</b> distributions</span></a>
  <div class="header-actions">
    <button class="theme-toggle" type="button" aria-label="Switch colour theme" title="Switch colour theme">
      <svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>
      <svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
    </button>
    <button class="nav-toggle" aria-label="Menu" aria-expanded="false" aria-controls="nav"><span></span></button>
  </div>
  <nav class="nav" id="nav" aria-label="Main">
    <a href="index.html">Map</a>
    ${distMenu()}
    <a href="relationships.html">Relationships</a>
    <a href="about.html">About</a>
  </nav></div></header>`;

const footer = () => `<footer class="site-footer"><div class="wrap">
  <div><strong>Probability distributions</strong>An interactive guide to the probability distributions most used in statistics and computational modeling, and to how they are related. Each distribution has a page with an adjustable plot, formulas, properties and uses; each arrow on the map has a page that explains the relationship.</div>
  <div><strong>Explore</strong><ul>
    <li><a href="index.html">Map of distributions</a></li>
    <li><a href="distributions.html">All distributions</a></li>
    <li><a href="relationships.html">All relationships</a></li>
    <li><a href="about.html">About and notation</a></li>
    <li><a href="${REPO}" target="_blank" rel="noopener">Source on GitHub</a></li></ul></div>
  <div><strong>Main references</strong><ul>
    <li><a href="https://doi.org/10.1198/000313008X270448" target="_blank" rel="noopener">Leemis &amp; McQueston (2008)</a></li>
    <li><a href="http://www.stat.columbia.edu/~gelman/book/" target="_blank" rel="noopener">Gelman et al., Bayesian Data Analysis</a></li>
    <li>Casella &amp; Berger, Statistical Inference</li>
    <li><a href="https://en.wikipedia.org/wiki/List_of_probability_distributions" target="_blank" rel="noopener">Wikipedia: list of distributions</a></li></ul></div>
  <div class="credit-row"><span class="credit">Designed by <a href="https://torwager.github.io" target="_blank" rel="noopener">Tor Wager</a> · <a href="http://canlab.science/" target="_blank" rel="noopener">CANlab</a></span></div>
</div></footer>`;

function applyTheme(t) {
  const root = document.documentElement;
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
  else root.removeAttribute('data-theme');
}
function currentTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  if (t) return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function init() {
  const hEl = document.getElementById('site-header');
  if (hEl) hEl.outerHTML = header();
  const fEl = document.getElementById('site-footer');
  if (fEl) fEl.outerHTML = footer();

  const hdr = document.querySelector('.site-header');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // active link
  const here = location.pathname.split('/').pop() || 'index.html';
  const params = new URLSearchParams(location.search);
  document.querySelectorAll('.nav > a, .nav .menu-btn').forEach(a => {
    const href = a.getAttribute('href');
    if (href === here || (here === 'distribution.html' && href === 'distributions.html') || (here === 'relation.html' && href === 'relationships.html')) a.classList.add('active');
  });
  const d = params.get('d');
  if (d) document.querySelectorAll(`.menu-list a[data-dist="${CSS.escape(d)}"]`).forEach(a => a.classList.add('current'));

  // mobile nav
  const toggle = document.querySelector('.nav-toggle'), nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A' && !e.target.classList.contains('menu-btn')) { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }
  // dropdown: on touch devices and on narrow screens the first tap opens the menu
  document.querySelectorAll('.menu-btn').forEach(b => b.addEventListener('click', e => {
    const m = b.parentElement;
    const narrow = window.matchMedia('(max-width: 900px)').matches;
    const touch = window.matchMedia('(hover: none)').matches;
    if ((narrow || touch) && !m.classList.contains('open')) {
      e.preventDefault();
      m.classList.add('open');
      b.setAttribute('aria-expanded', 'true');
    }
  }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.menu.open').forEach(m => { m.classList.remove('open'); m.querySelector('.menu-btn')?.setAttribute('aria-expanded', 'false'); });
  });
  document.addEventListener('click', e => {
    document.querySelectorAll('.menu.open').forEach(m => { if (!m.contains(e.target)) { m.classList.remove('open'); m.querySelector('.menu-btn')?.setAttribute('aria-expanded', 'false'); } });
  });

  // theme toggle (remembered per browser when storage is available)
  const tbtn = document.querySelector('.theme-toggle');
  if (tbtn) {
    const sync = () => tbtn.setAttribute('data-current', currentTheme());
    sync();
    tbtn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem('pd-theme', next); } catch (_) { /* storage unavailable */ }
      sync();
      document.dispatchEvent(new CustomEvent('themechange', { detail: next }));
    });
  }

  // scroll reveals
  const rvs = document.querySelectorAll('.rv');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) rvs.forEach(el => el.classList.add('in'));
  else {
    const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
    rvs.forEach(el => io.observe(el));
  }
}

init();
