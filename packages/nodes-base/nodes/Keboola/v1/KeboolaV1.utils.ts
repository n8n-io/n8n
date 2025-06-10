import { UnexpectedError } from 'n8n-workflow';
import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';

import type {
	KeboolaUploadParams,
	KeboolaTableIdentifiers,
	BucketIdentifiers,
	KeboolaCredentials,
	ExtractParams,
	UploadParams,
} from './KeboolaV1.types';

export function buildCsvFromItems(items: INodeExecutionData[], columns: string[]): string {
	if (items.length === 0) {
		throw new UnexpectedError('No items to convert to CSV');
	}

	const header = columns.join(',');
	const rows = items.map((item) =>
		columns
			.map((col) => {
				const value = item.json[col] ?? '';
				return typeof value === 'string' && (value.includes(',') || value.includes('"'))
					? `"${value.replace(/"/g, '""')}"`
					: String(value);
			})
			.join(','),
	);

	return [header, ...rows].join('\n');
}

// export function detectCloudProvider(url: string): Platform {
// 	if (url.startsWith('gs://') || url.includes('storage.googleapis.com')) {
// 		return 'gcp';
// 	}
// 	if (url.startsWith('s3://') || url.includes('.s3.amazonaws.com')) {
// 		return 'aws';
// 	}
// 	if (url.includes('.blob.core.windows.net')) {
// 		return 'azure';
// 	}
// 	throw new UnexpectedError(`Unsupported cloud provider URL: ${url}`);
// }

export function parseCsv(csv: string, columns: string[]): Array<Record<string, string>> {
	const lines = csv.trim().split('\n');
	return lines.map((line) => {
		const values = line.split(',');
		return Object.fromEntries(columns.map((col, i) => [col, values[i] || '']));
	});
}

export function createTableIdentifiers(params: KeboolaUploadParams): KeboolaTableIdentifiers {
	const bucketId = `${params.bucketStage}.c-${params.bucketName}`;
	const tableId = `${bucketId}.${params.tableName}`;
	const incremental = params.importMode === 'incremental';

	return { bucketId, tableId, incremental };
}

export function parsePrimaryKeys(primaryKeysRaw: string | string[] | undefined | null): string[] {
	if (!primaryKeysRaw) return [];

	if (Array.isArray(primaryKeysRaw)) return primaryKeysRaw.filter(Boolean);

	if (typeof primaryKeysRaw !== 'string') return [];

	// Normal string processing
	return primaryKeysRaw
		.split(',')
		.map((key) => key.trim())
		.filter(Boolean);
}

export function extractColumnsFromItems(items: INodeExecutionData[]): string[] {
	if (items.length === 0) {
		throw new UnexpectedError('No items to extract columns from');
	}

	return Object.keys(items[0].json);
}

export function validateBucketId(bucketId: string): BucketIdentifiers {
	const [stage, nameWithPrefix] = bucketId.split('.c-');
	if (!stage || !nameWithPrefix) {
		throw new UnexpectedError(`Invalid bucket ID: ${bucketId}. Expected format: {stage}.c-{name}`);
	}
	return { stage, name: nameWithPrefix };
}

export function createUploadUrl(apiUrl: string): string {
	return apiUrl.replace(/^https:\/\/connection\./, 'https://import.') + '/upload-file';
}

export function formatUploadSuccessMessage(itemCount: number, tableId: string): string {
	return `Uploaded ${itemCount} rows to ${tableId}`;
}

export async function delay(ms: number): Promise<void> {
	return await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function extractAwsRegion(url: string): string {
	try {
		const parsedUrl = new URL(url);

		const hostParts = parsedUrl.hostname.split('.');

		if (hostParts.length >= 4 && hostParts[1] === 's3') {
			return hostParts[2]; // Return the region part
		}

		const regionMatch = parsedUrl.hostname.match(/\.([a-z0-9-]+)\.amazonaws\.com$/);
		if (regionMatch && regionMatch[1]) {
			return regionMatch[1];
		}

		return 'us-east-1';
	} catch (error) {
		console.warn(`Failed to extract AWS region from URL: ${url}`, error);
		return 'us-east-1';
	}
}

export async function extractCredentials(
	executeFunctions: IExecuteFunctions,
): Promise<KeboolaCredentials> {
	return await executeFunctions.getCredentials('keboolaApiToken');
}

export function extractExtractParams(executeFunctions: IExecuteFunctions): ExtractParams {
	return {
		tableId: executeFunctions.getNodeParameter('tableId', 0) as string,
	};
}

export function extractUploadParams(executeFunctions: IExecuteFunctions): UploadParams {
	const primaryKeysRaw = executeFunctions.getNodeParameter('primaryKeys', 0) as string;

	return {
		bucketStage: executeFunctions.getNodeParameter('bucketStage', 0) as string,
		bucketName: executeFunctions.getNodeParameter('bucketName', 0) as string,
		tableName: (executeFunctions.getNodeParameter('tableName', 0) as string) || 'output',
		primaryKeys: parsePrimaryKeys(primaryKeysRaw),
		importMode: executeFunctions.getNodeParameter('importMode', 0) as 'full' | 'incremental',
		uploadFilename: 'upload.csv',
	};
}

export function createContextualError(originalError: unknown, operation: string): Error {
	let errorMessage = `Keboola ${operation} operation failed`;
	let errorStack: string | undefined;

	if (originalError instanceof Error) {
		errorMessage += `: ${originalError.message}`;
		errorStack = originalError.stack;
	} else if (typeof originalError === 'string') {
		errorMessage += `: ${originalError}`;
	} else {
		errorMessage += ': Unknown error occurred';
	}

	const contextualError = new Error(errorMessage);
	if (errorStack) {
		contextualError.stack = errorStack;
	}

	return contextualError;
}
