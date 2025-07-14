import type { INodeProperties } from 'n8n-workflow';

import * as append from './append';
import * as chooseBranch from './chooseBranch';
import * as combineAll from './combineAll';
import * as combineByFields from './combineByFields';
import * as combineByPosition from './combineByPosition';
import * as combineBySql from './combineBySql';

export { append, chooseBranch, combineAll, combineByFields, combineBySql, combineByPosition };

export const description: INodeProperties[] = [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Append',
				value: 'append',
				description: 'Output items of each input, one after the other',
			},
			{
				name: 'Combine',
				value: 'combine',
				description: 'Merge matching items together',
			},
			{
				name: 'SQL Query',
				value: 'combineBySql',
				description: 'Write a query to do the merge',
			},
			{
				name: 'Choose Branch',
				value: 'chooseBranch',
				description: 'Output data from a specific branch, without modifying it',
			},
		],
		default: 'append',
		description: 'How input data should be merged',
	},
	{
		displayName: 'Combine By',
		name: 'combineBy',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Matching Fields',
				value: 'combineByFields',
				description: 'Combine items with the same field values',
			},
			{
				name: 'Position',
				value: 'combineByPosition',
				description: 'Combine items based on their order',
			},
			{
				name: 'All Possible Combinations',
				value: 'combineAll',
				description: 'Every pairing of every two items (cross join)',
			},
		],
		default: 'combineByFields',
		description: 'How input data should be merged',
		displayOptions: {
			show: { mode: ['combine'] },
		},
	},
	...append.description,
	...combineAll.description,
	...combineByFields.description,
	...combineBySql.description,
	...combineByPosition.description,
	...chooseBranch.description,
];
