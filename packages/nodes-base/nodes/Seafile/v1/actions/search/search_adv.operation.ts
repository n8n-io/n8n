import {
	type IDataObject,
	type INodeExecutionData,
	type INodeProperties,
	type IExecuteFunctions,
	IRequestOptions,
} from 'n8n-workflow';
import { updateDisplayOptions } from 'n8n-workflow';
import { parseToTimestamp } from '../../GenericFunctions';

export const properties: INodeProperties[] = [
	{
		displayName: 'This advanced search requires Seafile Professional Edition.',
		name: 'notice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Keyword',
		name: 'q',
		type: 'string',
		default: '',
		required: true,
		description: 'This keyword will be searched in the file names and also the file content',
		hint: 'The keyword must be at least three characters long. Wildcard search is not allowed. If you want to get all modified files, use the action `File Activity` instead.',
	},
	{
		displayName: 'Where to Search',
		name: 'search_target',
		type: 'options',
		options: [
			{
				name: 'All Libraries the Account Has Access To',
				value: 'all',
			},
			{
				name: 'In One Specific Library',
				value: 'repo_id',
			},
			{
				name: 'Only in Group Libraries',
				value: 'group',
			},
			{
				name: 'Only in Libraries Shared with Me',
				value: 'shared',
			},
			{
				name: 'Only in Public Libraries',
				value: 'public',
			},
			{
				name: 'Only My Personal Libraries',
				value: 'mine',
			},
		],
		default: 'all',
		description:
			'Choose where the search should be limited to. Specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
			'The name of SeaTable library to access. Choose from the list, or specify a name using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				search_target: ['repo_id'],
			},
		},
	},
	{
		// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-options
		displayName: 'Search Path',
		name: 'search_path',
		type: 'options',
		placeholder: '/invoices/2024/',
		default: '',
		displayOptions: {
			show: {
				search_target: ['repo_id'],
			},
		},
		typeOptions: {
			loadOptionsMethod: 'getFoldersInRepo',
			loadOptionsDependsOn: ['repo'],
		},
		// eslint-disable-next-line n8n-nodes-base/node-param-description-wrong-for-dynamic-options
		description:
			'Path inside the library to search in. Choose from the list, or specify the path using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
	},
	{
		displayName: 'Search Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
					numberStepSize: 1,
					numberPrecision: 0,
				},
				description: 'Page to load',
			},
			{
				displayName: 'Per Page',
				name: 'per_page',
				type: 'number',
				default: 25,
				typeOptions: {
					minValue: 1,
					numberStepSize: 1,
					numberPrecision: 0,
				},
				description: 'Items to load per page',
			},
			{
				displayName: 'File Type',
				name: 'ftype',
				type: 'options',
				options: [
					{
						name: '',
						value: '',
					},
					{
						name: 'Audio',
						value: 'Audio',
					},
					{
						name: 'Document',
						value: 'Document',
					},
					{
						name: 'Image',
						value: 'Image',
					},
					{
						name: 'Markdown',
						value: 'Markdown',
					},
					{
						name: 'PDF',
						value: 'PDF',
					},
					{
						name: 'Text',
						value: 'Text',
					},
					{
						name: 'Video',
						value: 'Video',
					},
				],
				default: '',
				description:
					'Choose where the search should be limited to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'File Extension',
				name: 'input_fexts',
				type: 'string',
				default: '',
				description: 'Limit the search to a specific file type extensions, separated by comma',
			},
			{
				displayName: 'Show Permission',
				name: 'with_permission',
				type: 'boolean',
				default: false,
				description: 'Whether return permission info of the file or not',
			},
			{
				displayName: 'Last Modified After',
				name: 'time_from',
				type: 'dateTime',
				default: '',
				description:
					'Returns files that were modified after this date. Supported inputs are date (ISO format like 2024-08-25T15:34:47 or timestamps with 13 digits.',
				hint: 'Choose a date or use an expression like {{ $now - (2*24*60*60*1000) }} to get only files modified within the last two days.',
			},
			{
				displayName: 'Last Modified Before',
				name: 'time_to',
				type: 'dateTime',
				default: '',
				description:
					'Returns files that were modified after this date. Supported inputs are date (ISO format like 2024-08-25T15:34:47 or timestamps with 13 digits.',
			},
			{
				displayName: 'File Size Greater Than',
				name: 'size_from',
				type: 'number',
				default: '',
				description: 'Filter the result that the size greater than or equal to this value by Byte',
			},
			{
				displayName: 'File Size Smaller Than',
				name: 'size_to',
				type: 'number',
				default: '',
				description: 'Filter the result that the size less than or equal to this value by Byte',
			},
		],
	},
];

const displayOptions = {
	show: {
		resource: ['search'],
		operation: ['search_adv'],
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
	const q = this.getNodeParameter('q', index) as string;

	if (q.length < 3) {
		throw new Error('Keyword must be at least 3 chars long!');
	}

	const search_target = this.getNodeParameter('search_target', index) as string;
	const filters = this.getNodeParameter('filters', index);

	let search_repo = search_target;
	// search target: single library
	if (search_target === 'repo_id') {
		search_repo = this.getNodeParameter('repo', index) as string;
		let search_path = this.getNodeParameter('search_path', index) as string;
		if (search_path) {
			filters.search_path = search_path;
		}
	}

	// add search_ftypes=custom if needed
	if (filters.ftype || filters.input_fexts) filters.search_ftypes = 'custom';

	// modify time filters (supported inputs are date (ISO format like 2024-08-25T15:34:47 or timestamps with 13 digits.)
	if (filters.time_from) filters.time_from = parseToTimestamp(filters.time_from as any);
	if (filters.time_to) filters.time_to = parseToTimestamp(filters.time_to as any);

	const options: IRequestOptions = {
		method: 'GET',
		qs: {
			q: q,
			search_repo: search_repo,
			...filters,
		},
		body: {},
		uri: `${baseURL}/api2/search/` as string,
		json: true,
	};

	// DEBUG:
	//console.log(options);

	const responseData = await this.helpers.requestWithAuthentication.call(
		this,
		'seafileApi',
		options,
	);

	return this.helpers.returnJsonArray(responseData as IDataObject[]);
}
