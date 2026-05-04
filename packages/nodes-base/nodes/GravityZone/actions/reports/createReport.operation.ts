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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135314-createreport.html" target="_blank" rel="noopener noreferrer">Create Report</a>',
		name: 'createReportDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'Name of the report',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
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
		displayName: 'Target IDs',
		name: 'targetIds',
		type: 'string',
		required: true,
		default: '',
		description: 'A comma-separated list of target IDs (e.g. "id1, id2, id3")',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Scheduled Info (JSON)',
				name: 'scheduledInfo',
				type: 'json',
				default: '{}',
				description: 'A scheduled info object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Options (JSON)',
				name: 'options',
				type: 'json',
				default: '{}',
				description: 'An options object',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
			},
			{
				displayName: 'Email List',
				name: 'emailList',
				type: 'string',
				default: '',
				description:
					'A comma-separated list of email addresses where the report will be delivered (e.g. "email1@example.com, email2@example.com"). Only valid for scheduled reports.',
			},
		],
	},
];

const displayOptions = { show: { category: ['reports'], action: ['createReport'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const name = this.getNodeParameter('name', i) as string;
	const type = this.getNodeParameter('type', i) as number;
	const additionalFields = this.getNodeParameter('additionalFields', i, {});

	const targetIdsStr = this.getNodeParameter('targetIds', i) as string;
	const targetIds = targetIdsStr
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = { name, type, targetIds };

	if (additionalFields.scheduledInfo !== undefined) {
		const scheduledInfo = processJsonInput(
			additionalFields.scheduledInfo,
			'Scheduled Info',
		) as IDataObject;
		if (Object.keys(scheduledInfo).length > 0) {
			params.scheduledInfo = scheduledInfo;
		}
	}

	if (additionalFields.options !== undefined) {
		const options = processJsonInput(additionalFields.options, 'Options') as IDataObject;
		if (Object.keys(options).length > 0) {
			params.options = options;
		}
	}

	if (
		additionalFields.emailList !== undefined &&
		(additionalFields.emailList as string).trim() !== ''
	) {
		const emailListStr = additionalFields.emailList as string;
		params.emailList = emailListStr
			.split(',')
			.map((e) => e.trim())
			.filter(Boolean);
	}

	const responseData = await gravityZoneApiRequest.call(this, 'reports', 'createReport', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
