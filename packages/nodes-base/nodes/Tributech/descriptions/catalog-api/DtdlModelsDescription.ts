import {
	INodeProperties,
} from 'n8n-workflow';

export const dtdlModelsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		description: 'The operation that should be executed',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
			},
		},
		options: [
			{
				name: 'Get Bases',
				value: 'getBases',
				description: 'Get Bases',
			},
			{
				name: 'Get DTDL Model',
				value: 'getDtdlModel',
				description: 'Get DTDL Model',
			},
			{
				name: 'Get Expanded',
				value: 'getExpanded',
				description: 'Get Expanded',
			},
			{
				name: 'Get Expanded Models',
				value: 'getExpandedModels',
				description: 'Get Expanded Models',
			},
			{
				name: 'Get Outgoing Relationships',
				value: 'getOutgoingRelationships',
				description: 'Get Outgoing Relationships',
			},
			{
				name: 'Get Relationships',
				value: 'getRelationships',
				description: 'Get Relationships',
			},
			{
				name: 'Get Roots',
				value: 'getRoots',
				description: 'Get Roots',
			},
		],
		default: 'getDtdlModel',
	},
] as INodeProperties[];

export const dtdlModelsFields = [
	{
		displayName: 'Dtmi',
		name: 'dtmi',
		description: 'The DTMI of the requested model.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getBases',
					'getExpanded',
					'getDtdlModel',
				],
			},
		},
	},
	{
		displayName: 'Size',
		name: 'size',
		description: 'The page size to load.',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getExpandedModels',
				],
			},
		},
	},
	{
		displayName: 'Page',
		name: 'page',
		description: 'The page to load',
		type: 'number',
		required: true,
		default: 0,
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getExpandedModels',
				],
			},
		},
	},
	{
		displayName: 'sourceDtmi',
		name: 'sourceDtmi',
		description: 'The DTMI of the source model',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getOutgoingRelationships',
					'getRelationships',
				],
			},
		},
	},
	{
		displayName: 'targetDtmi',
		name: 'targetDtmi',
		description: 'The DTMI of the target model',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'dtdlModels',
				],
				operation: [
					'getRelationships',
				],
			},
		},
	},
] as INodeProperties[];
