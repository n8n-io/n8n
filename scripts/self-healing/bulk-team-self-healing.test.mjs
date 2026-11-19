import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('./bulk-team-self-healing.js', import.meta.url), 'utf8');
const target = { id: 'reviewer', email: 'reviewer@example.invalid' };
const operator = { id: 'operator', email: 'operator@example.invalid' };
const scopes = ['project:update', 'workflow:read', 'workflow:update', 'execution:read'];
const all = (id, fields = {}) => ({
	id,
	scope: 'all',
	enabled: true,
	workflowIds: [],
	reviewerIds: [operator.id],
	includeAllProjectMembers: false,
	includeSubWorkflows: false,
	...fields,
});
const selected = (id, fields = {}) => all(id, { scope: 'selected', workflowIds: ['w'], ...fields });
const apply = { apply: true };
const exclusive = { apply: true, exclusiveEdits: true };
const ok = (data) => Response.json({ data });
const refuse = (status) => Response.json({ message: 'refused' }, { status });

function fixture(options = {}) {
	const projects = Array.from({ length: options.count ?? 1 }, (_, i) => ({
		id: String(i + 1),
		type: 'team',
		name: 'Team ' + (i + 1),
	}));
	const rows = new Map(projects.map((p) => [p.id, structuredClone(options.rows ?? [])]));
	const requests = [],
		writes = [],
		tables = [];
	const reviewers = options.reviewers ?? [operator, target];
	const fetch = async (path, init) => {
		assert.equal(init.credentials, 'same-origin');
		assert.equal(init.headers['browser-id'], 'test');
		const url = new URL(path, 'https://example.invalid');
		const [, , resource, id, feature, item, toggle] = url.pathname.split('/');
		const method = init.method;
		requests.push([method, path]);
		if (resource === 'login') return ok(operator);
		if (resource === 'settings') return ok({ versionCli: options.version ?? '2.49.2' });
		if (id === 'count') return ok({ team: projects.length + (options.hidden ?? 0) });
		if (!id) {
			assert.equal(url.search, '?type=team');
			if (options.inventoryFailure) return refuse(503);
			return ok([...projects, { type: 'personal', id: 'p' }]);
		}
		assert(rows.has(id), 'touched a non-team project');
		if (!feature) return ok({ scopes: options.scopes ?? scopes });
		assert.equal(feature, 'self-healing-configurations');
		const configs = rows.get(id);
		const cfg = configs.find((c) => c.id === Number(item));
		const body = init.body && JSON.parse(init.body);
		if (method === 'GET') {
			if (options.failTeam === id) return new Response('proxy', { status: 502 });
			if (item === 'options') return ok({ reviewers, workflows: [{ id: 'w' }] });
			if (item) options.beforeDetail?.(cfg);
			return ok(item ? cfg : configs);
		}
		if (options.reject?.(method, item, toggle)) return refuse(403);
		if (method === 'POST') {
			const c = all(999, body);
			configs.push(c);
			writes.push([method, id, c.id]);
			if (options.lostReply) throw new TypeError('network failure');
			if (options.dropsSubWorkflows) delete c.includeSubWorkflows;
			return ok(c);
		}
		assert.equal(method, 'PATCH');
		if (!toggle) {
			assert(body.workflowIds.every((w) => w === 'w'));
			assert(body.reviewerIds.every((r) => reviewers.some((u) => u.id === r)));
		}
		Object.assign(cfg, body);
		writes.push([toggle || method, id, cfg.id]);
		return ok(cfg);
	};
	const fn = runInNewContext(source + '\nbulkTeamSelfHealing', {
		location: { origin: 'https://internal.users.n8n.cloud' },
		localStorage: { getItem: () => 'test' },
		fetch,
		console: {
			info() {},
			table(data) {
				tables.push(data);
			},
		},
	});
	return {
		run: (opts, email = target.email) => fn(email, opts),
		rows: rows.get('1'),
		projects,
		requests,
		writes,
		tables,
	};
}

test('preview is read-only and identifies operator and delegated reviewer', async () => {
	const s = fixture();
	const { summary, entries } = await s.run();
	assert.equal(summary.operator, operator.email);
	assert.equal(summary.reviewer, target.email);
	assert.equal(entries[0].status, 'Planned');
	assert.match(entries[0].action, /sub-workflow repair/);
	assert.equal(s.writes.length, 0);
});

test('creates with editor defaults, reports its ID, then reruns without writes', async () => {
	const s = fixture();
	const { entries, summary } = await s.run(apply);
	assert.equal(summary.completed, 1);
	assert.equal(entries[0].configuration, 999);
	assert.equal(s.rows[0].includeSubWorkflows, true);
	assert.equal(s.rows[0].enabled, true);
	assert.deepEqual(s.rows[0].reviewerIds, [target.id]);
	await s.run(apply);
	assert.equal(s.writes.length, 1);
});

for (const key of ['apply', 'exclusiveEdits']) {
	test('rejects string ' + key + ' before discovery', async () => {
		const s = fixture();
		await assert.rejects(s.run({ [key]: 'false' }), /booleans/);
		assert.equal(s.requests.length, 0);
	});
}

test('partial visibility gets a preview count and zero apply writes', async () => {
	const s = fixture({ hidden: 2 });
	assert.equal((await s.run()).summary.unprocessed, 2);
	const { summary } = await s.run(apply);
	assert.equal(summary.totalTeams, 3);
	assert.match(summary.stopped, /visibility/);
	assert.equal(s.writes.length, 0);
});

test('uses a single inventory for more than one hundred teams and skips personal projects', async () => {
	const s = fixture({ count: 103 });
	const { summary } = await s.run(apply);
	assert.equal(summary.completed, 103);
	assert.equal(s.writes.length, 103);
	assert.equal(s.requests.filter(([, path]) => path.includes('?')).length, 1);
});

