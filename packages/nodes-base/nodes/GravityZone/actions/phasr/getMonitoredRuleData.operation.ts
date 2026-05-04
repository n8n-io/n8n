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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1362200-getmonitoredruledata.html" target="_blank" rel="noopener noreferrer">Get Monitored Rule Data</a>',
		name: 'getMonitoredRuleDataDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Rule ID',
		name: 'ruleId',
		type: 'number',
		required: true,
		default: 0,
		description: 'The ID of the rule you want to retrieve information for',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Company ID',
				name: 'companyId',
				type: 'string',
				default: '',
				description: 'The ID of the company to which the specified rule belongs',
			},
			{
				displayName: 'Profile Type',
				name: 'profileType',
				type: 'options',
				default: 1,
				options: [
					{ name: 'Profiles Using Tools', value: 1 },
					{ name: 'Profiles Not Using Tools', value: 2 },
					{ name: 'Profiles Restricted by Autopilot', value: 3 },
					{ name: 'Profiles Restricted by Direct Control', value: 4 },
				],
				description:
					'Determines the types of behavioral profiles included in the response. If not set, all types are returned.',
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
	show: { category: ['phasr'], action: ['getMonitoredRuleData'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const ruleId = this.getNodeParameter('ruleId', i) as number;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { ruleId };

	if (options.companyId) params.companyId = options.companyId;
	if (options.profileType !== undefined) params.profileType = options.profileType;
	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'phasr',
		'getMonitoredRuleData',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
