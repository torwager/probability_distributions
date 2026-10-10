"""Regenerate assets/js/catalog.js from tools/catalog.source.json.

The source JSON is the catalog produced in the catalog phase (distributions, relations, notes).
This script adds derived fields (param keys and unicode labels, blurbs, map positions),
lifts the JSON blocks embedded in the notes (notation glossary, edge kinds) into their own
fields, and writes a frozen ES module. Run:  python3 tools/build_catalog.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
src = json.load(open(os.path.join(HERE, 'catalog.source.json'), encoding='utf-8'))

GREEK = {'alpha':'α','beta':'β','gamma':'γ','delta':'δ','kappa':'κ','lambda':'λ','mu':'μ','nu':'ν',
         'rho':'ρ','sigma':'σ','tau':'τ','theta':'θ','pi':'π','eta':'η','xi':'ξ','phi':'φ'}
SUB = str.maketrans('0123456789', '₀₁₂₃₄₅₆₇₈₉')

def key_of(sym):
    return sym.replace('\\', '').replace('_', '').replace('{', '').replace('}', '')

def label_of(sym):
    m = re.match(r'^\\?([A-Za-z]+)(?:_\{?([0-9A-Za-z]+)\}?)?$', sym)
    base, sub = m.group(1), m.group(2)
    base = GREEK.get(base, base) if sym.startswith('\\') else base
    if sub:
        if sub.isdigit():
            return base + sub.translate(SUB)
        return base + '_' + sub
    return base

BLURB = {
 'discrete-uniform': 'Each of a fixed range of consecutive whole numbers is equally likely, as with the roll of a fair die.',
 'bernoulli': 'A single trial with two outcomes: success (coded 1) with probability p, failure (coded 0) otherwise.',
 'categorical': 'A single trial with K possible outcomes, each with its own probability.',
 'binomial': 'The number of successes in a fixed number n of independent trials that share the same success probability p.',
 'multinomial': 'The counts in each of K categories after n independent trials.',
 'hypergeometric': 'The number of successes in a sample drawn without replacement from a finite population.',
 'geometric': 'The number of failures before the first success in a sequence of independent trials.',
 'negative-binomial': 'The number of failures before the r-th success; also a standard model for counts whose variance exceeds their mean.',
 'poisson': 'The number of events in a fixed interval when events occur independently at a constant average rate.',
 'beta-binomial': 'A binomial count whose success probability itself varies according to a Beta distribution.',
 'uniform': 'Every value in an interval from a to b is equally likely.',
 'exponential': 'The waiting time until the next event when events occur independently at a constant rate.',
 'gamma': 'A distribution for positive values; with a whole-number shape it is the total waiting time for several events.',
 'weibull': 'A distribution of lifetimes whose failure rate can decrease, stay constant or increase over time.',
 'normal': 'The bell curve: a symmetric distribution described by its mean and standard deviation.',
 'log-normal': 'A positive, right-skewed distribution whose logarithm has a normal distribution.',
 'student-t': 'A bell-shaped distribution with heavier tails than the normal, used for tests and intervals about means.',
 'chi-squared': 'The sum of squared independent standard normal variables; used in variance and goodness-of-fit tests.',
 'beta': 'A distribution for proportions and probabilities, on the interval from 0 to 1.',
 'f': 'The ratio of two chi-squared variables, each divided by its degrees of freedom; the reference distribution for ANOVA and regression F-tests.',
 'cauchy': 'A symmetric distribution with tails so heavy that it has no mean or variance.',
 'half-cauchy': 'The positive half of a Cauchy distribution, often used as a prior for standard deviations.',
 'laplace': 'A symmetric distribution with a sharp peak and exponentially decaying tails on both sides.',
 'logistic': 'A symmetric distribution whose CDF is the logistic (sigmoid) curve.',
 'inverse-gamma': 'The distribution of the reciprocal of a gamma variable; a conjugate prior for the variance of a normal distribution.',
 'dirichlet': 'A distribution over lists of probabilities that add up to 1; the multivariate version of the Beta.',
 'multivariate-normal': 'The joint distribution of several correlated normal variables.',
 'von-mises': 'A bell-shaped distribution for angles and directions on a circle.',
 'ex-gaussian': 'The sum of a normal and an independent exponential variable, often used to describe response times.',
 'wald': 'The time a drifting random walk takes to first reach a fixed boundary.',
 'pareto': 'A power-law distribution with a heavy right tail.',
 'gumbel': 'The distribution of the largest of many independent values; it also produces the softmax choice rule.',
}

# Placeholder grid positions (col 0-9, row 0-6); the map builder refines these.
MAPPOS = {
 'bernoulli': (1,0), 'categorical': (2,0), 'multinomial': (3,0), 'dirichlet': (4,0),
 'discrete-uniform': (0,1), 'binomial': (2,1), 'beta-binomial': (3,1), 'uniform': (5,1),
 'f': (7,0), 'multivariate-normal': (9,1),
 'hypergeometric': (1,2), 'beta': (4,2), 'gamma': (5,2), 'chi-squared': (6,2), 'normal': (8,2), 'student-t': (7,1),
 'geometric': (0,3), 'negative-binomial': (1,3), 'poisson': (2,3), 'inverse-gamma': (6,3), 'log-normal': (9,3), 'cauchy': (8,4), 'half-cauchy': (9,4),
 'exponential': (3,4), 'weibull': (4,4), 'pareto': (2,5), 'laplace': (3,5), 'gumbel': (4,5), 'logistic': (5,5),
 'ex-gaussian': (6,6), 'wald': (7,6), 'von-mises': (8,6),
}

import sys
sys.path.insert(0, HERE)
import catalog_rich as RICH

TEX_SYM = {'alpha':'α','beta':'β','gamma':'γ','delta':'δ','kappa':'κ','lambda':'λ','mu':'μ','nu':'ν','rho':'ρ',
           'sigma':'σ','tau':'τ','theta':'θ','pi':'π','eta':'η','xi':'ξ','phi':'φ','varepsilon':'ε','epsilon':'ε',
           'Gamma':'Γ','Sigma':'Σ','Phi':'Φ','Delta':'Δ','chi':'χ','le':'≤','ge':'≥','leq':'≤','geq':'≥','ne':'≠',
           'neq':'≠','times':'×','cdot':'·','infty':'∞','to':'→','sim':'~','approx':'≈','dots':'…','ldots':'…',
           'cdots':'⋯','sum':'Σ','in':'∈','mid':'|','top':'ᵀ','ln':'ln','exp':'exp','cos':'cos','quad':' '}
SUPS = str.maketrans('0123456789+-()k', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁽⁾ᵏ')

def math_to_text(t):
    t = re.sub(r'\\(?:big|Big|bigg|Bigg|left|right)\b', '', t)
    t = re.sub(r'\\begin\{pmatrix\}.*?\\end\{pmatrix\}', '(2×2 matrix)', t)
    for _ in range(3):
        t = re.sub(r'\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}', r'(\1)/(\2)', t)
        t = re.sub(r'\\binom\{([^{}]*)\}\{([^{}]*)\}', r'C(\1, \2)', t)
        t = re.sub(r'\\sqrt\{([^{}]*)\}', r'√(\1)', t)
    t = re.sub(r'\\binom\s*(\w)\s*(\w)', r'C(\1, \2)', t)
    t = re.sub(r'\\sqrt\s*', '√', t)
    t = re.sub(r'\\mathbb\s*\{?R\}?', 'ℝ', t)
    t = re.sub(r'\\mathbb\s*\{?Z\}?', 'ℤ', t)
    t = re.sub(r'\\(?:mathrm|text|mathbf|boldsymbol|mathcal|operatorname)\s*\{([^{}]*)\}', r'\1', t)
    t = re.sub(r'\\(?:mathbf|boldsymbol|mathcal)\s*', '', t)
    t = t.replace('^\\top', 'ᵀ')
    t = re.sub(r'\^\{([0-9+\-()k]+)\}', lambda m: m.group(1).translate(SUPS), t)
    t = re.sub(r'\^([0-9k])', lambda m: m.group(1).translate(SUPS), t)
    t = re.sub(r'\\([A-Za-z]+)', lambda m: TEX_SYM.get(m.group(1), m.group(1)), t)
    t = t.replace('\\!', '').replace('\\,', ' ').replace('\\ ', ' ').replace('\\{', '⟨LB⟩').replace('\\}', '⟨RB⟩')
    t = t.replace('{', '').replace('}', '').replace('⟨LB⟩', '{').replace('⟨RB⟩', '}')
    t = re.sub(r'_(\w)', r'\1', t)
    return t

def tex_to_text(t):
    """Crude rich text -> plain unicode for places that cannot render TeX (aria labels, title attributes)."""
    parts = re.split(r'(?<!\\)\$', t)
    out = ''.join(math_to_text(x) if i % 2 else x for i, x in enumerate(parts))
    out = re.sub(r'<[^>]+>', '', out).replace('\\$', '$')
    return re.sub(r'\s+', ' ', out).strip()

for d in src['distributions']:
    d['parameterization'] = RICH.PARAMETERIZATION[d['id']]
    if d['id'] in RICH.WHY_ADDED: d['whyAdded'] = RICH.WHY_ADDED[d['id']]
    d['parameterizationText'] = tex_to_text(d['parameterization'])
for r in src['relations']:
    assert r['id'] in RICH.RELATION_PLAIN, r['id']
    r['plain'] = RICH.RELATION_PLAIN[r['id']]
    r['plainText'] = tex_to_text(r['plain'])

for d in src['distributions']:
    assert d['id'] in BLURB and d['id'] in MAPPOS, d['id']
    d['blurb'] = BLURB[d['id']]
    c, r = MAPPOS[d['id']]
    d['mapPos'] = {'col': c, 'row': r}
    for p in d['params']:
        p['key'] = key_of(p['sym'])
        p['label'] = label_of(p['sym'])
        k = d['id'] + '.' + p['key']
        if k in RICH.PARAM_MEANING: p['meaning'] = RICH.PARAM_MEANING[k]
        if k in RICH.PARAM_NAME: p['name'] = RICH.PARAM_NAME[k]
        p['meaningText'] = tex_to_text(p['meaning'])

notes = src['notes']
def block(start, end):
    i = notes.index(start); i = notes.index('\n', i) + 1
    j = notes.index(end, i)
    return json.loads(notes[i:j].strip())

notation = block('NOTATION GLOSSARY', '\n\nEDGE KINDS')
edge_kinds = block('EDGE KINDS', '\n\nPAGE-ONLY FACTS')
ci = notes.index('CONVENTIONS'); cj = notes.index('\n\nNOTATION GLOSSARY')
conventions = RICH.CONVENTIONS  # rich-text sentences; the original wording is in CATALOG.notes

# substrings that indicate a notation entry is used in a TeX string
MATCH = {
 'X\\sim D': ['\\sim'], '\\overset{iid}{\\sim}': ['\\overset{iid}'], '\\xrightarrow{d}': ['\\xrightarrow{d}'],
 '\\Rightarrow': ['\\Rightarrow'], '\\iff': ['\\iff'], 'X\\mid Y=y': ['\\mid'], '\\mathbb 1[A]': ['\\mathbb 1['],
 '\\lfloor x\\rfloor': ['\\lfloor'], '\\binom nk\\text{ or }C(n,k)': ['\\binom', 'C(k'], '\\Gamma(a)': ['\\Gamma('],
 'B(a,b)': ['B(k', 'B(\\alpha'], '\\Phi(z)': ['\\Phi('], 'I_0(\\kappa)': ['I_0'], '\\Delta^{K-1}': ['\\Delta^'],
 'X_{(k)}': ['_{(k)}'], '\\arg\\max_j': ['\\arg\\max'], '\\inf\\{t: ...\\}': ['\\inf\\{'], 'B(t)': ['B(t)'],
 '\\mathbb Z,\\ \\mathbb R': ['\\mathbb{Z}', '\\mathbb{R}', '\\mathbb Z', '\\mathbb R'], '\\#\\{\\dots\\}': ['\\#'],
}
for e in notation:
    e['match'] = MATCH.get(e['sym'], [])
assert notation[-1]['sym'].startswith('\\mathrm{DUnif}')
notation = notation[:-1]
for e in notation:
    e['plain'] = RICH.NOTATION_PLAIN[e['sym']]
for sym, plain, match in RICH.ABBREVIATIONS:
    notation.append({'sym': sym, 'plain': plain, 'match': match})
for e in notation:
    e['plainText'] = tex_to_text(e['plain'])

KIND_LABELS = {
 'special-case': 'Special case', 'transformation': 'Transformation', 'sum': 'Sum', 'ratio': 'Ratio',
 'limit': 'Limit', 'mixture': 'Mixture', 'conditioning': 'Conditioning', 'conjugate-prior': 'Conjugate prior', 'other': 'Other relationship',
}
GROUP_ORDER = ['uniform', 'counting / Bernoulli trials', 'categorical / multivariate counts', 'waiting times / positive continuous',
               'normal family / sampling distributions', 'heavy-tailed / symmetric / extreme value', 'Bayesian priors',
               'response times and circular data']
assert set(d['group'] for d in src['distributions']) <= set(GROUP_ORDER)

data = {
  'distributions': src['distributions'],
  'relations': src['relations'],
  'notation': notation,
  'edgeKinds': edge_kinds,
  'kindLabels': KIND_LABELS,
  'groupOrder': GROUP_ORDER,
  'conventions': conventions,
  'notes': notes,
}

body = json.dumps(data, indent=1, ensure_ascii=False)
out = f"""// AUTO-GENERATED by tools/build_catalog.py from tools/catalog.source.json. Edit the source and re-run.
// The catalog of distributions and relationships shown on the site. Pure data, no DOM; safe to import in Node.
//
// distribution fields: id, name, kind ('discrete' | 'continuous' | 'multivariate-discrete' | 'multivariate-continuous'),
//   group, onOriginalMap, whyAdded (rich), parameterization (rich), parameterizationText (plain unicode),
//   params[{{sym, key, label, name, meaning (rich), meaningText (plain), domain, default, min, max, integer}}],
//   support (TeX), blurb (one plain sentence), mapPos {{col,row}} (placeholder grid position for the map).
// relation fields: id ('from--to'), from, to, bidirectional, kind (see edgeKinds), label (TeX), statement (TeX),
//   plain (rich), plainText (plain unicode), onOriginalMap.
// notation entries: {{sym (TeX), plain (rich), plainText, match}}; conventions: array of rich-text sentences.
// "rich" = HTML in which $...$ is inline TeX (render with ui.renderRich / ui.rich).

