import {
	INodeProperties,
} from 'n8n-workflow';

import * as search from './search';
import * as addResponse from './addResponse';

export {
	search,
	addResponse
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
								'task',
						],
				},
		},
		options: [
				{
						name: 'Search',
						value: 'search',
						description: 'Search tasks by multiple criteria',
				},
				{
					name: 'AddResponse',
					value: 'addResponse',
					description: 'Add a response',
			}
		],
		default: 'search',
	},
	...search.description,
	...addResponse.description
]
