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
				builderHint: {
					message:
						'Append items from multiple branches into a single list sequentially. Waits for all running branches. Supports any number of inputs. @example input1: [{ x }] [{ y }] input2: [{ z }]. Output: [{ x }, { y }, { z }]. Next node will execute 3 times with each item. Set executeOnce on next node to execute once.',
				},
			},
			{
				name: 'Combine',
				value: 'combine',
				description: 'Merge matching items together',
				builderHint: {
					message:
						'Combines items from 2 branches. Waits for both to have input data. @example **combine by position** input1: [{ x }, { y }] input2: [{ z }] output: [{ x, y }, { x: undefined, y: undefined, z }] @example **combine by key** input1: [{ id: 1, x }, { id: 2, y }] input2: [{ id: 1, z }] output: [{ id: 1, x, z }, { id: 2, y }]',
				},
			},
			{
				name: 'SQL Query',
				value: 'combineBySql',
				description: 'Write a query to do the merge',
				builderHint: {
					message:
						'Need to combine more than 2 branches? Use SQL Query for advanced operations. Waits for all inputs. @example Results depend on query - can filter, join, aggregate',
				},
			},
			{
				name: 'Choose Branch',
				value: 'chooseBranch',
				description: 'Output data from a specific branch, without modifying it',
				builderHint: {
					message:
						'Do you need to select data from only ONE specific input and discard the others? Use Choose Branch after conditional nodes to pick which path to continue. Waits for all inputs. @example 3 items from Input A + 2 items from Input B, choose Input A → 3 items',
				},
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
