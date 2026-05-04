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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135334-deletecustomrule.html" target="_blank" rel="noopener noreferrer">Delete Custom Rule</a>',
		name: 'deleteCustomRuleDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Rule ID',
		name: 'ruleId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the rule to be deleted. Must be a 24-character hexadecimal string.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				default: 2,
				options: [
					{ name: 'Detection', value: 1 },
					{ name: 'Exclusion', value: 2 },
				],
				description: 'The type of the rule to be deleted',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['incidents'], action: ['deleteCustomRule'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const ruleId = this.getNodeParameter('ruleId', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { ruleId };

	if (options.type !== undefined) params.type = options.type;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'deleteCustomRule',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
