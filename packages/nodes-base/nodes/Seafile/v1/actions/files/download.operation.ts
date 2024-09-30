import {
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	IRequestOptions,
	IDataObject,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';

import * as path from 'path';

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
		displayName: 'Download Link Only',
		name: 'link_only',
		type: 'boolean',
		default: false,
		description: 'Whether to return the file or just the download link',
	},
];

const displayOptions = {
	show: {
		resource: ['files'],
		operation: ['download'],
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
	const download_path = this.getNodeParameter('file_path', index) as string;
	const file_name = path.basename(download_path);
	const link_only = this.getNodeParameter('link_only', index) as string;

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			p: download_path,
		},
		body: {},
		uri: `${baseURL}/api2/repos/${repo}/file/` as string,
		json: true,
	};

	// get the url to the file (for download)
	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	if (link_only) {
		// download link only
		const download_link_output = [
			{
				download_link: responseData,
			},
		];
		return this.helpers.returnJsonArray(download_link_output as IDataObject[]);
	} else {
		// download the file (as binary)
		const options2: IRequestOptions = {
			method: 'GET',
			qs: {},
			body: {},
			uri: responseData,
			encoding: null,
		};
		const binaryData = await this.helpers.request(options2);

		const newItem: INodeExecutionData = {
			json: {},
			binary: {
				data: await this.helpers.prepareBinaryData(Buffer.from(binaryData as string), file_name),
			},
		};
		return [newItem];
	}
}
