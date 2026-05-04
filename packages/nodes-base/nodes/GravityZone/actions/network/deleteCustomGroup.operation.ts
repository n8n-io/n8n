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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128486-deletecustomgroup.html" target="_blank" rel="noopener noreferrer">Delete Custom Group</a>',
		name: 'deleteCustomGroupDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the custom group to delete',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Force',
				name: 'force',
				type: 'boolean',
				default: false,
				description: 'Whether to force delete when the group is not empty',
			},
		],
	},
];

const displayOptions = { show: { category: ['network'], action: ['deleteCustomGroup'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const groupId = this.getNodeParameter('groupId', i) as string;
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = { groupId };

	if (options.force !== undefined) params.force = options.force;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'deleteCustomGroup',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
