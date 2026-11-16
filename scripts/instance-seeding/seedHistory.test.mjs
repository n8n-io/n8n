import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'seedHistory.mjs');
const SEED_PREFIX = '[seed] ';

// Only the tables and columns seedHistory reads or writes, with the foreign keys it
// relies on. It sets `PRAGMA foreign_keys = ON`, so the referenced tables have to
// exist and executions have to cascade from their workflow.
const SCHEMA = `
CREATE TABLE user (id varchar PRIMARY KEY, createdAt datetime(3) NOT NULL);
CREATE TABLE project (id varchar(36) PRIMARY KEY, name varchar(255) NOT NULL, type varchar(36) NOT NULL);
CREATE TABLE workflow_entity (id varchar(36) PRIMARY KEY, name varchar(128) NOT NULL, nodes text);
CREATE TABLE credentials_entity (id varchar(36) PRIMARY KEY, name varchar(128) NOT NULL);
CREATE TABLE execution_entity (
	id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	workflowId varchar(36) NOT NULL,
	finished boolean NOT NULL,
	mode varchar NOT NULL,
	startedAt datetime, stoppedAt datetime,
	status varchar NOT NULL,
	createdAt datetime(3) NOT NULL,
	storedAt varchar(2) NOT NULL DEFAULT ('db'),
	jsonSizeBytes bigint NOT NULL DEFAULT (0),
	binaryDataSizeBytes bigint NOT NULL DEFAULT (0),
	usedPrivateCredentials boolean NOT NULL DEFAULT FALSE,
	FOREIGN KEY (workflowId) REFERENCES workflow_entity (id) ON DELETE CASCADE
);
CREATE TABLE execution_data (
	executionId int PRIMARY KEY NOT NULL,
	workflowData text NOT NULL,
	data text NOT NULL,
	FOREIGN KEY (executionId) REFERENCES execution_entity (id) ON DELETE CASCADE
);
CREATE TABLE instance_ai_threads (
	id varchar PRIMARY KEY NOT NULL,
	resourceId varchar(255) NOT NULL,
	projectId varchar(36) NOT NULL,
	title text NOT NULL DEFAULT (''),
	metadata text,
	createdAt datetime(3) NOT NULL, updatedAt datetime(3) NOT NULL,
	FOREIGN KEY (projectId) REFERENCES project (id) ON DELETE CASCADE
);
CREATE TABLE instance_ai_messages (
	id varchar(36) PRIMARY KEY NOT NULL,
	threadId varchar NOT NULL,
	content text NOT NULL, role varchar(16) NOT NULL, type varchar(32),
	resourceId varchar(255),
	createdAt datetime(3) NOT NULL, updatedAt datetime(3) NOT NULL,
	FOREIGN KEY (threadId) REFERENCES instance_ai_threads (id) ON DELETE CASCADE
);
CREATE TABLE activity_event (
	id integer PRIMARY KEY NOT NULL,
	category varchar(32) NOT NULL, action varchar(64) NOT NULL,
	typeVersion integer NOT NULL DEFAULT (1),
	userId varchar, projectId varchar(36),
	resourceType varchar(32), resourceId varchar(36), resourceName text, data text,
	createdAt datetime(3) NOT NULL,
	FOREIGN KEY (userId) REFERENCES user (id) ON DELETE SET NULL,
	FOREIGN KEY (projectId) REFERENCES project (id) ON DELETE CASCADE
);
`;

const NODES = JSON.stringify([
	{
		name: 'Schedule Trigger',
		type: 'n8n-nodes-base.scheduleTrigger',
		typeVersion: 1.4,
		parameters: {},
	},
	{ name: 'Notify', type: 'n8n-nodes-base.slack', typeVersion: 2.7, parameters: {} },
]);

/**
 * A database holding a seeded project with two workflows, plus rows the seeder must
 * not touch: unmarked threads and activity inside the seeded project, and a marked
 * thread belonging to a different project.
 */
