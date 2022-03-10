import {
	INodeProperties,
} from 'n8n-workflow';

export const valuesOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		description: 'The operation that should be executed',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
			},
		},
		options: [

			{
				name: 'Add Values As Base64',
				description: 'Add Values As Base64',
				value: 'addValuesAsBase64',
			},
			{
				name: 'Add Values As Byte',
				description: 'Add Values As Byte',
				value: 'addValuesAsByte',
			},
			{
				name: 'Add Values As Double',
				description: 'Add Values As Double',
				value: 'addValuesAsDouble',
			},
			{
				name: 'Get Values As Byte',
				description: 'Get Values As Byte',
				value: 'getValuesAsByte',
			},
			{
				name: 'Get Values As Double',
				description: 'Get Values As Double',
				value: 'getValuesAsDouble',
			},
			{
				name: 'Get Values As String',
				description: 'Get Values As String',
				value: 'getValuesAsString',
			},
			{
				name: 'Get Values As Integer',
				description: 'Get Values As Integer',
				value: 'getValuesAsInt',
			},
			{
				name: 'Get Values As Float',
				description: 'Get Values As Float',
				value: 'getValuesAsFloat',
			},
		],
		default: 'getValuesAsByte',
	},
] as INodeProperties[];

export const valuesFields = [
	{
		displayName: 'ValueMetadata ID',
		name: 'valueMetadataId',
		description: 'ValueMetadata ID',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',
					'getValuesAsInt',
					'getValuesAsFloat',
				],
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',
					'getValuesAsInt',
					'getValuesAsFloat',
				],
			},
		},
		options: [
			{
				displayName: 'From',
				name: 'from',
				description: 'Filter result by \'Timestamp\', only include \'Values\' with a \'Timestamp\' equal or after the given filter <br /> (format: ISO 8601, default: No filtering occurs, behavior: Timestamp >= From)',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'OrderBy',
				name: 'orderBy',
				description: 'Sort order of the returned \'Values\' (default: "asc", alternative: "desc") Values are ordered by Timestamp',
				type: 'string',
				default: 'asc',
			},
			{
				displayName: 'PageNumber',
				name: 'pageNumber',
				description: 'Page number (first page is 1, default: 1, min: 1, max: 2147483647)',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 2147483647,
				},
				default: 1,
			},
			{
				displayName: 'PageSize',
				name: 'pageSize',
				description: 'Page size (default: 100, min: 1, max: 2147483647)',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 2147483647,
				},
				default: 100,
			},
			{
				displayName: 'To',
				name: 'to',
				description: 'Filter result by \'Timestamp\', only include \'Values\' with a \'Timestamp\' before the given filter <br /> (format: ISO 8601, default: No filtering occurs, behavior: Timestamp < To)',
				type: 'dateTime',
				default: '',
			},
		],
	},
	{
		displayName: 'Standard',
		name: 'values',
		type: 'fixedCollection',
		placeholder: 'Add Value',
		description: 'Collection of values to add.',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'addValuesAsBase64',
					'addValuesAsByte',
					'addValuesAsDouble',
				],
			},
		},
		options: [
			{
				displayName: 'Value',
				name: 'value',
				values: [
					{
						displayName: 'ValueMetadata ID',
						name: 'valueMetadataId',
						description: 'ValueMetadata ID',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Timestamp',
						name: 'timestamp',
						description: 'Timestamp',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Value(s)',
						name: 'values',
						description: 'Value(s)',
						type: 'json',
						required: true,
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
