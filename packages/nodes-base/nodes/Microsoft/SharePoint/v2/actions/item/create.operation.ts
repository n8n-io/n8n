import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	ResourceMapperField,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { updateDisplayOptions } from '../../../../../../utils/utilities';
import { listRLC, untilSiteSelected } from '../../list';
import { itemColumns } from '../../list/columns';
import { resolveSiteId, siteRLC } from '../../site';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		...siteRLC,
		description: 'Select the site the list belongs to',
	},
	{
		...listRLC,
		description: 'Select the list to create an item in',
		displayOptions: {
			hide: {
				...untilSiteSelected,
			},
		},
	},
	itemColumns('add'),
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

// A hyperlink column arrives as two mapper fields (`{name}.Url`/`{name}.Description`)
// and must be folded back into SharePoint's two-part value; writing it requires
// `Prefer: apiversion=2.1` (see the contract note in list/columns.ts).
function buildItemFields(
	value: IDataObject,
	schema: ResourceMapperField[],
): { fields: IDataObject; hasHyperlink: boolean } {
	const hyperlinkColumns = new Set(
		schema
			.filter((field) => field.type === 'url' && field.id.endsWith('.Url'))
			.map((field) => field.id.slice(0, -'.Url'.length)),
	);

	// Null-prototype accumulator: column names are data, not code
	const fields = Object.create(null) as IDataObject;
	let hasHyperlink = false;
	for (const [key, fieldValue] of Object.entries(value)) {
		const dot = key.lastIndexOf('.');
		const name = dot === -1 ? key : key.slice(0, dot);
		const part = dot === -1 ? '' : key.slice(dot + 1);
		if (hyperlinkColumns.has(name) && (part === 'Url' || part === 'Description')) {
			hasHyperlink = true;
			fields[name] = { ...(fields[name] as IDataObject), [part]: fieldValue };
		} else {
			fields[key] = fieldValue;
		}
	}
	return { fields: { ...fields }, hasHyperlink };
}

export async function execute(
	this: IExecuteFunctions,
	i: number,
	siteIdCache?: Map<string, string>,
): Promise<IDataObject | IDataObject[]> {
	// https://learn.microsoft.com/en-us/graph/api/listitem-create
	const siteId = await resolveSiteId.call(this, i, siteIdCache);
	const listIdOrTitle = (
		this.getNodeParameter('list', i, '', { extractValue: true }) as string
	).trim();
	if (listIdOrTitle === '') {
		throw new NodeOperationError(this.getNode(), "The 'List' parameter is empty", {
			description: 'Set the list ID or title and try again.',
		});
	}

	const mappingMode = this.getNodeParameter('columns.mappingMode', i) as string;
	const schema = this.getNodeParameter('columns.schema', i, []) as ResourceMapperField[];

	let value: IDataObject;
	if (mappingMode === 'autoMapInputData') {
		const knownColumns = new Set(schema.map((field) => field.id));
		value = Object.fromEntries(
			Object.entries(this.getInputData()[i].json).filter(([key]) => knownColumns.has(key)),
		);
	} else {
		value = this.getNodeParameter('columns.value', i, {}) as IDataObject;
	}

	const { fields, hasHyperlink } = buildItemFields(value, schema);

	try {
		return await microsoftApiRequest.call(
			this,
			'POST',
			`/v1.0/sites/${encodeURIComponent(siteId)}/lists/${encodeURIComponent(listIdOrTitle)}/items`,
			{ fields },
			{},
			undefined,
			hasHyperlink ? { Prefer: 'apiversion=2.1' } : {},
		);
	} catch (error) {
		if (error instanceof NodeApiError && error.message.includes('unique constraints')) {
			error.description = "Double-check the value(s) in 'Columns' and try again";
		}
		throw error;
	}
}
