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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1362199-editmonitoredrulesaccess.html" target="_blank" rel="noopener noreferrer">Edit Monitored Rules Access</a>',
		name: 'editMonitoredRulesAccessDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Rule ID',
		name: 'ruleId',
		type: 'number',
		required: true,
		default: 0,
		description: 'The ID of the rule on which the recommendation is based',
	},
	{
		displayName: 'Action',
		name: 'actionValue',
		type: 'options',
		required: true,
		default: 0,
		options: [
			{ name: 'Allow Access', value: 0 },
			{ name: 'Restrict Access', value: 1 },
		],
		description: 'The action to take on the specified behavioral profiles',
	},
	{
		displayName: 'Targets',
		name: 'targets',
		type: 'string',
		required: true,
		default: '',
		description:
			'A comma-separated list of behavioral profile IDs to apply the recommendation to (e.g. "1234567890, 1234567891, 1234567892"). A profile ID is constructed by combining the identity ID with the resource ID.',
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
				description: 'The ID of the company the rule belongs to',
			},
			{
				displayName: 'Target Type',
				name: 'targetType',
				type: 'options',
				default: 0,
				options: [{ name: 'Profile', value: 0 }],
				description: 'The type of the specified behavioral profiles',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['phasr'], action: ['editMonitoredRulesAccess'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const ruleId = this.getNodeParameter('ruleId', i) as number;
	const actionValue = this.getNodeParameter('actionValue', i) as number;
	const options = this.getNodeParameter('options', i, {});

	const targetsRaw = this.getNodeParameter('targets', i) as string;
	const targets = targetsRaw
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const params: IDataObject = {
		ruleId,
		action: actionValue,
		targets,
	};

	if (options.companyId) params.companyId = options.companyId;
	if (options.targetType !== undefined) params.targetType = options.targetType;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'phasr',
		'editMonitoredRulesAccess',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
