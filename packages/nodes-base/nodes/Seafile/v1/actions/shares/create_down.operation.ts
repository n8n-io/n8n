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
		displayName: 'Share Type',
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
	{
		displayName: 'Permission',
		name: 'permission',
		type: 'options',
		placeholder: 'Select a permission',
		required: true,
		options: [
			{
				name: 'Preview & Download',
				value: 'download',
			},
			{
				name: 'Preview Only',
				value: 'preview',
			},
			{
				name: 'Download & Upload',
				value: 'down_and_up',
			},
		],
		default: 'download',
		displayOptions: {
			show: {
				type: ['folder'],
			},
		},
	},
	{
		displayName: 'Permission',
		name: 'permission',
		type: 'options',
		placeholder: 'Select a permission',
		required: true,
		options: [
			{
				name: 'Preview & Download',
				value: 'download',
			},
			{
				name: 'Preview Only',
				value: 'preview',
			},
		],
		default: 'download',
		displayOptions: {
			show: {
				type: ['file'],
			},
		},
	},
	{
		displayName: 'Expiration',
		name: 'expiration',
		type: 'dateTime',
		placeholder: '',
		default: '',
	},
	{
		displayName: 'Password',
		name: 'pw',
		type: 'string',
		default: '',
	},
];

const displayOptions = {
	show: {
		resource: ['share'],
		operation: ['create_down'],
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
	const permission = this.getNodeParameter('permission', index) as string;
	const expiration = this.getNodeParameter('expiration', index) as string;
	const pw = this.getNodeParameter('pw', index) as string;

	// calculate query params
	let path = '';
	if (type == 'folder') {
		path = this.getNodeParameter('folder_path', index) as string;
	} else {
		path = this.getNodeParameter('file_path', index) as string;
	}

	const params: any = {};
	if (pw) params.password = pw;
	if (expiration) params.expiration_time = expiration;
	// default permission is download.
	if (permission == 'preview') {
		params.permissions = { can_download: false };
	} else if (permission == 'down_and_up' && type == 'folder') {
		params.permissions = { can_download: true, can_upload: true };
	}

	const options: IRequestOptions = {
		method: 'POST',
		qs: {},
		body: {
			repo_id: repo,
			path: path,
			...params,
		},
		uri: `${baseURL}/api/v2.1/share-links/` as string,
		json: true,
	};

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
