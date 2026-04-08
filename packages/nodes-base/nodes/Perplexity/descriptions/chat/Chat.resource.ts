import type { INodeProperties } from 'n8n-workflow';

import * as complete from './complete.operation';
import { sendErrorPostReceive } from '../../GenericFunctions';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['chat'],
			},
		},
		options: [
			{
				name: 'Message a Model',
				value: 'complete',
				action: 'Message a model',
				description: 'Create one or more completions for a given text',
				routing: {
					request: {
						method: 'POST',
						url: '/chat/completions',
					},
					output: {
						postReceive: [sendErrorPostReceive],
					},
				},
			},
		],
		default: 'complete',
	},

	...complete.description,
];
