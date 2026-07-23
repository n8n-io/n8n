import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import {
	libraryRLC,
	siteRLC,
	workbookRLC,
	worksheetRLC,
} from '../../descriptions/common.descriptions';
import { resolveWorkbookRoot, validatePathSegment } from '../../helpers/utils';
import { microsoftApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	workbookRLC,
	siteRLC,
	libraryRLC,
	worksheetRLC,
	{
		displayName: 'Apply To',
		name: 'applyTo',
		type: 'options',
		// values in capital case as required by the API
		options: [
			{
				name: 'All',
				value: 'All',
				description: 'Clear data in cells and remove all formatting',
			},
			{
				name: 'Formats',
				value: 'Formats',
				description: 'Clear formatting (e.g. font size, color) of cells',
			},
			{
				name: 'Contents',
				value: 'Contents',
				description: 'Clear data contained in cells',
			},
		],
		default: 'All',
	},
	{
		displayName: 'Select a Range',
		name: 'useRange',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Range',
		name: 'range',
		type: 'string',
		placeholder: 'e.g. A1:B2',
		default: '',
		description: 'The sheet range that would be cleared, specified using A1-style notation',
		hint: 'Leave blank for entire worksheet',
		displayOptions: {
			show: {
				useRange: [true],
			},
		},
	},
];

const displayOptions = {
	show: {
		resource: ['worksheet'],
		operation: ['clear'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

type ClearSettings = {
	/** Validated sheet resource-locator value; the segment of the request path after `/workbook/worksheets/`. */
	worksheetId: string;
	/** A1-style range to clear, e.g. `A1:B2`. Empty means clear the whole worksheet instead. */
	range: string;
	/** Graph's `applyTo` choice: 'All' | 'Formats' | 'Contents'. */
	applyTo: string;
};

// Validated and read up front so the request-building code below only ever deals
// with `settings.xxx`, never raw `getNodeParameter` calls or `options.foo as bar`.
function getSettings(this: IExecuteFunctions, itemIndex: number): ClearSettings {
	const worksheetId = validatePathSegment(
		this.getNode(),
		'Sheet',
		this.getNodeParameter('worksheet', itemIndex, '', { extractValue: true }) as string,
	);

	const useRange = this.getNodeParameter('useRange', itemIndex, false) as boolean;
	const range = useRange ? (this.getNodeParameter('range', itemIndex, '') as string) : '';

	return {
		worksheetId,
		range,
		applyTo: this.getNodeParameter('applyTo', itemIndex) as string,
	};
}

export async function execute(
	this: IExecuteFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	// https://learn.microsoft.com/en-us/graph/api/range-clear
	const returnData: INodeExecutionData[] = [];

	// Hoisted once for the whole run and passed into resolveWorkbookRoot below,
	// so a pasted Workbook/Site address is resolved once, not once per item.
	const workbookRootCache = new Map<string, string>();
	const siteIdCache = new Map<string, string>();

	for (let i = 0; i < items.length; i++) {
		try {
			const settings = getSettings.call(this, i);

			const workbookRoot = await resolveWorkbookRoot.call(this, i, workbookRootCache, siteIdCache);
			const sheetPath = `${workbookRoot}/workbook/worksheets/${encodeURIComponent(settings.worksheetId)}`;
			const clearPath = settings.range
				? `${sheetPath}/range(address='${encodeURIComponent(settings.range)}')/clear`
				: `${sheetPath}/range/clear`;

			await microsoftApiRequest.call(this, 'POST', clearPath, { applyTo: settings.applyTo });

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ success: true }),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		} catch (error) {
			if (!this.continueOnFail()) throw error;

			const executionErrorData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray({ error: error.message }),
				{ itemData: { item: i } },
			);
			returnData.push(...executionErrorData);
		}
	}

	return returnData;
}
