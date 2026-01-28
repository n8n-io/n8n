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
				builderHint:
					'Does NOT wait for all inputs to receive data. Use when you need to concatenate all items from multiple inputs into a single output stream. Items are not modified, just combined sequentially.',
			},
			{
				name: 'Combine',
				value: 'combine',
				description: 'Merge matching items together',
				builderHint:
					'Waits for both inputs to receive data. Only accepts two inputs. Use when you need to join/merge data from two inputs based on matching field values (like a database JOIN). Set combineBy to specify matching strategy.',
			},
			{
				name: 'SQL Query',
				value: 'combineBySql',
				description: 'Write a query to do the merge',
				builderHint:
					'Waits for all connected inputs to receive data. Use when you need complex merge logic with SQL-like syntax. Allows filtering, joining, and transforming data using SQL queries.',
			},
			{
				name: 'Choose Branch',
				value: 'chooseBranch',
				description: 'Output data from a specific branch, without modifying it',
				builderHint:
					'Waits for all connected inputs to receive data. Use when you need to select data from only one specific input branch and discard the others. Useful after conditional nodes.',
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
