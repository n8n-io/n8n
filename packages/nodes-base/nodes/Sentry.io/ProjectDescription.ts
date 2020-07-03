import { INodeProperties } from 'n8n-workflow';

export const projectOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'project',
				],
			},
		},
		options: [
            {
				name: 'Create',
				value: 'create',
				description: 'Create a new project.',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get project by ID.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all projects.',
			}
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const projectFields = [
/* -------------------------------------------------------------------------- */
/*                                project:create/get                          */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Organization Slug',
        name: 'organizationSlug',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: [
                    'project',
                ],
                operation: [
                    'create', 'get', 'update', 'delete'
                ],
            },
        },
        required: true,
        description: 'The slug of the organization the events belong to.',
    },
    {
        displayName: 'Project Slug',
        name: 'projectSlug',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: [
                    'project',
                ],
                operation: [
                    'create', 'get', 'update', 'delete'
                ],
            },
        },
        required: true,
        description: 'The slug of the project the events belong to.',
    },
    {
        displayName: 'Name',
        name: 'name',
        type: 'string',
        default: '',
        displayOptions: {
            show: {
                resource: [
                    'project',
                ],
                operation: [
                    'create',
                ],
            },
        },
        required: true,
        description: 'The name for the new project.',
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
					'project',
				],
				operation: [
					'create',
				],
			},
		},
		options: [
			{
				displayName: 'Slug',
				name: 'slug',
				type: 'string',
				default: '',
				description: 'Optionally a slug for the new project. If it’s not provided a slug is generated from the name.',
			},
		]
	},
/* -------------------------------------------------------------------------- */
/*                                project:update                              */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Additional Fields',
        name: 'additionalFields',
        type: 'collection',
        placeholder: 'Add Field',
        default: {},
        displayOptions: {
            show: {
                resource: [
                    'organization',
                ],
                operation: [
                    'getAll',
                ],
            },
        },
        options: [
            {
                displayName: 'New Name',
                name: 'newName',
                type: 'string',
                default: '',
                description: 'The new name for the project.',
            },
            {
                displayName: 'New Slug',
                name: 'newSlug',
                type: 'string',
                default: '',
                description: 'The new slug for the project.',
            },
            {
                displayName: 'New Platform',
                name: 'newPlatform',
                type: 'string',
                default: '',
                description: 'The new platform for the project.',
            },
            {
                displayName: 'Digest min. Delay',
                name: 'digestMinDelay',
                type: 'number',
                default: 0
            },
            {
                displayName: 'Digest max. Delay',
                name: 'digestMaxDelay',
                type: 'number',
                default: 0
            },
        ]
    },
] as INodeProperties[];
