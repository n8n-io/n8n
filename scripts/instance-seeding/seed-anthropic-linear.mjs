#!/usr/bin/env node
/**
 * Seeds an n8n instance with a small, deliberately biased automation estate: ten workflows that
 * all use the Anthropic chat model and all touch Linear, the two data tables they read, working
 * credentials built from your own API tokens, a fortnight of execution history, four Instance AI
 * conversations about that estate, and — where the build supports it — a matching activity log.
 *
 * Everything is generated in one pass, in dependency order, so the parts agree: activity entries
 * carry the execution ids that were actually written, threads reference workflows that exist, and
 * the data-table workflows point at tables that were really created.
 *
 * Why a script rather than a .sql file
 * -----------------------------------
 * Three things cannot be expressed in shareable SQL:
 *
 *   * `execution_data.data` is flatted-encoded, not JSON — a hand-written payload is unreadable.
 *   * Data-table rows live in a `data_table_user_<id>` table that n8n creates at runtime, so the
 *     DDL has to be issued before the rows exist.
 *   * Credential secrets are encrypted with the instance encryption key. That key *can* be pinned
 *     across a team, and n8n's ciphertext is portable when it is — the salt travels inside the
 *     blob. But a key shared next to its ciphertext gives no confidentiality: committing an
 *     encrypted token beside the key that opens it is a slower way of committing the token.
 *
 * So nothing secret is shared. This script is the shareable artefact; the encryption key, the API
 * tokens and the ciphertext never leave the machine it runs on. Token *lengths* are reported,
 * never values.
 *
 * Usage
 * -----
 *   pnpm seed:account
 *
 * The pnpm script builds n8n-core first, because this reuses n8n's own cipher rather than
 * reimplementing the key derivation.
 *
 * Both API tokens are optional. Supply them and the workflows run for real; leave them out and the
 * credentials are still created with a labelled placeholder, so nothing is half-wired and the
 * report says which token to set. They come from the environment or from a dotenv file this repo
 * already uses for local secrets — packages/cli/.env, packages/@n8n/instance-ai/.env, or a root
 * .env — with the environment winning over a file.
 *
 * SEED_PLACEHOLDER_CREDENTIALS=1 forces placeholders even where a real token is available, for
 * producing a database with no real keys in it.
 *
 * Stop n8n first, or reload the UI afterwards. Re-running is safe: every phase replaces its own
 * rows, matched on the `seedAl` id prefix.
 *
 * SQLite only, via node:sqlite, so it needs no dependency of its own.
 */
import { DatabaseSync } from 'node:sqlite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	ACTIVITY,
	DATA_TABLES,
	EXECUTIONS,
	THREADS,
	WORKFLOWS,
} from './seed-anthropic-linear.data.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Every job below has more than one n8n node that could do it. One was chosen and is used
 * everywhere. This table is the contract: adding a workflow means following it, not picking again.
 * The Data Table node is listed with no alternative because there genuinely is none.
 */
