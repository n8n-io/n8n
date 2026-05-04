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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-1471075-updatecustomrule.html" target="_blank" rel="noopener noreferrer">Update Custom Rule</a>',
		name: 'updateCustomRuleDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Rule ID',
		name: 'ruleId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the rule to be updated',
	},
	{
		displayName: 'Name',
		name: 'name',
		type: 'string',
		required: true,
		default: '',
		description: 'The new name of the rule',
	},
	{
		displayName: 'Rule Settings (JSON)',
		name: 'settings',
		type: 'json',
		required: true,
		default: '{}',
		description: 'A rule settings object',
		typeOptions: { alwaysOpenEditWindow: true },
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
				description:
					'The type of the rule. Mandatory for detection rules, optional for exclusion rules.',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				description: 'The new description of the rule',
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A comma-separated list of tags (e.g. "tag1, tag2, tag3")',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['incidents'], action: ['updateCustomRule'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const ruleId = this.getNodeParameter('ruleId', i) as string;
	const name = this.getNodeParameter('name', i) as string;
	const settings = processJsonInput(
		this.getNodeParameter('settings', i),
		'Rule Settings',
	) as IDataObject;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { ruleId, name, settings };

	if (options.type !== undefined) params.type = options.type;
	if (options.description !== undefined && options.description !== '')
		params.description = options.description;
	if (options.tags !== undefined && (options.tags as string) !== '') {
		const tagsStr = options.tags as string;
		params.tags = tagsStr
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean);
	}

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'updateCustomRule',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
