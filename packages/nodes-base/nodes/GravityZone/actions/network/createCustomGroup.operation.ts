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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128485-createcustomgroup.html" target="_blank" rel="noopener noreferrer">Create Custom Group</a>',
		name: 'createCustomGroupDocsNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Group Name',
		name: 'groupName',
		type: 'string',
		required: true,
		default: '',
		description: 'The name of the custom group to create',
	},
	{
		displayName: 'Parent ID',
		name: 'parentId',
		type: 'string',
		default: '',
		description: 'The parent group ID',
	},
];

const displayOptions = { show: { category: ['network'], action: ['createCustomGroup'] } };

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const groupName = this.getNodeParameter('groupName', i) as string;
	const parentId = this.getNodeParameter('parentId', i) as string | undefined;

	const params: IDataObject = { groupName };

	if (parentId !== undefined && parentId !== '') params.parentId = parentId;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'createCustomGroup',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), { itemData: { item: i } });
}