const CHOICES = [
	[
		'Chat model',
		'Anthropic Chat Model @1.5',
		'OpenAI, Gemini, Azure, Ollama, Groq, Mistral, Bedrock',
	],
	['Model id', 'claude-sonnet-4-6', 'opus and haiku variants'],
	['Issue tracker', 'Linear @1.1', 'Jira, GitHub Issues, Asana, ClickUp, Trello, Notion'],
	['Linear auth', 'API token', 'Linear OAuth2'],
	['Key/value store', 'Data Table @1.1', '(no alternative in core n8n)'],
	['Agent', 'Tools Agent @1.3', 'a bare LLM chain with no tools'],
	['Chat memory', 'Simple Memory @1.4', 'Redis, Postgres, MongoDB, Zep, Motorhead'],
	[
		'Field extraction',
		'Information Extractor @1.2',
		'agent + structured output parser, Code + JSON.parse',
	],
	['Routing on text', 'Text Classifier @1.1', 'If on a regex, Switch, Code'],
	['One-shot prompting', 'Basic LLM Chain @1.9', 'an agent with no tools'],
	['Two-way branch', 'If @2.3', 'Switch'],
	['Dropping items', 'Filter @2.3', 'If with a NoOp on the false branch'],
	['Per-item side effects', 'Loop Over Items @3, batch size 1', 'a Code loop, Split Out'],
	['Many items into one', 'Aggregate @1', 'Summarize, Code'],
	['Field shaping', 'Edit Fields @3.5', 'Code'],
	['Outbound HTTP', 'HTTP Request @4.5', 'Code with fetch'],
	['Inbound HTTP', 'Webhook @2.1', 'Form Trigger'],
	['Webhook reply', 'Respond to Webhook @1.5', 'responseMode onReceived only'],
	['Chat entry point', 'Chat Trigger @1.4', 'Webhook plus manual chat wiring'],
	['Scheduled entry point', 'Schedule Trigger @1.4, cron mode', 'Cron, Interval'],
	['Manual entry point', 'Manual Trigger @1', 'Execute Workflow Trigger'],
	['Failure entry point', 'Error Trigger @1', 'polling the executions API'],
	['On-canvas notes', 'Sticky Note @1', 'long node names'],
	['Code', 'none at all', 'JavaScript or Python in a Code node'],
];

/**
 * The tokens are optional. Without one, the credential is still created so the workflows are
 * fully wired and open without a red credential warning — it just holds a placeholder that cannot
 * work. That is labelled in both places someone will look: the credential name in the UI list and
 * on every node, and the stored key itself, so a 401 in a log is self-explaining rather than a
 * mystery about which key was used.
 */
const PLACEHOLDER_KEY = 'SEEDED-FAKE-KEY-not-a-real-credential';

const CREDENTIALS = [
	{
		id: 'seedAlCred00001',
		name: 'Anthropic (seed)',
		placeholderName: 'Anthropic (seed, fake key)',
		type: 'anthropicApi',
		envVar: 'ANTHROPIC_API_KEY',
		tokenSource: 'create one at console.anthropic.com under API Keys',
		// Mirrors the credential's own defaults, so the UI shows a complete, valid credential.
		buildData: (apiKey) => ({ apiKey, url: 'https://api.anthropic.com', header: false }),
		nodeTypes: ['@n8n/n8n-nodes-langchain.lmChatAnthropic'],
	},
	{
		id: 'seedAlCred00002',
		name: 'Linear (seed)',
		placeholderName: 'Linear (seed, fake key)',
		type: 'linearApi',
		envVar: 'LINEAR_API_KEY',
		tokenSource: 'create a personal API key in Linear under Settings > Security & access',
		buildData: (apiKey) => ({ apiKey, signingSecret: '' }),
		// The tool variants are separate generated node types, so they are listed explicitly.
		nodeTypes: ['n8n-nodes-base.linear', 'n8n-nodes-base.linearTool'],
	},
];

/**
 * What each credential will hold: a real token from the environment or a dotenv file, or a labelled
 * placeholder. Resolved once so the name, the stored data and the report all agree.
 */
function resolveCredentials(tokensFromFiles) {
	// Forces placeholders even where a real token is available. For handing the resulting database
	// to someone else, or for seeing what the estate looks like before anything is configured —
	// without having to move your own dotenv files out of the way.
	const forced =
		process.env.SEED_PLACEHOLDER_CREDENTIALS === 'true' ||
		process.env.SEED_PLACEHOLDER_CREDENTIALS === '1';

	return CREDENTIALS.map((credential) => {
		const token = forced ? undefined : process.env[credential.envVar];
		return {
			...credential,
			token: token ?? PLACEHOLDER_KEY,
			isPlaceholder: !token,
			resolvedName: token ? credential.name : credential.placeholderName,
			origin: token
				? (tokensFromFiles.get(credential.envVar)?.file ?? 'environment')
				: 'placeholder',
		};
	});
}

