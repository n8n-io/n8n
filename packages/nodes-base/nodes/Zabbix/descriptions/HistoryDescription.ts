import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getCommonGetParameters,
} from './shared';

export const historyOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'history',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve history data according to the given parameters',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const historyFields = [

	/*-------------------------------------------------------------------------- */
	/*                                history:get                             	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'history',
				],
				operation: [
					'get',
				],
			},
		},
		default: false,
		description: 'Add parameters as JSON.',
	},
	{
		displayName: 'See <a href="https://www.zabbix.com/documentation/5.0/en/manual/api/reference/history/get" target="_blank">Zabbix documentation</a> on history.get properties',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'history',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
	},
	{
		displayName: 'Parameters JSON',
		name: 'parametersJson',
		type: 'json',
		displayOptions: {
			show: {
				resource: [
					'history',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					true,
				],
			},
		},
		default: '',
		description: 'Parameters as JSON (flat object) or JSON string.',
	},
	{
		displayName: 'Parameters',
		name: 'parametersUi',
		placeholder: 'Add Parameter',
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'history',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					false,
				],
			},
		},
		description: 'The query parameter to send.',
		default: {},
		options: [
            {
                displayName: 'History',
                name: 'history',
                type: 'options',
                default: 3,
                description: 'History object types to return.',
                options: [
                    {
                        name: '0 - numeric float',
                        value: 0,
                    },
                    {
                        name: '1 - character',
                        value: 1,
                    },
                    {
                        name: '2 - log',
                        value: 2,
                    },
                    {
                        name: '3 - numeric unsigned',
                        value: 3,
                    },
                    {
                        name: '4 - text',
                        value: 4,
                    },
                ],
            },
            {
                displayName: 'Host IDs',
                name: 'hostids',
                type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Host',
				},
				placeholder: 'Add Host ID',
				default: {},
				description: 'Return only history from the given hosts.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the host.',
					},
				],
			},
            {
				displayName: 'Item IDs',
				name: 'itemids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Item',
				},
				placeholder: 'Add Item ID',
				default: {},
				description: 'Return only history from the given items.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the item.',
					},
				],
			},
            {
				displayName: 'Time From',
				name: 'time_from',
				type: 'number',
				default: 0,
				description: 'Return only values that have been received after or at the given time. The format is Unix timestamp.',
			},
            {
				displayName: 'Time Till',
				name: 'time_till',
				type: 'number',
				default: 0,
				description: 'Return only values that have been received before or at the given time. The format is Unix timestamp.',
			},

			...getCommonGetParameters('history'),
		],
	},

] as INodeProperties[];