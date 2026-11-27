import { isRecord } from '@n8n/utils/is-record';
import flatted from 'flatted';
import type { N8NStack } from 'n8n-containers/stack';

import type { DeploymentProbe } from './probe';

type StackContainer = N8NStack['containers'][number];

// Pin to 2.49.7 so local runs and retries stay reproducible.
// Override with TEST_IMAGE_N8N_UPGRADE_FROM (CI resolves 2.x stable by digest).
const DEFAULT_FROM_IMAGE =
	'ghcr.io/n8n-io/n8n@sha256:17a3e5a8c5e2a7440cc757f5392d57b50eefdfd46eac4532a7dea9bf2735d9ae';
export const CONTAINER_HOME_DIR = '/home/node';
const CONTAINER_N8N_FOLDER = `${CONTAINER_HOME_DIR}/.n8n`;

export interface BinaryFileCheck {
	exists: boolean;
	content: string;
	metadataExists: boolean;
}

export interface StorageMigrationState {
	binaryDataDirExists: boolean;
	storageDirExists: boolean;
	binaryFileInBinaryData: BinaryFileCheck;
	binaryFileInStorage: BinaryFileCheck;
	fsStorageMigrated: boolean | null;
}

export interface WorkflowSnapshot {
	id: string;
	name: string;
	active: boolean;
}

export interface CredentialSnapshot {
	id: string;
	name: string;
	type: string;
	data: Record<string, unknown>;
}

export interface ExecutionSnapshot {
	id: string;
	workflowId: string;
	status: string;
	finished: boolean;
	runData: Record<string, unknown>;
}

const INSPECT_STORAGE_STATE_SCRIPT = `
const fs = require('node:fs');
const path = require('node:path');
const [n8nFolder, relativePath] = process.argv.slice(1);
const binaryDataDir = path.join(n8nFolder, 'binaryData');
const storageDir = path.join(n8nFolder, 'storage');
const checkFile = (rootDir) => {
	const fullPath = path.resolve(rootDir, relativePath);
	const exists = fs.existsSync(fullPath);
	return {
		exists,
		content: exists ? fs.readFileSync(fullPath, 'utf8') : '',
		metadataExists: fs.existsSync(fullPath + '.metadata'),
	};
};
let fsStorageMigrated = null;
const configPath = path.join(n8nFolder, 'config');
if (fs.existsSync(configPath)) {
	try {
		const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
		if (typeof parsed.fsStorageMigrated === 'boolean') {
			fsStorageMigrated = parsed.fsStorageMigrated;
		}
	} catch {
		fsStorageMigrated = null;
	}
}
process.stdout.write(
	JSON.stringify({
		binaryDataDirExists: fs.existsSync(binaryDataDir),
		storageDirExists: fs.existsSync(storageDir),
		binaryFileInBinaryData: checkFile(binaryDataDir),
		binaryFileInStorage: checkFile(storageDir),
		fsStorageMigrated,
	}),
);
`;

function unwrapData(body: unknown): Record<string, unknown> {
	if (!isRecord(body)) return {};
	if (isRecord(body.data)) return body.data;
	return body;
}

function toIdString(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return '';
}

function parseBinaryFileCheck(value: unknown): BinaryFileCheck {
	if (
		!isRecord(value) ||
		typeof value.exists !== 'boolean' ||
		typeof value.content !== 'string' ||
		typeof value.metadataExists !== 'boolean'
	) {
		throw new Error(`Unexpected binary file check entry: ${JSON.stringify(value)}`);
	}
	return {
		exists: value.exists,
		content: value.content,
		metadataExists: value.metadataExists,
	};
}

export function resolveUpgradeFromImage(): string {
	return process.env.TEST_IMAGE_N8N_UPGRADE_FROM?.trim() || DEFAULT_FROM_IMAGE;
}

