import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { HeaderConstants } from '../../helpers/constants';

const properties: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue: `={{ !!$response.headers?.["${HeaderConstants.X_MS_CONTINUATION}"] }}`,
						request: {
							headers: {
								[HeaderConstants.X_MS_CONTINUATION]: `={{ $response.headers?.["${HeaderConstants.X_MS_CONTINUATION}"] }}`,
							},
						},
					},
				},
			},
		},
		type: 'boolean',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				returnAll: [false],
			},
		},
		routing: {
			request: {
				headers: {
					[HeaderConstants.X_MS_MAX_ITEM_COUNT]: '={{ $value || undefined }}',
				},
			},
		},
		type: 'number',
		typeOptions: {
			minValue: 1,
		},
		validateType: 'number',
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		type: 'boolean',
	},
];

const displayOptions = {
	show: {
		resource: ['container'],
		operation: ['getAll'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
