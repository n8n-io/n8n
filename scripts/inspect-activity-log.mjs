#!/usr/bin/env node
/**
 * A one-page viewer for the `activity_event` table: every column, paginated, filterable, sortable.
 *
 * Deliberately standalone rather than a view in the editor UI. An in-app page would need a route,
 * a store, an API client, a scope-gated endpoint, i18n strings and tests — a lot of product surface
 * for a table you want to eyeball while working on it. This is one file, no build step, no
 * dependency, and it reads the database directly so what you see is what is stored.
 *
 * Usage
 * -----
 *   pnpm inspect:activity                # http://127.0.0.1:5699
 *   PORT=6000 pnpm inspect:activity
 *
 * Read-only: every query is a SELECT, and the page has no way to send anything else.
 *
 * Local only, and unauthenticated by design — it binds to 127.0.0.1 so nothing outside this
 * machine can reach it. Do not put it behind a tunnel or a reverse proxy; the whole table,
 * including who did what and in which project, is served to anyone who can open the port.
 */
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT ?? 5699);
const HOST = '127.0.0.1';

/**
 * Sortable columns, as an allowlist. A column name cannot be a bound parameter, so it is
 * interpolated — which means it has to come from here and nowhere else.
 */
const COLUMNS = [
	{ key: 'id', label: 'id', align: 'right' },
	{ key: 'createdAt', label: 'created', align: 'left' },
	{ key: 'category', label: 'category', align: 'left' },
	{ key: 'action', label: 'action', align: 'left' },
	{ key: 'resourceType', label: 'resource', align: 'left' },
	{ key: 'resourceName', label: 'name', align: 'left' },
	{ key: 'resourceId', label: 'resource id', align: 'left' },
	{ key: 'userId', label: 'user', align: 'left' },
	{ key: 'projectId', label: 'project', align: 'left' },
	{ key: 'typeVersion', label: 'v', align: 'right' },
	{ key: 'data', label: 'detail', align: 'left' },
];
const SORTABLE = new Set(COLUMNS.map((c) => c.key));
const PAGE_SIZES = [25, 50, 100, 250];

function n8nFolder() {
	const homeVar = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
	const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVar] ?? process.cwd();
	return path.join(userHome, '.n8n');
}

const dbFile = path.join(n8nFolder(), process.env.DB_SQLITE_DATABASE ?? 'database.sqlite');
if (!existsSync(dbFile)) {
	console.error(`\n  No SQLite database at ${dbFile}.\n`);
	process.exit(1);
}

/** Opened per request so the page always shows current rows, and nothing holds a write lock. */
function withDb(fn) {
	const db = new DatabaseSync(dbFile, { readOnly: true });
	try {
		return fn(db);
	} finally {
		db.close();
	}
}

const tableExists = withDb((db) =>
	Boolean(
		db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='activity_event'").get(),
	),
);

if (!tableExists) {
	const applied = withDb((db) =>
		Boolean(db.prepare("SELECT 1 FROM migrations WHERE name LIKE '%ActivityEvent%' LIMIT 1").get()),
	);
	console.error(`\n  ${dbFile} has no activity_event table.`);
	console.error(
		applied
			? '  The migration is recorded as applied but the table is gone — check the database.\n'
			: '  n8n applies migrations on startup, so start n8n once from this worktree and try again.\n',
	);
	process.exit(1);
}

/**
 * The free-text box searches every column a person would type into, `data` included, so a run id
 * or a failing node name finds its entry without knowing which field holds it.
 */
const SEARCHABLE = [
	'category',
	'action',
	'resourceType',
	'resourceName',
	'resourceId',
	'userId',
	'projectId',
	'data',
];

