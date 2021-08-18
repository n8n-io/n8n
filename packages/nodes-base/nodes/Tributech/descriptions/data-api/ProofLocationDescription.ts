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
				name: 'Get Proof Location',
				value: 'getProofLocation',
			},
			{
				name: 'Get Proof Locations',
				value: 'getProofLocations',
			},
			// {
			// 	name: 'Save Proof Location',
			// 	value: 'saveProofLocation',
			// },
			// {
			// 	name: 'Save Proof Locations',
			// 	value: 'saveProofLocations',
			// },
		],
		default: 'getProofLocation',
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
					'getProofLocation',
					'getProofLocations',
				],
			},
		},
	},
	{
		displayName: 'nextLastTimestamp',
		name: 'nextLastTimestamp',
		description: 'Specifies the point in time of which ProofLocation should be returned (format: ISO 8601)',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'proofLocation',
				],
				operation: [
					'getProofLocation',
				],
			},
		},
	},
	{
		displayName: 'From',
		name: 'from',
		description: 'Filter result by \'LastTimestamp\', only include \'ProofLocations\' with a \'LastTimestamp\' equal or after the given filter <br /> (format: ISO 8601, default: No filtering occurs, behavior: LastTimestamp >= From)',
		type: 'string',
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
		displayName: 'To',
		name: 'to',
		description: 'Filter result by \'LastTimestamp\', only include \'ProofLocations\' with a \'LastTimestamp\' before the given filter <br /> (format: ISO 8601, default: No filtering occurs, behavior: LastTimestamp < To)',
		type: 'string',
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
		displayName: 'OrderBy',
		name: 'orderBy',
		description: 'Order by LastTimestamp. Default: "asc" or empty field. Alternative: "desc"',
		type: 'string',
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
		displayName: 'PageNumber',
		name: 'pageNumber',
		description: 'Page number (first page is 1, default: 1, min: 1, max: 2147483647)',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 2147483647,
		},
		default: 0,
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
		displayName: 'PageSize',
		name: 'pageSize',
		description: 'Page size (default: 100, min: 1, max: 2147483647)',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 2147483647,
		},
		default: 0,
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

	// // ----------------------------------------
	// //     ProofLocation: SaveProofLocation
	// // ----------------------------------------
	// {
	// 	displayName: 'Standard',
	// 	name: 'standard',
	// 	type: 'collection',
	// 	placeholder: 'Add Field',
	// 	default: {},
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'ProofLocation',
	// 			],
	// 			operation: [
	// 				'SaveProofLocation',
	// 			],
	// 		},
	// 	},
	// 	options: [
	// 	],
	// },
	//
	// // ----------------------------------------
	// //    ProofLocation: SaveProofLocations
	// // ----------------------------------------
	// {
	// 	displayName: 'Standard',
	// 	name: 'standard',
	// 	type: 'collection',
	// 	placeholder: 'Add Field',
	// 	default: {},
	// 	displayOptions: {
	// 		show: {
	// 			resource: [
	// 				'ProofLocation',
	// 			],
	// 			operation: [
	// 				'SaveProofLocations',
	// 			],
	// 		},
	// 	},
	// 	options: [
	// 	],
	// },
] as INodeProperties[];
