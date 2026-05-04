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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128487-movecustomgroup.html" target="_blank" rel="noopener noreferrer">Move Custom Group</a>',
		name: 'moveCustomGroupDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Group ID',
		name: 'groupId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the custom group to move',
	},
	{
		displayName: 'Parent Group ID',
		name: 'parentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The ID of the destination parent custom group',
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['moveCustomGroup'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const groupId = this.getNodeParameter('groupId', i) as string;
	const parentId = this.getNodeParameter('parentId', i) as string;

	const params: IDataObject = { groupId, parentId };

	const responseData = await gravityZoneApiRequest.call(this, 'network', 'moveCustomGroup', params);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
