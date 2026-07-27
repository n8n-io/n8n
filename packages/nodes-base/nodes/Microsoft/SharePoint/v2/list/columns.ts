import type {
	FieldType,
	ILoadOptionsFunctions,
	INodeProperties,
	ResourceMapperField,
	ResourceMapperFields,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { resolveSiteId } from '../site';
import { microsoftApiRequest } from '../transport';
import { untilListSelected, untilSiteSelected } from './index';

export interface SharePointListColumn {
	name: string;
	displayName: string;
	type?: string;
	hidden?: boolean;
	readOnly?: boolean;
	required?: boolean;
	enforceUniqueValues?: boolean;
	choice?: { choices?: string[] };
}

type ContentTypesReply = { value?: Array<{ columns?: SharePointListColumn[] }> };

// No n8n field kind can hold these; omitted rather than shown as v1's disabled placeholders.
const UNSUPPORTED_COLUMN_TYPES = new Set(['location', 'geolocation', 'term', 'multiterm']);

const FIELD_TYPE_BY_COLUMN_TYPE: Record<string, FieldType> = {
	text: 'string',
	user: 'string',
	lookup: 'string',
	number: 'number',
	currency: 'number',
	// Rating columns report unknownFutureValue
	unknownFutureValue: 'number',
	boolean: 'boolean',
	dateTime: 'dateTime',
	thumbnail: 'object',
	choice: 'options',
};

function toMapperFields(column: SharePointListColumn): ResourceMapperField[] {
	const columnType = column.type ?? '';
	if (UNSUPPORTED_COLUMN_TYPES.has(columnType)) {
		return [];
	}

	const base = {
		defaultMatch: false,
		display: true,
		readOnly: false,
		required: column.required === true,
	};

	// A hyperlink column becomes two fields; the item operations fold
	// `{name}.Url`/`{name}.Description` back into SharePoint's two-part shape,
	// and their fields write must send `Prefer: apiversion=2.1` or Graph rejects it.
	if (columnType === 'url') {
		return [
			{
				...base,
				id: `${column.name}.Url`,
				displayName: `${column.displayName} (URL)`,
				canBeUsedToMatch: false,
				type: 'url',
			},
			{
				...base,
				required: false,
				id: `${column.name}.Description`,
				displayName: `${column.displayName} (Description)`,
				canBeUsedToMatch: false,
				type: 'string',
			},
		];
	}

	const field: ResourceMapperField = {
		...base,
		id: column.name,
		displayName: column.displayName,
		canBeUsedToMatch: Boolean(column.enforceUniqueValues && column.required),
		type: FIELD_TYPE_BY_COLUMN_TYPE[columnType] ?? 'string',
	};
	if (field.type === 'options') {
		field.options = (column.choice?.choices ?? []).map((choice) => ({
			name: choice,
			value: choice,
		}));
	}
	return [field];
}

export async function getMappingColumns(
	this: ILoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const siteId = await resolveSiteId.call(this, 0);
	const listIdOrTitle = (
		this.getNodeParameter('list', '', { extractValue: true }) as string
	).trim();
	if (listIdOrTitle === '') {
		throw new NodeOperationError(this.getNode(), "The 'List' parameter is empty", {
			description: 'Set the list ID or title and try again.',
		});
	}

	// Only the contentTypes columns reply carries the `type` discriminator
	// https://learn.microsoft.com/en-us/graph/api/resources/columndefinition
	const response = (await microsoftApiRequest.call(
		this,
		'GET',
		`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/contentTypes`,
		{},
		{ expand: 'columns' },
	)) as ContentTypesReply;

	// The list's default content type comes first.
	const columns = response.value?.[0]?.columns ?? [];
	const fields = columns
		.filter((column) => !column.hidden && !column.readOnly)
		.flatMap(toMapperFields);

	if (this.getNodeParameter('operation', '') === 'update') {
		fields.push({
			id: 'id',
			displayName: 'ID',
			defaultMatch: false,
			display: true,
			readOnly: true,
			required: true,
			canBeUsedToMatch: true,
			type: 'string',
		});
	}

	return { fields };
}

export function itemColumns(mode: 'add' | 'update' | 'upsert'): INodeProperties {
	return {
		displayName: 'Columns',
		name: 'columns',
		type: 'resourceMapper',
		default: { mappingMode: 'defineBelow', value: null },
		noDataExpression: true,
		required: true,
		displayOptions: {
			hide: {
				...untilSiteSelected,
				...untilListSelected,
			},
		},
		typeOptions: {
			loadOptionsDependsOn: ['site.value', 'list.value'],
			resourceMapper: {
				resourceMapperMethod: 'getMappingColumns',
				mode,
				fieldWords: {
					singular: 'column',
					plural: 'columns',
				},
				addAllFields: true,
				multiKeyMatch: false,
			},
		},
	};
}
