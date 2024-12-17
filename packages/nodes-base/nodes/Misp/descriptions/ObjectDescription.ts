import type { INodeProperties } from 'n8n-workflow';
import { updateDisplayOptions } from '../../../utils/utilities';
import { searchProperties } from './common.descriptions';

const searchDisplayOptions = {
	show: {
		resource: ['object'],
		operation: ['search'],
	},
};

const searchDescription = updateDisplayOptions(searchDisplayOptions, searchProperties);

export const objectOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['object'],
			},
		},
		noDataExpression: true,
		options: [
			{
				name: 'Search',
				value: 'search',
				action: 'Get a filtered list of objects',
			},
		],
		default: 'search',
	},
];

export const objectFields: INodeProperties[] = [
	// ----------------------------------------
	//              event: search
	// ----------------------------------------
	...searchDescription,
];
