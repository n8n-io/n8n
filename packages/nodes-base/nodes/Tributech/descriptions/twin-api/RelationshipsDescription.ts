import {
	INodeProperties,
} from 'n8n-workflow';

export const relationshipsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		description: 'The operation that should be executed',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'relationships',
				],
			},
		},
		options: [
			{
				name: 'Create Relationship',
				description: 'Create Relationship',
				value: 'postRelationship',
			},
			{
				name: 'Delete Relationship By Id',
				description: 'Delete Relationship By Id',
				value: 'deleteRelationshipById',
			},
			{
				name: 'Get All Relationships',
				description: 'Get All Relationships',
				value: 'getAllRelationships',
			},
			{
				name: 'Get Incoming Relationships',
				description: 'Get Incoming Relationships',
				value: 'getIncomingRelationships',
			},
			{
				name: 'Get Outgoing Relationships',
				description: 'Get Outgoing Relationships',
				value: 'getOutgoingRelationships',
			},
			{
				name: 'Get Relationship By Id',
				description: 'Get Relationship By Id',
				value: 'getRelationshipById',
			},
			{
				name: 'Update Relationship',
				description: 'Update Relationship',
				value: 'updateRelationship',
			},
		],
		default: 'getOutgoingRelationships',
	},
] as INodeProperties[];

export const relationshipsFields = [
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'relationships',
				],
				operation: [
					'getAllRelationships',
				],
			},
		},
		options: [
			{
				displayName: 'pageNumber',
				name: 'pageNumber',
				description: 'The page number. Default:1',
				type: 'number',
				default: 0,
			},
			{
				displayName: 'pageSize',
				name: 'pageSize',
				description: 'The page size. Default:100',
				type: 'number',
				default: 0,
			},
		],
	},
	{
		displayName: 'DTID',
		name: 'dtId',
		description: 'The digital twin identifier.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'relationships',
				],
				operation: [
					'getIncomingRelationships',
					'getOutgoingRelationships',
				],
			},
		},
	},
	{
		displayName: 'Relationship (JSON)',
		name: 'relationship',
		description: 'Add a new relationship',
		type: 'json',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'relationships',
				],
				operation: [
					'postRelationship',
					'updateRelationship',
				],
			},
		},
	},
	{
		displayName: 'Relationship ID',
		name: 'relationshipId',
		description: 'The relationship identifier.',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'relationships',
				],
				operation: [
					'getRelationshipById',
					'updateRelationship',
					'deleteRelationshipById',
				],
			},
		},
	},

] as INodeProperties[];
