import type { INodeProperties } from 'n8n-workflow';

import * as addAttachment from './addAttachment.operation';
import * as count from './count.operation';
import * as create from './create.operation';
import * as deleteAttachment from './deleteAttachment.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as getAttachment from './getAttachment.operation';
import * as search from './search.operation';
import * as getTimeline from './getTimeline.operation';
import * as update from './update.operation';

export {
	addAttachment,
	count,
	create,
	deleteAttachment,
	executeResponder,
	get,
	search,
	getAttachment,
	getTimeline,
	update,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		default: 'getMany',
		type: 'options',
		noDataExpression: true,
		required: true,
		options: [
			{
				name: 'Add Attachment',
				value: 'addAttachment',
				action: 'Add Attachment to a case',
			},
			{
				name: 'Count',
				value: 'count',
				action: 'Count a case',
			},
			{
				name: 'Create',
				value: 'create',
				action: 'Create a case',
			},
			{
				name: 'Delete Attachment',
				value: 'deleteAttachment',
				action: 'Delete attachment from the case',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute a responder on the specified case',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a single case',
			},
			{
				name: 'Get Attachment',
				value: 'getAttachment',
				action: 'Get attachment from the case',
			},
			{
				name: 'Get Timeline',
				value: 'getTimeline',
				action: 'Get the timeline of a case',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search cases',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update a case',
			},
		],
		displayOptions: {
			show: {
				resource: ['case'],
			},
		},
	},
	...addAttachment.description,
	...count.description,
	...create.description,
	...deleteAttachment.description,
	...executeResponder.description,
	...get.description,
	...getAttachment.description,
	...search.description,
	...getTimeline.description,
	...update.description,
];