function readRows(params) {
	const page = Math.max(1, Number(params.get('page') ?? 1));
	const pageSize = PAGE_SIZES.includes(Number(params.get('pageSize')))
		? Number(params.get('pageSize'))
		: PAGE_SIZES[1];
	const sort = SORTABLE.has(params.get('sort')) ? params.get('sort') : 'id';
	const direction = params.get('dir') === 'asc' ? 'ASC' : 'DESC';
	const query = (params.get('q') ?? '').trim();
	const category = (params.get('category') ?? '').trim();
	const action = (params.get('action') ?? '').trim();

	const where = [];
	const binds = [];
	if (query) {
		where.push(`(${SEARCHABLE.map((c) => `IFNULL("${c}", '') LIKE ?`).join(' OR ')})`);
		for (const _ of SEARCHABLE) binds.push(`%${query}%`);
	}
	if (category) {
		where.push('"category" = ?');
		binds.push(category);
	}
	if (action) {
		where.push('"action" = ?');
		binds.push(action);
	}
	const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

	return withDb((db) => {
		const { total } = db
			.prepare(`SELECT COUNT(*) AS total FROM "activity_event" ${clause}`)
			.get(...binds);
		const rows = db
			.prepare(
				`SELECT ${COLUMNS.map((c) => `"${c.key}"`).join(', ')} FROM "activity_event" ${clause}
				 ORDER BY "${sort}" ${direction}, "id" ${direction}
				 LIMIT ? OFFSET ?`,
			)
			.all(...binds, pageSize, (page - 1) * pageSize);

		// The dropdowns list what is actually in the table, unfiltered, so choosing one never
		// removes the option you would need to get back.
		const categories = db
			.prepare('SELECT DISTINCT "category" AS v FROM "activity_event" ORDER BY 1')
			.all();
		const actions = db
			.prepare('SELECT DISTINCT "action" AS v FROM "activity_event" ORDER BY 1')
			.all();

		return {
			rows,
			total,
			page,
			pageSize,
			sort,
			dir: direction.toLowerCase(),
			pages: Math.max(1, Math.ceil(total / pageSize)),
			categories: categories.map((r) => r.v),
			actions: actions.map((r) => r.v),
		};
	});
}

/**
 * One self-contained page: no build step, no CDN, no framework. Note that everything below lives
 * inside a template literal, so a backtick anywhere in the markup, styles, script or comments
 * ends the string — which is a syntax error rather than a subtle bug, but an easy one to cause.
 */
