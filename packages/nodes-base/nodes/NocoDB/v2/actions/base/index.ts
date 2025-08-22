import type { INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import * as get from './get';
import * as getAll from './getAll';
export * as get from './get';
export * as getAll from './getAll';

export const description: INodeProperties[] = updateDisplayOptions(
	{
		show: {
			resource: ['base'],
		},
	},
	[
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Get Many',
					value: 'getAll',
					description: 'Retrieve many bases',
					action: 'Get many bases',
				},
				{
					name: 'Get',
					value: 'get',
					description: 'Retrieve one base',
					action: 'Get one base',
				},
			],
			default: 'get',
		},
		...get.description,
		...getAll.description,
	],
);
