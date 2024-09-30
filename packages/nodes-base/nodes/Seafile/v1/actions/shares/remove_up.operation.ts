import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

export const properties: INodeProperties[] = [
	{
		displayName: 'Library Name or ID',
		name: 'repo',
		type: 'options',
		placeholder: 'Select a Library',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getRepos',
		},
		default: '',
		description:
			'The name of SeaTable library to access. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Upload Link',
		name: 'token',
		type: 'options',
		placeholder: 'Select an upload link',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getUploadLink',
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'The upload link you want to remove. Choose from the list, or specify the upload link token using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
];

const displayOptions = {
	show: {
		resource: ['share'],
		operation: ['remove_up'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	const credentials = await this.getCredentials('seafileApi');
	const baseURL = credentials?.domain;

	// get parameters
	const token = this.getNodeParameter('token', index) as string;

	const options: IRequestOptions = {
		method: 'DELETE',
		qs: {},
		body: {},
		uri: `${baseURL}/api/v2.1/upload-links/${token}/` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