/**
 * SQLite storage type per data-table column type. These are the types n8n's own DSL emits —
 * `toDslColumns` maps number to `.double` and SQLite renders that as `real` — so a seeded table is
 * indistinguishable from one created through the UI.
 */
const COLUMN_SQL_TYPE = { string: 'text', number: 'real', boolean: 'boolean', date: 'datetime(3)' };

const MINUTE = 60 * 1000;

function fail(message, hint) {
	console.error(`\n  ${message}`);
	if (hint) console.error(`  ${hint}`);
	console.error('');
	process.exit(1);
}

/** Same resolution order as getN8nFolder() in @n8n/config. */
function n8nFolder() {
	const homeVar = process.platform === 'win32' ? 'USERPROFILE' : 'HOME';
	const userHome = process.env.N8N_USER_FOLDER ?? process.env[homeVar] ?? process.cwd();
	return path.join(userHome, '.n8n');
}

/** Same order n8n uses: the env var wins, else the key written into the settings file on first boot. */
function resolveEncryptionKey(folder) {
	if (process.env.N8N_ENCRYPTION_KEY) {
		return { key: process.env.N8N_ENCRYPTION_KEY, source: 'N8N_ENCRYPTION_KEY' };
	}

	const settingsFile = path.join(folder, 'config');
	if (!existsSync(settingsFile)) {
		fail(
			`No encryption key found. ${settingsFile} does not exist and N8N_ENCRYPTION_KEY is not set.`,
			'Start n8n once so it writes a key, or set N8N_ENCRYPTION_KEY to the key this instance uses.',
		);
	}

	let parsed;
	try {
		parsed = JSON.parse(readFileSync(settingsFile, 'utf8'));
	} catch {
		fail(`${settingsFile} is not valid JSON, so the encryption key cannot be read.`);
	}
	if (!parsed.encryptionKey) fail(`${settingsFile} holds no encryptionKey.`);
	return { key: parsed.encryptionKey, source: settingsFile };
}

/**
 * Why `activity_event` is absent, which is two different situations with two different fixes.
 *
 * The table is created by a migration. A checkout that carries that migration but a database that
 * has never run it is the common case — n8n applies migrations on startup, so a database last
 * touched by a different branch simply predates the table. That is worth saying out loud, because
 * "no activity_event table" reads like the feature is missing when the feature is right here.
 */
function diagnoseMissingActivityTable(applied) {
	const migrationsDir = path.join(repoRoot, 'packages/@n8n/db/src/migrations/common');
	const inCheckout = existsSync(migrationsDir)
		? readdirSync(migrationsDir).some((file) => file.includes('ActivityEventTable'))
		: false;

	if (!inCheckout) {
		return ['skipped: this checkout has no activity-log migration, so the feature is not present'];
	}
	if (applied) {
		return [
			'skipped: the migration is recorded as applied but the table is gone — check the database',
		];
	}
	return [
		'skipped: this database has not run the activity-log migration yet',
		'  the migration is in this checkout; n8n applies migrations on startup, so this',
		'  database was last used by a build that predates it',
		'  fix: start n8n once from this worktree, then re-run pnpm seed:account',
	];
}

/**
 * Dotenv files this repo already uses for local secrets, most specific first.
 */
const ENV_FILES = ['packages/cli/.env', 'packages/@n8n/instance-ai/.env', '.env'];

/**
 * Takes only the two token variables from those files, and only when the environment does not
 * already carry one — so a shell export always wins, and nothing else in those files leaks into
 * this process. Returns which file each token came from, for the run report.
 */
