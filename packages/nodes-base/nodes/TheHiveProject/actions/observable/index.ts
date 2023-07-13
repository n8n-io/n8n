import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as executeAnalyzer from './executeAnalyzer.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { create, executeAnalyzer, executeResponder, get, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'getMany',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create observable',
			},
			{
				name: 'Execute Analyzer',
				value: 'executeAnalyzer',
				action: 'Execute an responder on selected observable',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute a responder on selected observable',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a single observable',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search observables',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update observable',
			},
		],
		displayOptions: {
			show: {
				resource: ['observable'],
			},
		},
	},
	...create.description,
	...executeAnalyzer.description,
	...executeResponder.description,
	...get.description,
	...search.description,
	...update.description,
];
