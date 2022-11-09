import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { messageFields, prepareFilterString, simplifyOutputMessages } from '../../helpers/utils';
import {
	downloadAttachments,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Folders Name or ID',
		name: 'folderId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getFoldersWithFilepath',
		},
		default: [],
		description:
			'The folder to get the messages from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['folderMessage'],
			},
		},
		options: [
			{
				name: 'Simplified',
				value: 'simple',
			},
			{
				name: 'Raw',
				value: 'raw',
			},
			{
				name: 'Select Included Fields',
				value: 'fields',
			},
		],
	},
	{
		displayName: 'Fields',
		name: 'fields',
		type: 'multiOptions',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['folderMessage'],
				output: ['fields'],
			},
		},
		options: messageFields,
		default: [],
	},
	{
		displayName:
			'Fetching a lot of messages may take a long time. Consider using filters to speed things up',
		name: 'filtersNotice',
		type: 'notice',
		default: '',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['folderMessage'],
				returnAll: [true],
			},
		},
	},
	{
		displayName: 'Filters',
		name: 'filtersUI',
		type: 'fixedCollection',
		placeholder: 'Add Filters',
		default: {},
		options: [
			{
				displayName: 'Values',
				name: 'values',
				values: [
					{
						displayName: 'Filter By',
						name: 'filterBy',
						type: 'options',
						options: [
							{
								name: 'Filters',
								value: 'filters',
							},
							{
								name: 'Search',
								value: 'search',
							},
						],
						default: 'filters',
					},
					{
						displayName: 'Search',
						name: 'search',
						type: 'string',
						default: '',
						placeholder: 'pizza',
						description: 'Only return messages that contains search term',
						displayOptions: {
							show: {
								filterBy: ['search'],
							},
						},
					},
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'collection',
						placeholder: 'Add Filter',
						default: {},
						displayOptions: {
							show: {
								filterBy: ['filters'],
							},
						},
						options: [
							{
								displayName: 'Custom Filter',
								name: 'custom',
								type: 'string',
								default: '',
								placeholder: 'isRead eq false',
								hint: 'Information about the syntax can be found <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">here</a>',
							},
							{
								displayName: 'Has Attachments',
								name: 'hasAttachments',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Read Status',
								name: 'readStatus',
								type: 'options',
								default: 'unread',
								hint: 'Filter messages by whether they have been read or not',
								options: [
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'Unread and read messages',
										value: 'both',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'Unread messages only',
										value: 'unread',
									},
									{
										// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
										name: 'Read messages only',
										value: 'read',
									},
								],
							},
							{
								displayName: 'Received After',
								name: 'receivedAfter',
								type: 'dateTime',
								default: '',
								description:
									'Get all messages received after the specified date. In an expression you can set date using string in ISO format or a timestamp in miliseconds.',
							},
							{
								displayName: 'Received Before',
								name: 'receivedBefore',
								type: 'dateTime',
								default: '',
								description:
									'Get all messages received before the specified date. In an expression you can set date using string in ISO format or a timestamp in miliseconds.',
							},
							{
								displayName: 'Sender',
								name: 'sender',
								type: 'string',
								default: '',
								description: 'Sender name or email to filter by',
							},
						],
					},
				],
			},
		],
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['folderMessage'],
				// returnAll: [true],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['folderMessage'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Attachments Prefix',
				name: 'attachmentsPrefix',
				type: 'string',
				default: 'attachment_',
				description:
					'Prefix for name of the binary property to which to write the attachments. An index starting with 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0"',
			},
			{
				displayName: 'Download Attachments',
				name: 'downloadAttachments',
				type: 'boolean',
				default: false,
				description:
					"Whether the message's attachments will be downloaded and included in the output",
			},
		],
	},
];

export async function execute(
	this: IExecuteFunctions,
	index: number,
): Promise<INodeExecutionData[]> {
	let responseData;
	const qs: IDataObject = {};

	const folderId = this.getNodeParameter('folderId', index) as string;
	const returnAll = this.getNodeParameter('returnAll', index) as boolean;
	const filters = this.getNodeParameter('filtersUI.values', index, {}) as IDataObject;
	const options = this.getNodeParameter('options', index, {}) as IDataObject;
	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];
		qs['$select'] = fields.join(',');
	}

	if (output === 'simple') {
		qs['$select'] =
			'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments';
	}

	if (filters.filterBy === 'search' && filters.search !== '') {
		qs['$search'] = `"${filters.search}"`;
	}

	if (filters.filterBy === 'filters') {
		const filterString = prepareFilterString(filters);

		if (filterString) {
			qs['$filter'] = filterString;
		}
	}

	const endpoint = `/mailFolders/${folderId}/messages`;

	if (returnAll) {
		responseData = await microsoftApiRequestAllItems.call(
			this,
			'value',
			'GET',
			endpoint,
			undefined,
			qs,
		);
	} else {
		qs['$top'] = this.getNodeParameter('limit', index) as number;
		responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
		responseData = responseData.value;
	}

	if (output === 'simple') {
		responseData = simplifyOutputMessages(responseData);
	}

	let executionData: INodeExecutionData[] = [];

	if (options.downloadAttachments) {
		const prefix = (options.attachmentsPrefix as string) || 'attachment_';
		executionData = await downloadAttachments.call(this, responseData, prefix);
	} else {
		executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData),
			{ itemData: { item: index } },
		);
	}

	return executionData;
}