function loadTokensFromEnvFiles() {
	const wanted = new Set(CREDENTIALS.map((c) => c.envVar));
	const found = new Map();

	for (const relative of ENV_FILES) {
		const file = path.join(repoRoot, relative);
		if (!existsSync(file)) continue;

		for (const line of readFileSync(file, 'utf8').split('\n')) {
			const match = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
			if (!match) continue;
			const [, name, rawValue] = match;
			if (!wanted.has(name) || found.has(name) || process.env[name]) continue;
			// Strip one layer of matching quotes; on an unquoted value, drop a trailing comment.
			const trimmed = rawValue.trim();
			const value = /^(['"]).*\1$/.test(trimmed)
				? trimmed.slice(1, -1)
				: trimmed.split('#')[0].trim();
			if (value) found.set(name, { value, file: relative });
		}
	}

	for (const [name, { value }] of found) process.env[name] = value;
	return found;
}

/**
 * Reuses n8n's own cipher and flatted encoder rather than reimplementing either. Both are loaded
 * by path: this script is standalone and the repo root depends on neither, so package resolution
 * would not find them.
 */
async function loadEncoders() {
	const cipherPath = path.join(repoRoot, 'packages/core/dist/encryption/aes-256-cbc.js');
	if (!existsSync(cipherPath)) {
		fail(
			'n8n-core is not built, so the encryption routine is unavailable.',
			'Run: pnpm build --filter=n8n-core',
		);
	}
	const { CipherAes256CBC } = await import(`file://${cipherPath}`);

	let flatted;
	try {
		flatted = createRequire(path.join(repoRoot, 'packages/cli/package.json'))('flatted');
	} catch {
		fail(
			'The `flatted` package could not be resolved, so execution data cannot be encoded.',
			'Run: pnpm install',
		);
	}

	return { cipher: new CipherAes256CBC(), flatted };
}

const { cipher, flatted } = await loadEncoders();
const folder = n8nFolder();
const { key, source } = resolveEncryptionKey(folder);

const tokensFromFiles = loadTokensFromEnvFiles();

const credentials = resolveCredentials(tokensFromFiles);
const placeholders = credentials.filter((c) => c.isPlaceholder);

const dbFile = path.join(folder, process.env.DB_SQLITE_DATABASE ?? 'database.sqlite');
if (!existsSync(dbFile)) {
	fail(`No SQLite database at ${dbFile}.`, 'Start n8n once so it creates and migrates the schema.');
}
const db = new DatabaseSync(dbFile);

const project = db
	.prepare("SELECT id FROM project WHERE type = 'personal' ORDER BY createdAt ASC LIMIT 1")
	.get();
if (!project) fail('No personal project on this instance, so there is nowhere to put any of this.');

const owner = db.prepare('SELECT id FROM "user" ORDER BY createdAt ASC LIMIT 1').get();
if (!owner) fail('No user on this instance.');

const hasTable = (name) =>
	Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));

/** Timestamps are written as the string form SQLite stores, so relative offsets stay readable here. */
const at = (minutesAgo) =>
	new Date(Date.now() - minutesAgo * MINUTE).toISOString().replace('T', ' ').replace('Z', '');

console.log(`\n  database        ${dbFile}`);
console.log(`  encryption key  ${source} (${key.length} chars)`);
console.log(`  project         ${project.id}`);
console.log(`  owner           ${owner.id}\n`);

// ---------------------------------------------------------------------------------------------
// Clean up a previous run, children before parents.
// ---------------------------------------------------------------------------------------------

for (const table of DATA_TABLES) {
	if (hasTable(`data_table_user_${table.id}`)) db.exec(`DROP TABLE "data_table_user_${table.id}"`);
}
db.exec(`
	DELETE FROM data_table_column WHERE dataTableId LIKE 'seedAlDt%';
	DELETE FROM data_table WHERE id LIKE 'seedAlDt%';
	DELETE FROM instance_ai_messages WHERE threadId LIKE 'seedAlThread%';
	DELETE FROM instance_ai_threads WHERE id LIKE 'seedAlThread%';
	DELETE FROM execution_data WHERE executionId IN (SELECT id FROM execution_entity WHERE workflowId LIKE 'seedAlWf%');
	DELETE FROM execution_entity WHERE workflowId LIKE 'seedAlWf%';
	DELETE FROM shared_workflow WHERE workflowId LIKE 'seedAlWf%';
	DELETE FROM workflow_entity WHERE id LIKE 'seedAlWf%';
	DELETE FROM shared_credentials WHERE credentialsId LIKE 'seedAlCred%';
	DELETE FROM credentials_entity WHERE id LIKE 'seedAlCred%';
`);
if (hasTable('activity_event')) {
	db.exec("DELETE FROM activity_event WHERE resourceId LIKE 'seedAl%'");
}

