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
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'File Path',
		name: 'file_path',
		type: 'options',
		placeholder: '/invoices/2024/invoice.pdf',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getFilesInRepo',
			loadOptionsDependsOn: ['repo'],
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Provide the file name with complete path. Choose from the list, or specify the complete path using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
			'The tag you would like to remove from the file. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		hint: 'If there are no tags available, you have to create one first in Seafile',
	},
];

const displayOptions = {
	show: {
		resource: ['tags'],
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
	const file_path = this.getNodeParameter('file_path', index) as string;
	const repo_tag_id = this.getNodeParameter('tag', index) as string;

	// get file_tag_id file
	const options1: IRequestOptions = {
		method: 'GET',
		qs: {
			file_path: file_path,
		},
		uri: `${baseURL}/api/v2.1/repos/${repo}/file-tags/`,
		json: true,
	};

	const fileTags = await this.helpers.requestWithAuthentication.call(this, 'seafileApi', options1);

	let file_tag_id = '';
	for (const tag of fileTags.file_tags) {
		if (tag.repo_tag_id == repo_tag_id) {
			file_tag_id = tag.file_tag_id;
		}
	}

	// remove file tag
	if (file_tag_id) {
		const options: IRequestOptions = {
			method: 'DELETE',
			qs: {},
			body: {},
			uri: `${baseURL}/api/v2.1/repos/${repo}/file-tags/${file_tag_id}/` as string,
			json: true,
		};

		const responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'seafileApi',
			options,
		);

		return this.helpers.returnJsonArray(responseData as IDataObject[]);
	} else {
		return this.helpers.returnJsonArray([{ success: 'No tag was removed' }] as IDataObject[]);
	}
}
