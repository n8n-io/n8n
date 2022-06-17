import {
	INodeProperties,
} from 'n8n-workflow';

import * as call from './call';

export {
	call,
};

export const descriptions: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
				show: {
						resource: [
								'function',
						],
				},
		},
		options: [
				{
						name: 'Call',
						value: 'call',
						description: 'Call a function',
				},
		],
		default: 'call',
	},
	...call.description,
];
