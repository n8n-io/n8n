import type { INodeProperties } from 'n8n-workflow';

import { boardResourceLocator } from '../../helpers/boardLocator';
import {
	HIDE_UNTIL_BOARD_SELECTED,
	itemIdTextProperty,
	itemInputModeProperty,
	itemListOnlyResourceLocator,
} from '../../helpers/itemLocator';
import { buildUserRowsProperty } from '../../helpers/userLocator';

export const updateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['update'] } },
		options: [
			{
				name: 'Add File',
				value: 'addFileToUpdate',
				action: 'Add a file to an update',
				description: 'Upload a binary file from the workflow as an attachment on an update',
			},
			{
				name: 'Create',
				value: 'createUpdate',
				action: 'Create an update',
				description: 'Post an update on an item, or a reply to an existing update',
			},
			{
				name: 'Get Many',
				value: 'getUpdates',
				action: 'Get many updates',
				description: 'Return updates of one item, or account-wide',
			},
			{
				name: 'Search',
				value: 'searchUpdatesAccount',
				action: 'Search updates',
				description: 'Find updates account-wide by keywords in their body text',
			},
		],
		default: 'createUpdate',
	},
];

export const updateFields: INodeProperties[] = [
	{
		displayName: 'Update ID',
		name: 'updateId',
		type: 'string',
		default: '',
		required: true,
		description: 'The ID of the update to attach the file to',
		displayOptions: { show: { operation: ['addFileToUpdate'] } },
	},

	{
		displayName: 'Input Binary Field',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		hint: 'The name of the input binary field containing the file to upload',
		displayOptions: { show: { operation: ['addFileToColumn', 'addFileToUpdate'] } },
	},

	{
		...itemInputModeProperty,
		displayOptions: { show: { operation: ['getUpdates'], updatesScope: ['item'] } },
	},
	{
		...boardResourceLocator,
		description: 'The board holding the item — used only to pick the item from the list',
		displayOptions: {
			show: { operation: ['getUpdates'], updatesScope: ['item'], itemInputMode: ['list'] },
		},
	},
	{
		...itemListOnlyResourceLocator,
		displayOptions: {
			show: { operation: ['getUpdates'], updatesScope: ['item'], itemInputMode: ['list'] },
			hide: HIDE_UNTIL_BOARD_SELECTED,
		},
	},
	{
		...itemIdTextProperty,
		displayOptions: {
			show: { operation: ['getUpdates'], updatesScope: ['item'], itemInputMode: ['id'] },
		},
	},

	{
		displayName: 'Scope',
		name: 'updatesScope',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Account',
				value: 'account',
				description: 'The most recent updates across the whole account',
			},
			{
				name: 'Item',
				value: 'item',
				description: 'Updates posted on one item',
			},
		],
		default: 'item',
		displayOptions: { show: { operation: ['getUpdates'] } },
	},
	{
		displayName: 'Update Text',
		name: 'updateBody',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		description:
			'The text of the update. Supports HTML tags: &lt;b&gt; (bold), &lt;i&gt; (italic), &lt;u&gt; (underline), &lt;a&gt; (links), &lt;br&gt; (line breaks). Some HTML attributes and styles may be stripped by the API. Maximum length limit unknown. Do not use @ symbols for mentions; use Mention Users/Teams options instead.',
		displayOptions: { show: { operation: ['createUpdate'] } },
	},
	{
		displayName: 'Options',
		name: 'createUpdateOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['createUpdate'] } },
		options: [
			buildUserRowsProperty({
				displayName: 'Mention Users',
				name: 'mentionUserIds',
				description:
					'Users to mention and notify in the update. In expression mode, pass user IDs as a comma-separated string.',
			}),
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-wrong-for-dynamic-multi-options
				displayName: 'Mention Teams',
				name: 'mentionTeamIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getTeamsList' },
				default: [],
				description:
					'Teams to mention and notify in the update. In expression mode, pass team IDs as a comma-separated string. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Reply to Update ID',
				name: 'parentId',
				type: 'string',
				default: '',
				description: 'Post this as a reply to an existing update instead of a new thread',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'getUpdatesOptions',
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		displayOptions: { show: { operation: ['getUpdates'] } },
		options: [
			{
				displayName: 'Include Assets',
				name: 'includeAssets',
				type: 'boolean',
				default: false,
				description: 'Whether to include files attached to each update',
			},
			{
				displayName: 'Include Replies',
				name: 'includeReplies',
				type: 'boolean',
				default: false,
				description: 'Whether to include the replies of each update',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 1000 },
				default: 50,
				description: 'Max number of results to return',
				hint: 'Higher limits consume more of your account’s API complexity budget per run — see the Get Rate Limits operation',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 1,
				description:
					'Which page of results to fetch (page size = limit). Increment it across runs to walk through long histories.',
			},
		],
	},
];
