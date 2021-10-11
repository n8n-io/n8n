import {
	INodeProperties,
} from 'n8n-workflow';

export const UserAccessTokensDescription = [
			// ----------------------------------
			//         Operation: useraccesstoken
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['userAccessToken'],
						api: ['rest']
					}
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create an entry.'
					},
					{
						name: 'List',
						value: 'list',
						description: 'Get data of all entries.'
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Update an entry.'
					},
				],
				default: 'create',
				description: 'The operation to perform.'
			},
			// ----------------------------------
			//         Fields: useraccesstoken
			// ----------------------------------
			{
				displayName: 'ID',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['delete'],
						resource: ['userAccessToken'],
						api: ['rest'],
					}
				},
				description: 'The ID of the user access token.'
			},
			{
				displayName: 'Label',
				name: 'label',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['userAccessToken'],
						api: ['rest'],
					},
				},
				default: '',
				description: "The Label of the user access token.",
			},
			{
				displayName: 'Expires At',
				name: 'expires_at',
				type: 'dateTime',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['userAccessToken'],
						api: ['rest'],
					},
				},
				default: '',
				description: "The expiration time of the user access token.",
			},
			{
				displayName: 'Permissions',
				name: 'permissions',
				placeholder: 'Add Permission',
				description: 'Adds a permission for the access token.',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true
				},
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['userAccessToken'],
						api: ['rest'],
					},
				},
				default: {},
				options: [
					{
						name: 'fields',
						displayName: 'Field',
						values: [
							{
								displayName: 'Permission',
								name: 'permission',
								type: 'string',
								default: '',
								description: 'Permission to set.'
							},
						]
					}
				]
			},
] as INodeProperties[];
