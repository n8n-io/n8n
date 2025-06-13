import { UnexpectedError } from 'n8n-workflow';
import type { INodeExecutionData, IExecuteFunctions } from 'n8n-workflow';

import type { KeboolaUploadParams, KeboolaTableIdentifiers, UploadParams } from './KeboolaV1.types';

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

export function createUploadUrl(apiUrl: string): string {
	return apiUrl.replace(/^https:\/\/connection\./, 'https://import.') + '/upload-file';
}

export function formatUploadSuccessMessage(itemCount: number, tableId: string): string {
	return `Uploaded ${itemCount} rows to ${tableId}`;
}

export async function delay(ms: number): Promise<void> {
	return await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function validateBucketId(bucketId: string): { stage: string; name: string } {
	const match = bucketId.match(/^(in|out)\.c-(.+)$/);

	if (!match) {
		throw new UnexpectedError(
			`Invalid bucket ID: ${bucketId}. Expected format is "<stage>.c-<name>", e.g. "out.c-n8n"`,
		);
	}

	const [, stage, name] = match;
	return { stage, name };
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
