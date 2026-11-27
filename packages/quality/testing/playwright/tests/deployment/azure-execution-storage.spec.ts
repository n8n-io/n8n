import { isRecord } from '@n8n/utils/is-record';
import { expect, test } from '@playwright/test';
import flatted from 'flatted';
import { formatBlobContainerName } from 'n8n-containers/services/azurite';
import type { N8NStack } from 'n8n-containers/stack';

import { assertN8nImage, runDeploymentCell } from './probe';

type StackContainer = N8NStack['containers'][number];

interface ParsedExecutionBundle {
	version: number;
	workflowId: string;
	editFieldsEcho: string;
}

interface SqliteExecutionRecord {
	entity: {
		status: string;
		finished: number;
		storedAt: string;
	} | null;
	executionDataRowCount: number;
}

const READ_SQLITE_EXECUTION_SCRIPT = `
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const [workflowId, executionId] = process.argv.slice(1);
const n8nFolder = path.join(process.env.N8N_USER_FOLDER || os.homedir(), '.n8n');
const dbPath = path.join(n8nFolder, 'database.sqlite');
let lastError;
for (let attempt = 0; attempt < 5; attempt++) {
	let db;
	try {
		db = new DatabaseSync(dbPath, { readOnly: true, timeout: 5000 });
		const entity = db
			.prepare(
				'SELECT status, finished, storedAt FROM execution_entity WHERE CAST(id AS TEXT) = ? AND workflowId = ?',
			)
			.get(executionId, workflowId) || null;
		const row = db
			.prepare('SELECT COUNT(*) AS count FROM execution_data WHERE CAST(executionId AS TEXT) = ?')
			.get(executionId);
		const executionDataRowCount = Number(row ? row.count : -1);
		process.stdout.write(JSON.stringify({ entity, executionDataRowCount }));
		process.exit(0);
	} catch (error) {
		lastError = error;
		Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
	} finally {
		if (db) db.close();
	}
}
console.error(String(lastError));
process.exit(1);
`;

function requireContainer(stack: N8NStack, pattern: RegExp, role: string): StackContainer {
	const container = stack.findContainers(pattern)[0];
	if (!container) {
		throw new Error(`Expected a ${role} n8n container in the stack`);
	}
	return container;
}

function extractEditFieldsEcho(runData: unknown): string {
	if (!isRecord(runData) || !Array.isArray(runData['Edit Fields'])) return '';
	const firstRun: unknown = runData['Edit Fields'][0];
	if (!isRecord(firstRun) || !isRecord(firstRun.data) || !Array.isArray(firstRun.data.main)) {
		return '';
	}
	const firstBranch: unknown = firstRun.data.main[0];
	if (!Array.isArray(firstBranch)) return '';
	const firstItem: unknown = firstBranch[0];
	if (!isRecord(firstItem) || !isRecord(firstItem.json)) return '';
	return typeof firstItem.json.echo === 'string' ? firstItem.json.echo : '';
}

function parseExecutionBundle(raw: string): ParsedExecutionBundle {
	const parsed: unknown = JSON.parse(raw);
	if (
		!isRecord(parsed) ||
		typeof parsed.version !== 'number' ||
		typeof parsed.data !== 'string' ||
		!isRecord(parsed.workflowData) ||
		typeof parsed.workflowData.id !== 'string'
	) {
		throw new Error(`Unexpected execution bundle JSON structure: ${raw.slice(0, 400)}`);
	}
	const runExecutionData: unknown = flatted.parse(parsed.data);
	const resultData =
		isRecord(runExecutionData) && isRecord(runExecutionData.resultData)
			? runExecutionData.resultData
			: null;
	const editFieldsEcho = resultData ? extractEditFieldsEcho(resultData.runData) : '';
	return {
		version: parsed.version,
		workflowId: parsed.workflowData.id,
		editFieldsEcho,
	};
}