// ---------------------------------------------------------------------------------------------
// 1. Data tables. The row table has to exist before the workflows that read it are worth opening.
// ---------------------------------------------------------------------------------------------

const insertDataTable = db.prepare(
	'INSERT INTO data_table (id, name, projectId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
);
const insertColumn = db.prepare(
	'INSERT INTO data_table_column (id, dataTableId, name, type, "index", createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
);

for (const table of DATA_TABLES) {
	const stamp = at(table.createdDaysAgo * 24 * 60);
	insertDataTable.run(table.id, table.name, project.id, stamp, stamp);
	table.columns.forEach((column, index) => {
		insertColumn.run(randomUUID(), table.id, column.name, column.type, index, stamp, stamp);
	});

	// Mirrors DataTableDdlService.createTableWithColumns: an int primary key, the user columns,
	// then the timestamps.
	const columnSql = table.columns.map((c) => `"${c.name}" ${COLUMN_SQL_TYPE[c.type]}`).join(', ');
	db.exec(
		`CREATE TABLE "data_table_user_${table.id}" (` +
			'"id" integer PRIMARY KEY NOT NULL, ' +
			`${columnSql}, ` +
			"\"createdAt\" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')), " +
			"\"updatedAt\" datetime(3) NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW'))" +
			')',
	);

	const names = table.columns.map((c) => `"${c.name}"`).join(', ');
	const holes = table.columns.map(() => '?').join(', ');
	const insertRow = db.prepare(
		`INSERT INTO "data_table_user_${table.id}" (${names}, "createdAt", "updatedAt") VALUES (${holes}, ?, ?)`,
	);
	for (const row of table.rows) {
		const values = table.columns.map((c) => {
			const value = row[c.name];
			// node:sqlite binds only primitives; a boolean has to become the 0/1 SQLite stores.
			return typeof value === 'boolean' ? Number(value) : (value ?? null);
		});
		insertRow.run(...values, stamp, stamp);
	}
	console.log(
		`  data table      ${table.name.padEnd(24)} ${table.rows.length} rows, ${table.columns.length} columns`,
	);
}

// ---------------------------------------------------------------------------------------------
// 2. Credentials, from this machine's key and this developer's tokens.
// ---------------------------------------------------------------------------------------------

const insertCredential = db.prepare(
	'INSERT INTO credentials_entity (id, name, data, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
);
const shareCredential = db.prepare(
	"INSERT INTO shared_credentials (credentialsId, projectId, role, createdAt, updatedAt) VALUES (?, ?, 'credential:owner', ?, ?)",
);
const credentialStamp = at(13 * 24 * 60);

for (const credential of credentials) {
	const encrypted = cipher.encrypt(JSON.stringify(credential.buildData(credential.token)), key);
	insertCredential.run(
		credential.id,
		credential.resolvedName,
		encrypted,
		credential.type,
		credentialStamp,
		credentialStamp,
	);
	shareCredential.run(credential.id, project.id, credentialStamp, credentialStamp);
	// A placeholder reports no length: there is nothing there worth measuring, and the word
	// placeholder is the useful part.
	const detail = credential.isPlaceholder
		? 'placeholder, not a working key'
		: `${credential.envVar} via ${credential.origin} (${credential.token.length} chars)`;
	console.log(`  credential      ${credential.type.padEnd(24)} ${detail}`);
}

const credentialByNodeType = new Map();
for (const credential of credentials) {
	for (const nodeType of credential.nodeTypes) credentialByNodeType.set(nodeType, credential);
}

