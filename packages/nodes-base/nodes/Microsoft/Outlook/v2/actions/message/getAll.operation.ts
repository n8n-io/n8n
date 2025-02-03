import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeProperties,
} from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import { returnAllOrLimit } from '../../descriptions';
import { messageFields, prepareFilterString, simplifyOutputMessages } from '../../helpers/utils';
import {
	downloadAttachments,
	microsoftApiRequest,
	microsoftApiRequestAllItems,
} from '../../transport';

export const properties: INodeProperties[] = [
	...returnAllOrLimit,
	{
		displayName: 'Output',
		name: 'output',
		type: 'options',
		default: 'simple',
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
		description: 'The fields to add to the output',
		displayOptions: {
			show: {
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
						placeholder: 'e.g. automation',
						description:
							'Only return messages that contains search term. Without specific message properties, the search is carried out on the default search properties of from, subject, and body. <a href="https://docs.microsoft.com/en-us/graph/query-parameters#search-parameter target="_blank">More info</a>.',
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
								displayName: 'Filter Query',
								name: 'custom',
								type: 'string',
								default: '',
								placeholder: 'e.g. isRead eq false',
								hint: 'Search query to filter messages. <a href="https://learn.microsoft.com/en-us/graph/filter-query-parameter">More info</a>.',
							},
							{
								displayName: 'Has Attachments',
								name: 'hasAttachments',
								type: 'boolean',
								default: false,
							},
							{
								displayName: 'Folders to Exclude',
								name: 'foldersToExclude',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getFolders',
								},
								default: [],
								description:
									'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
							},
							{
								displayName: 'Folders to Include',
								name: 'foldersToInclude',
								type: 'multiOptions',
								typeOptions: {
									loadOptionsMethod: 'getFolders',
								},
								default: [],
								description:
									'Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
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
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		options: [
			{
				displayName: 'Attachments Prefix',
				name: 'attachmentsPrefix',
				type: 'string',
				default: 'attachment_',
				description:
					'Prefix for name of the output fields to put the binary files data in. An index starting from 0 will be added. So if name is "attachment_" the first attachment is saved to "attachment_0".',
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

const displayOptions = {
	show: {
		resource: ['message'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);

export async function execute(this: IExecuteFunctions, index: number) {
	let responseData;
	const qs = {} as IDataObject;

	const returnAll = this.getNodeParameter('returnAll', index);
	const filters = this.getNodeParameter('filtersUI.values', index, {}) as IDataObject;
	const options = this.getNodeParameter('options', index, {});
	const output = this.getNodeParameter('output', index) as string;

	if (output === 'fields') {
		const fields = this.getNodeParameter('fields', index) as string[];

		if (options.downloadAttachments) {
			fields.push('hasAttachments');
		}

		qs.$select = fields.join(',');
	}

	if (output === 'simple') {
		qs.$select =
			'id,conversationId,subject,bodyPreview,from,toRecipients,categories,hasAttachments';
	}

	if (filters.filterBy === 'search' && filters.search !== '') {
		qs.$search = `"${filters.search}"`;
	}

	if (filters.filterBy === 'filters') {
		const filterString = prepareFilterString(filters);

		if (filterString) {
			qs.$filter = filterString;
		}
	}

	const endpoint = '/messages';

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
		qs.$top = this.getNodeParameter('limit', index);
		responseData = await microsoftApiRequest.call(this, 'GET', endpoint, undefined, qs);
		responseData = responseData.value;
	}

	if (output === 'simple') {
		responseData = simplifyOutputMessages(responseData as IDataObject[]);
	}

	let executionData: INodeExecutionData[] = [];

	if (options.downloadAttachments) {
		const prefix = (options.attachmentsPrefix as string) || 'attachment_';
		executionData = await downloadAttachments.call(this, responseData as IDataObject, prefix);
	} else {
		executionData = this.helpers.constructExecutionMetaData(
			this.helpers.returnJsonArray(responseData as IDataObject[]),
			{ itemData: { item: index } },
		);
	}

	return executionData;
}
