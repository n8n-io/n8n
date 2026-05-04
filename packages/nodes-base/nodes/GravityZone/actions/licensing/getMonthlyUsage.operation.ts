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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-127109-getmonthlyusage.html" target="_blank" rel="noopener noreferrer">Get Monthly Usage</a>',
		name: 'getMonthlyUsageDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Target Month',
		name: 'targetMonth',
		type: 'string',
		required: true,
		default: '',
		description: 'The month for which the usage is returned, in "mm/yyyy" format (e.g. 04/2026)',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Company Registration Start Date',
				name: 'companyRegistrationStartDate',
				type: 'string',
				default: '',
				description:
					'Only return monthly usage for companies that were created after this UTC date (e.g. 2026-04-01T12:06:33)',
			},
			{
				displayName: 'Company Registration End Date',
				name: 'companyRegistrationEndDate',
				type: 'string',
				default: '',
				description:
					'Only return monthly usage for companies that were created before this UTC date (e.g. 2026-04-01T12:06:33)',
			},
			{
				displayName: 'Usage Coverage Type',
				name: 'usageCoverageType',
				type: 'options',
				default: 3,
				description:
					'Only return monthly usage for companies created in the time interval specified by "Company Registration Start Date" and "Company Registration End Date"',
				options: [
					{
						name: 'Custom Date Range',
						value: 3,
					},
				],
			},
		],
	},
];

const displayOptions = {
	show: { category: ['licensing'], action: ['getMonthlyUsage'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const targetMonth = this.getNodeParameter('targetMonth', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { targetMonth };

	if (options.usageCoverageType !== undefined) {
		params.usageCoverageType = options.usageCoverageType;
	}
	if (options.companyRegistrationStartDate) {
		params.companyRegistrationStartDate = options.companyRegistrationStartDate;
	}
	if (options.companyRegistrationEndDate) {
		params.companyRegistrationEndDate = options.companyRegistrationEndDate;
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'licensing',
		'getMonthlyUsage',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
