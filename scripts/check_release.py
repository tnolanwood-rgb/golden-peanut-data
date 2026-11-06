#!/usr/bin/env python3
"""Validate the assembled app, all workflow YAML and embedded Python/JavaScript."""
import ast
import json
import pathlib
import re
import subprocess
import tempfile
import yaml
root=pathlib.Path(__file__).resolve().parents[1]
app=root/'app';html=(app/'index.html').read_text()
count=0
for p in app.glob('*.js'):
 subprocess.run(['node','--check',str(p)],check=True);count+=1
with tempfile.TemporaryDirectory() as d:
 for i,body in enumerate(re.findall(r'<script\b[^>]*>(.*?)</script>',html,re.S)):
  if not body.strip():continue
  p=pathlib.Path(d)/f'inline-{i}.js';p.write_text(body)
  subprocess.run(['node','--check',str(p)],check=True);count+=1
for src in re.findall(r'(?:src|href)="(\./[^"?]+)',html):
 assert (app/src[2:]).exists(),f'Missing app asset: {src}'
json.loads((app/'manifest.webmanifest').read_text())
version='7.16.0-evidence'
for name in ['index.html','execution-engine.js','opportunity-engine.js','focus-edition.js','public-market-feed.js']:
 assert version in (app/name).read_text(),f'Build stamp missing: {name}'
for p in root.glob('.github/workflows/*.yml'):
 data=yaml.load(p.read_text(),Loader=yaml.BaseLoader)
 assert 'on' in data and 'jobs' in data,p
 for job in data['jobs'].values():
  for step in job.get('steps',[]):
   run=step.get('run','')
   for match in re.finditer(r"python3?\s+-\s+<<'([^']+)'\n(.*?)\n\1",run,re.S):
    ast.parse(match.group(2),filename=str(p))
for p in (root/'scripts').glob('*.py'):ast.parse(p.read_text(),filename=str(p))
# No credential-shaped GW2 key or account profile is allowed in distributable files.
for p in app.rglob('*'):
 if p.suffix not in {'.js','.html','.css','.json','.webmanifest'}:continue
 text=p.read_text()
 assert not re.search(r'[A-F0-9]{8}(?:-[A-F0-9]{4}){3}-[A-F0-9]{20}(?:-[A-F0-9]{4}){3}-[A-F0-9]{12}',text,re.I),f'Possible credential: {p}'
 assert not re.search(r'__GP_PERSONAL_PROFILE\s*=\s*\{\s*(?:account|key)\s*:',text),f'Embedded personal profile: {p}'
print(f'PASS: {count} external/inline JS programs, Python, workflow YAML/heredocs, assets, manifest, versions and credential guard')
