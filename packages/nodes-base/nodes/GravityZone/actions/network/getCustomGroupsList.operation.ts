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
			'Documentation: <a href="https://www.bitdefender.com/business/support/en/77209-128488-getcustomgroupslist.html" target="_blank" rel="noopener noreferrer">Get Custom Groups List</a>',
		name: 'getCustomGroupsListDocsNotice',
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
				displayName: 'Parent Group ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'The ID of the parent group for which the child groups will be listed',
			},
		],
	},
];

const displayOptions = {
	show: { category: ['network'], action: ['getCustomGroupsList'] },
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const options = this.getNodeParameter('options', i, {});

	const params: IDataObject = {};

	if (options.parentId !== undefined && (options.parentId as string) !== '')
		params.parentId = options.parentId;

	const responseData = await gravityZoneApiRequest.call(
		this,
		'network',
		'getCustomGroupsList',
		params,
	);

	return this.helpers.constructExecutionMetaData(wrapData(responseData), {
		itemData: { item: i },
	});
}
