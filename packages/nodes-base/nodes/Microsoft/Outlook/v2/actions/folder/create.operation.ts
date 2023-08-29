import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';
import { microsoftApiRequest } from '../../transport';
import { updateDisplayOptions } from '@utils/utilities';
import { folderRLC } from '../../descriptions';

export const properties: INodeProperties[] = [
	{
		displayName: 'Name',
		name: 'displayName',
		description: 'Name of the folder',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. My Folder',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [{ ...folderRLC, displayName: 'Parent Folder', required: false }],
	},
];

const displayOptions = {
	show: {
		resource: ['folder'],
		operation: ['create'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const displayName = this.getNodeParameter('displayName', index) as string;
	const folderId = this.getNodeParameter('options.folderId', index, '', {
		extractValue: true,
	}) as string;

	const body: IDataObject = {
		displayName,
	};

	let endpoint;

	if (folderId) {
		endpoint = `/mailFolders/${folderId}/childFolders`;
	} else {
		endpoint = '/mailFolders';
	}

	const responseData = await microsoftApiRequest.call(this, 'POST', endpoint, body);

	const executionData = this.helpers.constructExecutionMetaData(
		this.helpers.returnJsonArray(responseData as IDataObject[]),
		{ itemData: { item: index } },
	);

	return executionData;
}
