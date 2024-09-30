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
		displayName: 'Target Path',
		name: 'folder_path',
		type: 'options',
		placeholder: '/invoices/2024/',
		required: true,
		typeOptions: {
			loadOptionsMethod: 'getFoldersInRepo',
			loadOptionsDependsOn: ['repo'],
		},
		default: '',
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Provide the target path. Choose from the list, or specify the complete path using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Output Type',
		name: 'output_type',
		type: 'options',
		placeholder: 'Choose output',
		default: 'all',
		options: [
			{
				name: 'Files & Folders',
				value: 'all',
			},
			{
				name: 'Files',
				value: 'f',
			},
			{
				name: 'Folders',
				value: 'd',
			},
		],
	},
	{
		displayName: 'Recursive',
		name: 'recursive',
		type: 'boolean',
		default: false,
		description:
			'Whether the list folder operation will be applied recursively to all subfolders and the response will contain contents of all subfolders. The default for this field is False.',
	},
];

const displayOptions = {
	show: {
		resource: ['folders'],
		operation: ['list'],
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
	const folder_path = this.getNodeParameter('folder_path', index) as string;
	const output_type = this.getNodeParameter('output_type', index) as string;
	const recursive = this.getNodeParameter('recursive', index) as boolean;

	const filters: any = {};
	if (output_type == 'f' || output_type == 'd') {
		filters.t = output_type;
	}
	filters.recursive = recursive ? '1' : '0';

	if (!folder_path.startsWith('/')) {
		return this.helpers.returnJsonArray([{ error: 'Path has to start with /' }] as IDataObject[]);
	} else {
		const options: IRequestOptions = {
			method: 'GET',
			qs: {
				p: folder_path,
				...filters,
			},
			uri: `${baseURL}/api2/repos/${repo}/dir/` as string,
			json: true,
		};

		const responseData = await this.helpers.requestWithAuthentication.call(
			this,
			'seafileApi',
			options,
		);

		return this.helpers.returnJsonArray(responseData as IDataObject[]);
	}
}
