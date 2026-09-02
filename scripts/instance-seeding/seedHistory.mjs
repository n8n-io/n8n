#!/usr/bin/env node
// Write a fortnight of history for a seeded instance: executions, assistant threads,
// and activity entries. Writes SQLite directly, because the public API has no create
// route for any of them, and because backdating needs `startedAt` set by hand.
//
// Run after `seed:account`. A live instance is fine, but prefer an idle one: SQLite
// serialises writers, so a busy instance can hold the write lock long enough to fail.

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// `flatted` is how n8n serialises run data. The format has cycles, so plain JSON
// would not round-trip. Resolved from the cli package rather than vendored.
const { stringify } = require(
	require.resolve('flatted', { paths: [path.join(REPO, 'packages/cli')] }),
);

const DB_PATH =
	process.env.DB_SQLITE_DATABASE ??
	path.join(process.env.N8N_USER_FOLDER ?? path.join(os.homedir(), '.n8n'), 'database.sqlite');

const SEED_PREFIX = '[seed] ';
const DAYS = Number(process.env.HISTORY_DAYS) || 14;

// Fixed seed and fixed clock, for the same reason the estate is fixed: an A/B eval
// compares two arms against one instance, which requires the instance not to move.
function makeRandom(seed) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const random = makeRandom(Number(process.env.SEED) || 1);

// The window has to end at the current time. n8n prunes threads after 30 days and
// executions past EXECUTIONS_DATA_MAX_AGE, so a fixed past date gets the whole
// fortnight deleted on the next start. Only timestamps move; the PRNG still decides
// what happens. HISTORY_NOW pins the window if you accept the pruning.
const NOW = process.env.HISTORY_NOW ? Date.parse(process.env.HISTORY_NOW) : Date.now();

