import type { INodeProperties } from 'n8n-workflow';

import * as concatenateItems from './concatenateItems.operation';
import * as limit from './limit.operation';
import * as removeDuplicates from './removeDuplicates.operation';
import * as sort from './sort.operation';
import * as splitOutItems from './splitOutItems.operation';
import * as summarize from './summarize.operation';

export { concatenateItems, limit, removeDuplicates, sort, splitOutItems, summarize };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['itemList'],
			},
		},
		options: [
			{
				name: 'Concatenate Items',
				value: 'concatenateItems',
				description: 'Combine fields into a list in a single new item',
				action: 'Concatenate Items',
			},
			{
				name: 'Limit',
				value: 'limit',
				description: 'Remove items if there are too many',
				action: 'Limit',
			},
			{
				name: 'Remove Duplicates',
				value: 'removeDuplicates',
				description: 'Remove extra items that are similar',
				action: 'Remove Duplicates',
			},
			{
				name: 'Sort',
				value: 'sort',
				description: 'Change the item order',
				action: 'Sort',
			},
			{
				name: 'Split Out Items',
				value: 'splitOutItems',
				description:
					"Turn a list or values of object's properties inside item(s) into separate items",
				action: 'Split Out Items',
			},
			{
				name: 'Summarize',
				value: 'summarize',
				description: 'Aggregate items together (pivot table)',
				action: 'Summarize',
			},
		],
		default: 'splitOutItems',
	},
	...concatenateItems.description,
	...limit.description,
	...removeDuplicates.description,
	...sort.description,
	...splitOutItems.description,
	...summarize.description,
];
