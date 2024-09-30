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
		displayName: 'Smartlink requires an authenticated user session.',
		name: 'notice',
		type: 'notice',
		default: '',
	},
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
		displayName: 'Smartlink Type',
		name: 'type',
		type: 'options',
		options: [
			{
				name: 'File',
				value: 'file',
			},
			{
				name: 'Folder',
				value: 'folder',
			},
		],
		default: 'file',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'File Path',
		name: 'file_path',
		type: 'options',
		placeholder: 'Select the path',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getFilesInRepo',
			loadOptionsDependsOn: ['repo'],
		},
		displayOptions: {
			show: {
				type: ['file'],
			},
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Provide the file name with complete path. Choose from the list, or specify the complete path using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Folder Path',
		name: 'folder_path',
		type: 'options',
		placeholder: 'Select a file',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getFoldersInRepo',
			loadOptionsDependsOn: ['repo'],
		},
		displayOptions: {
			show: {
				type: ['folder'],
			},
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Provide the complete folder path. Choose from the list, or specify the complete path using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
];

const displayOptions = {
	show: {
		resource: ['share'],
		operation: ['internal'],
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
	const type = this.getNodeParameter('type', index) as string;

	// calculate query params
	let path = '';
	let is_dir = '';
	if (type == 'folder') {
		path = this.getNodeParameter('folder_path', index) as string;
		is_dir = 'true';
	} else {
		path = this.getNodeParameter('file_path', index) as string;
		is_dir = 'false';
	}

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			repo_id: repo,
			path: path,
			is_dir: is_dir,
		},
		body: {},
		uri: `${baseURL}/api/v2.1/smart-link/` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
