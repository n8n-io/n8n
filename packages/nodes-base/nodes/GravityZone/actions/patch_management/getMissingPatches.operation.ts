import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1223777-getmissingpatches.html" target="_blank" rel="noopener noreferrer">Get Missing Patches</a>',
		name: 'getMissingPatchesDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Endpoint IDs',
		name: 'endpointsIds',
		type: 'string',
		default: '',
		description:
			'A comma-separated list of endpoint IDs to retrieve missing patches for (e.g. "1234567890, 1234567891, 1234567892")',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Filter by Type',
				name: 'filterType',
				type: 'options',
				default: -1,
				options: [
					{ name: 'All Types', value: -1 },
					{ name: 'Security Patch', value: 0 },
					{ name: 'Non-Security Patch', value: 1 },
					{ name: 'Manually Approved Patch', value: 2 },
				],
				description: 'The type of patches to include in the response',
			},
			{
				displayName: 'Filter by Severity',
				name: 'filterSeverity',
				type: 'options',
				default: -1,
				options: [
					{ name: 'All Severities', value: -1 },
					{ name: 'Critical', value: 4 },
					{ name: 'Important', value: 3 },
					{ name: 'Low', value: 1 },
					{ name: 'Moderate', value: 2 },
					{ name: 'None', value: 0 },
					{ name: 'Unassigned', value: 5 },
				],
				description: 'The severity level of patches to include in the response',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'Page number for pagination',
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'Number of items per page',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['patch_management'], action: ['getMissingPatches'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const endpointsIdsStr = this.getNodeParameter('endpointsIds', i) as string;
	const endpointsIds = endpointsIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const filters: IDataObject = {};

	if (options.filterType !== undefined && (options.filterType as number) !== -1) {
		filters.type = options.filterType;
	}
	if (options.filterSeverity !== undefined && (options.filterSeverity as number) !== -1) {
		filters.severity = options.filterSeverity;
	}

	const params: IDataObject = {};

	if (endpointsIds.length > 0) {
		params.endpointsIds = endpointsIds;
	}
	if (Object.keys(filters).length > 0) {
		params.filters = filters;
	}
	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'patchManagement',
		'getMissingPatches',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
