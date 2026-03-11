import { MergeClient } from '@mergeapi/merge-node-client';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import {
	findResourceKey,
	getCategoryClient,
	getLinkedAccountCategory,
	type ModelOperation,
} from '../utils';

type MergeCredentials = { apiKey: string; accountToken: string };

export async function getCommonModels(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { apiKey, accountToken } = await this.getCredentials<MergeCredentials>('mergeDevApi');
	const merge = new MergeClient({ apiKey, accountToken });
	const category = await getLinkedAccountCategory(merge);
	const client = getCategoryClient(merge, category);

	const result = await client.availableActions.retrieve();
	const ops = result.availableModelOperations as ModelOperation[] | undefined;
	if (!ops?.length) return [];

	return ops
		.filter((op) => {
			// Skip models that don't have a standalone SDK resource (e.g. FileStoragePermissions
			// is embedded inside files/folders and has no dedicated list/retrieve endpoint)
			try {
				findResourceKey(client, op.modelName);
				return true;
			} catch {
				return false;
			}
		})
		.map((op) => ({
			// Display name strips common category prefixes (e.g. "FileStorageFile" → "File")
			// Value stays as the full modelName so we can match it back in availableActions
			name: op.modelName
				.replace(/^FileStorage/, '')
				.replace(/^Hris/, '')
				.replace(/([A-Z])/g, ' $1')
				.trim(),
			value: op.modelName,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getModelOperations(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const { apiKey, accountToken } = await this.getCredentials<MergeCredentials>('mergeDevApi');
	const modelName = this.getNodeParameter('commonModels') as string;
	const merge = new MergeClient({ apiKey, accountToken });
	const category = await getLinkedAccountCategory(merge);
	const client = getCategoryClient(merge, category);

	const result = await client.availableActions.retrieve();
	const ops = result.availableModelOperations as ModelOperation[] | undefined;
	const modelOp = ops?.find((op) => op.modelName === modelName);
	if (!modelOp) return [];

	const resourceKey = findResourceKey(client, modelName);
	const resource = (client as unknown as Record<string, unknown>)[resourceKey] as Record<
		string,
		unknown
	>;

	// Detect operations by SDK method presence — more reliable than availableOperations,
	// which only reflects what the specific third-party integration reports and can be
	// empty even when the Merge endpoint exists (e.g. Accounting Expenses CREATE).
	const operations: INodePropertyOptions[] = [
		{ name: 'List', value: 'list', description: 'Return a paginated list of records' },
		{ name: 'Get', value: 'get', description: 'Return a single record by ID' },
	];

	if (typeof resource.create === 'function') {
		operations.push({ name: 'Create', value: 'create', description: 'Create a new record' });
	}

	if (typeof resource.partialUpdate === 'function') {
		operations.push({
			name: 'Update',
			value: 'update',
			description: 'Update fields on an existing record',
		});
	}

	// Detect download support (e.g. FileStorage files)
	if (typeof resource.downloadRetrieve === 'function') {
		operations.push({
			name: 'Download File',
			value: 'download',
			description: 'Download file content as binary data',
		});
	}

	if (typeof resource.downloadRequestMetaRetrieve === 'function') {
		operations.push({
			name: 'Get Download URL',
			value: 'getDownloadUrl',
			description: 'Get a direct download URL with auth headers',
		});
	}

	if (typeof resource.remoteFieldClassesList === 'function') {
		operations.push({
			name: 'List Remote Field Classes',
			value: 'remoteFieldClassesList',
			description: 'List available remote field classes for this model',
		});
	}

	if (typeof resource.linesRemoteFieldClassesList === 'function') {
		operations.push({
			name: 'List Line Remote Field Classes',
			value: 'linesRemoteFieldClassesList',
			description: 'List available remote field classes for line items',
		});
	}

	if (typeof resource.metaPostRetrieve === 'function') {
		operations.push({
			name: 'Get Create Metadata',
			value: 'metaPostRetrieve',
			description: 'Get metadata describing available fields for creating a record',
		});
	}

	return operations;
}
