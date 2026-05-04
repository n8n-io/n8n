import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions, wrapData } from '@utils/utilities';

import { gravityZoneApiRequest } from '../../transport';

const properties: INodeProperties[] = [
	{
		displayName:
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1362201-getmonitoredrules.html" target="_blank" rel="noopener noreferrer">Get Monitored Rules</a>',
		name: 'getMonitoredRulesDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Categories',
				name: 'categories',
				type: 'multiOptions',
				default: [],
				options: [
					{ name: 'Hack Tool', value: 2 },
					{ name: 'Lolbin', value: 5 },
					{ name: 'Miner', value: 4 },
					{ name: 'Remote Tool', value: 3 },
					{ name: 'Tampering Tool', value: 1 },
				],
				description: 'Filter rules by category type. If not set, all categories are returned.',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description: 'The results page number',
			},
			{
				displayName: 'Per Page',
				name: 'perPage',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 50,
				description: 'The number of results displayed per page',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['phasr'], action: ['getMonitoredRules'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if ((options.categories as number[])?.length) params.categories = options.categories;
	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;

	const responseData = await gravityZoneApiRequest.call(this, 'phasr', 'getMonitoredRules', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
