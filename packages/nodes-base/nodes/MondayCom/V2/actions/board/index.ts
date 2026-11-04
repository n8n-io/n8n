import type { INodeProperties } from 'n8n-workflow';

import * as aggregateBoardData from './aggregateBoardData.operation';
import * as archiveOrDeleteBoard from './archiveOrDeleteBoard.operation';
import * as createBoard from './createBoard.operation';
import * as duplicateBoard from './duplicateBoard.operation';
import * as getBoard from './getBoard.operation';
import * as getBoards from './getBoards.operation';
import * as getActivityLogs from './getActivityLogs.operation';
import * as getBoardSubscribers from './getBoardSubscribers.operation';
import * as searchBoardsAccount from './searchBoardsAccount.operation';
import * as updateBoardSubscribers from './updateBoardSubscribers.operation';

export {
	aggregateBoardData,
	archiveOrDeleteBoard,
	createBoard,
	duplicateBoard,
	getBoard,
	getBoards,
	getActivityLogs,
	getBoardSubscribers,
	searchBoardsAccount,
	updateBoardSubscribers,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['board'] } },
		options: [
			{
				name: 'Aggregate Item Data',
				value: 'aggregateBoardData',
				action: 'Aggregate item data on a board',
				description:
					'Calculate counts, sums, averages and more across a board’s items, optionally grouped like a pivot table — on monday’s servers, without fetching the items',
			},
			{
				name: 'Archive or Delete',
				value: 'archiveOrDeleteBoard',
				action: 'Archive or delete a board',
				description: 'Archive a board (recoverable, the default) or permanently delete it',
			},
			{
				name: 'Create',
				value: 'createBoard',
				action: 'Create a board',
				description: 'Create a new board, optionally in a specific workspace or from a template',
			},
			{
				name: 'Duplicate',
				value: 'duplicateBoard',
				action: 'Duplicate a board',
				description: 'Create a copy of a board: structure only, or including items and updates',
			},
			{
				name: 'Get',
				value: 'getBoard',
				action: 'Get a board',
				description: 'Return a single board with its groups and column schema',
			},
			{
				name: 'Get Many',
				value: 'getBoards',
				action: 'Get many boards',
				description: 'Return a page of boards, with optional filters',
			},
			{
				name: 'List Activity Logs',
				value: 'getActivityLogs',
				action: 'List board activity logs',
				description: 'Return the activity log events of a board, with optional filters',
			},
			{
				name: 'List Subscribers',
				value: 'getBoardSubscribers',
				action: 'List board subscribers',
				description: 'Return the users and teams subscribed to (or owning) a board',
			},
			{
				name: 'Search',
				value: 'searchBoardsAccount',
				action: 'Search boards',
				description: 'Find boards account-wide by keyword and semantic relevance',
			},
			{
				name: 'Update Subscribers',
				value: 'updateBoardSubscribers',
				action: 'Update board subscribers',
				description: 'Add users and/or teams to a board as subscribers or owners — or remove them',
			},
		],
		default: 'getBoard',
	},
	...aggregateBoardData.description,
	...archiveOrDeleteBoard.description,
	...createBoard.description,
	...duplicateBoard.description,
	...getBoard.description,
	...getBoards.description,
	...getActivityLogs.description,
	...getBoardSubscribers.description,
	...searchBoardsAccount.description,
	...updateBoardSubscribers.description,
];
