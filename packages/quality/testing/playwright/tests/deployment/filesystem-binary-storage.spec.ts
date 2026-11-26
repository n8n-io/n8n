import { isRecord } from '@n8n/utils/is-record';
import { expect, test } from '@playwright/test';
import { ENGINE_SHARED_STORAGE_PATH } from 'n8n-containers/services/engine';
import type { N8NStack } from 'n8n-containers/stack';

import { assertN8nImage, runDeploymentCell } from './probe';

type StackContainer = N8NStack['containers'][number];

interface BinaryStorageFileCheck {
	relativePath: string;
	exists: boolean;
	content: string;
	metadataExists: boolean;
}

const READ_STORAGE_FILES_SCRIPT = `
const fs = require('node:fs');
const path = require('node:path');
const [storageRoot, ...relativePaths] = process.argv.slice(1);
const results = relativePaths.map((relativePath) => {
	const fullPath = path.resolve(storageRoot, relativePath);
	const exists = fs.existsSync(fullPath);
	const content = exists ? fs.readFileSync(fullPath, 'utf8') : '';
	const metadataExists = fs.existsSync(fullPath + '.metadata');
	return { relativePath, exists, content, metadataExists };
});
process.stdout.write(JSON.stringify(results));
`;

function requireContainer(stack: N8NStack, pattern: RegExp, role: string): StackContainer {
	const container = stack.findContainers(pattern)[0];
	if (!container) {
		throw new Error(`Expected a ${role} n8n container in the stack`);
	}
	return container;
}

function extractBinaryIds(runData: Record<string, unknown>): Record<string, string> {
	const ids: Record<string, string> = {};
	for (const [nodeName, runs] of Object.entries(runData)) {
		if (!Array.isArray(runs)) continue;
		for (const run of runs) {
			if (!isRecord(run) || !isRecord(run.data) || !Array.isArray(run.data.main)) continue;
			for (const branch of run.data.main) {
				if (!Array.isArray(branch)) continue;
				for (const item of branch) {
					if (!isRecord(item) || !isRecord(item.binary)) continue;
					for (const [propName, entry] of Object.entries(item.binary)) {
						if (isRecord(entry) && typeof entry.id === 'string') {
							ids[`${nodeName}.${propName}`] = entry.id;
						}
					}
				}
			}
		}
	}
	return ids;
}

function stripFilesystemPrefix(binaryDataId: string): string {
	return binaryDataId.replace(/^filesystem(?:-v2)?:/, '');
}

function parseFileChecks(raw: string): BinaryStorageFileCheck[] {
	const parsed: unknown = JSON.parse(raw);
	if (!Array.isArray(parsed)) {
		throw new Error(`Expected array from storage file check, got: ${raw.slice(0, 400)}`);
	}
	return parsed.map((entry) => {
		if (
			!isRecord(entry) ||
			typeof entry.relativePath !== 'string' ||
			typeof entry.exists !== 'boolean' ||
			typeof entry.content !== 'string' ||
			typeof entry.metadataExists !== 'boolean'
		) {
			throw new Error(`Unexpected storage file check entry: ${JSON.stringify(entry)}`);
		}
		return {
			relativePath: entry.relativePath,
			exists: entry.exists,
			content: entry.content,
			metadataExists: entry.metadataExists,
		};
	});
}

async function readSharedStorageFiles(
	container: StackContainer,
	relativePaths: string[],
): Promise<BinaryStorageFileCheck[]> {
	const result = await container.exec([
		'node',
		'--no-warnings',
		'-e',
		READ_STORAGE_FILES_SCRIPT,
		ENGINE_SHARED_STORAGE_PATH,
		...relativePaths,
	]);
	if (result.exitCode !== 0) {
		throw new Error(
			`Failed to inspect ${ENGINE_SHARED_STORAGE_PATH} in ${container.getName()} (exit ${result.exitCode}): ${result.output}`,
		);
	}
	return parseFileChecks(result.stdout);
}

test(
	'Filesystem binary storage in queue mode',
	{
		tag: '@cell:ENV-07',
		annotation: [{ type: 'owner', description: 'Developer Platform' }],
	},
	async () => {
		await runDeploymentCell({
			stack: {
				workers: 1,
				sharedStorage: true,
			},
			probe: async ({ probe }) => {
				const binary = await probe.roundTripBinary();
				const execution = await probe.readExecution(binary.workflowId);
				return { binary, execution };
			},
			check: async ({ stack, probeOutput }) => {
				assertN8nImage(stack);

				expect(
					stack.serviceResults.redis,
					'Expected a Redis container in queue mode',
				).toBeDefined();
				expect(
					stack.serviceResults.postgres,
					'Expected a PostgreSQL container in queue mode',
				).toBeDefined();

				const main = requireContainer(stack, /-n8n(-main-1)?$/, 'main');
				const worker = requireContainer(stack, /-n8n-worker-1$/, 'worker');

				const { workflowId, payload, extracted } = probeOutput.binary;
				const { executionId, runData } = probeOutput.execution;
				expect(workflowId, `Unexpected workflowId: ${workflowId}`).toMatch(/^[A-Za-z0-9_-]+$/);
				expect(executionId, `Unexpected executionId: ${executionId}`).toMatch(/^[A-Za-z0-9_-]+$/);

				const binaryIds = extractBinaryIds(runData);
				const uploadedPattern = new RegExp(
					`^filesystem(?:-v2)?:workflows/${workflowId}/executions/(?:temp|${executionId})/binary_data/[A-Za-z0-9-]+$`,
				);
				const writtenPattern = new RegExp(
					`^filesystem(?:-v2)?:workflows/${workflowId}/executions/${executionId}/binary_data/[A-Za-z0-9-]+$`,
				);
				const uploadedId = binaryIds['Webhook.data'] ?? '';
				const writtenId = binaryIds['Convert to File.written'] ?? '';

				expect(
					uploadedId,
					`Expected uploaded webhook binary to use filesystem storage, got "${uploadedId}"`,
				).toMatch(uploadedPattern);
				expect(
					writtenId,
					`Expected worker-written binary to use filesystem storage, got "${writtenId}"`,
				).toMatch(writtenPattern);

				const relativePaths = [stripFilesystemPrefix(uploadedId), stripFilesystemPrefix(writtenId)];
				const expectedFiles: BinaryStorageFileCheck[] = [
					{
						relativePath: relativePaths[0],
						exists: true,
						content: payload,
						metadataExists: true,
					},
					{
						relativePath: relativePaths[1],
						exists: true,
						content: extracted,
						metadataExists: true,
					},
				];

				const mainFiles = await readSharedStorageFiles(main, relativePaths);
				const workerFiles = await readSharedStorageFiles(worker, relativePaths);

				expect(
					mainFiles,
					`Expected main container to read both binary files from ${ENGINE_SHARED_STORAGE_PATH}`,
				).toEqual(expectedFiles);
				expect(
					workerFiles,
					`Expected worker container to read both binary files from ${ENGINE_SHARED_STORAGE_PATH}`,
				).toEqual(expectedFiles);

				const dbBinaryRowsRaw = (
					await stack.services.postgres.exec('SELECT COUNT(*)::int FROM binary_data;')
				).trim();
				expect(
					dbBinaryRowsRaw,
					`Expected zero rows in PostgreSQL binary_data table in filesystem mode, got: ${dbBinaryRowsRaw}`,
				).toBe('0');
			},
		});
	},
);
