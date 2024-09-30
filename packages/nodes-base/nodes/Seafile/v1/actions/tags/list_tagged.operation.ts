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
		displayName: 'Source Library Name or ID',
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
		displayName: 'Tag Name or ID',
		name: 'tag',
		type: 'options',
		placeholder: 'Select a Tag',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getTags',
			loadOptionsDependsOn: ['repo'],
		},
		default: '',
		description:
			'The tag you would like to assign to the file. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		hint: 'If there are no tags available, you have to create one first in Seafile',
	},
];

const displayOptions = {
	show: {
		resource: ['tags'],
		operation: ['list_tagged'],
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
	const repo_tag_id = this.getNodeParameter('tag', index) as string;

	const options: IRequestOptions = {
		method: 'GET',
		qs: {},
		body: {},
		uri: `${baseURL}/api/v2.1/repos/${repo}/tagged-files/${repo_tag_id}` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	if (responseData.tagged_files) {
		return this.helpers.returnJsonArray(responseData.tagged_files as IDataObject[]);
	}
	return [];
}
