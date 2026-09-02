#!/usr/bin/env node
// A one-page read-only viewer for the `activity_event` table.
//
// This is a debug surface, not a product one. It is unauthenticated by design, and
// it serves the whole table — including who did what in which project — to anything
// that can reach the port. That is why it binds loopback only, and why it must not be
// tunnelled or port-forwarded.
//
// Read-only is enforced three times over, because any one of them can be undone by a
// later edit without the others noticing:
//
//   1. The connection is opened `readOnly`, so SQLite itself rejects a write.
//   2. Every statement here is a SELECT.
//   3. The sort column comes from an allowlist. A column name cannot be a bound
//      parameter, so it is the one piece of the query built by concatenation, and an
//      allowlist is what keeps that safe.

import { DatabaseSync } from 'node:sqlite';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';

const DB_PATH =
	process.env.DB_SQLITE_DATABASE ??
	path.join(process.env.N8N_USER_FOLDER ?? path.join(os.homedir(), '.n8n'), 'database.sqlite');
const PORT = Number(process.env.PORT) || 5699;
const HOST = '127.0.0.1';
const PAGE_SIZES = [25, 50, 100, 250];

let db;
try {
	db = new DatabaseSync(DB_PATH, { readOnly: true });
} catch (e) {
	console.error(`Cannot open ${DB_PATH} read-only: ${e.message}`);
	process.exit(1);
}

const tableExists = db
	.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_event'")
	.get();
if (!tableExists) {
	console.error(`No activity_event table in ${DB_PATH}.`);
	console.error('The table ships with the activity-event migration; this instance predates it.');
	process.exit(1);
}

// The allowlist is derived from the table itself rather than hardcoded, so a new
// column becomes sortable without a code change and a dropped one stops being valid.
const COLUMNS = db
	.prepare("SELECT name FROM pragma_table_info('activity_event')")
	.all()
	.map((r) => r.name);
const SORTABLE = new Set(COLUMNS);

