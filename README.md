# Project HQ · pixel office

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE) ![No build step](https://img.shields.io/badge/build-none-brightgreen.svg) ![Vanilla JS](https://img.shields.io/badge/vanilla-JS%20%2B%20canvas-f7df1e.svg)

Raymond Mak’s Project HQ, as a thin layer on [Grokbot Visual Office](https://github.com/huaspirit123/grokbot-visual-office) (Apache-2.0, Copyright 2026 贾维斯豆). The isometric pixel office, robots, and layout are the upstream ones. This fork does not restyle them.

The default page is a **demo roster** of desks: Project bots (Cursor coding agents), Academic tutors, Profile, Secretary, Schedule Reminders, and Tech Brief. Working desks type at the desk. Sleeping desks use the existing charging pod. Secretary starts at `waiting_approval`; **Approve** returns that desk to working, **Decline** sends it to sleep. The top bar says **Demo** while `office.provider` is `"mock"`, and **Live** only when a loaded file says `"live"`.

There is no Grok Bot control API in this repo. The mock file is not a live fleet, and the page does not invent one. Cursor cloud-agent runs are not attached here; the Project bots desk is only a stand-in.

## Start

```bash
npm start
```

Open http://localhost:8080/ (`npm run serve` is the same command). Add `?lang=en` for English. The original scripted tour, on the fictional sample office, is still `?demo=1`.

Static files only: no build step. A host such as Vercel can serve this repository root as-is. This pass does not deploy or change any Vercel project settings.

`python3 tools/bundle.py` writes `dist/grokbot-visual-office.html` with the Project HQ roster embedded. `?demo=1` on that file still plays the fictional sample tour.

## Fleet provider

Decisions on the mock roster stay in this browser (`localStorage` key `phq.decisions.mock`). Reset them from the Needs you / 待你确认 tab. Nothing is sent to Grok Bot.

| Piece | Role |
|---|---|
| `data/project-hq.json` | Demo roster. `office.provider: "mock"` is what labels the top bar Demo. `status: "sleeping"` is drawn as the offline pod. |
| `src/fleet.js` | `prepareAgent`, `applyDecisions`, `sourceFor`, and `submit`. Mock `submit` only writes the local store. |
| Live swap | Serve the same office JSON with `"provider": "live"`. Set `VISUAL_OFFICE_CONFIG.decide` (or `?decide=`) to a URL you control. Approve/Decline `POST`s `{confirmId, decision, agentId, taskId}` where `decision` is `"approve"` or `"decline"`. If that URL is missing, the click shows an error and does not pretend it was sent. Live decisions are stored apart from demo ones (`phq.decisions.live`). |

`?data=` still loads another office file. A file with no `provider` is labeled Live, as before, and Approve/Decline on it stays in the page until that file itself says `"provider": "live"`. Grok Bot has no model picker in its settings, so this page does not record or switch a model.

A tiny **isometric pixel-art office floating above the clouds** where your AI agents (and human teammates) live.
Each agent is a little white robot with its own accent colour. You can see at a glance who is working, who is stuck, who needs your answer and who is offline. Tap anyone to see what they are doing, what they finished and what they are waiting for you to confirm.

* **No build step, no backend, no API keys.** Vanilla JS + `<canvas>`, works from any static server (or from `file://` as a single HTML file).
* **Crisp pixels**: the world renders 1:1 into a low-res buffer and is scaled by an integer factor (`imageSmoothingEnabled = false`).
* **All art is procedural and original** (`themes/default.js`), so there are no sprite sheets to licence.
* **Tiny**: the single-file bundle is about 111 KB, including the layout and the demo data.
* 中文 by default, English included (`?lang=en`).

![Demo: a task finishes with fireworks, then you tap the robot with its hand up and answer its question in the panel](docs/demo.gif)

*Recorded from `index.html?demo=1&lang=en` (fictional sample data).*

## Screenshots

All screenshots use **fictional demo data only** (`sample-data.json`). Regenerate them with `tools/shoot.py`, which blocks every request that does not go to localhost.

![Desktop overview](docs/screenshots/desktop-sample.png)

| Panel open (待你确认 tab) | Team view, English |
|---|---|
| ![Panel](docs/screenshots/desktop-sample-panel.png) | ![Team view](docs/screenshots/desktop-sample-team-en.png) |

| Phone 390×844 | Phone, single-file bundle |
|---|---|
| <img src="docs/screenshots/phone-sample.png" width="300" alt="Phone"> | <img src="docs/screenshots/bundle-phone-sample-panel.png" width="300" alt="Phone bundle"> |

## Quick start

The Project HQ roster is what `npm start` serves (see above). To open only the original fictional sample, use `?demo=1` or `?data=sample-data.json`.

```bash
python3 -m http.server 8080
```

Guided demo: `http://localhost:8080/?demo=1&lang=en`. On the fictional sample it plays a 25 s scripted tour: a task finishes with fireworks, a cursor taps the robot that has its hand up, types an answer and sends it. `?demo=loop` repeats it. Demo answers use the in-memory reply provider and are never sent anywhere.

## Connect your own agents

1. Make your agent system write a JSON file in the [schema](docs/SCHEMA.md) (only `agents[].id` and `name` are required):
   ```json
   { "office": { "name": "My Office", "updatedAt": "2026-01-15T15:00:00+08:00" },
     "agents": [ { "id": "a1", "name": "Pixel", "color": "#4fa3ff", "status": "working",
                   "currentTask": "Landing page", "tasks": [ { "id": "t1", "title": "Landing page", "status": "running", "progress": 0.6,
                   "confirms": [ { "question": "Blue or gold hero?" } ] } ] } ] }
   ```
2. Point the office at it with `?data=agents.json`, or put this before the scripts:
   `<script>window.VISUAL_OFFICE_CONFIG = { data: 'agents.json', refreshSec: 60 }</script>`
   The file is re-read every 60 s. If it can't be loaded, the last good data (or the built-in snapshot or the sample) stays on screen, and the top bar shows which one.
3. If your format is different, write an **adapter**, a function `raw → schema`, and register it as `VisualOffice.adapters.mine` (see `adapters/workbench.js`). Then load with `?adapter=mine`.
4. Optional: bake it into one file with `python3 tools/bundle.py --data-url agents.json` (live) or `--data snapshot.json` (embedded fallback). **Don't commit bundles that contain real data.**

Answering questions: set `VISUAL_OFFICE_CONFIG.replies` to a reply provider and every pending question gets a reply box. Answered questions move to a collapsed "Answered" list, and the counters and raised hands drop. Questions on tasks that are already `done`, `cancelled` or `archived` never count as pending: they are listed in a collapsed "Questions on finished tasks" group instead. To try the reply boxes without a backend, use `replies: { type: 'memory' }`: answers live only in the open page and vanish on reload. For real use, the quickest option is the built-in HTTP provider:

```html
<script>window.VISUAL_OFFICE_CONFIG = { data: 'agents.json',
  replies: { type: 'http', post: '/api/answers', list: '/api/answers' } }</script>
```

Your backend stores the POSTed `{agentId, taskId, task, confirmId, question, text}` and returns `{items:[{confirmId, status}]}` from the list URL. You can also plug in your own provider object (`status`, `box`, `sync`, `busy`, `onChange`; see [docs/SCHEMA.md](docs/SCHEMA.md#answering-confirms)). The simpler `onConfirm(agent, task, confirm)` hook still works: it only adds an "Answer" button. `links: [{href, label}]` adds links to the top bar, e.g. back to your dashboard.

Host-specific glue such as a private endpoint or auth belongs in your own page or in `tools/bundle.py --extra-html glue.html`, never in the public `dist/`.

### How states show up

| status | the robot… |
|---|---|
| `working` | types at its desk under a floating hologram. If 2+ agents work on the same project within 3 h, they meet in the glass meeting room instead. |
| `idle` | wanders between the coffee bar, stools, arcade, sofas, bookshelf and windows |
| `stuck` | sweats at its desk with a spinning swirl overhead |
| `waiting_approval` / pending confirms on open tasks | raises a hand with a red **!**, and queues in front of the command platform when it has nothing else to do |
| `offline` / `sleeping` | sleeps in a charging pod, Zzz. Project HQ calls this sleeping. |
| `done` / task finished < 30 min ago | cheers with fireworks (once) |
| `isBoss` | wears a crown on the glowing central platform |
| `kind: "human"` | is a little person instead of a robot |

## Project layout

```
index.html  styles.css          page shell (top bar, canvas, side panel)
src/iso.js                       2:1 iso projection, screen↔tile, A* (8-dir, no corner cutting)
src/engine.js                    renderer, camera (drag / wheel / pinch, integer zoom), state machine, depth sort, hit-testing
src/data.js                      loading, refresh fallback, meeting + firework rules
src/fleet.js                     Project HQ roster decisions (mock local, optional live POST)
src/ui.js  src/main.js           panel (正在做 / 已完成 / 待你确认), config, boot
src/i18n.js                      zh + en strings
themes/default.js                ALL art: sky, platform, furniture, robots, effects (swap to re-skin)
layouts/default.json             tile map + objects + zones (generated by tools/make_layout.py)
adapters/workbench.js            reference adapter (also runs in Node)
schema/office.schema.json        JSON Schema · docs/SCHEMA.md human version
tools/bundle.py                  → one self-contained HTML · tools/shoot.py headless screenshots
```

Make your own layout: edit `tools/make_layout.py` (floor codes `w` wood, `s` stone path, `m` meeting room, `r` rug, `b` boss platform, `.` void), then load it with `VISUAL_OFFICE_CONFIG.layout`.

## Privacy

The repo ships only fictional demo data. `.local/` is git-ignored, and in `dist/` only the public demo bundle (sample data) is tracked. Keep real snapshots and screenshots there.

## License

[Apache License 2.0](LICENSE). Original pixel office Copyright 2026 贾维斯豆; Project HQ roster and fleet provider Copyright 2026 Raymond Mak. See [NOTICE](NOTICE).
If you redistribute it, keep LICENSE and NOTICE and mark any files you changed.

## 中文说明

**AI 像素办公室**：一间漂浮在云端的等距像素小办公室，把你的 AI 助手（以及真人同事）可视化。每个助手是一只带专属颜色耳机或耳灯的小白机器人。谁在干活、谁卡住了、谁在等你确认、谁下线了，一眼就能看到；点一下人物，就能看到 **正在做 / 已完成 / 待你确认**。

* 不用构建，不要后端，不要 API Key。原生 JS + Canvas，静态服务器或单个 HTML 文件都能打开。
* 像素整数倍放大，画面不糊。美术全部由程序绘制，原创，没有版权素材。
* 单文件约 111 KB，含示例数据。默认中文，`?lang=en` 切换英文。
* 演示模式：打开时加 `?demo=1`，会在示例数据上自动演示约 25 秒：任务完成放烟花，光标点开举手的机器人，输入答复并发送（`?demo=loop` 循环播放）。演示中的答复只存在于内存里，不会发送到任何地方。

**接入自己的助手**：按 [docs/SCHEMA.md](docs/SCHEMA.md) 输出一个 JSON（最少只要 `id` 和 `name`），用 `?data=你的文件.json` 打开，或者在页面里设置 `window.VISUAL_OFFICE_CONFIG = { data: '...' }`。页面每 60 秒自动刷新；读取失败时保留上一次的数据，并在顶栏标明「实时数据 / 内置快照 / 示例数据」。格式不一样的话，写一个适配器函数（参考 `adapters/workbench.js`）。

**在页面里答复「待你确认」**：配置 `replies`（不想接后端、只是试用：`{type:'memory'}`，答复只保存在当前页面里，刷新就没了；内置 HTTP 版：`{type:'http', post:'/api/answers', list:'/api/answers'}`，或者自己写一个 provider）。答复过的问题会移到折叠的「已答复」里，计数和举手同时减少。已完成（done / cancelled / archived）任务上的问题不计入待确认，单独折叠在「已完成任务上的问题 N」里。你自己的接口地址和口令放在自己的页面或 `--extra-html` 胶水文件里，不要放进公开的 dist。

**状态对照**：工作中 = 工位打字 + 全息屏；同一项目 3 小时内有 2 个以上助手在干活 = 去玻璃会议室开会；摸鱼 = 咖啡吧 / 游戏机 / 沙发 / 书架闲逛；卡住 = 流汗 + 头顶转圈；待你确认 = 举手 + 红色「!」，没事做时到中央指挥台前排队；下线 = 回充电舱睡觉 Zzz；30 分钟内完成任务 = 放烟花；isBoss = 戴皇冠，站在中央发光平台；kind=human = 真人小人。

**隐私**：仓库只放虚构的示例数据，真实数据和截图放在已加入 .gitignore 的 `.local/` 里。

**Project HQ**：`npm start` 打开的是演示花名册（Project bots、Academic tutors、Profile、Secretary、Schedule Reminders、Tech Brief），顶栏标「演示」。Secretary 的批准 / 拒绝只改本页状态。仓库里没有 Grok Bot 控制接口；换成实时数据时，让 JSON 的 `office.provider` 为 `"live"`，并配置 `decide` 地址，见上文 Fleet provider。

**开源协议**：[Apache License 2.0](LICENSE)。像素办公室 Copyright 2026 贾维斯豆；Project HQ 花名册与 fleet provider Copyright 2026 Raymond Mak。见 [NOTICE](NOTICE)。再分发时请保留 LICENSE 和 NOTICE，并标明你修改过的文件。