function fixture() {
	const file = join(mkdtempSync(join(tmpdir(), 'seed-history-')), 'database.sqlite');
	const db = new DatabaseSync(file);
	db.exec(SCHEMA);
	const now = '2026-01-01 00:00:00.000';

	db.exec(`
		INSERT INTO user (id, createdAt) VALUES ('u1', '${now}');
		INSERT INTO project (id, name, type) VALUES
			('p-seed', '${SEED_PREFIX}Automation Platform', 'team'),
			('p-other', 'Someone Else', 'team');
		INSERT INTO workflow_entity (id, name, nodes) VALUES
			('wf1', '${SEED_PREFIX}Alpha', '${NODES}'),
			('wf2', '${SEED_PREFIX}Beta', '${NODES}');
		INSERT INTO credentials_entity (id, name) VALUES ('c1', '${SEED_PREFIX}OpenAI');
	`);

	const thread = db.prepare(
		'INSERT INTO instance_ai_threads (id, resourceId, projectId, title, metadata, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?)',
	);
	// A developer's own conversation on a seeded workflow: same project, no marker.
	thread.run('t-real', 'wf1', 'p-seed', 'My real conversation', '{"seeded":false}', now, now);
	// Metadata is nullable, so the filter has to cope with NULL rather than throw.
	thread.run('t-null', 'wf2', 'p-seed', 'No metadata at all', null, now, now);
	// Marked, but in another project. Scoping must keep the seeder out of it.
	thread.run('t-other', 'wf9', 'p-other', 'Marked elsewhere', '{"seeded":true}', now, now);

	db.prepare(
		'INSERT INTO instance_ai_messages (id, threadId, content, role, type, resourceId, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,?)',
	).run('m-real', 't-real', 'do not delete me', 'user', 'message', 'wf1', now, now);

	const activity = db.prepare(
		'INSERT INTO activity_event (category, action, userId, projectId, resourceType, resourceId, resourceName, data, createdAt) VALUES (?,?,?,?,?,?,?,?,?)',
	);
	// Real activity in the seeded project: the relay would write rows like this.
	activity.run(
		'workflow',
		'saved',
		'u1',
		'p-seed',
		'workflow',
		'wf-real',
		'My Real Workflow',
		null,
		now,
	);
	// A null resourceName must not be swept up by a LIKE on that column.
	activity.run('workflow', 'saved', 'u1', 'p-seed', 'workflow', 'wf-anon', null, null, now);
	db.close();
	return file;
}

const run = (dbFile) =>
	execFileSync(process.execPath, [SCRIPT], {
		env: { ...process.env, DB_SQLITE_DATABASE: dbFile, HISTORY_DAYS: '2' },
		encoding: 'utf8',
	});

function counts(dbFile) {
	const db = new DatabaseSync(dbFile, { readOnly: true });
	const one = (sql) => db.prepare(sql).get().n;
	const out = {
		executions: one('SELECT COUNT(*) AS n FROM execution_entity'),
		executionData: one('SELECT COUNT(*) AS n FROM execution_data'),
		threads: one('SELECT COUNT(*) AS n FROM instance_ai_threads'),
		messages: one('SELECT COUNT(*) AS n FROM instance_ai_messages'),
		activity: one('SELECT COUNT(*) AS n FROM activity_event'),
		seededThreads: one(
			`SELECT COUNT(*) AS n FROM instance_ai_threads WHERE projectId = 'p-seed' AND metadata LIKE '%"seeded":true%'`,
		),
		seededActivity: one(
			`SELECT COUNT(*) AS n FROM activity_event WHERE projectId = 'p-seed' AND resourceName LIKE '[seed] %'`,
		),
	};
	const ids = (sql) =>
		db
			.prepare(sql)
			.all()
			.map((r) => r.id);
	out.threadIds = ids('SELECT id FROM instance_ai_threads ORDER BY id');
	db.close();
	return out;
}

const survivors = (dbFile) => {
	const db = new DatabaseSync(dbFile, { readOnly: true });
	const has = (sql, ...p) => db.prepare(sql).all(...p).length > 0;
	const out = {
		realThread: has(`SELECT 1 FROM instance_ai_threads WHERE id = 't-real'`),
		nullMetadataThread: has(`SELECT 1 FROM instance_ai_threads WHERE id = 't-null'`),
		otherProjectThread: has(`SELECT 1 FROM instance_ai_threads WHERE id = 't-other'`),
		realMessage: has(`SELECT 1 FROM instance_ai_messages WHERE id = 'm-real'`),
		realActivity: has(`SELECT 1 FROM activity_event WHERE resourceName = 'My Real Workflow'`),
		anonActivity: has(`SELECT 1 FROM activity_event WHERE resourceId = 'wf-anon'`),
	};
	db.close();
	return out;
};

