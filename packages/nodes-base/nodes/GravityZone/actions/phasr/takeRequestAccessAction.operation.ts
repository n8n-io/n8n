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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1477212-takerequestaccessaction.html" target="_blank" rel="noopener noreferrer">Take Request Access Action</a>',
		name: 'takeRequestAccessActionDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Recommendation IDs',
		name: 'recommendationIds',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of recommendation IDs to take action on (e.g. "1234567890, 1234567891, 1234567892")',
	},
	{
		displayName: 'Action',
		name: 'actionValue',
		type: 'options',
		required: true,
		default: 'allow',
		options: [
			{ name: 'Allow', value: 'allow' },
			{ name: 'Deny', value: 'deny' },
		],
		description: 'The action to take on the request access recommendations',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
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
	show: { category: ['phasr'], action: ['takeRequestAccessAction'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const actionValue = this.getNodeParameter('actionValue', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const recommendationIdsRaw = this.getNodeParameter('recommendationIds', i) as string;
	const recommendationIds = recommendationIdsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = {
		recommendationIds,
		action: actionValue,
	};

	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'phasr',
		'takeRequestAccessAction',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
