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
				description: 'All items of Input 1, then all items from following inputs',
				action: 'Append items',
			},
			{
				name: 'Combine by SQL',
				value: 'combineBySql',
				description: 'Combine items using SQL',
				action: 'Combine by SQL',
			},
			{
				name: 'Combine by Matching Fields',
				value: 'combineByFields',
				description: 'Combine items with the same field values',
				action: 'Combine by fields',
			},
			{
				name: 'Combine by Position',
				value: 'combineByPosition',
				description: 'Combine items based on their order',
				action: 'Combine by position',
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
				description: 'Output input data of a selected branch, without modifying it',
				action: 'Choose branch',
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
