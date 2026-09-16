import type { IExecuteFunctions } from 'n8n-workflow';

import { escapeODataValue } from '../../../../utils/query-escaping';
import { dataverseApiRequest, type DataverseQuery } from '../GenericFunctions';
import { normalizeEntitySet } from './shared';

export interface DataverseTableMetadata {
	logicalName: string;
	entitySetName: string;
	primaryIdAttribute?: string;
	tableType?: string;
}

interface EntityDefinitionRow {
	LogicalName?: string;
	EntitySetName?: string;
	PrimaryIdAttribute?: string;
	TableType?: string;
}

const entitySetCache = new WeakMap<
	object,
	Map<string, Promise<DataverseTableMetadata | undefined>>
>();

export function isElasticTable(metadata: Pick<DataverseTableMetadata, 'tableType'>): boolean {
	return metadata.tableType?.toLowerCase() === 'elastic';
}

export async function resolveTableMetadata(
	ctx: IExecuteFunctions,
	credentialType: string,
	entitySet: string,
): Promise<DataverseTableMetadata | undefined> {
	const normalizedEntitySet = normalizeEntitySet(entitySet);
	let perContext = entitySetCache.get(ctx);
	if (!perContext) {
		perContext = new Map();
		entitySetCache.set(ctx, perContext);
	}

	const existing = perContext.get(normalizedEntitySet);
	if (existing) return await existing;

	const pending = fetchTableMetadata(ctx, credentialType, normalizedEntitySet);
	perContext.set(normalizedEntitySet, pending);
	try {
		return await pending;
	} catch (error) {
		perContext.delete(normalizedEntitySet);
		throw error;
	}
}

async function fetchTableMetadata(
	ctx: IExecuteFunctions,
	credentialType: string,
	entitySet: string,
): Promise<DataverseTableMetadata | undefined> {
	const response = await dataverseApiRequest(
		ctx,
		'GET',
		'/EntityDefinitions',
		{},
		{
			$select: 'LogicalName,EntitySetName,PrimaryIdAttribute,TableType',
			$filter: `EntitySetName eq '${escapeODataValue(entitySet)}'`,
		},
		{},
		credentialType,
	);
	const row = (response.value as EntityDefinitionRow[] | undefined)?.[0];
	return row ? toTableMetadata(row) : undefined;
}

export async function resolveTableMetadataByLogicalNames(
	ctx: IExecuteFunctions,
	credentialType: string,
	logicalNames: string[],
): Promise<Map<string, DataverseTableMetadata>> {
	const result = new Map<string, DataverseTableMetadata>();
	const uniqueNames = [...new Set(logicalNames)];
	if (uniqueNames.length === 0) return result;

	const filter = uniqueNames
		.map((name) => `LogicalName eq '${name.replace(/'/g, "''")}'`)
		.join(' or ');
	const response = await dataverseApiRequest(
		ctx,
		'GET',
		'/EntityDefinitions',
		{},
		{
			$select: 'LogicalName,EntitySetName,PrimaryIdAttribute,TableType',
			$filter: filter,
		} as DataverseQuery,
		{},
		credentialType,
	);
	const rows = (response.value as EntityDefinitionRow[] | undefined) ?? [];
	for (const row of rows) {
		const metadata = toTableMetadata(row);
		if (metadata) result.set(metadata.logicalName, metadata);
	}
	return result;
}

function toTableMetadata(row: EntityDefinitionRow): DataverseTableMetadata | undefined {
	if (!row.LogicalName || !row.EntitySetName) return undefined;
	return {
		logicalName: row.LogicalName,
		entitySetName: row.EntitySetName,
		primaryIdAttribute: row.PrimaryIdAttribute,
		tableType: row.TableType,
	};
}
