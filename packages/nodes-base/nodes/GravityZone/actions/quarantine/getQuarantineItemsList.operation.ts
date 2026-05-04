import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { processJsonInput, updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-140256-getquarantineitemslist.html" target="_blank" rel="noopener noreferrer">Get Quarantine Items List</a>',
		name: 'getQuarantineItemsListDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Service',
		name: 'service',
		type: 'options',
		default: 'computers',
		options: [
			{ name: 'Computers', value: 'computers', description: 'Computers quarantine' },
			{ name: 'Exchange', value: 'exchange', description: 'Exchange quarantine' },
		],
		description: 'Service type for quarantine items',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Endpoint ID',
				name: 'endpointId',
				type: 'string',
				default: '',
				description:
					'The ID of the computer for which you want to retrieve the quarantined items. If not included, the method returns the items quarantined in the entire network.',
			},
			{
				displayName: 'Filters (JSON)',
				name: 'filters',
				type: 'json',
				default: '{}',
				description: 'A filters criteria object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
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

const displayOptions = { show: { category: ['quarantine'], action: ['getQuarantineItemsList'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const service = this.getNodeParameter('service', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.endpointId !== undefined && (options.endpointId as string) !== '')
		params.endpointId = options.endpointId;
	if (options.filters !== undefined) {
		const filters = processJsonInput(options.filters, 'Filters') as IDataObject;
		if (Object.keys(filters).length > 0) params.filters = filters;
	}
	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;

	const responseData = await gravityZoneApiRequest.call(
		this,
		`quarantine/${service}`,
		'getQuarantineItemsList',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
