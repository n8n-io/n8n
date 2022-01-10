import {
	INodeProperties,
} from 'n8n-workflow';

import {
	eventIds,
	getCommonGetParameters,
	graphIds,
	hostIds,
	objectIds,
	preserveKeys,
	selectHostsQuery,
	selectSuppressionDataQuery,
	selectTagsQuery,
} from './shared';

export const eventOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve events according to the given parameters',
			},
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const eventFields = [

	/*-------------------------------------------------------------------------- */
	/*                                event:get	                             	 */
	/* ------------------------------------------------------------------------- */
	{
		displayName: 'JSON Parameters',
		name: 'jsonParameters',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: [
					'event',
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
		displayName: 'See <a href="https://www.zabbix.com/documentation/5.0/en/manual/api/reference/event/get" target="_blank">Zabbix documentation</a> on event.get properties',
		name: 'jsonNotice',
		type: 'notice',
		displayOptions: {
			show: {
				resource: [
					'event',
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
					'event',
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
		type: 'collection',
		displayOptions: {
			show: {
				resource: [
					'event',
				],
				operation: [
					'get',
				],
				jsonParameters: [
					false,
				],
			},
		},
		default: {},
		placeholder: 'Add Parameters',
		description: 'The parameters to add',
		options: [

			eventIds,
			graphIds,
			hostIds,
			objectIds,

			{
                displayName: 'Source',
                name: 'source',
                type: 'options',
                default: 0,
                description: 'Return only events with the given type.',
                options: [
                    {
                        name: '0 - event created by a trigger',
                        value: 0,
                    },
                    {
                        name: '1 - event created by a discovery rule',
                        value: 1,
                    },
                    {
                        name: '2 - event created by active agent autoregistration',
                        value: 2,
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
                description: 'Return only events created by objects of the given type.',
                options: [
                    {
                        name: '0 - trigger',
                        value: 0,
                    },
                    {
                        name: '1 - discovered host',
                        value: 1,
                    },
                    {
                        name: '2 - discovered service',
                        value: 2,
                    },
                    {
                        name: '3 - auto-registered host',
                        value: 3,
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
				description: 'If set to true return only acknowledged events.',
			},
            {
				displayName: 'Suppressed',
				name: 'suppressed',
				type: 'boolean',
				default: false,
				description: 'If true, return only suppressed events. If false, return events in the normal state.',
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
				description: 'Return only events with given tags. Exact match by tag and case-insensitive search by value and operator.',
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
									{
										name: '2 - Not like',
										value: 2,
									},
									{
										name: '3 - Not equal',
										value: 3,
									},
									{
										name: '4 - Exists',
										value: 4,
									},
									{
										name: '5 - Not exists',
										value: 5,
									},
								]
							},
						]
					}
				],
			},
            {
				displayName: 'Event ID From',
				name: 'eventid_from',
				type: 'string',
				default: '',
				description: 'Return only events with IDs greater or equal to the given ID.',
			},
            {
				displayName: 'Event ID Till',
				name: 'eventid_till',
				type: 'string',
				default: '',
				description: 'Return only events with IDs less or equal to the given ID.',
			},
            {
				displayName: 'Time From',
				name: 'time_from',
				type: 'number',
				default: 0,
				description: 'Return only events that have been created after or at the given time. The format is Unix timestamp.',
			},
            {
				displayName: 'Time Till',
				name: 'time_till',
				type: 'number',
				default: 0,
				description: 'Return only events that have been created before or at the given time. The format is Unix timestamp.',
			},
            {
				displayName: 'Problem Time From',
				name: 'problem_time_from',
				type: 'number',
				default: 0,
				description: 'Returns only events that were in the problem state starting with problem_time_from. Applies only if the source is trigger event and object is trigger. Mandatory if problem_time_till is specified. The format is Unix timestamp.',
			},
            {
				displayName: 'Problem Time Till',
				name: 'problem_time_till',
				type: 'number',
				default: 0,
				description: 'Returns only events that were in the problem state until problem_time_till. Applies only if the source is trigger event and object is trigger. Mandatory if problem_time_from is specified. The format is Unix timestamp.',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'collection',
				typeOptions: {
					multipleValues: true,
					multipleValueButtonText: 'Add Another Value',
				},
				placeholder: 'Add Value',
				default: {},
				description: 'Return only events with the given values.',
				options: [
					{
						displayName: 'Value',
						name: 'value',
						type: 'number',
						default: 0,
						description: 'The value.',
					},
				]
			},

			...selectHostsQuery,
			{
				displayName: 'Select Acknowledges',
				name: 'select_acknowledges',
				type: 'options', // type - query
				default: 'extend',
				description: 'Return an acknowledges property with event updates. Event updates are sorted in reverse chronological order.',
				options: [
					{
						name: 'Extend',
						value: 'extend',
						description: 'Returns all object properties',
					},
					{
						name: 'Count',
						value: 'count',
						description: 'Returns the number of retrieved records, supported only by certain subselects',
					},
				],
			},
			...selectTagsQuery,
			...selectSuppressionDataQuery,

			...getCommonGetParameters('event'),
			...preserveKeys,

		],
	},

] as INodeProperties[];