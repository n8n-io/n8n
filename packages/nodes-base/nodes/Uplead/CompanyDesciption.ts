import { INodeProperties } from 'n8n-workflow';

export const companyOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: [
					'company',
				],
			},
		},
		options: [
			{
				name: 'Enrich',
				value: 'enrich',
			},
		],
		default: 'enrich',
	},
];

export const companyFields: INodeProperties[] = [

/* -------------------------------------------------------------------------- */
/*                                 company:enrich                             */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'enrich',
				],
			},
		},
		description: 'the name of the company (e.g – amazon)',
	},
	{
		displayName: 'Domain',
		name: 'domain',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: [
					'company',
				],
				operation: [
					'enrich',
				],
			},
		},
		description: 'the domain name (e.g – amazon.com)',
	},
];