const iso = (ms) => new Date(ms).toISOString().replace('T', ' ').replace('Z', '');
const pick = (arr) => arr[Math.floor(random() * arr.length)];
const uuid = () => {
	// Deterministic v4-shaped id. Not cryptographic; these are fixture ids.
	const hex = '0123456789abcdef';
	let s = '';
	for (let i = 0; i < 32; i++) s += hex[Math.floor(random() * 16)];
	return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`;
};

// One workflow fails its last run and two earlier ones, so "what broke?" has an
// answer. A uniformly green history has none.
const FAILING_WORKFLOW = 'Invoice Dunning';
const FAILURE = {
	node: 'Send Dunning Email',
	message: 'Forbidden - perhaps check your credentials?',
	description: 'The Gmail credential has no valid token. Reconnect the account.',
};

// An error must name a node that exists in its own workflow and say something that
// node could say. One shared message produces records that contradict themselves.
const NODE_FAILURES = {
	'n8n-nodes-base.gmail': {
		message: 'Forbidden - perhaps check your credentials?',
		description: 'The Gmail credential has no valid token. Reconnect the account.',
	},
	'n8n-nodes-base.slack': {
		message: 'Bad request - please check your parameters',
		description: 'channel_not_found: the bot is not a member of that channel.',
	},
	'n8n-nodes-base.linear': {
		message: 'Authorization failed - please check your credentials',
		description: 'The Linear API key was rejected.',
	},
	'n8n-nodes-base.httpRequest': {
		message: 'The service refused the connection - perhaps it is offline',
		description: 'connect ETIMEDOUT: the enrichment API did not respond.',
	},
	'n8n-nodes-base.dataTable': {
		message: 'Bad request - please check your parameters',
		description: 'The referenced column does not exist on this data table.',
	},
	'@n8n/n8n-nodes-langchain.agent': {
		message: 'Bad request - please check your parameters',
		description: 'The model returned no output for this prompt.',
	},
};

const GENERIC_FAILURE = {
	message: 'The service was not able to process your request',
	description: 'The node returned an unexpected response.',
};

/** Pick a node in this workflow that can plausibly fail, and an error to match. */
function failureFor(wf, isDesignated) {
	const candidates = wf.nodes.filter((n) => !n.type.includes('lmChat') && NODE_FAILURES[n.type]);
	if (isDesignated) {
		const node = wf.nodes.find((n) => n.name === FAILURE.node);
		if (node) return { node: FAILURE.node, ...FAILURE };
	}
	if (candidates.length === 0) return null;
	const node = pick(candidates);
	return { node: node.name, ...(NODE_FAILURES[node.type] ?? GENERIC_FAILURE) };
}

function runData(wf, failure) {
	const nodes = wf.nodes.filter((n) => !n.type.includes('lmChat'));
	const runData = {};
	for (const n of nodes) {
		// Stop before the failing node: a run that broke never produced output past it.
		if (failure && n.name === failure.node) break;
		runData[n.name] = [
			{
				hints: [],
				startTime: NOW,
				executionTime: 40 + Math.floor(random() * 400),
				source: [null],
				executionStatus: 'success',
				data: { main: [[{ json: { seeded: true }, pairedItem: { item: 0 } }]] },
			},
		];
	}
	const result = { resultData: { runData, lastNodeExecuted: Object.keys(runData).pop() } };
	if (failure) {
		result.resultData.error = {
			level: 'warning',
			tags: { packageName: 'nodes-base' },
			message: failure.message,
			description: failure.description,
			node: { name: failure.node },
			name: 'NodeApiError',
		};
		result.resultData.lastNodeExecuted = failure.node;
	}
	return result;
}

function main() {
	const db = new DatabaseSync(DB_PATH);
	db.exec('PRAGMA foreign_keys = ON');

	const workflows = db
		.prepare('SELECT id, name, nodes FROM workflow_entity WHERE name LIKE ? ORDER BY name')
		.all(`${SEED_PREFIX}%`)
		.map((w) => ({ ...w, nodes: JSON.parse(w.nodes) }));

	if (workflows.length === 0) {
		console.error(`No ${SEED_PREFIX} workflows in ${DB_PATH}. Run seed:account first.`);
		process.exit(1);
	}

	const project = db
		.prepare("SELECT id FROM project WHERE name LIKE ? AND type = 'team' LIMIT 1")
		.get(`${SEED_PREFIX}%`);
	const user = db.prepare('SELECT id FROM user ORDER BY createdAt LIMIT 1').get();
	if (!project || !user) {
		console.error('Could not find the seeded project or an owner user.');
		process.exit(1);
	}

	console.log(`Database: ${DB_PATH}`);
	console.log(`Workflows: ${workflows.length}, project ${project.id}`);

	// Clear and rewrite in one transaction. Split apart, a failed insert rolls back the
	// new history while the deletes stay committed, leaving nothing behind.
	// Outside the transaction block so the summary after the catch can read them.
	let execCount = 0;
	let failCount = 0;
	let threadCount = 0;
	let msgCount = 0;
	let actCount = 0;

	db.exec('BEGIN');
	try {
		const wfIds = workflows.map((w) => w.id);
		const placeholders = wfIds.map(() => '?').join(',');
		const priorExec = db
			.prepare(`SELECT id FROM execution_entity WHERE workflowId IN (${placeholders})`)
			.all(...wfIds)
			.map((r) => r.id);
		if (priorExec.length > 0) {
			const p = priorExec.map(() => '?').join(',');
			db.prepare(`DELETE FROM execution_data WHERE executionId IN (${p})`).run(...priorExec);
			db.prepare(`DELETE FROM execution_entity WHERE id IN (${p})`).run(...priorExec);
		}
		// Cleared by project, not workflow id. Re-seeding replaces the workflows with
		// fresh ids, so anything keyed on those orphans the old rows, and the seeded ids
		// then collide. Executions cascade when their workflow is deleted.
		const priorThreads = db
			.prepare('SELECT id FROM instance_ai_threads WHERE projectId = ?')
			.all(project.id)
			.map((r) => r.id);
		if (priorThreads.length > 0) {
			const p = priorThreads.map(() => '?').join(',');
			db.prepare(`DELETE FROM instance_ai_messages WHERE threadId IN (${p})`).run(...priorThreads);
			db.prepare(`DELETE FROM instance_ai_threads WHERE id IN (${p})`).run(...priorThreads);
		}
		const clearedActivity = db
			.prepare('DELETE FROM activity_event WHERE projectId = ?')
			.run(project.id);
		console.log(
			`Cleared prior: ${priorExec.length} executions, ${priorThreads.length} threads, ${clearedActivity.changes} activity entries`,
		);

		const insExec = db.prepare(`
		INSERT INTO execution_entity
			(workflowId, finished, mode, startedAt, stoppedAt, status, createdAt,
			 storedAt, jsonSizeBytes, binaryDataSizeBytes, usedPrivateCredentials)
		VALUES (?, ?, ?, ?, ?, ?, ?, 'db', ?, 0, 0)
	`);
		const insExecData = db.prepare(
			'INSERT INTO execution_data (executionId, workflowData, data) VALUES (?, ?, ?)',
		);
		const insThread = db.prepare(`
		INSERT INTO instance_ai_threads (id, resourceId, projectId, title, metadata, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`);
		const insMessage = db.prepare(`
		INSERT INTO instance_ai_messages (id, threadId, content, role, type, resourceId, createdAt, updatedAt)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`);
		const insActivity = db.prepare(`
		INSERT INTO activity_event
			(category, action, typeVersion, userId, projectId, resourceType, resourceId, resourceName, data, createdAt)
		VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
	`);

		for (const wf of workflows) {
			const short = wf.name.replace(SEED_PREFIX, '');
			const isFailing = short === FAILING_WORKFLOW;

			// Scheduled workflows run often, webhook-driven ones sporadically.
			const scheduled = wf.nodes.some((n) => n.type === 'n8n-nodes-base.scheduleTrigger');
			const runs = scheduled ? DAYS * 2 : Math.ceil(DAYS / 2);

			for (let i = 0; i < runs; i++) {
				// Newest run is i = 0, walking backwards across the window.
				const ageMs = (i * DAYS * 86400e3) / runs + Math.floor(random() * 3600e3);
				const startedAt = NOW - ageMs;
				const duration = 400 + Math.floor(random() * 4000);

				// The failing workflow breaks on its newest run and twice more; everything
				// else fails rarely, so the estate looks used rather than synthetic.
				const shouldFail = isFailing ? i === 0 || i === 3 || i === 7 : random() < 0.04;
				const failure = shouldFail ? failureFor(wf, isFailing) : null;
				const failed = failure !== null;
				const status = failed ? 'error' : 'success';

				const info = insExec.run(
					wf.id,
					failed ? 0 : 1,
					scheduled ? 'trigger' : 'webhook',
					iso(startedAt),
					iso(startedAt + duration),
					status,
					iso(startedAt),
					0,
				);
				const data = runData(wf, failure);
				const serialised = stringify(data);
				insExecData.run(
					Number(info.lastInsertRowid),
					JSON.stringify({
						id: wf.id,
						name: wf.name,
						nodes: wf.nodes,
						connections: {},
						active: true,
						settings: { executionOrder: 'v1' },
					}),
					serialised,
				);
				execCount++;
				if (failed) failCount++;
			}

			// One thread for each workflow, phrased as a developer talking about that
			// workflow, so a "what was I working on?" probe has something to find.
			const threadId = uuid();
			const threadAt = NOW - Math.floor(random() * DAYS * 86400e3);
			insThread.run(
				threadId,
				wf.id,
				project.id,
				`Working on ${short}`,
				JSON.stringify({ seeded: true }),
				iso(threadAt),
				iso(threadAt + 600e3),
			);
			threadCount++;

			const turns = isFailing
				? [
						['user', `${short} stopped working. What is going on?`],
						[
							'assistant',
							`The last three runs of ${short} failed at **${FAILURE.node}** with "${FAILURE.message}". ${FAILURE.description}`,
						],
						['user', 'Can you keep the rest of the flow running while I fix the credential?'],
						[
							'assistant',
							'You can set "Continue on Fail" on that node, so the Slack notification and the audit row still run.',
						],
					]
				: [
						['user', `Add a step to ${short} that records the run in a data table.`],
						[
							'assistant',
							`Added a Data Table insert named "Record Run" at the end of ${short}, writing to \`automation_runs\`, matching the other workflows here.`,
						],
					];
			for (const [role, content] of turns) {
				insMessage.run(
					uuid(),
					threadId,
					content,
					role,
					'message',
					wf.id,
					iso(threadAt),
					iso(threadAt),
				);
				msgCount++;
			}

			// Activity entries. Only `workflow` and `credential` categories exist:
			// executions are deliberately not in the vocabulary, because
			// `execution_entity` already indexes the read a feed wants.
			const createdAt = NOW - DAYS * 86400e3 - Math.floor(random() * 7 * 86400e3);
			insActivity.run(
				'workflow',
				'created',
				user.id,
				project.id,
				'workflow',
				wf.id,
				wf.name,
				JSON.stringify({ nodeCount: wf.nodes.length }),
				iso(createdAt),
			);
			actCount++;
			const savedAt = NOW - Math.floor(random() * DAYS * 86400e3);
			insActivity.run(
				'workflow',
				'saved',
				user.id,
				project.id,
				'workflow',
				wf.id,
				wf.name,
				JSON.stringify({ nodeCount: wf.nodes.length }),
				iso(savedAt),
			);
			actCount++;
			insActivity.run(
				'workflow',
				'published',
				user.id,
				project.id,
				'workflow',
				wf.id,
				wf.name,
				JSON.stringify({ nodeCount: wf.nodes.length }),
				iso(savedAt + 60e3),
			);
			actCount++;
		}

		// Credential activity, so the feed is not workflow-only.
		for (const cred of db
			.prepare('SELECT id, name FROM credentials_entity WHERE name LIKE ?')
			.all(`${SEED_PREFIX}%`)) {
			insActivity.run(
				'credential',
				'created',
				user.id,
				project.id,
				'credential',
				cred.id,
				cred.name,
				null,
				iso(NOW - DAYS * 86400e3 - 86400e3),
			);
			actCount++;
		}

		db.exec('COMMIT');
	} catch (e) {
		db.exec('ROLLBACK');
		console.error('Rolled back:', e.message);
		process.exit(1);
	}

	console.log(`Executions: ${execCount} (${failCount} failed)`);
	console.log(`AI threads: ${threadCount}, messages: ${msgCount}`);
	console.log(`Activity entries: ${actCount}`);
	console.log(`Newest failure: "${SEED_PREFIX}${FAILING_WORKFLOW}" at ${FAILURE.node}`);
	db.close();
}

main();
