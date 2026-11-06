#!/usr/bin/env python3
"""Build exact Pages upload and collector review ZIPs; exclude private/generated data."""
from pathlib import Path
import hashlib
import json
import zipfile
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'artifacts';out.mkdir(exist_ok=True)
app=out/'GoldenPeanut_7_16_Pages.zip'
with zipfile.ZipFile(app,'w',zipfile.ZIP_DEFLATED) as z:
 for path in sorted((ROOT/'app').rglob('*')):
  if path.is_file():z.write(path,path.relative_to(ROOT/'app'))
collector=out/'GoldenPeanut_7_16_Collector.zip'
with zipfile.ZipFile(collector,'w',zipfile.ZIP_DEFLATED) as z:
 for pattern in ['scripts/*.py','.github/workflows/*.yml','docs/*.md','README*.md']:
  for path in sorted(ROOT.glob(pattern)):z.write(path,path.relative_to(ROOT))
manifest={p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in (app,collector)}
(out/'release-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