async function readSqliteExecutionRecord(
	container: StackContainer,
	workflowId: string,
	executionId: string,
): Promise<SqliteExecutionRecord> {
	const result = await container.exec([
		'node',
		'--no-warnings',
		'-e',
		READ_SQLITE_EXECUTION_SCRIPT,
		workflowId,
		executionId,
	]);
	if (result.exitCode !== 0) {
		throw new Error(
			`Failed to query SQLite database in ${container.getName()} (exit ${result.exitCode}): ${result.output}`,
		);
	}
	const parsed: unknown = JSON.parse(result.stdout);
	if (!isRecord(parsed) || typeof parsed.executionDataRowCount !== 'number') {
		throw new Error(`Unexpected SQLite query payload: ${result.stdout.slice(0, 400)}`);
	}
	const entity =
		isRecord(parsed.entity) &&
		typeof parsed.entity.status === 'string' &&
		typeof parsed.entity.finished === 'number' &&
		typeof parsed.entity.storedAt === 'string'
			? {
					status: parsed.entity.status,
					finished: parsed.entity.finished,
					storedAt: parsed.entity.storedAt,
				}
			: null;
	return {
		entity,
		executionDataRowCount: parsed.executionDataRowCount,
	};
}

test(
	'Azure Blob execution data storage',
	{
		tag: '@cell:ENV-13',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		expect(
			Boolean(process.env.N8N_LICENSE_ACTIVATION_KEY || process.env.N8N_LICENSE_CERT),
			'N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT is required for Azure Blob execution data storage',
		).toBe(true);

		const containerName = formatBlobContainerName('n8n-env13-execution');

		await runDeploymentCell({
			stack: {
				services: ['azurite'],
				env: {
					N8N_EXECUTION_DATA_STORAGE_MODE: 'azure',
					N8N_EXTERNAL_STORAGE_AZURE_CONTAINER_NAME: containerName,
				},
			},
			probe: async ({ probe }) => {
				const webhook = await probe.runWebhook();
				const execution = await probe.readExecution(webhook.workflowId);
				return { webhook, execution };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.azurite,
					'Expected an Azurite container in the stack',
				).toBeDefined();

				const main = requireContainer(stack, /-n8n(-main-1)?$/, 'main');
				const { workflowId, token } = probeOutput.webhook;
				const { executionId } = probeOutput.execution;
				expect(workflowId, `Unexpected workflowId: ${workflowId}`).toMatch(/^[A-Za-z0-9_-]+$/);
				expect(executionId, `Unexpected executionId: ${executionId}`).toMatch(/^[A-Za-z0-9_-]+$/);

				const blobs = await stack.services.azurite.blob.listBlobs(containerName);
				expect(
					blobs.length,
					`Expected execution payload blobs in Azurite container "${containerName}"`,
				).toBeGreaterThan(0);

				const expectedBlobName = `workflows/${workflowId}/executions/${executionId}/execution_data/bundle.json`;
				expect(
					blobs.map((blob) => blob.name),
					`Expected execution bundle "${expectedBlobName}" in Azurite container "${containerName}"`,
				).toContain(expectedBlobName);

				const rawBundle = await stack.services.azurite.blob.downloadBlobText(
					containerName,
					expectedBlobName,
				);
				const bundle = parseExecutionBundle(rawBundle);
				expect(bundle.version, 'Expected execution bundle schema version 1').toBe(1);
				expect(bundle.workflowId, 'Expected execution bundle workflowId to match').toBe(workflowId);
				expect(
					bundle.editFieldsEcho,
					'Expected execution payload in Azure Blob storage to contain the webhook echo result',
				).toBe(`probe:${token}`);

				const sqliteRecord = await readSqliteExecutionRecord(main, workflowId, executionId);
				expect(
					sqliteRecord.entity,
					`Expected execution_entity row for execution ${executionId} to record storedAt="az"`,
				).toEqual({
					status: 'success',
					finished: 1,
					storedAt: 'az',
				});
				expect(
					sqliteRecord.executionDataRowCount,
					`Expected no inline execution_data row in SQLite for execution ${executionId}`,
				).toBe(0);
			},
			cleanup: async (stack) => {
				await stack.services.azurite.blob.deleteContainer(containerName);
			},
		});
	},
);