test('inventory failure ends before the first write and produces a report', async () => {
	const s = fixture({ inventoryFailure: true });
	assert.match((await s.run(apply)).summary.stopped, /HTTP 503/);
	assert.equal(s.writes.length, 0);
	assert.equal(s.tables.length, 2);
});

test('concurrent editor is protected by default and a dependent enable is withheld', async () => {
	const s = fixture({
		rows: [all(1, { enabled: false })],
		beforeDetail(c) {
			c.includeSubWorkflows = true;
		},
	});
	assert.equal((await s.run()).entries[0].status, 'Blocked');
	const { summary } = await s.run(apply);
	assert.equal(summary.incomplete, 1);
	assert.equal(s.writes.length, 0);
	assert.equal(s.rows[0].includeSubWorkflows, true);
	assert.equal(s.rows[0].enabled, false);
});

test('coordinated window preserves saved settings, adds reviewer before enable and respects a selection pause', async () => {
	const s = fixture({
		rows: [all(1, { enabled: false }), selected(2, { enabled: false, includeSubWorkflows: true })],
	});
	await s.run(exclusive);
	assert.deepEqual(
		s.writes.map(([verb]) => verb),
		['PATCH', 'enabled', 'PATCH'],
	);
	assert.equal(s.rows[0].includeSubWorkflows, false);
	assert.equal(s.rows[1].includeSubWorkflows, true);
	assert.equal(s.rows[1].enabled, false);
	assert.deepEqual(s.rows[1].reviewerIds, [operator.id, target.id]);
	assert.deepEqual(s.rows[1].workflowIds, ['w']);
	await s.run(exclusive);
	assert.equal(s.writes.length, 3);
});

for (const fields of [{ reviewerIds: ['departed'] }, { workflowIds: ['archived'] }]) {
	test('stale ' + Object.keys(fields)[0] + ' blocks one item in preview and apply', async () => {
		const s = fixture({
			rows: [selected(1, fields), all(2, { enabled: false, reviewerIds: [target.id] })],
		});
		const preview = await s.run({ exclusiveEdits: true });
		assert.match(preview.entries[0].action, /departed|archived/);
		const { summary, entries } = await s.run(exclusive);
		assert.equal(summary.incomplete, 1);
		assert.equal(entries[0].status, 'Blocked');
		assert.deepEqual(s.writes, [['enabled', '1', 2]]);
	});
}

test('group coverage skips replacement and can enable despite a stale explicit reviewer', async () => {
	const s = fixture({
		rows: [all(1, { enabled: false, includeAllProjectMembers: true, reviewerIds: ['departed'] })],
	});
	await s.run(apply);
	assert.deepEqual(s.writes, [['enabled', '1', 1]]);
});

test('a rejected create allows independent reviewer changes', async () => {
	const s = fixture({ rows: [selected(1)], reject: (m) => m === 'POST' });
	const { entries } = await s.run(exclusive);
	assert.equal(entries[0].status, 'Failed');
	assert.equal(entries[1].status, 'Applied');
	assert.deepEqual(s.writes, [['PATCH', '1', 1]]);
});

test('a successful create stays in the report after a rejected patch', async () => {
	const s = fixture({ rows: [selected(1)], reject: (m) => m === 'PATCH' });
	const { entries } = await s.run(exclusive);
	assert.equal(entries[0].status, 'Applied');
	assert.equal(entries[1].status, 'Failed');
	assert.match(entries[1].action, /403/);
});

test('a later proxy error keeps 100 acknowledged writes and includes the numeric status', async () => {
	const s = fixture({ count: 102, failTeam: '101' });
	const { summary, entries } = await s.run(apply);
	assert.equal(summary.completed, 100);
	assert.equal(summary.unprocessed, 1);
	assert.equal(summary.incomplete, 1);
	assert.equal(entries.filter((e) => e.status === 'Applied').length, 100);
	assert.match(summary.stopped, /HTTP 502/);
});

test('interrupted write is reported as unknown and is reconciled on rerun', async () => {
	const s = fixture({ lostReply: true });
	const { entries } = await s.run(apply);
	assert.equal(entries[0].status, 'Unknown outcome');
	assert.equal(s.rows.length, 1);
	await s.run(apply);
	assert.equal(s.writes.length, 1);
});

test('preview distinguishes enable authority from reviewer eligibility', async () => {
	const s = fixture({ scopes: scopes.filter((scope) => scope !== 'execution:read') });
	assert.match((await s.run()).entries[0].action, /execution:read/);
	await s.run(apply);
	assert.equal(s.writes.length, 0);
});

test('ignores null emails and skips projects where target is ineligible', async () => {
	const s = fixture({ reviewers: [{ id: 'empty', email: null }, operator] });
	assert.equal((await s.run(apply)).summary.skipped, 1);
	assert.equal(s.writes.length, 0);
});

for (const version of ['2.48.6', '3.2.0', 'unknown']) {
	test('stops before project writes on ' + version, async () => {
		const s = fixture({ version });
		const { summary } = await s.run(apply);
		assert.match(summary.stopped, /Sub-workflow repair requires/);
		assert.equal(summary.version, version);
		assert.equal(s.writes.length, 0);
	});
}

test('records the ID and stops if a server accepts creation but drops sub-workflow repair', async () => {
	const s = fixture({ count: 2, dropsSubWorkflows: true });
	const { summary, entries } = await s.run(apply);
	assert.match(summary.stopped, /Check the created configuration/);
	assert.equal(s.writes.length, 1);
	assert.equal(entries[0].configuration, 999);
	assert.equal(entries[0].status, 'Created with unexpected settings');
});
