/* Grokbot Visual Office boot: config -> layout -> data -> engine. Config sources (later wins):
 *   window.VISUAL_OFFICE_CONFIG = { data, adapter, refreshSec, lang, title, layout, theme, links:[{href,label}],
 *                                   replies (reply provider, see src/replies.js), onConfirm(agent, task, confirm) }
 *   URL query: ?data=URL&adapter=workbench|auto|none&lang=zh|en&refresh=60&demo=1
 *     &provider=mock|live&decide=URL
 *   With no ?data= and no ?demo=1, the page loads data/project-hq.json (Demo).
 *   ?demo=1 forces the fictional sample tour (src/demo.js) and skips the Project HQ snapshot. */
(function (PO) {
  var q = new URLSearchParams(location.search), base = window.VISUAL_OFFICE_CONFIG || {};
  var cfg = Object.assign({ refreshSec: 60, adapter: 'auto', theme: 'default', layout: 'layouts/default.json' }, base);
  if (q.get('data')) cfg.data = q.get('data');
  if (q.get('adapter')) cfg.adapter = q.get('adapter') === 'none' ? null : q.get('adapter');
  if (q.get('provider')) cfg.provider = q.get('provider');
  if (q.get('decide')) cfg.decide = q.get('decide');
  if (q.get('demo') && PO.demo) { cfg.demo = true; cfg.data = null; cfg.forceSample = true; cfg.refreshSec = 3600; cfg.replies = { type: 'memory' }; }
  else if (!cfg.data && location.protocol !== 'file:') cfg.data = 'data/project-hq.json';
  if (!cfg.provider) cfg.provider = 'mock';
  if (q.get('refresh')) cfg.refreshSec = Math.max(10, +q.get('refresh') || 60);
  var saved = null; try { saved = localStorage.getItem('gvo.lang'); } catch (e) {}
  PO.i18n.set(q.get('lang') || saved || cfg.lang || 'zh');

  async function boot() {
    var layout = PO.data.readInline('po-layout');
    if (!layout) layout = await PO.data.getJSON(cfg.layout);
    var theme = PO.themes[cfg.theme] || PO.themes['default'];
    Object.keys(theme.css || {}).forEach(function (k) { document.documentElement.style.setProperty(k, theme.css[k]); });
    var R = cfg.replies && (cfg.replies.type === 'http' || cfg.replies.type === 'memory') ? PO.replies[cfg.replies.type](cfg.replies) : cfg.replies || null;
    var app = PO.app = { cfg: cfg, theme: theme, data: null, src: null, meeting: null, replies: R,
      decisions: PO.fleet ? PO.fleet.browserStore(cfg.provider) : { all: function () { return {}; }, has: function () { return false; }, decide: function () {}, reset: function () {} } };
    var busy = function () { try { return !!(R && R.busy && R.busy()); } catch (e) { return false; } };
    function decorate(data) {
      PO.data.applyReplies(data, R);
      if (PO.fleet) PO.fleet.applyDecisions(data, app.decisions.all());
      return data;
    }
    /* answers changed (sent / synced): recount, re-pose the characters, redraw the panel unless the user is typing */
    function reapply() {
      if (!app.data) return; decorate(app.data);
      app.meeting = PO.data.meeting(app.data, Date.now()); app.engine.setData(app.data, app.meeting); PO.ui.renderTop(app.data, app.meeting, app.src);
      if (PO.ui.state.sel && !busy()) PO.ui.renderPanel(); else app.dirty = true;
    }
    app.reapply = reapply;
    if (R && R.onChange) R.onChange(reapply);
    document.addEventListener('focusout', function () { setTimeout(function () { if (app.dirty && !busy()) { app.dirty = false; if (PO.ui.state.sel) PO.ui.renderPanel(); } }, 300); });
    app.engine = new PO.Engine(document.getElementById('stage'), layout, theme, {
      onSelect: function (h) { if (h) PO.ui.open(h); else PO.ui.close(); }
    });
    PO.ui.renderStatic();
    async function refresh(manual) {
      var r = await PO.data.load(cfg, app.src && app.src.source !== 'sample' ? app.src : null);
      if (R && R.sync) { try { await R.sync(); } catch (e) {} }
      app.src = r; app.data = decorate(r.data); var now = Date.now();
      app.meeting = PO.data.meeting(r.data, now);
      app.engine.setData(r.data, app.meeting);
      PO.ui.renderTop(r.data, app.meeting, r);
      if (PO.ui.state.sel && !busy()) PO.ui.renderPanel(); else if (PO.ui.state.sel) app.dirty = true;
      var fw = PO.data.fireworks(r.data, now); if (cfg.demo) fw = [];   // the demo fires its own, on cue
      fw.slice(0, 4).forEach(function (f, i) {
        setTimeout(function () { app.engine.celebrate(f.agent.id); PO.ui.toast(PO.i18n.t('firework', { a: f.agent.name, t: f.task.title || '' })); }, 900 + i * 1800);
      });
      if (r.error && manual) PO.ui.toast(PO.i18n.t('loadFail', { s: PO.i18n.t(r.source === 'sample' ? 'sample' : r.source === 'snapshot' ? 'snapshot' : r.source === 'demo' ? 'demo' : 'live') }));
    }
    app.refresh = refresh;
    await refresh();
    setInterval(refresh, cfg.refreshSec * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });
    var B = function (id, f) { document.getElementById(id).onclick = f; };
    B('b-team', function () { PO.ui.open({ type: 'team' }); app.engine.select(null); });
    B('b-refresh', function () { refresh(true); });
    B('b-fit', function () { app.engine.fit(); });
    B('b-in', function () { var c = app.engine.cv; app.engine.zoomAt(1, c.width / 2, c.height / 2); });
    B('b-out', function () { var c = app.engine.cv; app.engine.zoomAt(-1, c.width / 2, c.height / 2); });
    B('b-lang', function () { PO.i18n.set(PO.i18n.lang === 'zh' ? 'en' : 'zh'); PO.ui.renderStatic(); PO.ui.renderTop(app.data, app.meeting, app.src); PO.ui.renderPanel(); });
    setTimeout(function () { document.getElementById('hint').classList.add('off'); }, 7000);
    window.__visualOfficeReady = true;
    if (cfg.demo) PO.demo.run(app, { loop: q.get('demo') === 'loop' });
  }
  boot().catch(function (e) { console.error(e); document.getElementById('hint').textContent = 'Error: ' + e.message; });
})(window.VisualOffice = window.VisualOffice || {});
