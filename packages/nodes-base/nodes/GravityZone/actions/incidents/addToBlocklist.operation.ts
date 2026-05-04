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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-135327-addtoblocklist.html" target="_blank" rel="noopener noreferrer">Add to Blocklist</a>',
		name: 'addToBlocklistDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		required: true,
		default: 'hash',
		options: [
			{ name: 'Hash', value: 'hash' },
			{ name: 'Path', value: 'path' },
			{ name: 'Connection', value: 'connection' },
		],
		description: 'The type of the blocklist rules to create',
	},
	{
		displayName: 'Rules (JSON)',
		name: 'rules',
		type: 'json',
		required: true,
		default: '[]',
		description: 'An array of rule objects',
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
				displayName: 'Recursive',
				name: 'recursive',
				type: 'boolean',
				default: true,
				description:
					'Whether the rules will be applied recursively to all companies managed by the target company',
			},
		],
	},
];

const displayOptions = { show: { category: ['incidents'], action: ['addToBlocklist'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const type = this.getNodeParameter('type', i) as string;
	const rules = processJsonInput(this.getNodeParameter('rules', i), 'Rules');
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { type, rules: rules as IDataObject[] };

	if (options.recursive !== undefined) params.recursive = options.recursive;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'incidents',
		'addToBlocklist',
		params,
		'v1.2',
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
