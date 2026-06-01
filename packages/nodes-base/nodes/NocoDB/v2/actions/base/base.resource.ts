import type { INodeProperties } from 'n8n-workflow';

import { updateDisplayOptions } from '@utils/utilities';

import * as get from './get.operation';
import * as getAll from './getAll.operation';

export * as get from './get.operation';
export * as getAll from './getAll.operation';

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
					// eslint-disable-next-line n8n-nodes-base/node-param-operation-option-description-wrong-for-get-many
					description: 'List all the bases',
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
