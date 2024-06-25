import type { INodeProperties } from 'n8n-workflow';

import * as append from './append';
import * as chooseBranch from './chooseBranch';
import * as combineAll from './combineAll';
import * as combineByFields from './combineByFields';
import * as combineBySql from './combineBySql';
import * as combineByPosition from './combineByPosition';

export { append, chooseBranch, combineAll, combineByFields, combineBySql, combineByPosition };

export const description: INodeProperties[] = [
	{
		displayName: 'Mode',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		// eslint-disable-next-line n8n-nodes-base/node-param-options-type-unsorted-items
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Output items of each input, one after the other',
				action: 'Output items of each input, one after the other',
			},
			{
				name: 'SQL Query',
				value: 'combineBySql',
				description: 'Write a query to do the merge',
				action: 'Write a query to do the merge',
			},
			{
				name: 'Combine by Matching Fields',
				value: 'combineByFields',
				description: 'Combine items with the same field values',
				action: 'Combine items with the same field values',
			},
			{
				name: 'Combine by Position',
				value: 'combineByPosition',
				description: 'Combine items based on their order',
				action: 'Combine items based on their order',
			},
			{
				name: 'Combine by All Possible Combinations',
				value: 'combineAll',
				description: 'All possible item combinations (cross join)',
				action: 'Combine all possible item combinations',
			},
			{
				name: 'Choose Branch',
				value: 'chooseBranch',
				description: 'Output data from a specific branch, without modifying it',
				action: 'Output data from a specific branch, without modifying it',
			},
		],
		default: 'append',
		description: 'How input data should be merged',
	},
	...append.description,
	...combineAll.description,
	...combineByFields.description,
	...combineBySql.description,
	...combineByPosition.description,
	...chooseBranch.description,
];
