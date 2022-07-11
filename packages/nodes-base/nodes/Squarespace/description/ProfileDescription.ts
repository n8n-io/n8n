import {
	INodeProperties
} from 'n8n-workflow';
import { profileFiltersPreSendAction } from '../GenericFunctions';

export const profileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				routing: {
					request: {
						method: 'GET',
						url: '=/profiles/{{$parameter.profileId}}',
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'profiles',
								},
							},
						],
					},
				},
			},
			{
				name: 'Get All',
				value: 'getAll',
				routing: {
					request: {
						method: 'GET',
						url: '/profiles',
					},
					send: {
						paginate: true,
					},
				}
			},
		],
		default: 'getAll',
	},
];

const getOperations: Array<INodeProperties> = [
	{
		displayName: 'Profile ID',
		name: 'profileId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
				operation: [
					'get',
				]
			},
		},
		default: '',
	},
];


const getAllOperations: Array<INodeProperties> = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['profile'],
				operation: ['getAll'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['profile'],
				operation: ['getAll'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 50,
		},
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
			},
			{
				displayName: 'Has Account',
				name: 'hasAccount',
				type: 'boolean',
				default: true,
				description: 'Whether the profile has an account; Value must be true; false currently not supported',
			},
			{
				displayName: 'Is Customer',
				name: 'isCustomer',
				type: 'boolean',
				default: true,
				description: 'Whether the profile is a customer; Value must be true; false currently not supported',
			},
		],
		routing: {
			send: {
				preSend: [
					profileFiltersPreSendAction
				]
			}
		}
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'profile',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Sort Direction',
				name: 'sortDirection',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'dsc' },
				],
				default: 'dsc',
				routing: {
					send: {
						type: 'query', property: 'sortDirection'
					}
				}
			},
			{
				displayName: 'Sort Field',
				name: 'sortField',
				type: 'options',
				options: [
					{ name: 'Created On', value: 'createdOn' },
					{ name: 'Email', value: 'email' },
					{ name: 'ID', value: 'id' },
					{ name: 'Last Name', value: 'lastName' },
				],
				default: 'id',
				routing: {
					send: {
						type: 'query', property: 'sortField'
					}
				}
			},
		],
	},
];

export const profileFields: INodeProperties[] = [
	...getOperations,
	...getAllOperations,
];
