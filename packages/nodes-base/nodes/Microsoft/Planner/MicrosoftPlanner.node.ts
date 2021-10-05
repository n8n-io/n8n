import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

export class MicrosoftPlanner implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Microsoft Planer',
		name: 'microsoftPlanner',
		icon: 'file:planner.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Microsoft Planner API',
		defaults: {
			name: 'Microsoft Planner',
			color: '#08c7fb',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'microsoftPlannerOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
			{
				name: 'microsoftPlannerApi',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'serviceAccount',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Credentials type',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Service account',
						value: 'serviceAccount',
					},
					{
						name: 'OAuth (suggested)',
						value: 'oAuth2',
					},
				],
				default: 'serviceAccount',
			},
			{
				displayName: 'Action',
				name: 'action',
				type: 'options',
				options: [
					{
						name: 'Create card',
						value: 'createCard',
					},
				],
				default: 'createCard',
			},
			{
				displayName: 'Board ID',
				name: 'boardId',
				description: 'The board ID',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
					},
				},
			},
			{
				displayName: 'Bucket ID',
				name: 'bucketId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
					},
				},
			},
			{
				displayName: 'Card descripition',
				name: 'cardDescription',
				description: 'Anything youd like to mention about the card.',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
					},
				},
			},
			{
				displayName: 'Card Title',
				name: 'cardTitle',
				description: 'The card title.',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
					},
				},
			},
			{
				displayName: 'Make card visible',
				name: 'makeCardVisible',
				description: 'Other people can see the card',
				type: 'boolean',
				required: true,
				default: false,
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
					},
				},
			},
			{
				displayName: 'Simplify output',
				name: 'simplifyOutput',
				type: 'boolean',
				required: true,
				default: false,
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
					},
				},
			},
			{
				displayName: 'Resolve IDs in output',
				name: 'resolveIdsInOutput',
				type: 'boolean',
				description: 'When enabled, looks for any IDs in the output and adds in the name of the thing that is referenced by this ID. this makes it easier to understand',
				required: true,
				default: true,
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
						simplifyOutput: [
							true,
						],
					},
				},
			},
			{
				displayName: 'optional fields',
				name: 'optionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						action: [
							'createCard',
						],
					},
				},
				options: [
					{
						displayName: 'Label',
						name: 'label',
						type: 'options',
						default: 'todo',
						description: 'For cards that are part of a kanban board, the label to apply to the card',
						options: [
							{
								name: 'todo',
								value: 'todo',
							},
							{
								name: 'in progress',
								value: 'inProgress',
							},
							{
								name: 'done',
								value: 'done',
							},
						],
					},
					{
						displayName: 'Proirity',
						name: 'priority',
						description: 'How important the card is. 1 is the most important',
						type: 'options',
						default: '1',
						options: [
							{
								name: '1',
								value: '1',
							},
							{
								name: '2',
								value: '2',
							},
							{
								name: '3',
								value: '3',
							},
							{
								name: '4',
								value: '4',
							},
							{
								name: '6',
								value: '6',
							},
						],
					},
					{
						displayName: 'Created by',
						name: 'createdBy',
						type: 'string',
						default: '',
					},
				],
			},
		],
	};

	// @ts-ignore
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		return [this.helpers.returnJsonArray([])];
	}
}
