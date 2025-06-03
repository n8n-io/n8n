import type { INodeProperties } from 'n8n-workflow';

import * as get from './get.operation';
import * as getAll from './getAll.operation';
import { handleErrorPostReceive, simplifyListPostReceive } from '../../helpers/utils';

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
						postReceive: [handleErrorPostReceive, simplifyListPostReceive],
					},
				},
				action: 'Get list',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of lists',
				routing: {
					request: {
						method: 'GET',
						url: '=/sites/{{ $parameter["site"] }}/lists',
					},
					output: {
						postReceive: [
							handleErrorPostReceive,
							{
								type: 'rootProperty',
								properties: {
									property: 'value',
								},
							},
							simplifyListPostReceive,
						],
					},
				},
				action: 'Get many lists',
			},
		],
		default: 'getAll',
	},

	...get.description,
	...getAll.description,
];