// ---------------------------------------------------------------------------------------------
// 3. Workflows, with the credentials attached as they are written rather than patched in after.
// ---------------------------------------------------------------------------------------------

const insertWorkflow = db.prepare(`
	INSERT INTO workflow_entity
		(id, name, active, isArchived, nodes, connections, settings, versionId, versionCounter,
		 triggerCount, nodeGroups, createdAt, updatedAt)
	VALUES (?, ?, 0, 0, ?, ?, '{"executionOrder": "v1"}', ?, 1, 0, '[]', ?, ?)
`);
const shareWorkflow = db.prepare(
	"INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?, ?, 'workflow:owner', ?, ?)",
);

/** Nothing lands active: a seed must not start firing schedules or registering webhooks. */
const workflowById = new Map();
let attachedNodes = 0;

for (const workflow of WORKFLOWS) {
	const nodes = structuredClone(workflow.nodes);
	for (const node of nodes) {
		const credential = credentialByNodeType.get(node.type);
		if (!credential) continue;
		node.credentials = { [credential.type]: { id: credential.id, name: credential.resolvedName } };
		attachedNodes += 1;
	}

	const created = at(workflow.createdDaysAgo * 24 * 60);
	const updated = at(workflow.updatedDaysAgo * 24 * 60);
	insertWorkflow.run(
		workflow.id,
		workflow.name,
		JSON.stringify(nodes, null, 2),
		JSON.stringify(workflow.connections, null, 2),
		workflow.versionId,
		created,
		updated,
	);
	shareWorkflow.run(workflow.id, project.id, created, updated);
	workflowById.set(workflow.id, { ...workflow, nodes });
}
console.log(`  workflows       ${WORKFLOWS.length} seeded, credentials on ${attachedNodes} nodes`);

// ---------------------------------------------------------------------------------------------
// 4. Execution history. `data` is flatted-encoded, which is why this cannot be a .sql file.
// ---------------------------------------------------------------------------------------------

/** The run-data shape a real execution carries, learnt from a genuine row rather than invented. */
function buildRunData(run, workflow, startedAtMs) {
	const runData = {};
	let elapsed = 0;
	let lastNodeExecuted = null;

	for (const [index, [nodeName, output]] of run.nodes.entries()) {
		const failed = run.failAt === nodeName;
		const entry = {
			startTime: startedAtMs + elapsed,
			executionIndex: index,
			source: index === 0 ? [] : [{ previousNode: run.nodes[index - 1][0] }],
			hints: [],
			executionTime: failed ? 12 : 4 + index,
			executionStatus: failed ? 'error' : 'success',
		};
		if (failed) {
			entry.error = { message: run.error, name: 'NodeApiError' };
		} else {
			entry.data = {
				main: [output.map((json, item) => ({ json, pairedItem: { item } }))],
			};
		}
		runData[nodeName] = [entry];
		lastNodeExecuted = nodeName;
		elapsed += entry.executionTime + 1;
		if (failed) break;
	}

	const data = {
		version: 1,
		startData: {},
		resultData: { runData, pinData: {}, lastNodeExecuted },
		executionData: {
			contextData: {},
			nodeExecutionStack: [],
			metadata: {},
			waitingExecution: {},
			waitingExecutionSource: {},
			runtimeData: {},
		},
	};
	if (run.failAt) {
		data.resultData.error = {
			message: run.error,
			name: 'NodeApiError',
			node: { name: run.failAt },
		};
	}
	return { data, durationMs: elapsed };
}

const insertExecution = db.prepare(`
	INSERT INTO execution_entity
		(workflowId, mode, finished, status, startedAt, stoppedAt, createdAt, storedAt,
		 jsonSizeBytes, binaryDataSizeBytes, usedPrivateCredentials, workflowVersionId)
	VALUES (?, ?, ?, ?, ?, ?, ?, 'db', ?, 0, 0, ?)
`);
const insertExecutionData = db.prepare(
	'INSERT INTO execution_data (executionId, data, workflowData, workflowVersionId) VALUES (?, ?, ?, ?)',
);

