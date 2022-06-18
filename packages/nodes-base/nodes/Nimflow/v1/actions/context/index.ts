import {
	INodeProperties,
} from 'n8n-workflow';

import * as dispatchAction from './dispatchAction';

export {
	dispatchAction
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
								'context',
						],
				},
		},
		options: [
				{
						name: 'DispatchAction',
						value: 'dispatchAction',
						description: 'Dispatch an action',
				}
		],
		default: 'dispatchAction',
	},
	...dispatchAction.description,
]
