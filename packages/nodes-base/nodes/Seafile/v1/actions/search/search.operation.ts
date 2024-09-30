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
		displayName: 'Keyword',
		name: 'q',
		type: 'string',
		default: '',
		required: true,
		description: 'The string to search for',
		hint: 'Keyword is used to search for the filename and the file path. This is a case-insensitive substring match search (e.g. `Voi` will find `Invoices`)',
	},
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['search'],
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
	const q = this.getNodeParameter('q', index) as string;

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			q: q,
			repo_id: repo,
		},
		body: {},
		uri: `${baseURL}/api/v2.1/search-file/` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	if (responseData.data) {
		return this.helpers.returnJsonArray(responseData.data as IDataObject[]);
	}
	return [];
}
