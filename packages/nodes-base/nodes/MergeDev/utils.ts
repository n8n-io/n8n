import type {
	Accounting,
	Ats,
	Crm,
	Filestorage,
	Hris,
	MergeClient,
	Ticketing,
} from '@mergeapi/merge-node-client';
import { type IDataObject, UserError } from 'n8n-workflow';

export type CategoryClient =
	| AtsClient
	| CrmClient
	| FilestorageClient
	| HrisClient
	| TicketingClient
	| AccountingClient;

export type MergeCredentials = { apiKey: string; accountToken: string };

// SDK category client instance types
type AtsClient = InstanceType<typeof Ats>;
type CrmClient = InstanceType<typeof Crm>;
type FilestorageClient = InstanceType<typeof Filestorage>;
type HrisClient = InstanceType<typeof Hris>;
type TicketingClient = InstanceType<typeof Ticketing>;
type AccountingClient = InstanceType<typeof Accounting>;

export interface ModelOperation {
	modelName: string;
	availableOperations: string[];
	requiredPostParameters: string[];
	supportedFields: string[];
}

export function getCategoryClient(merge: MergeClient, category: string): CategoryClient {
	switch (category) {
		case 'ats':
			return merge.ats;
		case 'crm':
			return merge.crm;
		case 'filestorage':
			return merge.filestorage;
		case 'hris':
			return merge.hris;
		case 'ticketing':
			return merge.ticketing;
		case 'accounting':
			return merge.accounting;
		default:
			throw new UserError(`Unknown Merge.dev category: ${category}`);
	}
}

/** Infrastructure resource names shared by all category clients. */
const INFRA_RESOURCES = new Set([
	'accountDetails',
	'accountToken',
	'asyncPassthrough',
	'asyncTasks', // accounting: async operation status, not a common model
	'auditTrail',
	'availableActions',
	'scopes',
	'deleteAccount',
	'fieldMapping',
	'generateKey',
	'issues',
	'linkToken',
	'linkedAccounts',
	'passthrough',
	'regenerateKey',
	'syncStatus',
	'forceResync',
	'webhookReceivers',
]);

/**
 * Resolves the SDK resource key (e.g. "files") from a Merge modelName (e.g. "FileStorageFile").
 *
 * Merge model names may carry a category prefix (e.g. "FileStorage", "Crm").
 * Strategy: find the resource whose singular form is a suffix of the model name.
 * Examples:
 *   "FileStorageFile"   → singular "file"   matches suffix → "files"
 *   "FileStorageFolder" → singular "folder" matches suffix → "folders"
 *   "Activity"          → singular "activity" matches suffix → "activities"
 */
export function findResourceKey(categoryClient: CategoryClient, modelName: string): string {
	const resources = Object.getOwnPropertyNames(Object.getPrototypeOf(categoryClient)).filter(
		(r) => !INFRA_RESOURCES.has(r) && r !== 'constructor',
	);

	const modelLower = modelName.toLowerCase();

	// Pick the resource whose singular form is the longest suffix of the model name.
	// This prevents ambiguous matches like "BankFeedAccount" → "accounts" (singular "account")
	// when "bankFeedAccounts" (singular "bankFeedAccount") is the correct, more specific match.
	let bestKey: string | undefined;
	let bestSingularLength = 0;

	for (const resource of resources) {
		const singular = resource.replace(/ies$/, 'y').replace(/s$/, '');
		const singularLower = singular.toLowerCase();
		if (
			(modelLower.endsWith(singularLower) || modelLower === resource.toLowerCase()) &&
			singularLower.length > bestSingularLength
		) {
			bestKey = resource;
			bestSingularLength = singularLower.length;
		}
	}

	if (bestKey) return bestKey;
	throw new UserError(`No SDK resource found for model "${modelName}" in this category`);
}

/** Remove null/undefined/empty-string values so they don't override SDK defaults. */
export function omitEmpty(obj: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''),
	);
}
