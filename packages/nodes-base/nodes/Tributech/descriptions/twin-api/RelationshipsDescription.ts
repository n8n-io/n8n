import {
	INodeProperties,
} from 'n8n-workflow';

export const relationshipsOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
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
				name: 'Get All Relationships',
				value: 'getAllRelationships',
			},
			{
				name: 'Get Incoming Relationships',
				value: 'getIncomingRelationships',
			},
			{
				name: 'Get Outgoing Relationships',
				value: 'getOutgoingRelationships',
			},
			{
				name: 'Create Relationship',
				value: 'postRelationship',
			},
			{
				name: 'Update Relationship',
				value: 'updateRelationship',
			},
			{
				name: 'Get Relationship By Id',
				value: 'getRelationshipById',
			},
			{
				name: 'Delete Relationship By Id',
				value: 'deleteRelationshipById',
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
