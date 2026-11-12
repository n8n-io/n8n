"""Build the prototype sample from saved Skills.sh responses."""
import json
from pathlib import Path

ROOT = Path(__file__).parent
records = []
for filename in ['browser-probes.json', 'extra-probes.json']:
    records.extend(json.loads((ROOT / 'evidence' / filename).read_text()))
search = {s['id']: s for r in records if r['name'].startswith('search-') for s in r.get('body', {}).get('skills', [])}
downloads = {r['name']: r for r in records if r['name'].startswith('download-')}
# These short summaries are editorial paraphrases of the Skills.sh skill content.
annotations = [
    ('vercel-labs/skills/find-skills', 'download-find', 'Find skills', 'Discover skills for a task and install them with the Skills CLI.', 'Agent workflows', 'Skills.sh page', 'Terminal access and the Skills CLI', 'Needs tools'),
    ('anthropics/skills/frontend-design', 'download-frontend-design', 'Frontend design', 'Plan a visual direction and create a distinctive interface.', 'Design & UI', 'Skills.sh page', 'A runtime that can create and edit frontend files', 'License review'),
    ('vercel-labs/agent-browser/agent-browser', 'download-agent-browser', 'Agent browser', 'Navigate websites, inspect pages, and automate browser tasks.', 'Agent workflows', 'Skills.sh page', 'The agent-browser CLI and a browser runtime', 'Needs tools'),
    ('anthropics/skills/pdf', 'download-pdf', 'PDF', 'Extract text, combine documents, and work with PDF forms.', 'Documents', 'Proposed n8n category', 'Python tools, PDF libraries, and the bundled scripts', 'Unsupported files'),
    ('anthropics/skills/webapp-testing', 'download-webapp-testing', 'Web app testing', 'Check a local web app with Playwright and inspect browser output.', 'Testing', 'Skills.sh page', 'Python, Playwright, a browser, and the bundled scripts', 'Unsupported files'),
    ('anthropics/skills/xlsx', 'download-xlsx', 'Spreadsheets', 'Create and edit spreadsheets with formulas and formatting.', 'Documents', 'Proposed n8n category', 'A file runtime, spreadsheet libraries, and the bundled scripts', 'Unsupported files'),
]
items = []
for skill_id, key, title, summary, topic, topic_source, requirements, fit in annotations:
    raw = search[skill_id]
    record = downloads[key]
    body = record['body']
    files = body['files']
    kept = [f['path'] for f in files if f['path'] == 'SKILL.md' or f['path'].startswith('references/') and f['path'].endswith(('.md', '.markdown'))]
    items.append({**raw, 'title': title, 'summary': summary, 'summarySource': 'Editorial paraphrase of Skills.sh content', 'topic': topic, 'topicSource': topic_source, 'requirements': requirements, 'fit': fit, 'url': 'https://skills.sh/' + skill_id, 'fetchedAt': record['fetchedAt'], 'hash': body['hash'], 'files': files, 'keptFiles': kept, 'skippedCount': len(files) - len(kept), 'license': 'See LICENSE.txt; terms not evaluated' if any(f['path']=='LICENSE.txt' for f in files) else 'Not included in this snapshot', 'models': None, 'runFrequency': None, 'audit': next(r['body']['audits'] for r in records if r['name'] == 'v1-audit') if skill_id.endswith('/find-skills') else None})
snapshot = {'source': 'Skills.sh', 'capturedOn': '2026-11-12', 'mode': 'Saved sample; no live API calls from prototype', 'items': items}
(ROOT / 'snapshot.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
print('Built', len(items), 'records from saved responses')
