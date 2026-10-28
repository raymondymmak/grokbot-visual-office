/* Project HQ fleet provider. No Grok Bot control API is called from here.
 * Mock decisions stay in this page. A later live provider is the same office JSON
 * (office.provider "live") plus POST {confirmId, decision, agentId, taskId} to cfg.decide.
 * Works in the browser (VisualOffice.fleet) and in Node (module.exports). */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.VisualOffice = root.VisualOffice || {}; root.VisualOffice.fleet = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  function prepareAgent(a) {
    ['status', 'resumeStatus', 'declineStatus'].forEach(function (k) {
      if (a[k] === 'sleeping') a[k] = 'offline';
    });
    return a;
  }
  function sourceFor(data, fallback) {
    var p = data && data.office && data.office.provider;
    if (p === 'mock') return 'demo';
    if (p === 'live') return 'live';
    return fallback;
  }
  /* Idempotent. `decisions` is { confirmId: { decision: 'approve'|'decline' } }.
     Approve returns a waiting desk to resumeStatus (default working).
     Any decline, once nothing is still pending, uses declineStatus (default sleeping). */
  function applyDecisions(data, decisions) {
    decisions = decisions || {};
    if (!data || !data.agents) return data;
    data.agents.forEach(function (a) {
      var sawApprove = false, sawDecline = false;
      (a.tasks || []).forEach(function (t) {
        (t.confirms || []).forEach(function (c) {
          var d = c && c.id != null ? decisions[c.id] : null;
          var decision = d && (d.decision === 'decline' ? 'decline' : 'approve');
          if (decision && !c.closed && c.baseStatus === 'pending') {
            c.decision = decision;
            c.status = decision === 'decline' ? 'declined' : 'approved';
            c.reply = { state: c.status };
            if (decision === 'decline') sawDecline = true; else sawApprove = true;
          } else if (!(c.reply && (c.reply.state === 'answered' || c.reply.state === 'seen' || c.reply.state === 'handled'))) {
            c.decision = null;
            if (c.reply && (c.reply.state === 'approved' || c.reply.state === 'declined')) c.reply = null;
            if (!c.closed && (c.status === 'approved' || c.status === 'declined')) c.status = c.baseStatus || 'pending';
          }
        });
      });
      a.pending = 0;
      (a.tasks || []).forEach(function (t) {
        (t.confirms || []).forEach(function (c) {
          if ((c.status || 'pending') === 'pending' && !c.closed) a.pending++;
        });
      });
      (a.tasks || []).forEach(function (t) {
        if (t._holdStatus == null) t._holdStatus = t.status;
        var touched = (t.confirms || []).some(function (c) { return c.decision; });
        var stillPending = (t.confirms || []).some(function (c) { return (c.status || 'pending') === 'pending' && !c.closed; });
        t.status = touched && !stillPending ? 'archived' : t._holdStatus;
      });
      if (!a._holdCaptured) { a._holdCaptured = true; a._holdTask = a.currentTask; }
      if (a.baseStatus === 'waiting_approval') {
        if (a.pending) { a.status = 'waiting_approval'; a.currentTask = a._holdTask; }
        else if (sawDecline || sawApprove) {
          var next = sawDecline ? (a.declineStatus || 'sleeping') : (a.resumeStatus || 'working');
          a.status = next === 'sleeping' ? 'offline' : next;
          a.currentTask = null;
        }
      }
    });
    return data;
  }
  function memoryStore(initial) {
    var decisions = {};
    if (initial) Object.keys(initial).forEach(function (k) { decisions[k] = initial[k]; });
    return {
      all: function () { return decisions; },
      has: function () { return Object.keys(decisions).length > 0; },
      decide: function (id, decision) {
        decisions[id] = { decision: decision === 'decline' ? 'decline' : 'approve', at: new Date().toISOString() };
      },
      reset: function () { Object.keys(decisions).forEach(function (k) { delete decisions[k]; }); }
    };
  }
  function browserStore(provider) {
    var KEY = 'phq.decisions.' + (provider || 'mock'), initial = {};
    try { initial = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    var s = memoryStore(initial);
    function save() { try { localStorage.setItem(KEY, JSON.stringify(s.all())); } catch (e) {} }
    return {
      all: function () { return s.all(); },
      has: function () { return s.has(); },
      decide: function (id, decision) { s.decide(id, decision); save(); },
      reset: function () { s.reset(); save(); }
    };
  }
  /* Local overlay when the office JSON says provider is not live.
     Live: POST cfg.decide, then overlay so the desk updates before the next refresh.
     Refuses to invent a URL when cfg.decide is missing. */
  function submit(app, payload) {
    var office = app.data && app.data.office;
    var live = !!(office && office.provider === 'live');
    var decision = payload.decision === 'decline' ? 'decline' : 'approve';
    if (!live) {
      app.decisions.decide(payload.confirmId, decision);
      return Promise.resolve({ sent: false });
    }
    var url = app.cfg && app.cfg.decide;
    if (!url) return Promise.reject(new Error('no-decide-url'));
    return fetch(url, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmId: payload.confirmId, decision: decision, agentId: payload.agentId || null, taskId: payload.taskId || null })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      app.decisions.decide(payload.confirmId, decision);
      return { sent: true };
    });
  }
  return {
    prepareAgent: prepareAgent, sourceFor: sourceFor, applyDecisions: applyDecisions,
    memoryStore: memoryStore, browserStore: browserStore, submit: submit
  };
});
