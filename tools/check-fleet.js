/* Node check for the Project HQ mock roster and approve/decline state changes. */
var fs = require('fs');
var path = require('path');
var fleet = require('../src/fleet.js');
var file = path.join(__dirname, '..', 'data', 'project-hq.json');
var raw = JSON.parse(fs.readFileSync(file, 'utf8'));
var ids = raw.agents.map(function (a) { return a.id; });
var expect = ['tech-brief', 'academic-tutors', 'project-bots', 'secretary', 'profile', 'schedule-reminders'];
function fail(m) { console.error(m); process.exit(1); }
if (raw.office.provider !== 'mock' || raw.office.name !== 'Project HQ') fail('office is not the Project HQ mock');
if (ids.join() !== expect.join()) fail('roster ids: ' + ids.join());
var by = {};
raw.agents.forEach(function (a) { by[a.id] = a; });
['tech-brief', 'academic-tutors', 'project-bots'].forEach(function (id) {
  if (by[id].status !== 'working') fail(id + ' should be working');
});
['profile', 'schedule-reminders'].forEach(function (id) {
  if (by[id].status !== 'sleeping') fail(id + ' should be sleeping');
});
if (by.secretary.status !== 'waiting_approval') fail('secretary should be waiting_approval');
var confirm = by.secretary.tasks[0].confirms[0];
if (!confirm || confirm.kind !== 'approval' || confirm.status !== 'pending') fail('secretary approval confirm missing');
if (by['project-bots'].role !== 'Cursor coding agents') fail('project bots should be Cursor coding agents');
var src = fs.readFileSync(path.join(__dirname, '..', 'src', 'fleet.js'), 'utf8');
if (/api\.x\.ai|grok\.com\/api|\/v1\/bots/.test(src)) fail('fleet.js should not call an invented Grok Bot API');

function desk() {
  var data = JSON.parse(JSON.stringify(raw));
  data.agents.forEach(function (a) {
    fleet.prepareAgent(a);
    a.baseStatus = a.status;
    (a.tasks || []).forEach(function (t) {
      (t.confirms || []).forEach(function (c) { c.baseStatus = c.status || 'pending'; c.closed = false; });
    });
  });
  return data;
}
var approved = desk();
fleet.applyDecisions(approved, { 'secretary-hold-1': { decision: 'approve' } });
var sec = approved.agents.find(function (a) { return a.id === 'secretary'; });
if (sec.status !== 'working') fail('approve should set working, got ' + sec.status);
if (sec.pending !== 0) fail('approve should clear pending');
if (sec.currentTask) fail('approve should clear the floor label');
if (sec.tasks[0].status !== 'archived') fail('approve should archive the hold task');
if (sec.tasks[0].confirms[0].status !== 'approved') fail('confirm should be approved');
var declined = desk();
fleet.applyDecisions(declined, { 'secretary-hold-1': { decision: 'decline' } });
sec = declined.agents.find(function (a) { return a.id === 'secretary'; });
if (sec.status !== 'offline') fail('decline should sleep (offline), got ' + sec.status);
if (sec.tasks[0].confirms[0].status !== 'declined') fail('confirm should be declined');
var cleared = desk();
fleet.applyDecisions(cleared, { 'secretary-hold-1': { decision: 'approve' } });
fleet.applyDecisions(cleared, {});
sec = cleared.agents.find(function (a) { return a.id === 'secretary'; });
if (sec.status !== 'waiting_approval' || sec.tasks[0].confirms[0].status !== 'pending') fail('clearing decisions should restore the hold');
if (sec.tasks[0].status !== 'running') fail('clearing decisions should restore the task');
if (sec.currentTask !== 'Needs approval') fail('clearing decisions should restore the floor label');
if (fleet.sourceFor(raw, 'live') !== 'demo') fail('mock provider should label demo');
if (fleet.sourceFor({ office: { provider: 'live' } }, 'snapshot') !== 'live') fail('live provider should label live');
if (fleet.sourceFor({ office: {} }, 'sample') !== 'sample') fail('missing provider should keep the fallback label');
var store = fleet.memoryStore();
store.decide('secretary-hold-1', 'decline');
if (!store.has() || store.all()['secretary-hold-1'].decision !== 'decline') fail('store decide');
store.reset();
if (store.has()) fail('store reset');
console.log('fleet ok');