export function resolveHostUser(): string {
	return `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;
}

export function parseMajorVersion(version: string): number {
	const match = /^(\d+)\./.exec(version.trim());
	if (!match) {
		throw new Error(`Unable to parse major version from n8n version "${version}"`);
	}
	return Number.parseInt(match[1], 10);
}

export function requireMainContainer(stack: N8NStack): StackContainer {
	const container = stack.findContainers(/-n8n(-main-1)?$/)[0];
	if (!container) {
		throw new Error('Expected a main n8n container in the stack');
	}
	return container;
}

export function extractBinaryIds(runData: Record<string, unknown>): Record<string, string> {
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

export function extractEditFieldsEcho(runData: unknown): string {
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

export function stripFilesystemPrefix(binaryDataId: string): string {
	return binaryDataId.replace(/^filesystem(?:-v2)?:/, '');
}

export async function inspectStorageMigrationState(
	container: StackContainer,
	binaryRelativePath: string,
): Promise<StorageMigrationState> {
	const result = await container.exec([
		'node',
		'--no-warnings',
		'-e',
		INSPECT_STORAGE_STATE_SCRIPT,
		CONTAINER_N8N_FOLDER,
		binaryRelativePath,
	]);
	if (result.exitCode !== 0) {
		throw new Error(
			`Failed to inspect ${CONTAINER_N8N_FOLDER} in ${container.getName()} (exit ${result.exitCode}): ${result.output}`,
		);
	}
	const parsed: unknown = JSON.parse(result.stdout);
	if (
		!isRecord(parsed) ||
		typeof parsed.binaryDataDirExists !== 'boolean' ||
		typeof parsed.storageDirExists !== 'boolean' ||
		(parsed.fsStorageMigrated !== null && typeof parsed.fsStorageMigrated !== 'boolean')
	) {
		throw new Error(`Unexpected storage migration probe output: ${result.stdout.slice(0, 400)}`);
	}
	return {
		binaryDataDirExists: parsed.binaryDataDirExists,
		storageDirExists: parsed.storageDirExists,
		binaryFileInBinaryData: parseBinaryFileCheck(parsed.binaryFileInBinaryData),
		binaryFileInStorage: parseBinaryFileCheck(parsed.binaryFileInStorage),
		fsStorageMigrated: parsed.fsStorageMigrated,
	};
}

export async function readWorkflow(
	probe: DeploymentProbe,
	workflowId: string,
): Promise<WorkflowSnapshot> {
	const response = await probe.fetch(`rest/workflows/${workflowId}`);
	const text = await response.text();
	if (!response.ok()) {
		throw new Error(
			`GET rest/workflows/${workflowId} failed (${response.status()}): ${text.slice(0, 400)}`,
		);
	}
	const body: unknown = JSON.parse(text);
	const data = unwrapData(body);
	return {
		id: toIdString(data.id),
		name: typeof data.name === 'string' ? data.name : '',
		active: data.active === true,
	};
}

export async function readCredentialWithData(
	probe: DeploymentProbe,
	credentialId: string,
): Promise<CredentialSnapshot> {
	const response = await probe.fetch(`rest/credentials/${credentialId}?includeData=true`);
	const text = await response.text();
	if (!response.ok()) {
		throw new Error(
			`GET rest/credentials/${credentialId}?includeData=true failed (${response.status()}): ${text.slice(0, 400)}`,
		);
	}
	const body: unknown = JSON.parse(text);
	const data = unwrapData(body);
	return {
		id: toIdString(data.id),
		name: typeof data.name === 'string' ? data.name : '',
		type: typeof data.type === 'string' ? data.type : '',
		data: isRecord(data.data) ? data.data : {},
	};
}

export async function readExecutionById(
	probe: DeploymentProbe,
	executionId: string,
): Promise<ExecutionSnapshot> {
	const response = await probe.fetch(`rest/executions/${executionId}`);
	const text = await response.text();
	if (!response.ok()) {
		throw new Error(
			`GET rest/executions/${executionId} failed (${response.status()}): ${text.slice(0, 400)}`,
		);
	}
	const body: unknown = JSON.parse(text);
	const detail = unwrapData(body);
	const parsedData: unknown =
		typeof detail.data === 'string' ? flatted.parse(detail.data) : detail.data;
	const resultData =
		isRecord(parsedData) && isRecord(parsedData.resultData) ? parsedData.resultData : null;
	const runData = resultData && isRecord(resultData.runData) ? resultData.runData : {};
	return {
		id: toIdString(detail.id),
		workflowId: toIdString(detail.workflowId),
		status: typeof detail.status === 'string' ? detail.status : '',
		finished: detail.finished === true,
		runData,
	};
}

export async function downloadBinaryData(
	probe: DeploymentProbe,
	binaryDataId: string,
): Promise<string> {
	const params = new URLSearchParams({ id: binaryDataId, action: 'download' });
	const response = await probe.fetch(`rest/binary-data?${params.toString()}`);
	const text = await response.text();
	if (!response.ok()) {
		throw new Error(
			`GET rest/binary-data (${binaryDataId}) failed (${response.status()}): ${text.slice(0, 400)}`,
		);
	}
	return text;
}
