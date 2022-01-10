import {
	INodeProperties,
} from 'n8n-workflow';

import {
	getCommonGetParameters,
	preserveKeys,
	selectAcknowledgesQuery,
	selectSuppressionDataQuery,
	selectTagsQuery,
} from './shared';

export const problemOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'problem',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve problems according to the given parameters',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const problemFields = [

	/*-------------------------------------------------------------------------- */
	/*                                problem:get                             	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'problem',
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
		displayName: 'See <a href="https://www.zabbix.com/documentation/5.0/en/manual/api/reference/problem/get" target="_blank">Zabbix documentation</a> on problem.get properties',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'problem',
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
					'problem',
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
					'problem',
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
				displayName: 'Event IDs',
				name: 'eventids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Event',
				},
				placeholder: 'Add Event ID',
				default: {},
				description: 'Return only problems with the given IDs.',
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
				displayName: 'Group IDs',
				name: 'groupids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Group',
				},
				placeholder: 'Add Group ID',
				default: {},
				description: 'Return only problems created by objects that belong to the given host groups.',
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
				displayName: 'Host IDs',
				name: 'hostids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Host',
				},
				placeholder: 'Add Host ID',
				default: {},
				description: 'Return only items that belong to the given hosts.',
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
				displayName: 'Object IDs',
				name: 'objectids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Object',
				},
				default: {},
				placeholder: 'Add Object ID',
				description: 'Return only problems created by the given objects.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the application.',
					},
				],
			},
			{
				displayName: 'Application IDs',
				name: 'applicationids',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Application',
				},
				default: {},
				placeholder: 'Add Application ID',
				description: 'Return only items that belong to the given applications.',
				options: [
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						default: '',
						description: 'ID of the application.',
					},
				],
			},
            {
                displayName: 'Source',
                name: 'source',
                type: 'options',
                default: 0,
                description: 'Return only problems with the given type.',
                options: [
                    {
                        name: '0 - event created by a trigger',
                        value: 0,
                    },
                    {
                        name: '3 - internal event',
                        value: 3,
                    },
                ],
            },
            {
                displayName: 'Object',
                name: 'object',
                type: 'options',
                default: 0,
                description: 'Return only problems with the given type.',
                options: [
                    {
                        name: '0 - event created by a trigger',
                        value: 0,
                    },
                    {
                        name: '4 - item',
                        value: 4,
                    },
                    {
                        name: '5 - LLD rule',
                        value: 5,
                    },
                ],
            },
            {
				displayName: 'Acknowledged',
				name: 'acknowledged',
				type: 'boolean',
				default: false,
				description: 'If true, return acknowledged problems only. If false, return unacknowledged only.',
			},
            {
				displayName: 'Suppressed',
				name: 'suppressed',
				type: 'boolean',
				default: false,
				description: 'If true, return only suppressed problems. If false, return problems in the normal state.',
			},
			{
				displayName: 'Severities',
				name: 'severities',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Severity',
				},
				placeholder: 'Add Severity Number',
				default: {},
				description: 'Return only problems with given event severities. Applies only if object is trigger.',
				options: [
					{
						displayName: 'Severity Number',
						name: 'severityNumber',
						type: 'number',
						default: 0,
						description: 'Number of the severity.',
					},
				],
			},
            {
                displayName: 'Evaluation Type',
                name: 'evaltype',
                type: 'options',
                default: 0,
                description: 'Rules for tag searching.',
                options: [
                    {
                        name: '0 - (default) And/Or',
                        value: 0,
                    },
                    {
                        name: '2 - Or',
                        value: 2,
                    },
                ],
            },
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Tag',
				default: {},
				description: 'Return only problems with given Acknowledged. Exact match by tag and case-insensitive search by value and operator.',
				options: [
					{
						displayName: 'Tags',
						name: 'tags',
						values: [
							{
								displayName: 'Tag',
								name: 'tag',
								type: 'string',
								default: '',
								description: 'Tag name.',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Search value.',
							},
							{
								displayName: 'Operator',
								name: 'operator',
								type: 'options',
								default: 0,
								description: 'Search operator.',
								options: [
									{
										name: '0 - (default) Like',
										value: 0,
									},
									{
										name: '1 - Equal',
										value: 1,
									},
								]
							},
						]
					}
				],
			},
            {
				displayName: 'Recent',
				name: 'recent',
				type: 'boolean',
				default: false,
				description: 'If true, return PROBLEM and recently RESOLVED problems (depends on Display OK triggers for N seconds). If false, return UNRESOLVED problems only.',
			},
            {
				displayName: 'Event ID From',
				name: 'eventid_from',
				type: 'string',
				default: '',
				description: 'Return only problems with IDs greater or equal to the given ID.',
			},
            {
				displayName: 'Event ID Till',
				name: 'eventid_till',
				type: 'string',
				default: '',
				description: 'Return only problems with IDs less or equal to the given ID.',
			},
            {
				displayName: 'Time From',
				name: 'time_from',
				type: 'number',
				default: 0,
				description: 'Return only problems that have been created after or at the given time. The format is Unix timestamp.',
			},
            {
				displayName: 'Time Till',
				name: 'time_till',
				type: 'number',
				default: 0,
				description: 'Return only problems that have been created before or at the given time. The format is Unix timestamp.',
			},

			...selectAcknowledgesQuery,
			...selectTagsQuery,
			...selectSuppressionDataQuery,

			...getCommonGetParameters('problem'),
			...preserveKeys,
		],
	},

] as INodeProperties[];