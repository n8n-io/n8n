import {
	INodeProperties
} from 'n8n-workflow';

export const templateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'template',
				],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'create a template',
			},
		],
		default: 'create',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const templateFields = [

	/* -------------------------------------------------------------------------- */
	/*                                template:create                             */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Template',
		name: 'template',
		type: 'string',
		displayOptions: {
			show: {
				resource: [
					'template',
				],
				operation: [
					'create',
				],
			},
		},
		required: true,
		default: '',
		description: 'Render a Home Assistant template. <a href="https://www.home-assistant.io/docs/configuration/templating/" target="_blank">See template docs for more information.</a>',
	},
] as INodeProperties[];
