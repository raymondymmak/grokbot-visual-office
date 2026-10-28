/* Grokbot Visual Office UI: top bar, side panel (正在做 / 已完成 / 待你确认), toast. Plain DOM, all text escaped. */
(function (PO) {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var t = function (k, v) { return PO.i18n.t(k, v); };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  function fmt(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return ''; var n = new Date(), today = d.toDateString() === n.toDateString();
    return (today ? (PO.i18n.lang === 'zh' ? '今天 ' : 'Today ') : pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ') + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  var UI = PO.ui = { state: { sel: null, tab: null, more: 30 }, fmt: fmt, esc: esc };

  UI.modeOf = function (a, meeting) {
    if (a.isBoss && a.status !== 'offline') return 'boss';
    if (a.status === 'working' && meeting && meeting.ids.indexOf(a.id) >= 0) return 'meeting';
    return a.status;
  };
  UI.renderStatic = function () {
    document.documentElement.lang = PO.i18n.lang === 'zh' ? 'zh-CN' : 'en';
    $('b-team').textContent = '👥 ' + t('team'); $('b-refresh').textContent = '⟳ ' + t('refresh'); $('b-fit').textContent = '⤢ ' + t('fit'); $('b-lang').textContent = t('lang');
    $('hint').textContent = t('hint');
    var L = (PO.app && PO.app.cfg.links) || [], el = $('links');
    if (el) el.innerHTML = L.map(function (l) { return '<a href="' + esc(l.href) + '">' + esc(l.label) + '</a>'; }).join('');
  };
  UI.renderTop = function (d, meeting, src) {
    $('title').textContent = (d.office && d.office.name) || t('title');
    document.title = (d.office && d.office.name) || t('title');
    var c = { working: 0, meeting: 0, waiting: 0, stuck: 0, idle: 0, offline: 0 };
    d.agents.forEach(function (a) { var m = UI.modeOf(a, meeting);
      if (m === 'meeting') c.meeting++; else if (m === 'working' || m === 'boss' && a.currentTask) c.working++; else if (m === 'stuck') c.stuck++; else if (m === 'offline') c.offline++; else if (m !== 'waiting_approval') c.idle++;
      if (a.pending && a.status !== 'offline' || a.status === 'waiting_approval') c.waiting++; });
    var chips = [['working', '⌨'], ['meeting', '👥'], ['waiting', '❗'], ['stuck', '🌀'], ['idle', '☕'], ['offline', '🔋']];
    $('counts').innerHTML = chips.map(function (k) { return '<span class="chip c-' + k[0] + '" title="' + esc(t('c_' + k[0])) + '">' + k[1] + ' <span class="cl">' + esc(t('c_' + k[0])) + '</span> <b>' + c[k[0]] + '</b></span>'; }).join('');
    var label = src.source === 'live' ? t('live') : src.source === 'demo' ? t('demo') : src.source === 'snapshot' ? t('snapshot') : t('sample');
    $('stamp').innerHTML = '<i class="dot ' + esc(src.source) + '"></i>' + esc(label) + (d.office && d.office.updatedAt ? ' · ' + esc(t('updated')) + ' ' + esc(fmt(d.office.updatedAt)) : '');
  };
  function badge(mode) { return '<span class="badge m-' + esc(mode) + '">' + esc(t('st_' + mode)) + '</span>'; }
  function taskItem(a, x, team) {
    var subs = x.subtasks || [], sd = subs.filter(function (s) { return s.status === 'done'; }).length;
    var times = [x.startedAt ? t('started') + ' ' + fmt(x.startedAt) : '', x.updatedAt && x.status !== 'done' ? t('last') + ' ' + fmt(x.updatedAt) : '', x.doneAt ? t('finished') + ' ' + fmt(x.doneAt) : ''].filter(Boolean).join(' · ');
    var prog = x.progress != null ? Math.round(x.progress * 100) : null;
    return '<div class="it">' + (team ? '<span class="agt" style="--c:' + esc(a.color || '#89a') + '">' + esc(a.name) + '</span>' : '') + '<div class="tn">' + esc(x.title) + '</div>' +
      '<div class="meta"><span class="pill s-' + esc(x.status) + '">' + esc(t('ts_' + x.status)) + '</span>' + (x.projectName || x.project ? '<span>📁 ' + esc(x.projectName || x.project) + '</span>' : '') + '<span>' + esc(times) + '</span></div>' +
      (prog != null && x.status !== 'done' ? '<div class="bar" title="' + esc(t('progress')) + ' ' + prog + '%"><i style="width:' + prog + '%"></i></div>' : '') +
      (x.note ? '<div class="nt">' + esc(x.note) + '</div>' : '') +
      (subs.length ? '<details class="subs"><summary>' + esc(t('subtasks')) + ' ' + sd + '/' + subs.length + '</summary>' + subs.map(function (s) { return '<div>' + ({ done: '✅', stuck: '🌀', running: '⏳' }[s.status] || '▫️') + ' ' + esc(s.title) + '</div>'; }).join('') + '</details>' : '') + '</div>';
  }
  UI.open = function (sel) { UI.state.sel = sel; UI.state.tab = null; UI.state.more = 30; UI.renderPanel(); $('panel').classList.toggle('open', !!sel); };
  UI.close = function () { UI.state.sel = null; $('panel').classList.remove('open'); PO.app && PO.app.engine.select(null); };
  UI.renderPanel = function () {
    var sel = UI.state.sel, app = PO.app; if (!sel || !app) return; var d = app.data, meeting = app.meeting, team = sel.type === 'team', agents;
    var head = $('p-head');
    if (sel.type === 'desk') {
      head.innerHTML = '<div class="av">🪑</div><div class="hd"><div class="nm">' + esc(t('emptyDesk', { n: sel.desk })) + '</div></div><button class="x" aria-label="close">✕</button>';
      $('p-tabs').innerHTML = ''; $('p-body').innerHTML = '<div class="emp">' + esc(t('emptyDeskTip')) + '</div>'; bindClose(); return;
    }
    if (team) { agents = d.agents; var run = 0, pc = 0; agents.forEach(function (a) { a.tasks.forEach(function (x) { if (x.status === 'running' || x.status === 'stuck') run++; }); pc += a.pending; });
      head.innerHTML = '<div class="av">🏢</div><div class="hd"><div class="nm">' + esc(t('team')) + ' · ' + esc(t('agents', { n: agents.length })) + '</div><div class="sub">' + esc(t('teamSub', { r: run, c: pc })) + '</div></div><button class="x" aria-label="close">✕</button>'; }
    else { var a = d.agents.find(function (x) { return x.id === sel.id; }); if (!a) { UI.close(); return; } agents = [a];
      var ch = app.engine.chars[a.id], where = ch && ch.home.boss ? t('bossDesk') : ch && ch.home.desk ? t('desk', { n: ch.home.desk.id }) : '';
      head.innerHTML = '<canvas class="av" width="24" height="32" id="p-av"></canvas><div class="hd"><div class="nm">' + esc(a.name) + ' ' + badge(UI.modeOf(a, meeting)) + '</div><div class="sub">' +
        esc([a.role, a.kind === 'human' ? t('human') : t('ai'), where, a.lastActive ? t('lastActive') + ' ' + fmt(a.lastActive) : ''].filter(Boolean).join(' · ')) + '</div></div><button class="x" aria-label="close">✕</button>';
      var av = $('p-av'), cx = av.getContext('2d'); cx.imageSmoothingEnabled = false;
      app.theme.drawCharacter(cx, 12, 30, { kind: a.kind, color: a.color, pose: 'stand', act: a.pending ? 'hand' : '', frame: 0, t: 0, style: ch ? ch.style : 0, hair: ch ? ch.hair : 0, boss: a.isBoss });
    }
    var now = [], done = [], conf = [], ans = [], cls = [], R = app.replies;
    agents.forEach(function (a) { a.tasks.forEach(function (x) {
      if (x.status === 'running' || x.status === 'stuck' || x.status === 'queued') now.push([a, x]); else if (x.status === 'done') done.push([a, x]);
      (x.confirms || []).forEach(function (c) { if (c.closed) cls.push([a, x, c]); else if (c.status === 'pending') conf.push([a, x, c]); else if ((c.status === 'answered' || c.status === 'approved' || c.status === 'declined') && c.baseStatus === 'pending') ans.push([a, x, c]); }); }); });
    var ord = { stuck: 0, running: 1, queued: 2 }, ts = function (v) { return v ? Date.parse(v) : 0; };
    now.sort(function (p, q) { return ord[p[1].status] - ord[q[1].status] || ts(q[1].updatedAt) - ts(p[1].updatedAt); });
    done.sort(function (p, q) { return ts(q[1].doneAt || q[1].updatedAt) - ts(p[1].doneAt || p[1].updatedAt); });
    var tab = UI.state.tab || (conf.length && !team ? 'conf' : 'now'); UI.state.tab = tab;
    $('p-tabs').innerHTML = [['now', t('now'), now.length], ['done', t('done'), done.length], ['conf', t('confirm'), conf.length]].map(function (k) {
      return '<button data-tab="' + k[0] + '" class="' + (tab === k[0] ? 'on' : '') + '">' + esc(k[1]) + '<i class="' + (k[0] === 'conf' && k[2] ? 'red' : '') + '">' + k[2] + '</i></button>'; }).join('');
    var h = '';
    if (tab === 'now') h = now.length ? now.map(function (p) { return taskItem(p[0], p[1], team); }).join('') : '<div class="emp">' + esc(t('nothingNow')) + '</div>';
    else if (tab === 'done') h = done.length ? done.slice(0, UI.state.more).map(function (p) { return taskItem(p[0], p[1], team); }).join('') + (done.length > UI.state.more ? '<button class="more">' + esc(t('more', { n: Math.min(30, done.length - UI.state.more) })) + '</button>' : '') : '<div class="emp">' + esc(t('nothingDone')) + '</div>';
    else {
      var qItem = function (p, i, list, pre) { var same = i > 0 && list[i - 1][1] === p[1], c = p[2], r = c.reply;
        return (same ? '' : (i ? '</div>' : '') + '<div class="it q">' + (team ? '<span class="agt" style="--c:' + esc(p[0].color || '#89a') + '">' + esc(p[0].name) + '</span>' : '') + '<div class="tn">' + esc(p[1].title) + '</div>') +
          '<div class="qq">❓ ' + esc(c.question) + (r ? ' <span class="rflag r-' + esc(r.state) + '">' + esc(r.label || t('rs_' + r.state)) + '</span>' : '') +
          (c.status === 'pending' && c.kind === 'approval' ? '<div class="dec"><button type="button" data-decide="approve" data-cid="' + esc(c.id) + '" data-ag="' + esc(p[0].id) + '" data-tid="' + esc(p[1].id) + '">' + esc(t('approve')) + '</button><button type="button" class="no" data-decide="decline" data-cid="' + esc(c.id) + '" data-ag="' + esc(p[0].id) + '" data-tid="' + esc(p[1].id) + '">' + esc(t('decline')) + '</button>' + (app.src && app.src.source === 'demo' ? '<span class="dec-note">' + esc(t('decisionDemo')) + '</span>' : '') + '</div>' : (c.status === 'pending' && R && R.box ? R.box(p[0], p[1], c) : c.status === 'pending' && app.cfg.onConfirm ? '<br><button class="ans" data-k="' + pre + i + '">' + esc(t('answer')) + '</button>' : '')) + '</div>'; };
      h = conf.length ? conf.map(function (p, i) { return qItem(p, i, conf, 'p'); }).join('') + '</div>' : '<div class="emp">' + esc(t('nothingConfirm')) + '</div>';
      if (cls.length) h += '<details class="answered closedq"' + (UI.state.clsOpen ? ' open' : '') + '><summary>' + esc(t('closedN', { n: cls.length })) + '</summary>' + cls.map(function (p, i) { return qItem(p, i, cls, 'c'); }).join('') + '</div></details>';
      if (ans.length) h += '<details class="answered"' + (UI.state.ansOpen ? ' open' : '') + '><summary>✓ ' + esc(t('answeredN', { n: ans.length })) + '</summary>' + ans.map(function (p, i) { return qItem(p, i, ans, 'a'); }).join('') + '</div></details>';
      if (app.decisions && app.decisions.has() && app.src && app.src.source === 'demo') h += '<button type="button" class="reset-demo">' + esc(t('resetDemo')) + '</button>';
    }
    var body = $('p-body'), keep = UI.state.lastKey === sel.type + sel.id + tab ? body.scrollTop : 0; UI.state.lastKey = sel.type + sel.id + tab;
    body.innerHTML = h; body.scrollTop = keep;
    body.querySelectorAll('details.answered').forEach(function (det) { det.ontoggle = function () { UI.state[det.classList.contains('closedq') ? 'clsOpen' : 'ansOpen'] = det.open; }; });
    $('p-tabs').querySelectorAll('button').forEach(function (b) { b.onclick = function () { UI.state.tab = b.dataset.tab; UI.renderPanel(); }; });
    var more = $('p-body').querySelector('.more'); if (more) more.onclick = function () { UI.state.more += 30; UI.renderPanel(); };
    $('p-body').querySelectorAll('.ans').forEach(function (b) { b.onclick = function () { var k = b.dataset.k, p = ({ p: conf, a: ans, c: cls })[k[0]][+k.slice(1)]; app.cfg.onConfirm(p[0], p[1], p[2]); }; });
    $('p-body').querySelectorAll('[data-decide]').forEach(function (b) {
      b.onclick = function () {
        if (!PO.fleet) return;
        b.disabled = true;
        PO.fleet.submit(app, { confirmId: b.getAttribute('data-cid'), decision: b.getAttribute('data-decide'), agentId: b.getAttribute('data-ag'), taskId: b.getAttribute('data-tid') }).then(function () {
          app.reapply();
          PO.ui.toast(t(b.getAttribute('data-decide') === 'decline' ? 'declined' : 'approved'));
        }, function () { b.disabled = false; PO.ui.toast(t('decideFail')); });
      };
    });
    var reset = $('p-body').querySelector('.reset-demo');
    if (reset) reset.onclick = function () { app.decisions.reset(); app.reapply(); PO.ui.toast(t('resetDone')); };
    bindClose();
  };
  function bindClose() { var x = $('p-head').querySelector('.x'); if (x) x.onclick = UI.close; }
  var tt = 0; UI.toast = function (m) { var e = $('toast'); e.textContent = m; e.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { e.classList.remove('on'); }, 4200); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') UI.close(); });
})(window.VisualOffice = window.VisualOffice || {});
