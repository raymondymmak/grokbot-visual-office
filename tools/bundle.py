#!/usr/bin/env python3
"""Bundle Grokbot Visual Office into ONE self-contained HTML file (no build step needed to run the repo itself).

  python3 tools/bundle.py                         -> dist/grokbot-visual-office.html (sample data only)
  python3 tools/bundle.py --data-url 任务合并.json  -> also polls that URL (relative to the HTML) every 60 s
  python3 tools/bundle.py --data real.json --adapter workbench --out .local/x.html
                                                  -> embeds a converted snapshot (needs node). Never commit that file.
  --extra-html glue.html                          -> host-specific glue (e.g. a cfg.replies provider); keep it out of the public dist
"""
import argparse, json, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ap = argparse.ArgumentParser()
ap.add_argument('--out', default=os.path.join(ROOT, 'dist', 'grokbot-visual-office.html'))
ap.add_argument('--data', help='JSON file to embed as a snapshot (fallback when the live URL is unreachable)')
ap.add_argument('--adapter', default=None, help='adapter used to convert --data at build time (e.g. workbench)')
ap.add_argument('--data-url', help='live data URL baked into the config')
ap.add_argument('--title', help='page title override')
ap.add_argument('--no-sample', action='store_true')
ap.add_argument('--budget', type=float, default=150, help='warn above this size in KB')
ap.add_argument('--extra-html', action='append', default=[], help='HTML snippet file inserted before the app scripts (host glue: a reply provider, links...). Repeatable.')
a = ap.parse_args()

def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()
def js_min(s):
    out = []
    for line in s.split('\n'):
        t = line.strip()
        if not t or t.startswith('//'): continue
        out.append(t)
    s = '\n'.join(out)
    return re.sub(r'/\*(?!!)[\s\S]*?\*/', '', s)  # block comments (none are inside strings in this codebase)
def css_min(s): return re.sub(r'\s*\n\s*', '', re.sub(r'/\*[\s\S]*?\*/', '', s))
def safe_json(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

html = rd('index.html')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + css_min(rd('styles.css')) + '</style>')
blocks = [open(f, encoding='utf-8').read() for f in a.extra_html]
blocks += ['<script type="application/json" id="po-layout">' + safe_json(json.loads(rd('layouts/default.json'))) + '</script>']
if not (a.no_sample or a.data): blocks.append('<script type="application/json" id="po-sample">' + safe_json(json.loads(rd('sample-data.json'))) + '</script>')
if a.data:
    raw = json.load(open(a.data, encoding='utf-8'))
    if a.adapter:
        code = "const A=require(%s);const fs=require('fs');process.stdout.write(JSON.stringify(A.convert(JSON.parse(fs.readFileSync(0,'utf8')),{})))" % json.dumps(os.path.join(ROOT, 'adapters', a.adapter + '.js'))
        raw = json.loads(subprocess.run(['node', '-e', code], input=json.dumps(raw), capture_output=True, text=True, check=True).stdout)
    blocks.append('<script type="application/json" id="po-data">' + safe_json(raw) + '</script>')
elif os.path.exists(os.path.join(ROOT, 'data', 'project-hq.json')):
    blocks.append('<script type="application/json" id="po-data">' + safe_json(json.loads(rd('data/project-hq.json'))) + '</script>')
cfg = {}
if a.data_url: cfg['data'] = a.data_url
if a.title: cfg['title'] = a.title
if cfg: blocks.append('<script>window.VISUAL_OFFICE_CONFIG=Object.assign(%s,window.VISUAL_OFFICE_CONFIG||{})</script>' % safe_json(cfg))
def inline(m): return '<script>' + js_min(rd(m.group(1))).replace('</script', '<\\/script') + '</script>'
first = html.index('<script src=')
html = html[:first] + '\n'.join(blocks) + '\n' + html[first:]
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
html = re.sub(r'<!--[\s\S]*?-->\n?', '', html)
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
open(a.out, 'w', encoding='utf-8').write(html)
n = len(html.encode('utf-8'))
print('%s  %.1f KB%s' % (a.out, n / 1024, '' if n < a.budget * 1024 else '  (over the %g KB budget!)' % a.budget))
