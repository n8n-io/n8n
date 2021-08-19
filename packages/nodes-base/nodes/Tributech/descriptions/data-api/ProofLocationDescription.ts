import {
	INodeProperties,
} from 'n8n-workflow';

export const proofLocationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'proofLocation',
				],
			},
		},
		options: [
			{
				name: 'Get Proof Locations',
				value: 'getProofLocations',
			},
			{
				name: 'Save Proof Locations',
				value: 'saveProofLocations',
			},
		],
		default: 'getProofLocations',
	},
] as INodeProperties[];

export const proofLocationFields = [
	{
		displayName: 'valueMetadata ID',
		name: 'valueMetadataId',
		description: 'The ValueMedataId of the data stream',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'proofLocation',
				],
				operation: [
					'getProofLocations',
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
					'proofLocation',
				],
				operation: [
					'getProofLocations',
				],
			},
		},
		options: [
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
				displayName: 'OrderBy',
				name: 'orderBy',
				description: 'Sort order of the returned \'Values\' (default: "asc", alternative: "desc") Values are ordered by Timestamp',
				type: 'string',
				default: 'asc',
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
			{
				displayName: 'From',
				name: 'from',
				description: 'Filter result by \'Timestamp\', only include \'Values\' with a \'Timestamp\' equal or after the given filter <br /> (format: ISO 8601, default: No filtering occurs, behavior: Timestamp >= From)',
				type: 'dateTime',
				default: '',
			},
		],
	},
	{
		displayName: 'Standard',
		name: 'proofLocations',
		type: 'fixedCollection',
		placeholder: 'Add Proof Location',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: [
					'proofLocation',
				],
				operation: [
					'saveProofLocations',
				],
			},
		},
		options: [
			{
				displayName: 'Proof Location',
				name: 'proofLocation',
				values: [
					{
						displayName: 'ValueMetadata ID',
						name: 'valueMetadataId',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Last Timestamp',
						name: 'lastTimestamp',
						type: 'string',
						required: true,
						default: '',
					},
					{
						displayName: 'Merkel Tree Depth',
						name: 'merkelTreeDepth',
						type: 'number',
						required: true,
						default: '',
					},
					{
						displayName: 'URI',
						name: 'uri',
						type: 'string',
						required: true,
						default: '',
					},
				],
			},
		],
	},
] as INodeProperties[];
