/* Data loading + normalisation + generic office rules (meeting / firework). */
(function (PO) {
  var RULES = { meetingHours: 3, fireworkMinutes: 30 };
  PO.RULES = RULES;
  var STATUSES = ['working', 'idle', 'stuck', 'waiting_approval', 'offline', 'done'];
  /* A question on a finished task (done / cancelled / archived) is still listed, but never counts as "waiting for you". */
  var CLOSED = { done: 1, cancelled: 1, archived: 1 };
  function isClosed(t) { return !!(CLOSED[t.status] || t.archived); }

  function readInline(id) { var e = document.getElementById(id); if (!e) return null; try { return JSON.parse(e.textContent); } catch (x) { return null; } }
  async function getJSON(url) {
    var ac = new AbortController(), tm = setTimeout(function () { ac.abort(); }, 10000);
    try {
      var u = url + (url.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now();
      var r = await fetch(u, { cache: 'no-store', credentials: 'same-origin', signal: ac.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(tm); }
  }
  /* Demo data (office.demo=true) is time-shifted so that office.updatedAt == now; the sample always looks "live". */
  function shiftDemo(d) {
    if (!d.office || !d.office.demo || !d.office.updatedAt) return d;
    var delta = Date.now() - Date.parse(d.office.updatedAt);
    var sh = function (v) { return v ? new Date(Date.parse(v) + delta).toISOString() : v; };
    d.office.updatedAt = sh(d.office.updatedAt);
    d.agents.forEach(function (a) { a.lastActive = sh(a.lastActive); (a.tasks || []).forEach(function (t) { t.startedAt = sh(t.startedAt); t.updatedAt = sh(t.updatedAt); t.doneAt = sh(t.doneAt); }); });
    return d;
  }
  function sourceFor(data, fallback) {
    return PO.fleet && PO.fleet.sourceFor ? PO.fleet.sourceFor(data, fallback) : fallback;
  }
  function normalise(d) {
    d = d || {}; d.office = d.office || { name: 'AI Office' }; d.agents = (d.agents || []).filter(function (a) { return a && a.id != null; });
    d.agents.forEach(function (a, i) {
      a.id = String(a.id); a.name = a.name || a.id; a.kind = a.kind === 'human' ? 'human' : 'ai';
      if (PO.fleet && PO.fleet.prepareAgent) PO.fleet.prepareAgent(a);
      else if (a.status === 'sleeping') a.status = 'offline';
      if (STATUSES.indexOf(a.status) < 0) a.status = 'idle';
      a.baseStatus = a.baseStatus || a.status;
      a.tasks = (a.tasks || []).map(function (t, j) {
        t.id = t.id != null ? String(t.id) : a.id + '-' + j; t.title = t.title || '';
        t.subtasks = t.subtasks || []; t.confirms = (t.confirms || []).map(function (c, k) { c = typeof c === 'string' ? { id: t.id + '-c' + k, question: c, status: 'pending' } : c;
          if (c.id == null) c.id = t.id + '-c' + k; c.baseStatus = c.baseStatus || c.status || 'pending'; c.closed = isClosed(t); return c; });
        return t;
      });
      a.pending = 0; a.tasks.forEach(function (t) { t.confirms.forEach(function (c) { if ((c.status || 'pending') === 'pending' && !c.closed) a.pending++; }); });
      if (a.status === 'waiting_approval' && !a.pending) a.status = a.baseStatus = 'idle';
    });
    return d;
  }
  /* Meeting: >= 2 non-boss agents that are "working" on the same project, active within meetingHours. Biggest group wins. */
  function meeting(d, now) {
    var by = {};
    d.agents.forEach(function (a) {
      if (a.isBoss || a.status !== 'working' || !a.project) return;
      if (a.lastActive && now - Date.parse(a.lastActive) > RULES.meetingHours * 36e5) return;
      (by[a.project] = by[a.project] || []).push(a.id);
    });
    var best = null; Object.keys(by).forEach(function (p) { if (by[p].length >= 2 && (!best || by[p].length > best.ids.length)) best = { project: p, ids: by[p] }; });
    if (best) { var pr = (d.projects || []).find(function (p) { return p.id === best.project; }); best.name = pr ? pr.name : best.project; }
    return best;
  }
  /* Fireworks: done tasks with doneAt within fireworkMinutes, or that flipped to done since the last refresh, or agents with status=done. Once per task (localStorage). */
  var SEEN_KEY = 'gvo.fw', seen = {}, prev = null;
  try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (e) {}
  function fireworks(d, now) {
    var out = [];
    d.agents.forEach(function (a) {
      var doneTasks = a.tasks.filter(function (t) { return t.status === 'done'; });
      doneTasks.forEach(function (t) {
        var k = a.id + '|' + t.id; if (seen[k]) return;
        var e = t.doneAt ? Date.parse(t.doneAt) : 0;
        var fresh = e && now - e <= RULES.fireworkMinutes * 6e4 && now - e >= -6e4;
        var flipped = prev && prev[k] && prev[k] !== 'done';
        if (fresh || flipped) { seen[k] = now; out.push({ agent: a, task: t }); }
      });
      if (a.status === 'done' && !out.some(function (o) { return o.agent === a; })) {
        var k2 = a.id + '|status-done|' + (a.lastActive || ''); if (!seen[k2]) { seen[k2] = now; out.push({ agent: a, task: doneTasks[0] || { title: '' } }); }
      }
    });
    Object.keys(seen).forEach(function (k) { if (now - seen[k] > 7 * 864e5) delete seen[k]; });
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) {}
    prev = {}; d.agents.forEach(function (a) { a.tasks.forEach(function (t) { prev[a.id + '|' + t.id] = t.status; }); });
    return out;
  }

  /* Reply provider (cfg.replies, see docs/SCHEMA.md "Answering confirms"): R.status(agent, task, confirm) -> null | {state, label}.
     state answered|seen|handled = the question has an answer, so it leaves 待你确认 and stops counting; sending|failed only adds a flag.
     Idempotent: always recomputed from baseStatus, so it can run after every data load and every reply change. */
  var ANSWERED = { answered: 1, seen: 1, handled: 1 };
  function applyReplies(d, R) {
    d.agents.forEach(function (a) {
      a.pending = 0;
      a.tasks.forEach(function (t) { t.confirms.forEach(function (c) {
        var r = null; if (R && R.status && c.baseStatus === 'pending') { try { r = R.status(a, t, c); } catch (e) { r = null; } }
        c.reply = r || null; c.status = r && ANSWERED[r.state] ? 'answered' : c.baseStatus;
        if (c.status === 'pending' && !c.closed) a.pending++;
      }); });
      // an agent that was only "waiting for you" goes back to idle once everything is answered
      a.status = a.baseStatus === 'waiting_approval' && !a.pending ? 'idle' : a.baseStatus;
    });
    return d;
  }
  PO.data = {
    normalise: normalise, applyReplies: applyReplies, isClosed: isClosed, meeting: meeting, fireworks: fireworks, readInline: readInline, getJSON: getJSON,
    /* Returns {data, source:'live'|'demo'|'snapshot'|'sample', error}.
       office.provider "mock" is Demo even when the file was fetched. "live" is Live.
       cfg.forceSample skips both the URL and any embedded snapshot (the ?demo=1 tour). */
    load: async function (cfg, last) {
      var url = cfg.forceSample ? null : cfg.data, err = null;
      if (url) {
        try {
          var raw = await getJSON(url);
          var liveData = PO.data.adapt(raw, cfg);
          return { data: liveData, source: sourceFor(liveData, 'live') };
        } catch (e) { err = e; }
        if (last) return { data: last.data, source: last.source, error: err };
      }
      if (!cfg.forceSample) {
        var snap = readInline('po-data');
        if (snap) { var snapData = PO.data.adapt(snap, cfg); return { data: snapData, source: sourceFor(snapData, 'snapshot'), error: err }; }
      }
      var sample = readInline('po-sample');
      if (!sample) { try { sample = await getJSON(cfg.sample || 'sample-data.json'); } catch (e) { sample = { office: { name: 'AI Office' }, agents: [] }; } }
      return { data: normalise(shiftDemo(JSON.parse(JSON.stringify(sample)))), source: 'sample', error: err };
    },
    adapt: function (raw, cfg) {
      var name = cfg.adapter, A = PO.adapters || {};
      if (!name || name === 'auto') { name = null; for (var k in A) if (A[k].detect && A[k].detect(raw)) { name = k; break; } }
      var d = name && A[name] ? A[name](raw, { name: cfg.title }) : raw;
      return normalise(shiftDemo(d));
    }
  };
})(window.VisualOffice = window.VisualOffice || {});