const esc = (v) =>
	v === null || v === undefined
		? ''
		: String(v).replace(
				/[&<>"']/g,
				(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
			);

function query({ q, sort, dir, limit, offset }) {
	// The free-text filter spans every column including `data`, so a run id or a
	// failing node name finds its entry without the reader knowing which field holds
	// it. That is the whole reason to search the JSON blob rather than parse it.
	const where = q ? `WHERE ${COLUMNS.map((c) => `IFNULL("${c}", '') LIKE ?`).join(' OR ')}` : '';
	const params = q ? COLUMNS.map(() => `%${q}%`) : [];

	const total = db.prepare(`SELECT COUNT(*) AS n FROM activity_event ${where}`).get(...params).n;
	// `sort` and `dir` are allowlisted above; everything else is bound.
	const rows = db
		.prepare(`SELECT * FROM activity_event ${where} ORDER BY "${sort}" ${dir} LIMIT ? OFFSET ?`)
		.all(...params, limit, offset);
	return { total, rows };
}

function page({ q, sort, dir, limit, offset, total, rows }) {
	const link = (over) => {
		const p = new URLSearchParams({
			q,
			sort,
			dir,
			limit: String(limit),
			offset: String(offset),
			...over,
		});
		if (!p.get('q')) p.delete('q');
		return `/?${p}`;
	};
	const header = COLUMNS.map((c) => {
		const active = c === sort;
		const nextDir = active && dir === 'DESC' ? 'asc' : 'desc';
		const arrow = active ? (dir === 'DESC' ? ' ▾' : ' ▴') : '';
		return `<th><a href="${esc(link({ sort: c, dir: nextDir, offset: '0' }))}"${active ? ' class="on"' : ''}>${esc(c)}${arrow}</a></th>`;
	}).join('');

	// One line per row, truncated, with the full value on hover. A log viewer is read
	// by scanning down it, and a wrapped cell turns 25 rows into six screens.
	const body =
		rows.length === 0
			? `<tr><td colspan="${COLUMNS.length}" class="empty">No rows${q ? ` matching “${esc(q)}”` : ''}.</td></tr>`
			: rows
					.map(
						(r) =>
							`<tr>${COLUMNS.map((c) => {
								const v = r[c];
								const s = v === null || v === undefined ? '' : String(v);
								const cls = ` class="c-${c}"`;
								// `title` only where it adds something the cell cannot show.
								const t = s.length > 20 ? ` title="${esc(s)}"` : '';
								return `<td${cls}${t}>${esc(s)}</td>`;
							}).join('')}</tr>`,
					)
					.join('');

	const from = total === 0 ? 0 : offset + 1;
	const to = Math.min(offset + limit, total);
	const prev = Math.max(0, offset - limit);
	const next = offset + limit;

	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>activity_event — ${total} rows</title>
<style>
 :root { color-scheme: light dark; --line: #8883; }
 body { font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0; padding: 16px 20px; }
 h1 { font-size: 15px; margin: 0 0 2px; font-weight: 600; }
 .sub { opacity: .65; margin-bottom: 14px; }
 .bar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
 input[type=search] { font: inherit; padding: 5px 8px; min-width: 280px; border: 1px solid var(--line); border-radius: 5px; background: transparent; color: inherit; }
 button, select { font: inherit; padding: 5px 8px; border: 1px solid var(--line); border-radius: 5px; background: transparent; color: inherit; cursor: pointer; }
 table { border-collapse: collapse; width: 100%; table-layout: fixed; }
 th, td { border-bottom: 1px solid var(--line); padding: 5px 8px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
 th { position: sticky; top: 0; background: Canvas; font-weight: 600; }
 /* Fixed layout, so the wide opaque id columns cannot starve the columns a reader
    is actually scanning. Percentages so it still fills a narrow window. */
 .c-id, th:nth-child(1) { width: 3.5rem; }
 .c-category, th:nth-child(2) { width: 6rem; }
 .c-action, th:nth-child(3) { width: 6rem; }
 .c-typeVersion, th:nth-child(4) { width: 3.5rem; }
 .c-userId, th:nth-child(5) { width: 8%; }
 .c-projectId, th:nth-child(6) { width: 8%; }
 .c-resourceType, th:nth-child(7) { width: 6rem; }
 .c-resourceId, th:nth-child(8) { width: 8%; }
 .c-resourceName, th:nth-child(9) { width: 22%; }
 .c-data, th:nth-child(10) { width: 14%; }
 .c-createdAt, th:nth-child(11) { width: 13.5rem; }
 td[title] { cursor: help; }
 th a { color: inherit; text-decoration: none; }
 th a.on { text-decoration: underline; }
 tr:hover td { background: #8881; }
 .empty { opacity: .6; text-align: center; padding: 28px; }
 .pager { display: flex; gap: 10px; align-items: center; margin-top: 12px; }
 .pager a { color: inherit; }
 .pager .off { opacity: .35; pointer-events: none; }
 .warn { margin-top: 18px; opacity: .6; font-size: 12px; }
</style></head><body>
<h1>activity_event</h1>
<div class="sub">${esc(DB_PATH)} · read-only · ${total} row${total === 1 ? '' : 's'}</div>
<form class="bar" method="get" action="/">
 <input type="search" name="q" value="${esc(q)}" placeholder="filter any column, including the JSON data blob" autofocus>
 <input type="hidden" name="sort" value="${esc(sort)}">
 <input type="hidden" name="dir" value="${esc(dir.toLowerCase())}">
 <select name="limit">${PAGE_SIZES.map((n) => `<option value="${n}"${n === limit ? ' selected' : ''}>${n} / page</option>`).join('')}</select>
 <button type="submit">Filter</button>
 ${q ? '<a href="/">clear</a>' : ''}
</form>
<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
<div class="pager">
 <a class="${offset === 0 ? 'off' : ''}" href="${esc(link({ offset: '0' }))}">« first</a>
 <a class="${offset === 0 ? 'off' : ''}" href="${esc(link({ offset: String(prev) }))}">‹ prev</a>
 <span>${from}–${to} of ${total}</span>
 <a class="${next >= total ? 'off' : ''}" href="${esc(link({ offset: String(next) }))}">next ›</a>
</div>
<div class="warn">Debug surface: unauthenticated, serves the whole table. Loopback only — do not tunnel or port-forward.</div>
</body></html>`;
}

const server = http.createServer((req, res) => {
	// Only loopback can reach the socket, but a browser pointed at a hostname that
	// resolves to 127.0.0.1 would still be served. Requiring a loopback Host closes
	// that, which matters because there is no authentication behind it.
	const host = (req.headers.host ?? '').split(':')[0];
	if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host)) {
		res.writeHead(403, { 'content-type': 'text/plain' });
		return res.end('Loopback host required.\n');
	}
	if (req.method !== 'GET') {
		res.writeHead(405, { 'content-type': 'text/plain', allow: 'GET' });
		return res.end('Read-only.\n');
	}

	const url = new URL(req.url, `http://${HOST}:${PORT}`);
	if (url.pathname === '/favicon.ico') {
		res.writeHead(204);
		return res.end();
	}
	if (url.pathname !== '/') {
		res.writeHead(404, { 'content-type': 'text/plain' });
		return res.end('Not found.\n');
	}

	const q = (url.searchParams.get('q') ?? '').slice(0, 200);
	const askedSort = url.searchParams.get('sort') ?? 'id';
	const sort = SORTABLE.has(askedSort) ? askedSort : 'id';
	const dir = (url.searchParams.get('dir') ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
	const askedLimit = Number(url.searchParams.get('limit'));
	const limit = PAGE_SIZES.includes(askedLimit) ? askedLimit : 50;
	const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);

	try {
		const { total, rows } = query({ q, sort, dir, limit, offset });
		res.writeHead(200, {
			'content-type': 'text/html; charset=utf-8',
			'cache-control': 'no-store',
			'x-frame-options': 'DENY',
		});
		res.end(page({ q, sort, dir, limit, offset, total, rows }));
	} catch (e) {
		res.writeHead(500, { 'content-type': 'text/plain' });
		res.end(`Query failed: ${e.message}\n`);
	}
});

server.listen(PORT, HOST, () => {
	console.log(`activity_event viewer  http://${HOST}:${PORT}`);
	console.log(`database               ${DB_PATH} (read-only)`);
	console.log(`columns                ${COLUMNS.join(', ')}`);
	console.log('Loopback only, unauthenticated. Ctrl-C to stop.');
});
