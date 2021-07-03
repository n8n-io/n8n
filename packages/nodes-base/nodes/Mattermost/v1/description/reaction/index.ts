import {
	INodeProperties,
} from 'n8n-workflow';

import { reactionCreateDescription } from './create';
import { reactionDeleteDescription } from './delete';
import { reactionGetAllDescription } from './getAll';

const reactionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'reaction',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Add a reaction to a post.',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Remove a reaction from a post',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all the reactions to one or more posts',
			},
		],
		default: 'create',
		description: 'The operation to perform',
	},
	...reactionCreateDescription,
	...reactionDeleteDescription,
	...reactionGetAllDescription,
];

export { reactionDescription };