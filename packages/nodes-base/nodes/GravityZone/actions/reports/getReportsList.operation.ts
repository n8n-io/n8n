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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135315-getreportslist.html" target="_blank" rel="noopener noreferrer">Get Reports List</a>',
		name: 'getReportsListDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				default: '',
				description: 'The report name to filter by',
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 1,
				description: 'Report type',
				options: [
					{ name: 'Antiphishing Activity', value: 1 },
					{ name: 'Blocked Applications', value: 2 },
					{ name: 'Blocked Websites', value: 3 },
					{ name: 'Customer Status Overview', value: 4 },
					{ name: 'Data Protection', value: 5 },
					{ name: 'Device Control Activity', value: 6 },
					{ name: 'Endpoint Modules Status', value: 7 },
					{ name: 'Endpoint Protection Status', value: 8 },
					{ name: 'Firewall Activity', value: 9 },
					{ name: 'License Status', value: 10 },
					{ name: 'Malware Status', value: 12 },
					{ name: 'Monthly License Usage', value: 13 },
					{ name: 'Network Status', value: 14 },
					{ name: 'On Demand Scanning', value: 15 },
					{ name: 'Policy Compliance', value: 16 },
					{ name: 'Security Audit', value: 17 },
					{ name: 'Security Server Status', value: 18 },
					{ name: 'Top 10 Detected Malware', value: 19 },
					{ name: 'Top 10 Infected Companies', value: 20 },
					{ name: 'Top 10 Infected Endpoints', value: 21 },
					{ name: 'Update Status', value: 22 },
					{ name: 'Upgrade Status', value: 23 },
					{ name: 'AWS Monthly Usage', value: 24 },
					{ name: 'Email Security Usage', value: 29 },
					{ name: 'Endpoint Encryption Status', value: 30 },
					{ name: 'HyperDetect Activity', value: 31 },
					{ name: 'Network Patch Status', value: 32 },
					{ name: 'Sandbox Analyzer Failed Submissions', value: 33 },
					{ name: 'Network Incidents', value: 34 },
					{ name: 'MDR Service Status', value: 35 },
					{ name: 'Integrity Monitoring Activity', value: 36 },
					{ name: 'Integrity Monitoring Configuration Changes', value: 37 },
					{ name: 'Mobile Security Monthly License Usage', value: 38 },
					{ name: 'Data Insights License Usage', value: 39 },
				],
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

const displayOptions = { show: { category: ['reports'], action: ['getReportsList'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.name !== undefined && (options.name as string) !== '') params.name = options.name;
	if (options.type !== undefined) params.type = options.type;
	if (options.page !== undefined) params.page = options.page;
	if (options.perPage !== undefined) params.perPage = options.perPage;

	const responseData = await gravityZoneApiRequest.call(this, 'reports', 'getReportsList', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
