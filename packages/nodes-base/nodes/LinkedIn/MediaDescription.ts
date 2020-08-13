import { INodeProperties } from "n8n-workflow";

export const mediaOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'post',
				],
			},
		},
		options: [
			{
				name: 'Register',
				value: 'register',
				description: 'Register a media image.',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const mediaFields = [
/* -------------------------------------------------------------------------- */
/*                                 media:register                              */
/* -------------------------------------------------------------------------- */
    {
        displayName: 'Binary Property',
        displayOptions: {
            show: {
                resurce: [
                    'media'
                ],
                operation: [
                    'register',
                ],
            },
        },
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        description: 'Object property name which holds binary data.',
        required: true,
    },
] as INodeProperties[];