const PAGE = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>activity_event</title>
<style>
	:root { color-scheme: light dark; --line: #8883; --dim: #8888; }
	* { box-sizing: border-box; }
	body { margin: 0; font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace; }
	header { display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
		padding: 10px 12px; border-bottom: 1px solid var(--line); position: sticky; top: 0;
		background: Canvas; z-index: 2; }
	header .grow { flex: 1; }
	input, select, button { font: inherit; padding: 4px 6px; border: 1px solid var(--line);
		border-radius: 4px; background: Canvas; color: CanvasText; }
	input[type=search] { min-width: 260px; }
	button { cursor: pointer; }
	button:disabled { opacity: .4; cursor: default; }
	.count { color: var(--dim); }
	table { border-collapse: collapse; width: 100%; }
	th, td { text-align: left; padding: 5px 8px; border-bottom: 1px solid var(--line);
		vertical-align: top; white-space: nowrap; }
	th { position: sticky; top: 43px; background: Canvas; cursor: pointer; user-select: none;
		font-weight: 600; }
	th .arrow { color: var(--dim); }
	td.right, th.right { text-align: right; }
	td.detail { white-space: pre-wrap; min-width: 34ch; color: var(--dim); }
	td.name { max-width: 32ch; overflow: hidden; text-overflow: ellipsis; }
	/* Ids repeat unchanged down the page, so they get a ceiling and the width goes to detail.
	   The full value stays in the title attribute. */
	td.ident { max-width: 14ch; overflow: hidden; text-overflow: ellipsis; }
	tr:hover td { background: #8881; }
	.mono-dim { color: var(--dim); }
	.empty { padding: 24px 12px; color: var(--dim); }
</style>
</head>
<body>
<header>
	<input type="search" id="q" placeholder="filter any column, including detail" autofocus>
	<select id="category"><option value="">every category</option></select>
	<select id="action"><option value="">every action</option></select>
	<span class="grow"></span>
	<span class="count" id="count"></span>
	<select id="pageSize"></select>
	<button id="prev" title="previous page">&larr;</button>
	<span class="count" id="pageLabel"></span>
	<button id="next" title="next page">&rarr;</button>
</header>
<table>
	<thead><tr id="head"></tr></thead>
	<tbody id="body"></tbody>
</table>
<div class="empty" id="empty" hidden>Nothing matches that filter.</div>
<script>
const COLUMNS = __COLUMNS__;
const PAGE_SIZES = __PAGE_SIZES__;
const state = { page: 1, pageSize: PAGE_SIZES[1], sort: 'id', dir: 'desc', q: '', category: '', action: '' };
let debounce;

const el = (id) => document.getElementById(id);
el('pageSize').innerHTML = PAGE_SIZES.map((n) => '<option value="' + n + '">' + n + ' rows</option>').join('');
el('pageSize').value = state.pageSize;

/** Relative age is what makes a feed readable; the absolute timestamp stays in the title. */
function age(value) {
	if (!value) return '';
	const then = new Date(value.replace(' ', 'T') + 'Z');
	const mins = Math.round((Date.now() - then.getTime()) / 60000);
	if (!Number.isFinite(mins)) return value;
	if (mins < 60) return Math.max(0, mins) + 'm ago';
	if (mins < 60 * 24) return Math.floor(mins / 60) + 'h ago';
	return Math.floor(mins / 1440) + 'd ago';
}

function renderHead() {
	el('head').innerHTML = COLUMNS.map((c) => {
		const active = state.sort === c.key;
		const arrow = active ? (state.dir === 'asc' ? ' \\u2191' : ' \\u2193') : '';
		return '<th data-key="' + c.key + '" class="' + (c.align === 'right' ? 'right' : '') + '">' +
			c.label + '<span class="arrow">' + arrow + '</span></th>';
	}).join('');
	for (const th of el('head').children) {
		th.onclick = () => {
			const key = th.dataset.key;
			state.dir = state.sort === key && state.dir === 'desc' ? 'asc' : 'desc';
			state.sort = key;
			state.page = 1;
			load();
		};
	}
}

function cell(column, row) {
	const raw = row[column.key];
	if (raw === null || raw === undefined) return '<td class="mono-dim">·</td>';
	if (column.key === 'createdAt') {
		return '<td title="' + raw + '">' + age(raw) + '</td>';
	}
	if (column.key === 'data') {
		let text = raw;
		try { text = JSON.stringify(JSON.parse(raw)); } catch {}
		return '<td class="detail">' + escapeHtml(text) + '</td>';
	}
	// Only the uuids that repeat unchanged down the page. The resource id is the one you
	// cross-reference against a workflow or execution, so it keeps its full width.
	const IDENT = ['userId', 'projectId'];
	const cls = (column.align === 'right' ? 'right' : '') +
		(column.key === 'resourceName' ? ' name' : '') +
		(IDENT.includes(column.key) ? ' ident' : '');
	return '<td class="' + cls + '" title="' + escapeHtml(String(raw)) + '">' + escapeHtml(String(raw)) + '</td>';
}

function escapeHtml(value) {
	return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

function fillOptions(select, values, keep) {
	const first = select.querySelector('option').outerHTML;
	select.innerHTML = first + values.map((v) => '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>').join('');
	select.value = keep;
}

async function load() {
	const params = new URLSearchParams({
		page: state.page, pageSize: state.pageSize, sort: state.sort, dir: state.dir,
		q: state.q, category: state.category, action: state.action,
	});
	const result = await (await fetch('/api/rows?' + params)).json();

	state.page = result.page;
	renderHead();
	el('body').innerHTML = result.rows
		.map((row) => '<tr>' + COLUMNS.map((c) => cell(c, row)).join('') + '</tr>')
		.join('');
	el('empty').hidden = result.rows.length > 0;
	el('count').textContent = result.total + (result.total === 1 ? ' entry' : ' entries');
	el('pageLabel').textContent = result.page + ' / ' + result.pages;
	el('prev').disabled = result.page <= 1;
	el('next').disabled = result.page >= result.pages;
	fillOptions(el('category'), result.categories, state.category);
	fillOptions(el('action'), result.actions, state.action);
}

el('q').oninput = (e) => {
	clearTimeout(debounce);
	debounce = setTimeout(() => { state.q = e.target.value; state.page = 1; load(); }, 150);
};
for (const key of ['category', 'action']) {
	el(key).onchange = (e) => { state[key] = e.target.value; state.page = 1; load(); };
}
el('pageSize').onchange = (e) => { state.pageSize = Number(e.target.value); state.page = 1; load(); };
el('prev').onclick = () => { state.page -= 1; load(); };
el('next').onclick = () => { state.page += 1; load(); };

load();
</script>
</body>
</html>`;

const server = createServer((req, res) => {
	const url = new URL(req.url, `http://${HOST}:${PORT}`);

	if (url.pathname === '/api/rows') {
		try {
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(readRows(url.searchParams)));
		} catch (error) {
			res.writeHead(500, { 'content-type': 'application/json' });
			res.end(JSON.stringify({ error: error.message }));
		}
		return;
	}

	if (url.pathname === '/') {
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
		res.end(
			PAGE.replace('__COLUMNS__', JSON.stringify(COLUMNS)).replace(
				'__PAGE_SIZES__',
				JSON.stringify(PAGE_SIZES),
			),
		);
		return;
	}

	// A browser asks for this unprompted; answering keeps the console clean.
	if (url.pathname === '/favicon.ico') {
		res.writeHead(204).end();
		return;
	}

	res.writeHead(404).end();
});

server.listen(PORT, HOST, () => {
	const { total } = withDb((db) =>
		db.prepare('SELECT COUNT(*) AS total FROM "activity_event"').get(),
	);
	console.log(`\n  activity_event   ${total} entries in ${dbFile}`);
	console.log(`  viewer           http://${HOST}:${PORT}`);
	console.log('  read-only, local only. Ctrl-C to stop.\n');
});
