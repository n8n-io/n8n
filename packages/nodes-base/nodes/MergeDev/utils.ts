import type {
	Accounting,
	Ats,
	Crm,
	Filestorage,
	Hris,
	MergeClient,
	Ticketing,
} from '@mergeapi/merge-node-client';
import { UserError } from 'n8n-workflow';

export type CategoryClient =
	| AtsClient
	| CrmClient
	| FilestorageClient
	| HrisClient
	| TicketingClient
	| AccountingClient;

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

/**
 * Returns the category of the linked account by calling accountDetails.
 * The account-details endpoint returns the correct linked account regardless of
 * which category URL is used, so we bootstrap through `filestorage`.
 */
export async function getLinkedAccountCategory(merge: MergeClient): Promise<string> {
	const details = await merge.filestorage.accountDetails.retrieve();
	return details.category ?? 'filestorage';
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

	for (const resource of resources) {
		// Derive singular form of the resource key
		const singular = resource.replace(/ies$/, 'y').replace(/s$/, '');
		if (modelLower.endsWith(singular.toLowerCase())) {
			return resource;
		}
		// Also accept exact match on the resource key itself
		if (modelLower === resource.toLowerCase()) {
			return resource;
		}
	}

	throw new UserError(`No SDK resource found for model "${modelName}" in this category`);
}