/** Keyed by workflow id so the activity phase can cite the execution it is actually about. */
const executionsByWorkflow = new Map();

for (const run of EXECUTIONS) {
	const workflow = workflowById.get(run.workflowId);
	if (!workflow) fail(`Execution fixture names an unknown workflow: ${run.workflowId}`);

	const startedAtMs = Date.now() - run.minutesAgo * MINUTE;
	const { data, durationMs } = buildRunData(run, workflow, startedAtMs);
	const encoded = flatted.stringify(data);
	const snapshot = flatted.stringify({
		id: workflow.id,
		name: workflow.name,
		active: false,
		isArchived: false,
		nodes: workflow.nodes,
		connections: workflow.connections,
		settings: { executionOrder: 'v1' },
		versionId: workflow.versionId,
	});

	const startedAt = at(run.minutesAgo);
	const stoppedAt = at(run.minutesAgo - durationMs / MINUTE);
	const result = insertExecution.run(
		run.workflowId,
		run.mode,
		run.failAt ? 0 : 1,
		run.failAt ? 'error' : 'success',
		startedAt,
		stoppedAt,
		startedAt,
		encoded.length,
		workflow.versionId,
	);
	const executionId = Number(result.lastInsertRowid);
	insertExecutionData.run(executionId, encoded, snapshot, workflow.versionId);

	const list = executionsByWorkflow.get(run.workflowId) ?? [];
	list.push({ executionId, run });
	executionsByWorkflow.set(run.workflowId, list);
}
console.log(
	`  executions      ${EXECUTIONS.length} runs, ${EXECUTIONS.filter((r) => r.failAt).length} failed`,
);

// ---------------------------------------------------------------------------------------------
// 5. Instance AI threads.
// ---------------------------------------------------------------------------------------------

const insertThread = db.prepare(
	'INSERT INTO instance_ai_threads (id, title, metadata, projectId, resourceId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
);
const insertMessage = db.prepare(
	'INSERT INTO instance_ai_messages (id, threadId, role, type, content, resourceId, createdAt, updatedAt) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)',
);

/** The service appends this per turn; the message parser strips it again before display. */
function withCurrentDateTime(text, when) {
	const iso = new Date(when).toISOString().slice(0, 16);
	return `${text}\n\n<current-date-time>\n## Current Date and Time\n\nThe user's current local date and time is: ${iso}.\n</current-date-time>`;
}

let messageCount = 0;
for (const thread of THREADS) {
	const created = at(thread.createdMinutesAgo);
	const updated = at(thread.updatedMinutesAgo);
	insertThread.run(
		thread.id,
		thread.title,
		JSON.stringify({ source: 'assistant_page', origin: 'internal', titleRefined: true }),
		project.id,
		owner.id,
		created,
		updated,
	);

	const span = thread.createdMinutesAgo - thread.updatedMinutesAgo;
	thread.messages.forEach(([role, text], index) => {
		const minutesAgo =
			thread.createdMinutesAgo - (span * index) / Math.max(1, thread.messages.length - 1);
		const when = Date.now() - minutesAgo * MINUTE;
		const body = role === 'user' ? withCurrentDateTime(text, when) : text;
		insertMessage.run(
			randomUUID(),
			thread.id,
			role,
			JSON.stringify({ role, content: [{ type: 'text', text: body }] }),
			owner.id,
			at(minutesAgo),
			at(minutesAgo),
		);
		messageCount += 1;
	});
}
console.log(`  ai threads      ${THREADS.length} threads, ${messageCount} messages`);

// ---------------------------------------------------------------------------------------------
// 6. Activity log, if this build has it. Run entries are derived from what phase 4 wrote, so an
//    entry can never describe an execution that is not there.
// ---------------------------------------------------------------------------------------------

