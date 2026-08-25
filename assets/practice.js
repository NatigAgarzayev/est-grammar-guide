/* ============================================================================
   Practice engine — queue, answer checking, word-level diff, optional AI check
   Depends on assets/rules.js (ET_RULES) and assets/items.js (ET_ITEMS).
   ========================================================================== */
(function () {
'use strict';

var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
var KEY = {
  levels: 'et.practice.levels',
  topic:  'et.practice.topic',
  mode:   'et.practice.mode',
  hist:   'et.practice.history',
  ai:     'et.practice.ai'
};

/* ------------------------------------------------------------- storage -- */
function load(k, fallback) {
  try { var v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
  catch (e) { return fallback; }
}
function save(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}

/* --------------------------------------------------------------- state -- */
var state = {
  levels: load(KEY.levels, ['A1']),
  topic:  load(KEY.topic, 'all'),
  mode:   load(KEY.mode, 'mixed'),
  history: load(KEY.hist, {}),
  queue: [],
  current: null,
  checked: false,
  lastResult: null,
  streakBefore: 0,
  session: { answered: 0, correct: 0, streak: 0, best: 0 }
};
if (!Array.isArray(state.levels) || !state.levels.length) state.levels = ['A1'];
state.levels = state.levels.filter(function (l) { return LEVELS.indexOf(l) > -1; });
if (!state.levels.length) state.levels = ['A1'];

var ai = load(KEY.ai, { provider: 'gemini', key: '', model: '', enabled: false, models: [] });
if (!Array.isArray(ai.models)) ai.models = [];   /* older saved settings had no list */

function itemKey(it) { return it.en; }

/* ---------------------------------------------------- text normalising -- */
var FOLD = { 'õ': 'o', 'ä': 'a', 'ö': 'o', 'ü': 'u', 'š': 's', 'ž': 'z' };

function normalize(s) {
  return String(s == null ? '' : s)
    .replace(/[‘’ʼ´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/[–—]/g, '-')
    .toLowerCase()
    .replace(/[.,!?;:"()\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function tokens(s) {
  var t = normalize(s);
  return t ? t.split(' ') : [];
}
function fold(w) {
  return w.replace(/[õäöüšž]/g, function (c) { return FOLD[c]; });
}

/* character-level distance, used to tell a typo from a different word */
function charDistance(a, b) {
  if (a === b) return 0;
  var m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
  for (j = 0; j <= n; j++) prev[j] = j;
  for (i = 1; i <= m; i++) {
    cur[0] = i;
    for (j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
      );
    }
    for (j = 0; j <= n; j++) prev[j] = cur[j];
  }
  return prev[n];
}

/* what kind of mistake is this substitution? */
function classify(userWord, refWord) {
  if (fold(userWord) === fold(refWord)) return 'diacritic';
  var d = charDistance(userWord, refWord);
  var len = Math.max(userWord.length, refWord.length);
  if (d === 1 && len >= 4) return 'typo';
  if (d === 2 && len >= 8) return 'typo';
  return 'wrong';
}

/* ------------------------------------------------------ word alignment -- */
/* Levenshtein over word arrays, with a backtrace so we can show the diff.
   ops: {op:'ok'|'sub'|'extra'|'miss', u:userWord, r:refWord, kind:...}      */
function align(u, r) {
  var m = u.length, n = r.length, i, j;
  var d = [];
  for (i = 0; i <= m; i++) { d[i] = new Array(n + 1); d[i][0] = i; }
  for (j = 0; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) {
    for (j = 1; j <= n; j++) {
      var sub = d[i - 1][j - 1] + (u[i - 1] === r[j - 1] ? 0 : 1);
      d[i][j] = Math.min(sub, d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }
  var ops = [];
  i = m; j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (u[i - 1] === r[j - 1] ? 0 : 1)) {
      if (u[i - 1] === r[j - 1]) ops.push({ op: 'ok', u: u[i - 1], r: r[j - 1] });
      else ops.push({ op: 'sub', u: u[i - 1], r: r[j - 1], kind: classify(u[i - 1], r[j - 1]) });
      i--; j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      ops.push({ op: 'extra', u: u[i - 1] }); i--;
    } else {
      ops.push({ op: 'miss', r: r[j - 1] }); j--;
    }
  }
  return ops.reverse();
}

function opCost(o) {
  if (o.op === 'ok') return 0;
  if (o.op === 'sub') return o.kind === 'diacritic' ? 0.3 : (o.kind === 'typo' ? 0.5 : 1);
  return 1;
}

/* Grade the answer against every accepted variant, keep the closest one. */
function grade(text, item) {
  var u = tokens(text);
  var best = null;
  for (var k = 0; k < item.et.length; k++) {
    var r = tokens(item.et[k]);
    var ops = align(u, r);
    var cost = 0;
    for (var i = 0; i < ops.length; i++) cost += opCost(ops[i]);
    if (!best || cost < best.cost) best = { cost: cost, ops: ops, variant: item.et[k] };
  }
  var soft = false, hard = false;
  for (var j = 0; j < best.ops.length; j++) {
    var o = best.ops[j];
    if (o.op === 'ok') continue;
    soft = true;
    if (!(o.op === 'sub' && (o.kind === 'diacritic' || o.kind === 'typo'))) hard = true;
  }
  if (!u.length) { best.verdict = 'bad'; return best; }
  best.verdict = !soft ? 'ok' : (hard ? 'bad' : 'almost');
  return best;
}

/* ------------------------------------------------------------------ DOM -- */
function $(id) { return document.getElementById(id); }
function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function star() {
  var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('class', 'star');
  s.setAttribute('aria-hidden', 'true');
  var u = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  u.setAttribute('href', '#star8');
  s.appendChild(u);
  return s;
}
function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

/* ------------------------------------------------------------- the pool -- */
function inScope(it) {
  return state.levels.indexOf(it.l) > -1 && (state.topic === 'all' || it.t === state.topic);
}
function pool() { return window.ET_ITEMS.filter(inScope); }

function filteredPool() {
  var p = pool();
  if (state.mode === 'new') {
    p = p.filter(function (it) { return !state.history[itemKey(it)]; });
  } else if (state.mode === 'review') {
    p = p.filter(function (it) {
      var h = state.history[itemKey(it)];
      return h && h.w > 0;
    });
  }
  return p;
}

/* ------------------------------------------------------------ ordering -- */
/* Sentences are not shuffled blindly. Four things decide what comes next:

   1. what you got wrong and have not yet re-mastered comes back first,
   2. then sentences you have never seen,
   3. then sentences whose spacing interval has elapsed,
   4. then everything else, so the session never runs dry.

   Inside each band the easier sentence goes first — shorter model answer and
   lower level — so a beginner ramps up instead of hitting a wall. A little
   jitter keeps two sessions from being identical, and a final pass spreads
   the topics out so you are not drilled on six genitives in a row.         */

var DAY = 86400000;
var INTERVALS = [0, DAY, 3 * DAY, 7 * DAY, 16 * DAY, 35 * DAY];

function interval(streak) {
  return INTERVALS[Math.min(streak, INTERVALS.length - 1)];
}

/* rough difficulty: words to produce, plus a penalty for the level */
function ease(it) {
  return tokens(it.et[0]).length + LEVELS.indexOf(it.l) * 1.5;
}

function band(it, now) {
  var h = state.history[itemKey(it)];
  if (!h) return 1;                                   /* never seen */
  var s = h.s || 0;
  if ((h.w || 0) > 0 && s < 2) return 0;              /* wrong, not re-mastered */
  if (now - (h.t || 0) >= interval(s)) return 2;      /* due again */
  return 3;                                           /* still fresh */
}

/* Keep runs of the same topic apart: always take the highest-priority item
   whose topic differs from the one just emitted, falling back to the very
   next item when everything left shares that topic.                        */
function spreadTopics(list) {
  var out = [], pool = list.slice();
  while (pool.length) {
    var prev = out.length ? out[out.length - 1].t : null;
    var i = 0;
    while (i < pool.length && pool[i].t === prev) i++;
    if (i === pool.length) i = 0;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function orderQueue(items) {
  var now = Date.now();
  var ranked = items.map(function (it) {          /* score once, then sort */
    return { it: it, k: band(it, now) * 1000 + ease(it) * 10 + Math.random() * 9 };
  }).sort(function (a, b) {
    return a.k - b.k;
  }).map(function (r) { return r.it; });
  return spreadTopics(ranked);
}

function buildQueue() {
  state.queue = orderQueue(filteredPool());
  state.session = { answered: 0, correct: 0, streak: 0, best: 0 };
  next();
}

/* ------------------------------------------------------------- rendering -- */
function renderLevelPills() {
  var wrap = $('levelPills');
  clear(wrap);
  LEVELS.forEach(function (lv) {
    var n = window.ET_ITEMS.filter(function (it) { return it.l === lv; }).length;
    var b = el('button', 'pill ' + lv.toLowerCase());
    b.type = 'button';
    b.setAttribute('aria-pressed', String(state.levels.indexOf(lv) > -1));
    b.appendChild(document.createTextNode(lv));
    b.appendChild(el('span', 'n', n));
    b.addEventListener('click', function () {
      var i = state.levels.indexOf(lv);
      if (i > -1) { if (state.levels.length > 1) state.levels.splice(i, 1); }
      else state.levels.push(lv);
      state.levels.sort(function (a, c) { return LEVELS.indexOf(a) - LEVELS.indexOf(c); });
      save(KEY.levels, state.levels);
      if (state.topic !== 'all') {
        var rule = window.ET_RULES[state.topic];
        if (rule && state.levels.indexOf(rule.level) === -1) { state.topic = 'all'; save(KEY.topic, 'all'); }
      }
      renderLevelPills(); renderTopics(); renderSidebar(); buildQueue();
    });
    wrap.appendChild(b);
  });
}

function topicsInScope() {
  var seen = {}, out = [];
  window.ET_ITEMS.forEach(function (it) {
    if (state.levels.indexOf(it.l) === -1) return;
    if (!seen[it.t]) { seen[it.t] = 0; out.push(it.t); }
    seen[it.t]++;
  });
  out.counts = seen;
  return out;
}

function renderTopics() {
  var sel = $('topicSelect');
  var list = topicsInScope();
  clear(sel);
  var all = el('option', null, 'All topics (' + pool0(list) + ')');
  all.value = 'all';
  sel.appendChild(all);
  list.forEach(function (t) {
    var rule = window.ET_RULES[t];
    var o = el('option', null, (rule ? rule.title : t) + '  (' + list.counts[t] + ')');
    o.value = t;
    sel.appendChild(o);
  });
  sel.value = state.topic;
  if (sel.value !== state.topic) { state.topic = 'all'; sel.value = 'all'; }
}
function pool0(list) {
  var n = 0;
  list.forEach(function (t) { n += list.counts[t]; });
  return n;
}

function renderSidebar() {
  var nav = $('practiceNav');
  clear(nav);
  LEVELS.forEach(function (lv) {
    var items = window.ET_ITEMS.filter(function (it) { return it.l === lv; });
    if (!items.length) return;
    var group = el('div', 'nav-group');
    var head = el('button', 'nav-chapter' + (state.levels.indexOf(lv) > -1 ? ' active' : ''));
    head.type = 'button';
    head.appendChild(el('span', 'badge ' + lv.toLowerCase(), lv));
    head.appendChild(document.createTextNode(levelName(lv)));
    head.addEventListener('click', function () {
      state.levels = [lv]; state.topic = 'all';
      save(KEY.levels, state.levels); save(KEY.topic, state.topic);
      renderLevelPills(); renderTopics(); renderSidebar(); buildQueue(); closeNav();
    });
    group.appendChild(head);

    var seen = {};
    items.forEach(function (it) { seen[it.t] = (seen[it.t] || 0) + 1; });
    Object.keys(seen).forEach(function (t) {
      var rule = window.ET_RULES[t];
      var active = state.topic === t && state.levels.indexOf(lv) > -1;
      var b = el('button', 'nav-sub' + (active ? ' active' : ''));
      b.type = 'button';
      b.appendChild(document.createTextNode(rule ? rule.title : t));
      b.appendChild(el('span', 'cnt', seen[t]));
      b.addEventListener('click', function () {
        state.levels = [lv]; state.topic = t;
        save(KEY.levels, state.levels); save(KEY.topic, state.topic);
        renderLevelPills(); renderTopics(); renderSidebar(); buildQueue(); closeNav();
      });
      group.appendChild(b);
    });
    nav.appendChild(group);
  });
}

function levelName(lv) {
  return { A1: 'Basics', A2: 'Elementary', B1: 'Intermediate', B2: 'Upper-int.', C1: 'Advanced' }[lv] || lv;
}

function renderStats() {
  var s = state.session;
  $('statAnswered').textContent = s.answered;
  $('statAccuracy').textContent = s.answered ? Math.round(s.correct / s.answered * 100) + '%' : '—';
  $('statStreak').textContent = s.streak;
  $('statLeft').textContent = state.queue.length + (state.current ? 1 : 0);
  $('streakStat').classList.toggle('hot', s.streak >= 3);
  var total = s.answered + state.queue.length + (state.current ? 1 : 0);
  $('progressBar').style.width = total ? (s.answered / total * 100) + '%' : '0%';
  $('poolCount').textContent = filteredPool().length + ' sentences in this selection';
}

/* --------------------------------------------------------- the exercise -- */
function next() {
  state.checked = false;
  state.lastResult = null;
  state.current = state.queue.shift() || null;
  $('feedback').classList.remove('show');
  $('promptHint').classList.remove('show');
  var input = $('answerInput');
  input.value = '';
  input.disabled = false;
  $('btnCheck').disabled = true;
  $('btnCheck').hidden = false;
  $('btnNext').hidden = true;
  $('btnHint').hidden = false;
  $('btnReveal').hidden = false;

  if (!state.current) {
    $('cardWrap').hidden = true;
    $('doneWrap').hidden = false;
    var msg = state.session.answered
      ? 'You worked through ' + state.session.answered + ' sentences with ' +
        Math.round(state.session.correct / state.session.answered * 100) + '% correct. Pick another level or topic to keep going.'
      : 'No sentences match this selection. Try another level, topic or mode.';
    $('doneText').textContent = msg;
    renderStats();
    return;
  }
  $('doneWrap').hidden = true;
  $('cardWrap').hidden = false;

  var it = state.current;
  var badge = $('itemBadge');
  badge.className = 'badge ' + it.l.toLowerCase();
  badge.textContent = it.l;
  var rule = window.ET_RULES[it.t];
  $('itemTopic').textContent = rule ? rule.title : it.t;
  var h = state.history[itemKey(it)];
  var why = ['needs review', 'new sentence', 'due again', 'seen recently'][band(it, Date.now())];
  $('itemCount').textContent = h ? (why + ' · seen ' + (h.c + h.w) + '× · ' + h.c + ' right') : why;
  $('promptEn').textContent = it.en;
  $('promptHint').textContent = it.h ? 'Hint: ' + it.h : 'Hint: think about which case the ending needs.';
  $('btnHint').disabled = false;
  renderStats();
  input.focus();
}

function renderDiff(target, ops) {
  clear(target);
  ops.forEach(function (o) {
    if (o.op === 'ok') {
      target.appendChild(el('span', 'tok tok-ok', o.u));
    } else if (o.op === 'sub') {
      target.appendChild(el('span', 'tok tok-sub', o.u));
      target.appendChild(el('span', 'tok tok-fix', o.r));
      target.appendChild(el('span', 'tok-note',
        o.kind === 'diacritic' ? 'diacritic' : (o.kind === 'typo' ? 'spelling' : 'wrong form')));
    } else if (o.op === 'extra') {
      target.appendChild(el('span', 'tok tok-extra', o.u));
      target.appendChild(el('span', 'tok-note', 'extra'));
    } else {
      target.appendChild(el('span', 'tok tok-miss', o.r));
      target.appendChild(el('span', 'tok-note', 'missing'));
    }
  });
}

function renderRule(item) {
  var box = $('ruleBox');
  clear(box);
  var rule = window.ET_RULES[item.t];
  if (!rule) { box.hidden = true; return; }
  box.hidden = false;
  var h = el('h4');
  h.appendChild(star());
  h.appendChild(document.createTextNode(rule.title));
  box.appendChild(h);
  box.appendChild(el('p', null, rule.body));
  if (rule.ex && rule.ex.length) {
    var exWrap = el('div', 'r-ex');
    rule.ex.forEach(function (line) { exWrap.appendChild(el('div', null, line)); });
    box.appendChild(exWrap);
  }
  if (rule.link) {
    var a = el('a', 'r-link', 'Read this section in the guide →');
    a.href = rule.link;
    box.appendChild(a);
  }
}

function verdictText(v) {
  if (v === 'ok') return ['ok', 'Õige! — Correct.'];
  if (v === 'almost') return ['almost', 'Peaaegu — almost there.'];
  return ['bad', 'Mitte päris — not quite.'];
}

function check() {
  if (!state.current || state.checked) return;
  var it = state.current;
  var text = $('answerInput').value;
  var res = grade(text, it);
  state.checked = true;
  state.lastResult = res;
  state.streakBefore = state.session.streak;

  /* score */
  var s = state.session;
  s.answered++;
  if (res.verdict === 'bad') { s.streak = 0; }
  else { s.correct++; s.streak++; if (s.streak > s.best) s.best = s.streak; }

  var k = itemKey(it);
  var h = state.history[k] || { c: 0, w: 0, s: 0, t: 0 };
  if (res.verdict === 'bad') { h.w++; h.s = 0; }     /* s = run of correct answers */
  else { h.c++; h.s = (h.s || 0) + 1; }
  h.t = Date.now();                                  /* drives the spacing interval */
  state.history[k] = h;
  save(KEY.hist, state.history);

  /* requeue anything not fully right, so it comes round again */
  if (res.verdict === 'bad') state.queue.splice(Math.min(4, state.queue.length), 0, it);
  else if (res.verdict === 'almost') state.queue.splice(Math.min(9, state.queue.length), 0, it);

  showFeedback(res, it, text);
  renderStats();
}

function showFeedback(res, it, text) {
  var v = verdictText(res.verdict);
  var box = $('verdict');
  box.className = 'verdict ' + v[0];
  clear(box);
  box.appendChild(star());
  box.appendChild(document.createTextNode(v[1]));
  var note = el('small', null,
    res.verdict === 'ok' ? 'exact match' :
    res.verdict === 'almost' ? 'spelling or diacritics only' : 'see the corrections below');
  box.appendChild(note);

  var diffBlock = $('diffBlock');
  if (res.verdict === 'ok' || !tokens(text).length) {
    diffBlock.hidden = true;
  } else {
    diffBlock.hidden = false;
    renderDiff($('diffLine'), res.ops);
  }

  $('modelAnswer').textContent = res.variant;
  var alts = it.et.filter(function (a) { return a !== res.variant; });
  var altBox = $('answerAlts');
  clear(altBox);
  if (alts.length) {
    altBox.appendChild(el('b', null, 'Also accepted: '));
    altBox.appendChild(document.createTextNode(alts.join('  ·  ')));
  }

  renderRule(it);

  $('feedback').classList.add('show');
  $('answerInput').disabled = true;
  $('btnCheck').hidden = true;
  $('btnHint').hidden = true;
  $('btnReveal').hidden = true;
  $('btnNext').hidden = false;
  $('btnNext').focus();

  var aiBox = $('aiBox');
  aiBox.hidden = true;
  if (ai.enabled && ai.key && res.verdict !== 'ok' && tokens(text).length) {
    askAI(it, text, res);
  }
}

function reveal() {
  if (!state.current || state.checked) return;
  var it = state.current;
  state.checked = true;
  var s = state.session;
  s.answered++; s.streak = 0;
  var k = itemKey(it);
  var h = state.history[k] || { c: 0, w: 0, s: 0, t: 0 };
  h.w++; h.s = 0; h.t = Date.now();
  state.history[k] = h;
  save(KEY.hist, state.history);
  state.queue.splice(Math.min(4, state.queue.length), 0, it);

  var box = $('verdict');
  box.className = 'verdict almost';
  clear(box);
  box.appendChild(star());
  box.appendChild(document.createTextNode('Vaatasid vastust — answer revealed.'));
  $('diffBlock').hidden = true;
  $('modelAnswer').textContent = it.et[0];
  var alts = it.et.slice(1);
  var altBox = $('answerAlts');
  clear(altBox);
  if (alts.length) {
    altBox.appendChild(el('b', null, 'Also accepted: '));
    altBox.appendChild(document.createTextNode(alts.join('  ·  ')));
  }
  renderRule(it);
  $('aiBox').hidden = true;
  $('feedback').classList.add('show');
  $('answerInput').disabled = true;
  $('btnCheck').hidden = true;
  $('btnHint').hidden = true;
  $('btnReveal').hidden = true;
  $('btnNext').hidden = false;
  $('btnNext').focus();
  renderStats();
}

function skip() {
  if (!state.current) return;
  if (state.checked) { next(); return; }
  state.queue.push(state.current);
  next();
}

/* ------------------------------------------------------------------- AI -- */
var PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    model: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    hint: 'Free tier available with a Google account — no card required.',
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    prefer: [/^gemini-2\.5-flash$/, /^gemini-2\.0-flash$/, /flash/, /gemini/]
  },
  groq: {
    label: 'Groq',
    model: 'llama-3.1-8b-instant',
    keyUrl: 'https://console.groq.com/keys',
    hint: 'Free keys reach only part of the catalogue — press Load models to see yours.',
    modelsUrl: 'https://api.groq.com/openai/v1/models',
    prefer: [/gpt-oss-120b/, /llama-3\.3-70b/, /gpt-oss-20b/, /llama-3\.1-8b-instant/, /llama/]
  },
  openrouter: {
    label: 'OpenRouter',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/keys',
    hint: 'Or just press Connect above — no key page needed.',
    modelsUrl: 'https://openrouter.ai/api/v1/models',
    prefer: [/llama-3\.3-70b.*:free$/, /:free$/]
  }
};

/* ------------------------------------------------ one-click OpenRouter -- */
/* OAuth PKCE. The user approves on openrouter.ai and comes back holding a key
   of their own — so nobody has to visit a key page, and this repo never ships
   a shared secret it could not keep secret anyway.                          */

var PKCE_KEY = 'et.practice.pkce';

function b64url(buf) {
  var arr = new Uint8Array(buf), s = '';
  for (var i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function callbackUrl() { return location.origin + location.pathname; }

function canConnect() {
  return !!(window.crypto && crypto.subtle && /^https?:$/.test(location.protocol));
}

function setConnectStatus(msg) {
  var n = $('aiConnectStatus');
  if (n) n.textContent = msg;
}

function startConnect() {
  if (!canConnect()) {
    setConnectStatus('One-click connect needs the page served over http(s) — it cannot run from a local file.');
    return;
  }
  var bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  var verifier = b64url(bytes);
  setConnectStatus('Opening OpenRouter…');
  crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (hash) {
    save(PKCE_KEY, verifier);
    location.href = 'https://openrouter.ai/auth' +
      '?callback_url=' + encodeURIComponent(callbackUrl()) +
      '&code_challenge=' + encodeURIComponent(b64url(hash)) +
      '&code_challenge_method=S256';
  }).catch(function (e) {
    setConnectStatus('Could not start the connection: ' + e.message);
  });
}

/* Runs on load: if OpenRouter sent us back with a code, trade it for a key. */
function finishConnect() {
  var code = new URLSearchParams(location.search).get('code');
  if (!code) return;
  var verifier = load(PKCE_KEY, '');
  history.replaceState(null, '', callbackUrl());      /* keep the code out of the URL bar */
  try { localStorage.removeItem(PKCE_KEY); } catch (e) {}

  var panel = document.querySelector('.ai-panel');
  if (panel) panel.open = true;

  if (!verifier) {
    setConnectStatus('That connection could not be verified — please press Connect again.');
    return;
  }
  setConnectStatus('Finishing the connection…');
  fetch('https://openrouter.ai/api/v1/auth/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code, code_verifier: verifier, code_challenge_method: 'S256' })
  }).then(readResponse).then(function (data) {
    if (!data.key) throw new Error('no key was returned');
    ai.provider = 'openrouter'; ai.key = data.key;
    ai.model = ''; ai.models = []; ai.enabled = true;
    saveAi();
    setConnectStatus('Connected. The AI tutor is on — your key is stored in this browser only.');
    return loadModels().then(applyModelList).catch(function () {});
  }).catch(function (e) {
    setConnectStatus('Could not finish connecting: ' + e.message);
  });
}

function authHeaders() {
  return ai.provider === 'gemini'
    ? { 'x-goog-api-key': ai.key }
    : { 'Authorization': 'Bearer ' + ai.key };
}

/* speech, embedding and guard models cannot answer a grammar question */
function isChatModel(id) {
  return !/whisper|tts|embed|guard|orpheus|moderation|rerank|speech/i.test(id);
}

/* Ask the provider which models THIS key may actually use. Model ranges shift
   over time and free keys see only part of the catalogue, so a hard-coded
   default eventually returns 404 — this is the cure for that. */
function loadModels() {
  var p = PROVIDERS[ai.provider];
  return fetch(p.modelsUrl, { headers: authHeaders() }).then(readResponse).then(function (data) {
    var ids = [];
    if (ai.provider === 'gemini') {
      (data.models || []).forEach(function (m) {
        var methods = m.supportedGenerationMethods || [];
        if (methods.indexOf('generateContent') > -1) {
          ids.push(String(m.name || '').replace(/^models\//, ''));
        }
      });
    } else {
      (data.data || []).forEach(function (m) { if (m.id) ids.push(m.id); });
    }
    ids = ids.filter(isChatModel);
    /* OpenRouter lists hundreds of paid models — keep the free ones, which is
       the whole point here. A different id can still be typed by hand.      */
    if (ai.provider === 'openrouter') {
      var free = ids.filter(function (id) { return /:free$/.test(id); });
      if (free.length) ids = free;
    }
    return ids.sort();
  });
}

function pickModel(ids) {
  var prefer = PROVIDERS[ai.provider].prefer || [];
  for (var i = 0; i < prefer.length; i++) {
    for (var j = 0; j < ids.length; j++) {
      if (prefer[i].test(ids[j])) return ids[j];
    }
  }
  return ids[0];
}

/* Remember the list alongside the key, so the dropdown is still there after a
   reload and nobody has to fetch it twice. Returns true when the model was
   changed because the old one was not on the list.                          */
function applyModelList(ids) {
  ai.models = ids;
  if (!ids.length) {
    saveAi();
    $('aiModelStatus').textContent = 'The provider returned no usable chat models for this key.';
    return false;
  }
  var current = aiModel();
  var changed = ids.indexOf(current) === -1;
  if (changed) ai.model = pickModel(ids);
  saveAi();                                  /* redraws the panel and the datalist */
  if (changed) {
    $('aiModelStatus').textContent = 'This key cannot use ' + current + ' — switched to ' +
      ai.model + ' (' + ids.length + ' available).';
  }
  return changed;
}

function isModelError(err) {
  return /HTTP (400|404)/.test(err.message) && /model/i.test(err.message);
}

/* One automatic retry: if the model id is the problem, re-discover and repeat */
function callAIWithRecovery(prompt) {
  return callAI(prompt).catch(function (err) {
    if (!isModelError(err)) throw err;
    return loadModels().then(function (ids) {
      if (!applyModelList(ids)) throw err;
      return callAI(prompt);
    });
  });
}

function aiModel() { return (ai.model && ai.model.trim()) || PROVIDERS[ai.provider].model; }

function buildPrompt(item, answer) {
  return [
    'You are an Estonian teacher marking one translation exercise. Be strict but fair.',
    '',
    'English sentence: ' + item.en,
    'Reference translations: ' + item.et.join(' | '),
    'Learner wrote: ' + answer,
    '',
    'Answer with exactly three lines, nothing else. No JSON, no braces, no quotation marks, no markdown:',
    'VERDICT: correct or acceptable or incorrect',
    'CORRECTION: the corrected Estonian sentence on one line',
    'EXPLANATION: one or two sentences, written in English',
    '',
    'Use "acceptable" when the learner produced correct, natural Estonian that conveys the English sentence even though it differs from the references.',
    'In EXPLANATION name the grammar point that went wrong — which case, which ending, which word-order rule. If nothing is wrong, say briefly why the learner version also works.',
    'Write the explanation in English even though the sentences are Estonian.'
  ].join('\n');
}

/* Models are unreliable about escaping, and a half-broken JSON blob must never
   reach the page as raw text. So: read the labelled format first, fall back to
   JSON, then to a loose field scrape, and only then treat the whole reply as
   prose. Whatever happens, the user sees sentences, not syntax.            */
function parseAI(text) {
  if (!text) return null;
  var t = String(text).replace(/```[a-z]*/gi, '').trim();
  var out = { verdict: '', correction: '', note: '' };

  var labelled = /VERDICT\s*:\s*(.+)/i.exec(t);
  if (labelled) {
    out.verdict = cleanField(labelled[1]).toLowerCase();
    var c = /CORRECTION\s*:\s*(.+)/i.exec(t);
    var e = /EXPLANATION\s*:\s*([\s\S]+)/i.exec(t);
    if (c) out.correction = cleanField(c[1]);
    if (e) out.note = cleanField(e[1]);
    if (out.correction || out.note) return normalizeVerdict(out);
  }

  try {                                        /* a well-formed JSON reply */
    var j = JSON.parse(t.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    return normalizeVerdict({
      verdict: cleanField(j.verdict || '').toLowerCase(),
      correction: cleanField(j.correction || ''),
      note: cleanField(j.note || j.explanation || '')
    });
  } catch (err) {}

  /* broken JSON — scrape the fields out by hand rather than show the blob */
  var v = /verdict\s*"?\s*[:=]\s*"?\s*([a-zäöõüšž]+)/i.exec(t);
  var cr = /correction\s*"?\s*[:=]\s*"?([^"\n]*?)"?\s*[,}\n]/i.exec(t);
  var nt = /(?:note|explanation)\s*"?\s*[:=]\s*"?([\s\S]*?)"?\s*\}?\s*$/i.exec(t);
  if (v || cr || nt) {
    return normalizeVerdict({
      verdict: v ? v[1].toLowerCase() : '',
      correction: cr ? cleanField(cr[1]) : '',
      note: nt ? cleanField(nt[1]) : ''
    });
  }

  /* no structure at all — if it reads like prose, show it as the note */
  var prose = cleanField(t);
  return prose && !/[{}]/.test(prose) ? normalizeVerdict({ verdict: '', correction: '', note: prose }) : null;
}

/* strip the punctuation scaffolding a model may leave behind */
function cleanField(s) {
  return String(s == null ? '' : s)
    .replace(/\\"/g, '"').replace(/\\n/g, ' ').replace(/\\\\/g, '')
    .replace(/^[\s"'`]+|[\s"'`,]+$/g, '')
    .replace(/^\{+|\}+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeVerdict(o) {
  if (/accept/i.test(o.verdict)) o.verdict = 'acceptable';
  else if (/correct/i.test(o.verdict) && !/in/i.test(o.verdict)) o.verdict = 'correct';
  else if (/incorrect|wrong|vale/i.test(o.verdict)) o.verdict = 'incorrect';
  else o.verdict = '';
  return o;
}

function callAI(prompt) {
  var model = aiModel();
  if (ai.provider === 'gemini') {
    return fetch('https://generativelanguage.googleapis.com/v1beta/models/' +
      encodeURIComponent(model) + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ai.key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    }).then(readResponse).then(function (data) {
      var c = data.candidates && data.candidates[0];
      var parts = c && c.content && c.content.parts;
      return parts ? parts.map(function (p) { return p.text || ''; }).join('') : '';
    });
  }
  var url = ai.provider === 'groq'
    ? 'https://api.groq.com/openai/v1/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
  var body = {
    model: model,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }]
  };
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + ai.key },
    body: JSON.stringify(body)
  }).then(readResponse).then(function (data) {
    return data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content : '';
  });
}

function readResponse(r) {
  return r.text().then(function (raw) {
    var data = null;
    try { data = JSON.parse(raw); } catch (e) {}
    if (!r.ok) {
      var msg = (data && data.error && (data.error.message || data.error.code)) || raw.slice(0, 180);
      throw new Error('HTTP ' + r.status + ' — ' + msg);
    }
    return data || {};
  });
}

function askAI(item, answer, res) {
  var box = $('aiBox');
  box.hidden = false;
  box.className = 'aibox';
  clear(box);
  var h = el('h4');
  h.appendChild(star());
  h.appendChild(document.createTextNode('AI tutor'));
  box.appendChild(h);
  var p = el('p', 'dots', 'Asking ' + PROVIDERS[ai.provider].label);
  box.appendChild(p);

  var token = state.current;
  callAIWithRecovery(buildPrompt(item, answer)).then(function (text) {
    if (state.current !== token) return;          /* moved on already */
    var out = parseAI(text);
    clear(box);
    box.appendChild(h);

    if (!out || (!out.note && !out.correction)) {
      box.appendChild(el('p', null,
        'The model replied in a form this page could not read. Your answer is still marked by the checker above.'));
      return;
    }

    if (out.verdict) {
      var chip = el('span', 'ai-chip ' + out.verdict,
        out.verdict === 'acceptable' ? 'Also correct' :
        out.verdict === 'correct' ? 'Correct' : 'Not correct');
      h.appendChild(chip);
    }
    if (out.correction && normalize(out.correction) !== normalize(answer)) {
      box.appendChild(el('p', 'ai-fix', out.correction));
    }
    if (out.note) box.appendChild(el('p', null, out.note));

    if ((out.verdict === 'correct' || out.verdict === 'acceptable') && res.verdict !== 'ok') {
      upgrade(item, res);
      box.appendChild(el('p', 'ai-upgrade', 'The AI check accepts your version, so it has been counted as correct.'));
    }
  }).catch(function (err) {
    if (state.current !== token) return;
    box.className = 'aibox err';
    clear(box);
    box.appendChild(h);
    box.appendChild(el('p', null, 'AI check failed: ' + err.message));
    box.appendChild(el('p', null, isModelError(err)
      ? 'That model is not available to your key. Open AI settings and press Load models to pick one that is.'
      : 'The exercise itself is unaffected — check the key and model in AI settings, or switch the AI check off.'));
  });
}

/* the local check said wrong, the model says the sentence is fine after all */
function upgrade(item, res) {
  var s = state.session;
  if (res.verdict === 'bad') {
    s.correct++;
    s.streak = state.streakBefore + 1;
    if (s.streak > s.best) s.best = s.streak;
    var k = itemKey(item);
    var h = state.history[k];
    if (h && h.w > 0) { h.w--; h.c++; h.s = 1; save(KEY.hist, state.history); }
  }
  var box = $('verdict');
  box.className = 'verdict ok';
  clear(box);
  box.appendChild(star());
  box.appendChild(document.createTextNode('Õige! — accepted by the AI check.'));
  renderStats();
}

/* ------------------------------------------------------- AI settings UI -- */
function renderAiPanel() {
  if (!PROVIDERS[ai.provider]) ai.provider = 'gemini';   /* guard against stale saved settings */
  $('aiProvider').value = ai.provider;
  $('aiKey').value = ai.key || '';
  $('aiModel').value = ai.model || '';
  $('aiModel').placeholder = PROVIDERS[ai.provider].model;
  $('aiEnabled').checked = !!ai.enabled;

  /* restore the remembered model list into the dropdown */
  var list = $('aiModelList');
  clear(list);
  var models = ai.models || [];
  models.forEach(function (m) {
    var o = document.createElement('option');
    o.value = m;
    list.appendChild(o);
  });
  if (models.length) {
    $('aiModelStatus').textContent = models.length + ' models available to this key · using ' + aiModel();
  }
  $('aiKeyLink').href = PROVIDERS[ai.provider].keyUrl;
  $('aiKeyLink').textContent = 'Get a free ' + PROVIDERS[ai.provider].label + ' key';
  $('aiProviderHint').textContent = PROVIDERS[ai.provider].hint;
  var badge = $('aiState');
  var on = !!(ai.enabled && ai.key);
  badge.textContent = on ? 'on' : 'off';
  badge.classList.toggle('on', on);
}

function saveAi() { save(KEY.ai, ai); renderAiPanel(); }

/* --------------------------------------------------------------- wiring -- */
function closeNav() {
  var sb = $('sidebar');
  if (sb && sb.classList.contains('open')) {
    sb.classList.remove('open');
    document.body.classList.remove('nav-open');
    var b = $('burger');
    if (b) b.setAttribute('aria-expanded', 'false');
  }
}

function insertChar(ch) {
  var input = $('answerInput');
  if (input.disabled) return;
  var s = input.selectionStart, e = input.selectionEnd;
  input.value = input.value.slice(0, s) + ch + input.value.slice(e);
  input.selectionStart = input.selectionEnd = s + ch.length;
  input.focus();
  $('btnCheck').disabled = !input.value.trim();
}

function init() {
  renderLevelPills();
  renderTopics();
  renderSidebar();
  renderAiPanel();

  $('topicSelect').addEventListener('change', function () {
    state.topic = this.value; save(KEY.topic, state.topic);
    renderSidebar(); buildQueue();
  });
  $('modeSelect').value = state.mode;
  $('modeSelect').addEventListener('change', function () {
    state.mode = this.value; save(KEY.mode, state.mode);
    buildQueue();
  });

  var input = $('answerInput');
  input.addEventListener('input', function () {
    $('btnCheck').disabled = !input.value.trim();
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.checked) next(); else if (input.value.trim()) check();
    }
  });

  $('btnCheck').addEventListener('click', check);
  $('btnNext').addEventListener('click', next);
  $('btnSkip').addEventListener('click', skip);
  $('btnReveal').addEventListener('click', reveal);
  $('btnHint').addEventListener('click', function () {
    $('promptHint').classList.add('show');
    this.disabled = true;
    input.focus();
  });
  $('btnRestart').addEventListener('click', buildQueue);

  [].forEach.call(document.querySelectorAll('.charbtn'), function (b) {
    b.addEventListener('click', function () { insertChar(b.dataset.ch); });
  });

  $('aiProvider').addEventListener('change', function () {
    /* the remembered list belongs to the old provider, so drop it */
    ai.provider = this.value; ai.model = ''; ai.models = [];
    $('aiModelStatus').textContent = '';
    $('aiStatus').textContent = '';
    saveAi();
  });
  $('aiKey').addEventListener('change', function () { ai.key = this.value.trim(); saveAi(); });
  $('aiModel').addEventListener('change', function () { ai.model = this.value.trim(); saveAi(); });
  $('aiEnabled').addEventListener('change', function () { ai.enabled = this.checked; saveAi(); });
  $('btnAiForget').addEventListener('click', function () {
    /* the model list was discovered with that key, so it goes too */
    ai.key = ''; ai.enabled = false; ai.model = ''; ai.models = [];
    $('aiModelStatus').textContent = '';
    saveAi();
    $('aiStatus').textContent = 'Key removed from this browser.';
  });
  $('btnConnectOR').addEventListener('click', startConnect);
  if (!canConnect()) {
    $('btnConnectOR').disabled = true;
    setConnectStatus('Available once the page is served over http(s).');
  }
  finishConnect();                       /* handles the redirect back from OpenRouter */

  $('btnAiModels').addEventListener('click', function () {
    var st = $('aiModelStatus');
    if (!ai.key) { st.textContent = 'Add a key first — the list depends on it.'; return; }
    st.textContent = 'Loading…';
    loadModels()
      .then(function (ids) { applyModelList(ids); })
      .catch(function (e) { st.textContent = 'Could not load the model list: ' + e.message; });
  });

  $('btnAiTest').addEventListener('click', function () {
    var st = $('aiStatus');
    if (!ai.key) { st.textContent = 'Add a key first.'; return; }
    st.textContent = 'Testing…';
    callAIWithRecovery('Answer with one line only:\nVERDICT: correct')
      .then(function (t) {
        var p = parseAI(t);
        st.textContent = p
          ? 'Works — ' + PROVIDERS[ai.provider].label + ' answered with ' + aiModel() + '.'
          : 'Connected, but the reply could not be read. Try another model.';
      })
      .catch(function (e) {
        st.textContent = 'Failed: ' + e.message +
          (isModelError(e) ? ' — press Load models to see what this key can use.' : '');
      });
  });

  /* the shared sidebar toggle from the guide page */
  var burger = $('burger'), overlay = $('overlay'), sidebar = $('sidebar');
  function setNav(open) {
    sidebar.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { setNav(!sidebar.classList.contains('open')); });
  overlay.addEventListener('click', function () { setNav(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  buildQueue();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
