"""Save a small, read-only sample from Skills.sh. No skills are installed."""

import datetime
import json
import pathlib
import re
import socket
import urllib.error
import urllib.request

OUT = pathlib.Path(__file__).parent / "evidence"
OUT.mkdir(exist_ok=True)
REQUESTS = {
    "v1-list": "/api/v1/skills?per_page=2&page=0",
    "v1-search": "/api/v1/skills/search?q=pdf&limit=2",
    "v1-curated": "/api/v1/skills/curated",
    "v1-detail": "/api/v1/skills/vercel-labs/skills/find-skills",
    "v1-audit": "/api/v1/skills/audit/vercel-labs/skills/find-skills",
    "search-find": "/api/search?q=find-skills&limit=3",
    "search-design": "/api/search?q=design&limit=5",
    "search-testing": "/api/search?q=testing&limit=3",
    "search-pdf": "/api/search?q=pdf&owner=anthropics&limit=2",
    "search-xlsx": "/api/search?q=xlsx&owner=anthropics&limit=2",
    "download-find": "/api/download/vercel-labs/skills/find-skills",
    "download-pdf": "/api/download/anthropics/skills/pdf",
    "download-xlsx": "/api/download/anthropics/skills/xlsx",
    "download-frontend-design": "/api/download/anthropics/skills/frontend-design",
    "download-webapp-testing": "/api/download/anthropics/skills/webapp-testing",
    "download-agent-browser": "/api/download/vercel-labs/agent-browser/agent-browser",
    "search-short-query": "/api/search?q=a&limit=2",
}
results = []
for name, path in REQUESTS.items():
    url = "https://www.skills.sh" + path
    request = urllib.request.Request(url, headers={"User-Agent": "n8n-skills-marketplace-spike/1.0", "Accept": "application/json"})
    at = datetime.datetime.now(datetime.timezone.utc).isoformat()
    try:
        response = urllib.request.urlopen(request, timeout=25)
    except urllib.error.HTTPError as error:
        response = error
    except (urllib.error.URLError, socket.timeout) as error:
        results.append({"name": name, "url": url, "fetchedAt": at, "error": str(error)})
        print(name, str(error), flush=True)
        continue
    with response:
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise RuntimeError("Response exceeded the 2 MB probe limit")
        headers = {key.lower(): value for key, value in response.headers.items() if key.lower() in {"content-type", "cache-control", "retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset", "access-control-allow-origin"}}
        try:
            body = json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            body = raw.decode("utf-8", errors="replace")
        if name.startswith("download") and isinstance(body, dict) and "files" in body:
            files = body["files"]
            skill = next((file["contents"] for file in files if file["path"] == "SKILL.md"), "")
            frontmatter = re.match(r"^---[\s\S]*?\n---", skill)
            body = {
                "hash": body.get("hash"),
                "fileCount": len(files),
                "files": [{"path": file["path"], "bytes": len(file["contents"].encode("utf-8"))} for file in files],
                "frontmatter": frontmatter.group(0) if frontmatter else None,
                "fullContentsOmitted": True,
            }
        record = {"name": name, "url": url, "finalUrl": response.geturl(), "fetchedAt": at, "status": response.status, "headers": headers, "bytes": len(raw), "body": body}
        (OUT / (name + ".json")).write_text(json.dumps(record, indent=2) + "\n")
        results.append({key: value for key, value in record.items() if key != "body"})
        print(name, response.status, headers, "keys:", list(body)[:12] if isinstance(body, dict) else "text", flush=True)
        if response.status == 429:
            break
(OUT / "manifest.json").write_text(json.dumps(results, indent=2) + "\n")