if (!hasTable('activity_event')) {
	const applied = Boolean(
		db.prepare("SELECT 1 FROM migrations WHERE name LIKE '%ActivityEvent%' LIMIT 1").get(),
	);
	for (const [index, line] of diagnoseMissingActivityTable(applied).entries()) {
		console.log(index === 0 ? `  activity        ${line}` : `                  ${line}`);
	}
} else {
	const insertActivity = db.prepare(`
		INSERT INTO activity_event
			(category, action, userId, projectId, resourceType, resourceId, resourceName, data, createdAt)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`);
	let activityCount = 0;

	const record = (
		category,
		action,
		userId,
		resourceType,
		resourceId,
		resourceName,
		data,
		minutesAgo,
	) => {
		insertActivity.run(
			category,
			action,
			userId,
			project.id,
			resourceType,
			resourceId,
			resourceName,
			data ? JSON.stringify(data) : null,
			at(minutesAgo),
		);
		activityCount += 1;
	};

	for (const credential of credentials) {
		record(
			'credential',
			'created',
			owner.id,
			'credential',
			credential.id,
			credential.type,
			null,
			13 * 24 * 60,
		);
	}
	for (const table of DATA_TABLES) {
		record(
			'datatable',
			'created',
			owner.id,
			'datatable',
			table.id,
			table.name,
			{ columnCount: table.columns.length },
			table.createdDaysAgo * 24 * 60,
		);
	}
	for (const workflow of WORKFLOWS) {
		record(
			'workflow',
			'created',
			owner.id,
			'workflow',
			workflow.id,
			workflow.name,
			{ nodeCount: workflow.nodes.length },
			workflow.createdDaysAgo * 24 * 60,
		);
	}
	for (const [category, action, workflowId, data, minutesAgo] of ACTIVITY) {
		const workflow = workflowById.get(workflowId);
		record(category, action, owner.id, 'workflow', workflowId, workflow.name, data, minutesAgo);
	}
	for (const [workflowId, runs] of executionsByWorkflow) {
		const workflow = workflowById.get(workflowId);
		for (const { executionId, run } of runs) {
			// A scheduled run has no user: nobody pressed anything.
			const userId = run.mode === 'manual' ? owner.id : null;
			record(
				run.mode === 'evaluation' ? 'eval' : 'execution',
				run.failAt ? 'failed' : 'succeeded',
				userId,
				'workflow',
				workflowId,
				workflow.name,
				{
					executionId: String(executionId),
					status: run.failAt ? 'error' : 'success',
					mode: run.mode,
					...(run.failAt ? { failedNode: run.failAt } : {}),
				},
				run.minutesAgo,
			);
		}
	}
	console.log(`  activity        ${activityCount} entries`);
}

db.close();

if (placeholders.length > 0) {
	const plural = placeholders.length > 1;
	console.log(
		`\n  ${placeholders.length} credential${plural ? 's hold' : ' holds'} a placeholder, so the workflows are wired but will not run:\n`,
	);
	for (const credential of placeholders) {
		console.log(`    ${credential.resolvedName.padEnd(28)} set ${credential.envVar} to fix`);
		console.log(`    ${''.padEnd(28)} ${credential.tokenSource}`);
	}
	console.log('\n  Set the token in any of these, then re-run — the shell wins over a file:\n');
	console.log('    the shell             export ANTHROPIC_API_KEY=... LINEAR_API_KEY=...');
	for (const relative of ENV_FILES) {
		const state = existsSync(path.join(repoRoot, relative)) ? 'exists' : 'create it';
		console.log(`    ${relative.padEnd(21)} (${state})`);
	}
	console.log(
		'\n  Re-running replaces the credential in place, so the workflows keep pointing at it.',
	);
}

console.log('\n  Choices this estate is consistent about:');
for (const [job, chosen] of CHOICES.slice(0, 5)) {
	console.log(`    ${job.padEnd(22)} ${chosen}`);
}
console.log(`    ... and ${CHOICES.length - 5} more, in CHOICES at the top of this file.`);
console.log('\n  Reload the n8n UI to pick it all up.\n');
