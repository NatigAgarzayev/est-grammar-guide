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

var ai = load(KEY.ai, { provider: 'gemini', key: '', model: '', enabled: false });

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

function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function buildQueue() {
  state.queue = shuffle(filteredPool().slice());
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
  $('itemCount').textContent = h ? ('seen ' + (h.c + h.w) + '× · ' + h.c + ' right') : 'new sentence';
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
  var h = state.history[k] || { c: 0, w: 0 };
  if (res.verdict === 'bad') h.w++; else h.c++;
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
  var h = state.history[k] || { c: 0, w: 0 };
  h.w++;
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
    hint: 'Free tier available with a Google account — no card required.'
  },
  groq: {
    label: 'Groq',
    model: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    hint: 'Free tier with generous rate limits.'
  },
  openrouter: {
    label: 'OpenRouter',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/keys',
    hint: 'Use a model whose name ends in :free.'
  }
};

function aiModel() { return (ai.model && ai.model.trim()) || PROVIDERS[ai.provider].model; }

function buildPrompt(item, answer) {
  return [
    'You are an Estonian teacher marking one translation exercise. Be strict but fair.',
    '',
    'English sentence: ' + item.en,
    'Reference translations: ' + item.et.join(' | '),
    'Learner wrote: ' + answer,
    '',
    'Reply with JSON only, no markdown fence, in this shape:',
    '{"verdict":"correct|acceptable|incorrect","correction":"the corrected Estonian sentence","note":"at most two sentences of English explanation"}',
    '',
    'verdict "acceptable" means the learner produced correct, natural Estonian that conveys the English sentence even though it differs from the references.',
    'In "note", name the actual grammar point that went wrong (which case, which ending, which word order rule). If nothing is wrong, say briefly why the learner version also works.'
  ].join('\n');
}

function parseJson(text) {
  if (!text) return null;
  var t = String(text).replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  var m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (e2) {} }
  return null;
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
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
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
  if (ai.provider === 'groq') body.response_format = { type: 'json_object' };
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
  callAI(buildPrompt(item, answer)).then(function (text) {
    if (state.current !== token) return;          /* moved on already */
    var out = parseJson(text);
    clear(box);
    box.appendChild(h);
    if (!out) {
      box.appendChild(el('p', null, text ? String(text).slice(0, 400) : 'No answer came back.'));
      return;
    }
    if (out.correction && normalize(out.correction) !== normalize(answer)) {
      var c = el('p');
      c.appendChild(el('b', null, 'Suggested: '));
      c.appendChild(document.createTextNode(out.correction));
      box.appendChild(c);
    }
    if (out.note) box.appendChild(el('p', null, out.note));
    if ((out.verdict === 'correct' || out.verdict === 'acceptable') && res.verdict !== 'ok') {
      upgrade(item, res);
      box.appendChild(el('p', null, 'The AI check accepts your version, so it has been counted as correct.'));
    }
  }).catch(function (err) {
    if (state.current !== token) return;
    box.className = 'aibox err';
    clear(box);
    box.appendChild(h);
    box.appendChild(el('p', null, 'AI check failed: ' + err.message));
    box.appendChild(el('p', null, 'The exercise itself is unaffected — check the key and model in AI settings, or switch the AI check off.'));
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
    if (h && h.w > 0) { h.w--; h.c++; save(KEY.hist, state.history); }
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
  $('aiProvider').value = ai.provider;
  $('aiKey').value = ai.key || '';
  $('aiModel').value = ai.model || '';
  $('aiModel').placeholder = PROVIDERS[ai.provider].model;
  $('aiEnabled').checked = !!ai.enabled;
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
    ai.provider = this.value; ai.model = ''; saveAi();
  });
  $('aiKey').addEventListener('change', function () { ai.key = this.value.trim(); saveAi(); });
  $('aiModel').addEventListener('change', function () { ai.model = this.value.trim(); saveAi(); });
  $('aiEnabled').addEventListener('change', function () { ai.enabled = this.checked; saveAi(); });
  $('btnAiForget').addEventListener('click', function () {
    ai.key = ''; ai.enabled = false; saveAi();
    $('aiStatus').textContent = 'Key removed from this browser.';
  });
  $('btnAiTest').addEventListener('click', function () {
    var st = $('aiStatus');
    if (!ai.key) { st.textContent = 'Add a key first.'; return; }
    st.textContent = 'Testing…';
    callAI('Reply with JSON only: {"verdict":"correct","correction":"Ma olen kodus.","note":"test"}')
      .then(function (t) {
        st.textContent = parseJson(t) ? 'Works — ' + PROVIDERS[ai.provider].label + ' answered.' :
          'Connected, but the answer was not valid JSON. Try another model.';
      })
      .catch(function (e) { st.textContent = 'Failed: ' + e.message; });
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
