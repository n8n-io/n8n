import {
	INodeProperties,
} from 'n8n-workflow';

export const valuesOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
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
				name: 'Add Value',
				value: 'addValue',
			},
			{
				name: 'Add Value As Base64',
				value: 'addValueAsBase64',
			},
			{
				name: 'Add Value As Byte',
				value: 'addValueAsByte',
			},
			{
				name: 'Add Value As Double',
				value: 'addValueAsDouble',
			},
			{
				name: 'Add Values',
				value: 'addValues',
			},
			{
				name: 'Add Values As Base64',
				value: 'addValuesAsBase64',
			},
			{
				name: 'Add Values As Byte',
				value: 'addValuesAsByte',
			},
			{
				name: 'Add Values As Double',
				value: 'addValuesAsDouble',
			},
			{
				name: 'Get Raw Values',
				value: 'getRawValues',
			},
			{
				name: 'Get Values As Byte',
				value: 'getValuesAsByte',
			},
			{
				name: 'Get Values As Double',
				value: 'getValuesAsDouble',
			},
			{
				name: 'Get Values As String',
				value: 'getValuesAsString',
			},
		],
		default: 'addValue',
	},
] as INodeProperties[];

export const valuesFields = [
	{
		displayName: 'ValueMetadata ID',
		name: 'valueMetadataId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getRawValues',
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',

					'addValue',
					'addValueAsBase64',
					'addValueAsByte',
					'addValueAsDouble',
				],
			},
		},
	},
	{
		displayName: 'Timestamp',
		name: 'timestamp',
		description: 'Timestamp',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'addValue',
					'addValueAsBase64',
					'addValueAsByte',
					'addValueAsDouble',
				],
			},
		},
	},
	{
		displayName: 'Value(s)',
		name: 'values',
		description: 'Values',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'addValue',
					'addValueAsBase64',
					'addValueAsByte',
					'addValueAsDouble',
				],
			},
		},
	},
	{
		displayName: 'From',
		name: 'from',
		description: 'Filter result by \'Timestamp\', only include \'Values\' with a \'Timestamp\' equal or after the given filter <br /> (format: ISO 8601, default: No filtering occurs, behavior: Timestamp >= From)',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getRawValues',
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',
				],
			},
		},
	},
	{
		displayName: 'To',
		name: 'to',
		description: 'Filter result by \'Timestamp\', only include \'Values\' with a \'Timestamp\' before the given filter <br /> (format: ISO 8601, default: No filtering occurs, behavior: Timestamp < To)',
		type: 'dateTime',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getRawValues',
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',
				],
			},
		},
	},
	{
		displayName: 'OrderBy',
		name: 'orderBy',
		description: 'Sort order of the returned \'Values\' (default: "asc", alternative: "desc") Values are ordered by Timestamp',
		type: 'string',
		default: 'asc',
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getRawValues',
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',
				],
			},
		},
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
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getRawValues',
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',
				],
			},
		},
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
		default: 1,
		displayOptions: {
			show: {
				resource: [
					'value',
				],
				operation: [
					'getRawValues',
					'getValuesAsByte',
					'getValuesAsDouble',
					'getValuesAsString',
				],
			},
		},
	},
	{
		displayName: 'Standard',
		name: 'standard',
		type: 'fixedCollection',
		placeholder: 'Add Value',
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
					'addValues',
					'addValuesAsBase64',
					'addValuesAsByte',
					'addValuesAsDouble',
				],
			},
		},
		options: [
			{
				displayName: 'Details',
				name: 'details',
				values: [
					{
						displayName: 'ValueMetadata ID',
						name: 'valueMetadataId',
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
						description: 'Values',
						type: 'json',
						required: true,
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