function deepFreeze(o) {{
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {{
    Object.freeze(o);
    for (const k of Object.keys(o)) deepFreeze(o[k]);
  }}
  return o;
}}

export const CATALOG = deepFreeze({body});

export const DISTRIBUTIONS = CATALOG.distributions;
export const RELATIONS = CATALOG.relations;
export const NOTATION = CATALOG.notation;
export const EDGE_KINDS = CATALOG.edgeKinds;
export const KIND_LABELS = CATALOG.kindLabels;
export const GROUP_ORDER = CATALOG.groupOrder;

const distById = new Map(DISTRIBUTIONS.map(d => [d.id, d]));
const relById = new Map(RELATIONS.map(r => [r.id, r]));

/** Catalog entry for a distribution id, or undefined. */
export function getDist(id) {{ return distById.get(id); }}
/** Catalog entry for a relation id, or undefined. */
export function getRelation(id) {{ return relById.get(id); }}
/** All relations that touch distribution `id` (as source or target). */
export function relationsOf(id) {{ return RELATIONS.filter(r => r.from === id || r.to === id); }}
/** Param specs from the catalog for distribution `id`, as a fresh mutable array (modules may refine them). */
export function catalogParams(id, overrides = {{}}) {{
  const d = distById.get(id);
  if (!d) throw new Error('Unknown distribution id: ' + id);
  return d.params.map(p => ({{ ...p, ...(overrides[p.key] || {{}}) }}));
}}
/** Notation-glossary entries whose symbols appear in a TeX string. */
export function notationFor(tex) {{
  return NOTATION.filter(e => e.match.some(m => tex.includes(m)));
}}
"""
open(os.path.join(ROOT, 'assets', 'js', 'catalog.js'), 'w', encoding='utf-8').write(out)
print('wrote catalog.js:', len(data['distributions']), 'distributions,', len(data['relations']), 'relations,', len(notation), 'notation entries')
