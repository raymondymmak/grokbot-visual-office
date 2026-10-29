/* i18n: zh (default) and en. Add a language by adding a key to DICT. */
(function (PO) {
  var DICT = {
    zh: {
      title: 'Project HQ', team: '全队', refresh: '刷新', fit: '适配', lang: 'EN',
      live: '实时数据', demo: '演示', sample: '示例数据', snapshot: '内置快照', updated: '数据更新',
      now: '正在做', done: '已完成', confirm: '待你确认', nothingNow: '现在手上没有进行中的任务',
      nothingDone: '还没有完成记录', nothingConfirm: '没有需要你确认的事 👍', more: '再显示 {n} 条',
      st_working: '工作中', st_idle: '摸鱼中', st_stuck: '卡住了', st_waiting_approval: '待你确认',
      st_offline: '睡眠', st_done: '刚完成', st_meeting: '开会中', st_boss: '统筹全队',
      ts_running: '进行中', ts_done: '已完成', ts_queued: '排队', ts_stuck: '卡住', ts_cancelled: '已取消',
      ts_pending: '待确认', ts_answered: '已答复',
      answered: '已答复 · 等助手处理', answeredN: '已答复 {n} 条', closedN: '已完成任务上的问题 {n}', rs_answered: '已答复', rs_seen: '助手已看到', rs_handled: '助手已处理', rs_sending: '答复待发送', rs_failed: '提交失败',
      answer: '答复', replyPh: '有意见或要求就写在这里；直接点提交 = 同意', send: '提交', sentOk: '已提交', agree: '同意（没有补充）',
      approve: '批准', decline: '拒绝', approved: '已批准', declined: '已拒绝', rs_approved: '已批准', rs_declined: '已拒绝',
      decisionDemo: '演示决定，不会发给 Grok Bot。', decisionLocal: '只保存在这个页面里。', resetDemo: '重置演示决定', resetDone: '已恢复演示状态',
      decideFail: '没有提交。实时数据源还没接上。',
      started: '开始', last: '最近', finished: '完成', subtasks: '子任务', lastActive: '最近动静',
      emptyDesk: '{n} 号工位 · 空位', emptyDeskTip: '这里还没人。在数据里多加一个助手或真人员工，就会坐到这里。',
      desk: '{n} 号工位', bossDesk: '中央指挥台', human: '真人', ai: 'AI 助手',
      meetingOn: '会议中 · {p}', firework: '🎉 {a} 完成了「{t}」', loadFail: '没连上数据源，显示的是{s}',
      agents: '{n} 位', teamSub: '进行中 {r} · 待你确认 {c}', progress: '进度',
      c_working: '工作', c_meeting: '开会', c_waiting: '待确认', c_stuck: '卡住', c_idle: '摸鱼', c_offline: '睡眠',
      hint: '拖动平移 · 滚轮/双指缩放 · 点人物或工位查看任务'
    },
    en: {
      title: 'Project HQ', team: 'Team', refresh: 'Refresh', fit: 'Fit', lang: '中文',
      live: 'Live', demo: 'Demo', sample: 'Sample data', snapshot: 'Built-in snapshot', updated: 'Updated',
      now: 'Doing', done: 'Done', confirm: 'Needs you', nothingNow: 'Nothing in progress right now',
      nothingDone: 'Nothing finished yet', nothingConfirm: 'Nothing needs your answer 👍', more: 'Show {n} more',
      st_working: 'Working', st_idle: 'Idle', st_stuck: 'Stuck', st_waiting_approval: 'Needs you',
      st_offline: 'Sleeping', st_done: 'Just finished', st_meeting: 'In a meeting', st_boss: 'Leading the team',
      ts_running: 'Running', ts_done: 'Done', ts_queued: 'Queued', ts_stuck: 'Stuck', ts_cancelled: 'Cancelled',
      ts_pending: 'Pending', ts_answered: 'Answered',
      answered: 'Answered · waiting for the agent', answeredN: '{n} answered', closedN: 'Questions on finished tasks: {n}', rs_answered: 'Answered', rs_seen: 'Seen by agent', rs_handled: 'Handled', rs_sending: 'Not sent yet', rs_failed: 'Failed',
      answer: 'Answer', replyPh: 'Add a comment, or just press Send to approve', send: 'Send', sentOk: 'Sent', agree: 'Approved (no comment)',
      approve: 'Approve', decline: 'Decline', approved: 'Approved', declined: 'Declined', rs_approved: 'Approved', rs_declined: 'Declined',
      decisionDemo: 'Demo decision. Nothing is sent to Grok Bot.', decisionLocal: 'Saved on this page only.', resetDemo: 'Reset demo decisions', resetDone: 'Demo decisions cleared',
      decideFail: 'Not sent. No live decide URL is configured.',
      started: 'Started', last: 'Last', finished: 'Finished', subtasks: 'Subtasks', lastActive: 'Last active',
      emptyDesk: 'Desk {n} · free', emptyDeskTip: 'Nobody sits here yet. Add another agent or a human to your data and they will take this desk.',
      desk: 'Desk {n}', bossDesk: 'Command desk', human: 'Human', ai: 'AI agent',
      meetingOn: 'Meeting · {p}', firework: '🎉 {a} finished “{t}”', loadFail: 'Could not reach the data source, showing {s}',
      agents: '{n} members', teamSub: '{r} running · {c} need you', progress: 'Progress',
      c_working: 'Working', c_meeting: 'Meeting', c_waiting: 'Needs you', c_stuck: 'Stuck', c_idle: 'Idle', c_offline: 'Sleeping',
      hint: 'Drag to pan · wheel/pinch to zoom · tap a character or desk'
    }
  };
  var lang = 'zh';
  PO.i18n = {
    DICT: DICT,
    set: function (l) { if (DICT[l]) { lang = l; try { localStorage.setItem('gvo.lang', l); } catch (e) {} } },
    get lang() { return lang; },
    t: function (k, v) { var s = (DICT[lang] && DICT[lang][k]) || DICT.zh[k] || k; if (v) for (var n in v) s = s.split('{' + n + '}').join(v[n]); return s; }
  };
})(window.VisualOffice = window.VisualOffice || {});