describe('seedHistory cleanup', () => {
	it('writes history for the seeded workflows', () => {
		const dbFile = fixture();
		run(dbFile);
		const c = counts(dbFile);
		assert.equal(c.seededThreads, 2, 'one marked thread per seeded workflow');
		assert.ok(c.executions > 0, 'executions written');
		assert.equal(c.executionData, c.executions, 'every execution has its data row');
		assert.ok(c.seededActivity > 0, 'activity written');
	});

	// The assistant page lists threads by `resourceId = user id` and drops any message
	// whose `content` is not an agent-message JSON object, so both must match the runtime.
	it('writes threads and messages the assistant page can read', () => {
		const dbFile = fixture();
		run(dbFile);
		const db = new DatabaseSync(dbFile, { readOnly: true });
		const threads = db
			.prepare(
				`SELECT resourceId FROM instance_ai_threads WHERE metadata LIKE '%"seeded":true%' AND projectId = 'p-seed'`,
			)
			.all();
		assert.ok(threads.length > 0);
		assert.ok(
			threads.every((t) => t.resourceId === 'u1'),
			'threads owned by the first user',
		);
		const messages = db
			.prepare(
				`SELECT m.content, m.resourceId, m.type FROM instance_ai_messages m
				 JOIN instance_ai_threads t ON t.id = m.threadId
				 WHERE t.metadata LIKE '%"seeded":true%' AND t.projectId = 'p-seed'`,
			)
			.all();
		assert.ok(messages.length > 0);
		for (const m of messages) {
			assert.equal(m.resourceId, 'u1');
			assert.equal(m.type, null);
			const parsed = JSON.parse(m.content);
			assert.ok(['user', 'assistant'].includes(parsed.role));
			assert.equal(parsed.content[0].type, 'text');
		}
		db.close();
	});

	it('leaves rows it did not create alone', () => {
		const dbFile = fixture();
		run(dbFile);
		assert.deepEqual(survivors(dbFile), {
			realThread: true,
			nullMetadataThread: true,
			otherProjectThread: true,
			realMessage: true,
			realActivity: true,
			anonActivity: true,
		});
	});

	// Re-running used to stack a second fortnight on the first, and later to collide
	// on primary keys generated from the fixed seed.
	it('replaces its own history instead of accumulating', () => {
		const dbFile = fixture();
		run(dbFile);
		const first = counts(dbFile);
		run(dbFile);
		const second = counts(dbFile);
		run(dbFile);
		const third = counts(dbFile);
		assert.deepEqual(second, first, 'second run matches the first');
		assert.deepEqual(third, first, 'third run matches the first');
	});

	it('keeps the untouched rows across repeated runs', () => {
		const dbFile = fixture();
		run(dbFile);
		run(dbFile);
		const s = survivors(dbFile);
		assert.equal(s.realThread, true);
		assert.equal(s.realMessage, true);
		assert.equal(s.otherProjectThread, true);
		assert.equal(s.realActivity, true);
	});

	// `seed:account` deletes and recreates the workflows, so their ids change between
	// history runs. Clearing by workflow id therefore matched nothing on the second
	// run, orphaning the first run's rows, and the ids generated from the fixed seed
	// then collided on insert.
	it('survives the seeded workflows being replaced with new ids', () => {
		const dbFile = fixture();
		run(dbFile);
		const before = counts(dbFile);

		const db = new DatabaseSync(dbFile);
		db.exec('PRAGMA foreign_keys = ON');
		db.exec(`
			INSERT INTO workflow_entity (id, name, nodes)
				SELECT 'new-' || id, name, nodes FROM workflow_entity WHERE name LIKE '[seed] %';
			DELETE FROM workflow_entity WHERE id IN ('wf1', 'wf2');
		`);
		db.close();

		const out = run(dbFile);
		const after = counts(dbFile);
		assert.equal(after.seededThreads, before.seededThreads, 'threads replaced, not duplicated');
		assert.equal(after.seededActivity, before.seededActivity, 'activity replaced, not duplicated');
		assert.equal(after.executionData, after.executions, 'no orphaned execution data');
		assert.doesNotMatch(out, /UNIQUE constraint|Rolled back/);
		assert.equal(survivors(dbFile).realThread, true, 'the real thread still survives');
	});

	it('reports what it cleared on the second run', () => {
		const dbFile = fixture();
		run(dbFile);
		const out = run(dbFile);
		assert.match(out, /Cleared prior: \d+ executions, 2 threads, \d+ activity entries/);
	});

	it('exits with a message when nothing is seeded', () => {
		const file = join(mkdtempSync(join(tmpdir(), 'seed-history-empty-')), 'database.sqlite');
		const db = new DatabaseSync(file);
		db.exec(SCHEMA);
		db.close();
		assert.throws(() => run(file), /Run seed:account first/);
	});
});
