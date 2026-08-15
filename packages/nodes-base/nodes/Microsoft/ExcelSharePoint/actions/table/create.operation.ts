import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	libraryRLC,
	siteRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot, runPerItem, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	siteRLC,
	libraryRLC,
	workbookRLC,
	worksheetRLC,
	{
		displayName: 'Select Range',
		name: 'selectRange',
		type: 'options',
		options: [
			{
				name: 'Automatically',
				value: 'auto',
				description: 'The whole used range on the selected sheet will be converted into a table',
			},
			{
				name: 'Manually',
				value: 'manual',
				description: 'Select a range that will be converted into a table',
			},
		],
		default: 'auto',
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		default: '',
		placeholder: 'e.g. A1:B2',
		description: 'The range of cells that will be converted to a table',
		displayOptions: {
			show: {
				selectRange: ['manual'],
			},
		},
	},
	{
		displayName: 'Has Headers',
		name: 'hasHeaders',
		type: 'boolean',
		default: true,
		description:
			'Whether the range has column labels. When this property set to false Excel will automatically generate header shifting the data down by one row.',
	},
];

const displayOptions = {
	show: {
		resource: ['table'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const workbookRootCache = new Map<string, string>();
	const siteIdCache = new Map<string, string>();

	return await runPerItem.call(this, items, async (i) => {
		const workbookRoot = await resolveWorkbookRoot.call(this, i, workbookRootCache, siteIdCache);
		const worksheetId = validatePathSegment(
			this.getNode(),
			'Sheet',
			this.getNodeParameter('worksheet', i, '', { extractValue: true }) as string,
		);
		const worksheetEndpoint = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(worksheetId)}`;
		const hasHeaders = this.getNodeParameter('hasHeaders', i) as boolean;

		let range: string;
		if (this.getNodeParameter('selectRange', i) === 'auto') {
			const usedRange = await microsoftApiRequest.call(
				this,
				'GET',
				`${worksheetEndpoint}/usedRange`,
				{},
				{ $select: 'address' },
			);
			range = String(usedRange.address ?? '').split('!')[1] ?? '';
		} else {
			range = this.getNodeParameter('range', i) as string;
		}

		return await microsoftApiRequest.call(this, 'POST', `${worksheetEndpoint}/tables/add`, {
			address: range,
			hasHeaders,
		});
	});
}
