import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getAll from './getAll.operation';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['list'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve details of a single list',
				routing: {
					request: {
						ignoreHttpStatusErrors: true,
						method: 'GET',
						url: '=/sites/{{ $parameter["site"] }}/lists/{{ $parameter["list"] }}',
					},
					output: {
						postReceive: [],
					},
				},
				action: 'Get list',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of',
				routing: {
					request: {
						method: 'GET',
						url: '=/sites/{{ $parameter["site"] }}/lists',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'value',
								},
							},
						],
					},
				},
				action: 'Get many',
			},
		],
		default: 'getAll',
	},

	...get.properties,
	...getAll.properties,
];
