import type { INodeProperties } from 'n8n-workflow';

import * as create from './create.operation';
import * as deleteObservable from './deleteObservable.operation';
import * as executeAnalyzer from './executeAnalyzer.operation';
import * as executeResponder from './executeResponder.operation';
import * as get from './get.operation';
import * as search from './search.operation';
import * as update from './update.operation';

export { create, deleteObservable, executeAnalyzer, executeResponder, get, search, update };

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		required: true,
		default: 'create',
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create an observable',
			},
			{
				name: 'Delete',
				value: 'deleteObservable',
				action: 'Delete an observable',
			},
			{
				name: 'Execute Analyzer',
				value: 'executeAnalyzer',
				action: 'Execute analyzer on an observable',
			},
			{
				name: 'Execute Responder',
				value: 'executeResponder',
				action: 'Execute responder on an observable',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an observable',
			},
			{
				name: 'Search',
				value: 'search',
				action: 'Search observables',
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an observable',
			},
		],
		displayOptions: {
			show: {
				resource: ['observable'],
			},
		},
	},
	...create.description,
	...deleteObservable.description,
	...executeAnalyzer.description,
	...executeResponder.description,
	...get.description,
	...search.description,
	...update.description,
];
