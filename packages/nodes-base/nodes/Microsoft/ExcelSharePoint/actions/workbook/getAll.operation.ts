import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeParameterResourceLocator,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { libraryRLC, returnAllAndLimit, siteRLC } from '../../descriptions/common.descriptions';
import {
	fetchCollection,
	resolveSiteId,
	runPerItem,
	validatePathSegment,
} from '../../helpers/utils';
import { isWorkbookFile, workbookSearchEndpoint } from '../../helpers/workbookSearch';
import type { DriveItem } from '../../helpers/workbookSearch';

const properties: INodeProperties[] = [
	siteRLC,
	libraryRLC,
	{
		displayName: 'Filter',
		name: 'filter',
		type: 'string',
		default: '',
		placeholder: 'e.g. budget',
		description: 'Text to search the library for. Leave empty to list every workbook.',
	},
	...returnAllAndLimit,
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Fields',
				name: 'fields',
				type: 'string',
				default: '',
				description: 'Fields to include in the response. Separate multiple fields with a comma.',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['workbook'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const siteIdCache = new Map<string, string>();

	return await runPerItem.call(this, items, async (i) => {
		const filterText = this.getNodeParameter('filter', i, '') as string;
		const options = this.getNodeParameter('options', i, {}) as { fields?: string };

		const qs: IDataObject = {};
		if (options.fields) {
			// name and file must survive a narrowed $select — the workbook trim reads them
			qs.$select = [
				...new Set([...options.fields.split(',').map((field) => field.trim()), 'name', 'file']),
			].join(',');
		}

		const siteId = await resolveSiteId.call(this, i, siteIdCache);
		const driveId = validatePathSegment(
			this.getNode(),
			'Library',
			String((this.getNodeParameter('library', i) as INodeParameterResourceLocator).value ?? ''),
		);
		const endpoint = workbookSearchEndpoint(siteId, driveId, filterText);

		// Filter per page inside fetchCollection so a limited listing keeps paging
		// until it has `limit` workbooks, not just whatever the first page holds
		return await (fetchCollection<DriveItem>).call(this, i, endpoint, qs, (page) =>
			page.filter(isWorkbookFile),
		);
	});
}
