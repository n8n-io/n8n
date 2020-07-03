import { INodeProperties } from 'n8n-workflow';

export const organizationOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'organization',
				],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get organization by ID.',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all organizations.',
			}
		],
		default: 'get',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const organizationFields = [
/* -------------------------------------------------------------------------- */
/*                                organization:getAll                                */
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
            displayName: 'Member',
            name: 'member',
            type: 'boolean',
            default: true,
            description: 'Restrict results to organizations which you have membership.',
        },
        {
            displayName: 'Owner',
            name: 'owner',
            type: 'boolean',
            default: true,
            description: 'Restrict results to organizations which you are the owner.',
        },
    ]
},
/* -------------------------------------------------------------------------- */
/*                                organization:get                                   */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Organization Slug',
		name: 'organizationSlug',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: [
					'organization',
				],
				resource: [
					'get',
				],
			},
		},
		required: true,
		description: 'The slug of the organization the team should be created for.',
	}
] as INodeProperties[];
