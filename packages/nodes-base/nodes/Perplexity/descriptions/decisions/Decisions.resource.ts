import type { INodeProperties } from 'n8n-workflow';

import { decisionsErrorPostReceive, decisionsPreSend } from '../../GenericFunctions';
import * as answerQuestions from './answerQuestions.operation';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['decision'],
			},
		},
		options: [
			{
				name: 'Answer Questions',
				value: 'answerQuestions',
				action: 'Answer questions about content',
				description:
					'Answer yes or no, choice, score, and locate questions about content with a decision model',
				routing: {
					request: {
						method: 'POST',
						url: '/v1/decisions',
					},
					send: {
						preSend: [decisionsPreSend],
					},
					output: {
						postReceive: [decisionsErrorPostReceive],
					},
				},
			},
		],
		default: 'answerQuestions',
	},

	...answerQuestions.description,
];
