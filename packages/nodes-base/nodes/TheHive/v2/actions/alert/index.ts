import type { INodeProperties } from 'n8n-workflow';

import * as count from './count.operation';
import * as create from './create.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as getMany from './getMany.operation';
import * as markAsRead from './markAsRead.operation';
import * as markAsUnread from './markAsUnread.operation';
import * as merge from './merge.operation';
import * as promote from './promote.operation';
import * as update from './update.operation';

export {
	count,
	create,
	executeResponder,
	get,
	getMany,
	markAsRead,
	markAsUnread,
	merge,
	promote,
	update,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		options: [
			{
				name: 'Count',
				value: 'count',
				action: 'Count alerts',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create alert',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute a responder on the specified alert',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an alert',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				action: 'Get many alerts',
			},
			{
				name: 'Mark as Read',
				value: 'markAsRead',
				action: 'Mark the alert as read',
			},
			{
				name: 'Mark as Unread',
				value: 'markAsUnread',
				action: 'Mark the alert as unread',
			},
			{
				name: 'Merge',
				value: 'merge',
				action: 'Merge alert into an existing case',
			},
			{
				name: 'Promote',
				value: 'promote',
				action: 'Promote an alert into a case',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update alert',
			},
		],
		displayOptions: {
			show: {
				resource: ['alert'],
			},
		},
		default: 'create',
	},
	...count.description,
	...create.description,
	...executeResponder.description,
	...get.description,
	...getMany.description,
	...markAsRead.description,
	...markAsUnread.description,
	...merge.description,
	...promote.description,
	...update.description,
];
