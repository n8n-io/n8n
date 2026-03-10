import { MergeClient } from '@mergeapi/merge-node-client';
import type {
	FieldType,
	ILoadOptionsFunctions,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';

import { getCategoryClient, getLinkedAccountCategory, type ModelOperation } from '../utils';

function snakeToCamel(s: string): string {
	return s.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

function snakeToTitle(s: string): string {
	return s
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}

function inferType(fieldName: string): FieldType {
	if (fieldName.endsWith('_at') || fieldName.endsWith('_date')) return 'dateTime';
	if (fieldName === 'size' || fieldName.endsWith('_count') || fieldName === 'page_size')
		return 'number';
	// 'url' type doesn't render an input in the resourceMapper widget — use 'string' instead
	// if (fieldName.endsWith('_url') || fieldName === 'url') return 'url';
	if (
		fieldName.startsWith('is_') ||
		fieldName.startsWith('include_') ||
		fieldName.startsWith('has_') ||
		fieldName === 'is_me'
	)
		return 'boolean';
	return 'string';
}

const COMMON_LIST_FIELDS: ResourceMapperField[] = [
	{
		id: 'pageSize',
		displayName: 'Page Size',
		type: 'number',
		required: false,
		display: true,
		defaultMatch: false,
	},
	{
		id: 'cursor',
		displayName: 'Cursor',
		type: 'string',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'includeDeletedData',
		displayName: 'Include Deleted Data',
		type: 'boolean',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'includeRemoteData',
		displayName: 'Include Remote Data',
		type: 'boolean',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'includeShellData',
		displayName: 'Include Shell Data',
		type: 'boolean',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'createdAfter',
		displayName: 'Created After',
		type: 'dateTime',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'createdBefore',
		displayName: 'Created Before',
		type: 'dateTime',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'modifiedAfter',
		displayName: 'Modified After',
		type: 'dateTime',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'modifiedBefore',
		displayName: 'Modified Before',
		type: 'dateTime',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'remoteId',
		displayName: 'Remote ID',
		type: 'string',
		required: false,
		display: false,
		defaultMatch: false,
	},
];

const COMMON_GET_FIELDS: ResourceMapperField[] = [
	{
		id: 'id',
		displayName: 'ID',
		type: 'string',
		required: true,
		display: true,
		defaultMatch: true,
	},
	{
		id: 'includeRemoteData',
		displayName: 'Include Remote Data',
		type: 'boolean',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'includeShellData',
		displayName: 'Include Shell Data',
		type: 'boolean',
		required: false,
		display: false,
		defaultMatch: false,
	},
];

const DOWNLOAD_URL_FIELDS: ResourceMapperField[] = [
	{
		id: 'id',
		displayName: 'ID',
		type: 'string',
		required: true,
		display: true,
		defaultMatch: true,
	},
];

const DOWNLOAD_FILE_FIELDS: ResourceMapperField[] = [
	{
		id: 'id',
		displayName: 'ID',
		type: 'string',
		required: true,
		display: true,
		defaultMatch: true,
	},
	{
		id: 'mimeType',
		displayName: 'Mime Type',
		type: 'string',
		required: false,
		display: false,
		defaultMatch: false,
	},
	{
		id: 'includeShellData',
		displayName: 'Include Shell Data',
		type: 'boolean',
		required: false,
		display: false,
		defaultMatch: false,
	},
];

function buildCreateFields(
	supportedFields: string[],
	requiredFields: string[],
): ResourceMapperField[] {
	const requiredSet = new Set(requiredFields);
	return supportedFields
		.filter((f) => f !== 'id' && !f.endsWith('_at'))
		.map((snake) => {
			const camel = snakeToCamel(snake);
			const isRequired = requiredSet.has(snake);
			return {
				id: camel,
				displayName: snakeToTitle(snake),
				type: inferType(snake),
				required: isRequired,
				display: isRequired, // Only required fields shown by default; optional can be added manually
				defaultMatch: false,
			};
		});
}

function buildUpdateFields(supportedFields: string[]): ResourceMapperField[] {
	const idField: ResourceMapperField = {
		id: 'id',
		displayName: 'ID',
		type: 'string',
		required: true,
		display: true,
		defaultMatch: true,
	};
	// All model fields are optional for PATCH
	return [idField, ...buildCreateFields(supportedFields, [])];
}

function buildListFields(supportedFields: string[]): ResourceMapperField[] {
	const knownIds = new Set(COMMON_LIST_FIELDS.map((f) => f.id));
	const modelFilters: ResourceMapperField[] = supportedFields
		.filter((f) => f !== 'id' && !f.endsWith('_at') && !knownIds.has(snakeToCamel(f)))
		.map((snake) => ({
			id: snakeToCamel(snake),
			displayName: snakeToTitle(snake),
			type: inferType(snake),
			required: false,
			display: false,
			defaultMatch: false,
		}));
	return [...COMMON_LIST_FIELDS, ...modelFilters];
}

export async function getModelFields(this: ILoadOptionsFunctions): Promise<ResourceMapperFields> {
	const modelName = this.getNodeParameter('commonModels') as string;
	const operation = this.getNodeParameter('modelOperation') as string;

	if (operation === 'get') {
		return { fields: COMMON_GET_FIELDS };
	}

	if (operation === 'getDownloadUrl') {
		return { fields: DOWNLOAD_URL_FIELDS };
	}

	if (operation === 'download') {
		return { fields: DOWNLOAD_FILE_FIELDS };
	}

	if (operation === 'remoteFieldClassesList' || operation === 'linesRemoteFieldClassesList') {
		return { fields: COMMON_LIST_FIELDS };
	}

	const { apiKey, accountToken } = await this.getCredentials<{
		apiKey: string;
		accountToken: string;
	}>('mergeDevApi');
	const merge = new MergeClient({ apiKey, accountToken });
	const category = await getLinkedAccountCategory(merge);
	const client = getCategoryClient(merge, category);
	const result = await client.availableActions.retrieve();
	const availableModelOperations = result.availableModelOperations as ModelOperation[] | undefined;

	const modelOp = availableModelOperations?.find((op) => op.modelName === modelName);
	if (!modelOp) return { fields: [] };

	if (operation === 'list') {
		return { fields: buildListFields(modelOp.supportedFields) };
	}

	if (operation === 'create') {
		return { fields: buildCreateFields(modelOp.supportedFields, modelOp.requiredPostParameters) };
	}

	if (operation === 'update') {
		return { fields: buildUpdateFields(modelOp.supportedFields) };
	}

	return { fields: [] };
}

// Aliases used by the two separate resourceMapper properties in the node description
export { getModelFields as getQueryParamFields };
export { getModelFields as getBodyFields };
