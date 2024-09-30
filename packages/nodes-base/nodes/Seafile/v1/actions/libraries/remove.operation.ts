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
		hint: 'The library and all files have been moved to the trash. Restoration is typically possible within 30 days.',
	},
];

const displayOptions = {
	show: {
		resource: ['libraries'],
		operation: ['remove'],
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
	const repo = this.getNodeParameter('repo', index) as string;

	const options: IRequestOptions = {
		method: 'DELETE',
		body: {},
		uri: `${baseURL}/api2/repos/${repo}/` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);
	if (responseData) {
		return this.helpers.returnJsonArray([{ status: 'success' }] as IDataObject[]);
	} else {
		return this.helpers.returnJsonArray([{ status: 'unknown' }] as IDataObject[]);
	}
}
