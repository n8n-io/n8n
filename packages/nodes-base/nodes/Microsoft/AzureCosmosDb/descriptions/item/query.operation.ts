import { updateDisplayOptions, type INodeProperties } from 'n8n-workflow';

import { containerResourceLocator } from '../../helpers/resourceLocators';
import { validateQueryParameters } from '../../helpers/utils';

const properties: INodeProperties[] = [
	containerResourceLocator,
	{
		displayName: 'Query',
		name: 'query',
		default: '',
		description:
			"The SQL query to execute. Use $1, $2, $3, etc., to reference the 'Query Parameters' set in the options below.",
		hint: 'Consider using query parameters to prevent SQL injection attacks. Add them in the options below.',
		noDataExpression: true,
		placeholder: 'e.g. SELECT id, name FROM c WHERE c.name = $1',
		required: true,
		routing: {
			send: {
				type: 'body',
				property: 'query',
				value: "={{ $value.replace(/\\$(\\d+)/g, '@param$1') }}",
			},
		},
		type: 'string',
		typeOptions: {
			editor: 'sqlEditor',
			sqlDialect: 'StandardSQL',
		},
	},
	{
		displayName: 'Simplify',
		name: 'simple',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
		type: 'boolean',
	},
	{
		displayName: 'Options',
		name: 'options',
		default: {},
		options: [
			{
				displayName: 'Query Options',
				name: 'queryOptions',
				values: [
					{
						displayName: 'Query Parameters',
						name: 'queryParameters',
						default: '',
						description:
							'Comma-separated list of values used as query parameters. Use $1, $2, $3, etc., in your query.',
						hint: 'Reference them in your query as $1, $2, $3…',
						placeholder: 'e.g. value1,value2,value3',
						routing: {
							send: {
								preSend: [validateQueryParameters],
							},
						},
						type: 'string',
					},
				],
			},
		],
		placeholder: 'Add options',
		type: 'fixedCollection',
		typeOptions: {
			multipleValues: false,
		},
	},
];

const displayOptions = {
	show: {
		resource: ['item'],
		operation: ['query'],
	},
};

export const description = updateDisplayOptions(displayOptions, properties);
